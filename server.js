const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const SESSION_DAYS = 30;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ---------- Database ----------

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'tablebook.db'));

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Every restaurant has its own tables, numbered from 1
  CREATE TABLE IF NOT EXISTS tables (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    number        INTEGER NOT NULL,
    seats         INTEGER NOT NULL,
    UNIQUE (restaurant_id, number)
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    table_id   INTEGER NOT NULL REFERENCES tables(id),
    date       TEXT NOT NULL,
    time       TEXT NOT NULL,
    guests     INTEGER NOT NULL,
    duration   INTEGER NOT NULL DEFAULT 60,
    status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    cuisine     TEXT NOT NULL DEFAULT '',
    address     TEXT NOT NULL DEFAULT '',
    city        TEXT NOT NULL DEFAULT 'yerevan',
    description TEXT NOT NULL DEFAULT '',
    image_url   TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Guests may send several requests for the same slot; only one of them can be confirmed
  DROP INDEX IF EXISTS reservations_slot;
  CREATE UNIQUE INDEX IF NOT EXISTS reservations_confirmed_slot
    ON reservations (table_id, date, time) WHERE status = 'confirmed';

  -- A restaurant's menu: dishes by category, prices in Armenian drams; removed with the restaurant
  CREATE TABLE IF NOT EXISTS menu_items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category      TEXT NOT NULL,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    price         INTEGER NOT NULL,
    image_url     TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS menu_items_restaurant ON menu_items (restaurant_id);

  -- Dishes the guest ordered with a booking. Name and price are copied, so later menu changes
  -- don't change an order that was already made
  CREATE TABLE IF NOT EXISTS reservation_items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    price          INTEGER NOT NULL,
    qty            INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS reservation_items_reservation ON reservation_items (reservation_id);

  -- The booking deposit (test payments only). awaiting: not paid yet (15 minutes); held: paid, the money
  -- is held on the card; captured: charged after the admin confirmed; released / refunded: returned to
  -- the card (before / after it was charged); expired: not paid in time; void: cancelled before paying
  CREATE TABLE IF NOT EXISTS payments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE CASCADE,
    amount         INTEGER NOT NULL,
    status         TEXT NOT NULL DEFAULT 'awaiting'
                   CHECK (status IN ('awaiting', 'held', 'captured', 'released', 'refunded', 'expired', 'void')),
    card_brand     TEXT NOT NULL DEFAULT '',
    card_last4     TEXT NOT NULL DEFAULT '',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at     TEXT NOT NULL,
    paid_at        TEXT,
    captured_at    TEXT,
    returned_at    TEXT
  );

  -- Messages for guests (audience 'user') and for the admin page (audience 'admin'). The text is built
  -- on the page from the type and its params, so it shows in the chosen language
  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    audience   TEXT NOT NULL CHECK (audience IN ('user', 'admin')),
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    params     TEXT NOT NULL DEFAULT '{}',
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS notifications_audience ON notifications (audience, user_id);
`);

// Databases created before bookings had a length get the column added (existing bookings become 1 hour)
const reservationColumns = db.prepare('PRAGMA table_info(reservations)').all().map((c) => c.name);
if (!reservationColumns.includes('duration')) {
  db.exec('ALTER TABLE reservations ADD COLUMN duration INTEGER NOT NULL DEFAULT 60');
}
// The admin's message to the guest when a booking is rejected (rejected bookings are 'cancelled')
if (!reservationColumns.includes('reject_reason')) {
  db.exec('ALTER TABLE reservations ADD COLUMN reject_reason TEXT');
}
// When the booking was rejected; rejected bookings are deleted 2 minutes later.
// Bookings rejected before this column existed get "now", so they too go in 2 minutes.
if (!reservationColumns.includes('rejected_at')) {
  db.exec(`
    ALTER TABLE reservations ADD COLUMN rejected_at TEXT;
    UPDATE reservations SET rejected_at = datetime('now') WHERE reject_reason IS NOT NULL;
  `);
}

// The guest has 2 minutes to read the admin's message, then the rejected booking is removed
const REJECTED_KEEP_MINUTES = 2;

function deleteOldRejected() {
  db.prepare(`
    DELETE FROM reservations
    WHERE reject_reason IS NOT NULL AND rejected_at <= datetime('now', ?)
  `).run(`-${REJECTED_KEEP_MINUTES} minutes`);
}

deleteOldRejected();
setInterval(deleteOldRejected, 30 * 1000);

// Users created before admins existed get the column added (nobody is admin until make-admin is run)
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('is_admin')) {
  db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
}

// Every user has a role: 'user' (guest) or 'admin' (staff).
// Users who were already admins become 'admin'; everyone else becomes 'user'.
if (!userColumns.includes('role')) {
  db.exec(`
    ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
      CHECK (role IN ('user', 'admin'));
    UPDATE users SET role = 'admin' WHERE is_admin = 1;
  `);
}

// Dishes created before photos existed have none (the pages show the section's icon instead)
const menuColumns = db.prepare('PRAGMA table_info(menu_items)').all().map((c) => c.name);
if (!menuColumns.includes('image_url')) {
  db.exec("ALTER TABLE menu_items ADD COLUMN image_url TEXT NOT NULL DEFAULT ''");
}

// Restaurants created before cities existed are all in Yerevan
const restaurantColumns = db.prepare('PRAGMA table_info(restaurants)').all().map((c) => c.name);
if (!restaurantColumns.includes('city')) {
  db.exec("ALTER TABLE restaurants ADD COLUMN city TEXT NOT NULL DEFAULT 'yerevan'");
}

// Cities of Armenia a restaurant can be in (the names are translated on the pages, see i18n.js)
const CITIES = [
  'yerevan', 'gyumri', 'vanadzor', 'vagharshapat', 'abovyan', 'hrazdan', 'kapan', 'armavir',
  'artashat', 'ashtarak', 'gavar', 'goris', 'dilijan', 'ijevan', 'sevan', 'jermuk',
  'tsaghkadzor', 'sisian', 'stepanavan', 'yeghegnadzor', 'alaverdi', 'masis', 'charentsavan', 'meghri',
];

// Add 10 restaurants on first run; after that the admin manages the list
if (db.prepare('SELECT COUNT(*) AS n FROM restaurants').get().n === 0) {
  const photo = (id) => `https://images.unsplash.com/photo-${id}?w=700&q=70&auto=format&fit=crop`;
  const insertRestaurant = db.prepare(
    'INSERT INTO restaurants (name, cuisine, address, description, image_url) VALUES (?, ?, ?, ?, ?)'
  );
  [
    ['Golden Plate', 'Fine dining', '2 Republic Square, Yerevan', 'An elegant hall with chandeliers for special evenings.', photo('1785845506893-70768a28ba44')],
    ['Bordeaux Lounge', 'French', '5 Northern Avenue, Yerevan', 'Burgundy velvet interiors, French wines and a quiet atmosphere.', photo('1753727471014-efe38840c7c7')],
    ['Ararat Terrace', 'Armenian', '12 Abovyan Street, Yerevan', 'Classic Armenian dishes and a terrace with a view of Mount Ararat.', photo('1667388969250-1c7220bf3f37')],
    ['Lavash House', 'Armenian grill', '21 Tumanyan Street, Yerevan', 'Fresh lavash from the tonir and grilled khorovats.', photo('1682778418768-16081e4470a1')],
    ['Trattoria Verde', 'Italian', '8 Pushkin Street, Yerevan', 'Handmade pasta and wood-fired pizza.', photo('1517248135467-4c7edcad34c4')],
    ['Sakura Garden', 'Japanese', '3 Saryan Street, Yerevan', 'Sushi, ramen and a calm, garden-style hall.', photo('1667388968964-4aa652df0a9b')],
    ['Café Cascade', 'Café', '1 Tamanyan Street, Yerevan', 'Coffee, desserts and breakfast near the Cascade.', photo('1771574205963-0c1d84ac7354')],
    ['The Oak Grill', 'Steakhouse', '17 Mashtots Avenue, Yerevan', 'Steaks and grilled vegetables in a warm wooden hall.', photo('1552960226-639240203497')],
    ['Spice Route', 'Indian', '24 Teryan Street, Yerevan', 'Curries, tandoor dishes and plenty of vegetarian choices.', photo('1687648431656-da99da578d50')],
    ['Sevan Fish House', 'Seafood', '30 Arami Street, Yerevan', 'Fresh trout and fish from Lake Sevan.', photo('1560130934-590b85fc08e7')],
  ].forEach((r) => insertRestaurant.run(...r));
}

// Older databases had one shared set of tables. Rebuild that table with a restaurant_id column
// (keeping the table ids so existing bookings still point to the same tables) and give the
// existing tables to the first restaurant.
const tableColumns = db.prepare('PRAGMA table_info(tables)').all().map((c) => c.name);
if (!tableColumns.includes('restaurant_id')) {
  const firstRestaurant = db.prepare('SELECT MIN(id) AS id FROM restaurants').get().id;
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec(`
    BEGIN;
    CREATE TABLE tables_new (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL,
      number        INTEGER NOT NULL,
      seats         INTEGER NOT NULL,
      UNIQUE (restaurant_id, number)
    );
    INSERT INTO tables_new (id, restaurant_id, number, seats) SELECT id, ${Number(firstRestaurant)}, number, seats FROM tables;
    DROP TABLE tables;
    ALTER TABLE tables_new RENAME TO tables;
    COMMIT;
  `);
  db.exec('PRAGMA foreign_keys = ON');
}

// The hall layout every restaurant starts with: seats per table, tables numbered 1–8
const DEFAULT_TABLE_SEATS = [2, 2, 2, 4, 4, 4, 6, 8];

function addDefaultTables(restaurantId) {
  const insertTable = db.prepare('INSERT INTO tables (restaurant_id, number, seats) VALUES (?, ?, ?)');
  DEFAULT_TABLE_SEATS.forEach((seats, i) => insertTable.run(restaurantId, i + 1, seats));
}

// Restaurants without tables (new ones, or all of them on first run) get the default hall
db.prepare('SELECT id FROM restaurants WHERE id NOT IN (SELECT restaurant_id FROM tables)').all()
  .forEach((r) => addDefaultTables(r.id));

// ---------- Helpers ----------

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

function sendJson(res, status, data, headers = {}) {
  // API answers change all the time (bookings, restaurants), so the browser must not reuse old ones
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}

// Read a JSON request body; invalid or oversized bodies become {} and fail validation
function readJson(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10000) {
        req.destroy();
        resolve({});
      }
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        resolve(data && typeof data === 'object' ? data : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

// The main page and the admin page keep separate cookies, so a guest and an admin
// can be signed in at the same time in one browser without logging each other out
const USER_COOKIE = 'session';
const ADMIN_COOKIE = 'admin_session';

function startSession(userId, cookie = USER_COOKIE) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return `${cookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`;
}

// Deletes the session behind the cookie and returns the header that clears it
function endSession(req, cookie) {
  const token = getSessionToken(req, cookie);
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  return `${cookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function getSessionToken(req, cookie = USER_COOKIE) {
  const match = new RegExp(`(?:^|;\\s*)${cookie}=([a-f0-9]+)`).exec(req.headers.cookie || '');
  return match ? match[1] : null;
}

function getSessionUser(req, cookie = USER_COOKIE) {
  const token = getSessionToken(req, cookie);
  if (!token) return null;
  const user = db.prepare(`
    SELECT u.id, u.first_name AS firstName, u.last_name AS lastName, u.email, u.role
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.created_at > datetime('now', ?)
  `).get(token, `-${SESSION_DAYS} days`);
  return user ? { ...user, isAdmin: user.role === 'admin' } : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const asText = (value) => (typeof value === 'string' ? value.trim() : '');

// A reservation can be cancelled until 1 hour before it starts
const CANCEL_BEFORE_MS = 60 * 60 * 1000;

function canStillCancel(reservation) {
  return new Date(`${reservation.date}T${reservation.time}`) - new Date() >= CANCEL_BEFORE_MS;
}

// Every new booking holds the table for 1 hour; the stored duration lets the admin extend it later
const BOOKING_MINUTES = 60;
const REJECT_REASON_MAX = 300;
const CLOSING_MINUTES = 23 * 60;

// True once the booking's time slot is over (start + duration is in the past)
function hasEnded(reservation) {
  const start = new Date(`${reservation.date}T${reservation.time}`);
  return start.getTime() + reservation.duration * 60 * 1000 <= Date.now();
}

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// True if the table already has a confirmed booking that overlaps [start, start + duration).
// Pending bookings do not hold the table until the admin confirms them.
function isTableBusy(tableId, date, start, duration, ignoreId = 0) {
  return db.prepare(`
    SELECT time, duration FROM reservations
    WHERE table_id = ? AND date = ? AND status = 'confirmed' AND id != ?
  `).all(tableId, date, ignoreId).some((r) => {
    const otherStart = toMinutes(r.time);
    return start < otherStart + r.duration && otherStart < start + duration;
  });
}

// Sends 403 and returns false unless the signed-in user has the 'admin' role
// (only the admin page's own login counts, not the main page's Log in)
function requireAdmin(req, res, message = 'Մուտքն արգելված է') {
  const user = getSessionUser(req, ADMIN_COOKIE);
  if (user && user.role === 'admin') return true;
  sendJson(res, 403, { error: message });
  return false;
}

// ---------- Test payments: the booking deposit ----------

// The guest pays only the deposit online; the rest is paid at the restaurant after the meal
const DEPOSIT_AMOUNT = 5000;
const PAYMENT_MINUTES = 15;

// Payments are a test system: they work only when the site is opened on this computer (localhost)
function isLocalRequest(req) {
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(req.headers.host || '');
}

// SQLite keeps UTC times as "YYYY-MM-DD HH:MM:SS"; the pages get ISO times
const isoTime = (sqlTime) => (sqlTime ? sqlTime.replace(' ', 'T') + 'Z' : null);

function notify(audience, userId, type, params) {
  db.prepare('INSERT INTO notifications (audience, user_id, type, params) VALUES (?, ?, ?, ?)')
    .run(audience, userId, type, JSON.stringify(params));
}

// Notifications are deleted 48 hours after they were sent (read or not)
const NOTIFICATION_KEEP_HOURS = 48;

function deleteOldNotifications() {
  db.prepare("DELETE FROM notifications WHERE created_at <= datetime('now', ?)").run(`-${NOTIFICATION_KEEP_HOURS} hours`);
}

deleteOldNotifications();
setInterval(deleteOldNotifications, 10 * 60 * 1000);

// What a notification about a booking mentions: restaurant, table, day and time, guest
function bookingInfo(reservationId) {
  const r = db.prepare(`
    SELECT r.user_id AS userId, r.date, r.time, t.number AS table_number, COALESCE(rest.name, '') AS restaurant,
      u.first_name || ' ' || u.last_name AS guest
    FROM reservations r JOIN tables t ON t.id = r.table_id JOIN users u ON u.id = r.user_id
    LEFT JOIN restaurants rest ON rest.id = t.restaurant_id
    WHERE r.id = ?
  `).get(reservationId);
  return r && { userId: r.userId, restaurant: r.restaurant, table: r.table_number, date: r.date, time: r.time, guest: r.guest };
}

function paymentOf(reservationId) {
  return db.prepare('SELECT * FROM payments WHERE reservation_id = ?').get(reservationId);
}

// The payment as the pages see it (no card data except the brand and last four digits)
function paymentView(payment) {
  return payment && {
    id: payment.id, amount: payment.amount, status: payment.status, cardBrand: payment.card_brand,
    cardLast4: payment.card_last4, expiresAt: isoTime(payment.expires_at),
  };
}

// Returns the deposit to the card right away: a held amount is released, a charged one is refunded.
// Gives back the amount returned (0 when nothing was paid); an unpaid deposit is just closed
function returnDeposit(reservationId) {
  const payment = paymentOf(reservationId);
  if (!payment) return 0;
  if (payment.status === 'held' || payment.status === 'captured') {
    const status = payment.status === 'held' ? 'released' : 'refunded';
    db.prepare("UPDATE payments SET status = ?, returned_at = datetime('now') WHERE id = ?").run(status, payment.id);
    return payment.amount;
  }
  if (payment.status === 'awaiting') db.prepare("UPDATE payments SET status = 'void' WHERE id = ?").run(payment.id);
  return 0;
}

// Bookings not paid within 15 minutes are cancelled, and the guest is told
function expireUnpaid() {
  const late = db.prepare(`
    SELECT p.id, p.reservation_id FROM payments p JOIN reservations r ON r.id = p.reservation_id
    WHERE p.status = 'awaiting' AND p.expires_at <= datetime('now')
  `).all();
  late.forEach((p) => {
    const info = bookingInfo(p.reservation_id);
    db.prepare("UPDATE payments SET status = 'expired' WHERE id = ?").run(p.id);
    db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ? AND status != 'cancelled'").run(p.reservation_id);
    if (info) notify('user', info.userId, 'bookingExpired', info);
  });
}

expireUnpaid();
setInterval(expireUnpaid, 30 * 1000);

// Card checks for the test payment page. Nothing about the card is stored except the brand and last 4 digits
const DECLINED_TEST_CARD = '4000000000000002';

function luhnValid(number) {
  let sum = 0;
  for (let i = 0; i < number.length; i++) {
    let digit = Number(number[number.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function cardBrand(number) {
  if (/^9051/.test(number)) return 'ArCa';
  if (/^220[0-4]/.test(number)) return 'Mir';
  if (/^4/.test(number)) return 'Visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(number)) return 'Mastercard';
  if (/^3[47]/.test(number)) return 'American Express';
  if (/^62/.test(number)) return 'UnionPay';
  return 'Card';
}

const RESTAURANTS_ADMIN_ONLY = 'Միայն ադմինը կարող է փոխել ռեստորանները';

// Menu sections in the order they are shown (the names are translated on the pages)
const MENU_CATEGORIES = ['starters', 'salads', 'soups', 'mains', 'grill', 'desserts', 'drinks'];
const MENU_LIMITS = { name: 80, description: 200, imageUrl: 500 };
const MAX_PRICE = 10000000;
const MAX_ORDER_LINES = 50;
const MAX_DISH_QTY = 20;

// The dishes ordered with each booking, as { reservationId: [{ name, price, qty }] }
function ordersFor(reservationIds) {
  const orders = {};
  if (!reservationIds.length) return orders;
  const rows = db.prepare(`
    SELECT reservation_id, name, price, qty FROM reservation_items
    WHERE reservation_id IN (${reservationIds.map(() => '?').join(',')}) ORDER BY id
  `).all(...reservationIds);
  rows.forEach((row) => {
    (orders[row.reservation_id] ||= []).push({ name: row.name, price: row.price, qty: row.qty });
  });
  return orders;
}

// Checks the guest's order against the restaurant's menu; returns the dishes to save, or an error text
function readOrder(order, restaurantId) {
  if (order == null) return { lines: [] };
  if (!Array.isArray(order) || order.length > MAX_ORDER_LINES) return { error: 'Պատվերը սխալ է' };
  const findDish = db.prepare('SELECT name, price FROM menu_items WHERE id = ? AND restaurant_id = ?');
  const lines = [];
  for (const line of order) {
    const id = Number(line && line.id);
    const qty = Number(line && line.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_DISH_QTY) return { error: 'Պատվերը սխալ է' };
    const dish = Number.isInteger(id) && findDish.get(id, restaurantId);
    if (!dish) return { error: 'Ճաշացանկում այդպիսի ուտեստ չկա' };
    lines.push({ name: dish.name, price: dish.price, qty });
  }
  return { lines };
}

// Validates a dish; sends 400 and returns null when something is wrong
function readMenuItem(body, res) {
  const item = {
    category: asText(body.category),
    name: asText(body.name),
    description: asText(body.description),
    price: Number(body.price),
    imageUrl: asText(body.imageUrl),
  };
  let error = null;
  if (!MENU_CATEGORIES.includes(item.category)) error = { category: 'Ընտրեք բաժինը' };
  else if (!item.name) error = { name: 'Գրեք ուտեստի անվանումը' };
  else if (item.name.length > MENU_LIMITS.name) error = { name: 'Տեքստը չափազանց երկար է' };
  else if (item.description.length > MENU_LIMITS.description) error = { description: 'Տեքստը չափազանց երկար է' };
  else if (!Number.isInteger(item.price) || item.price < 0 || item.price > MAX_PRICE) error = { price: 'Նշեք ճիշտ գին' };
  else if (item.imageUrl.length > MENU_LIMITS.imageUrl) error = { imageUrl: 'Տեքստը չափազանց երկար է' };
  else if (item.imageUrl && !/^https:\/\/\S+$/.test(item.imageUrl)) error = { imageUrl: 'Լուսանկարի հղումը պետք է սկսվի https://-ով' };
  if (error) {
    sendJson(res, 400, { errors: error });
    return null;
  }
  return item;
}

const RESTAURANT_LIMITS = { name: 80, cuisine: 40, address: 120, description: 300, imageUrl: 500 };

// Validates the restaurant fields; sends 400 and returns null when something is wrong
function readRestaurant(body, res) {
  const data = {};
  for (const field of Object.keys(RESTAURANT_LIMITS)) data[field] = asText(body[field]);

  if (!data.name) {
    sendJson(res, 400, { errors: { name: 'Գրեք ռեստորանի անվանումը' } });
    return null;
  }
  data.city = asText(body.city);
  if (!CITIES.includes(data.city)) {
    sendJson(res, 400, { errors: { city: 'Ընտրեք քաղաքը' } });
    return null;
  }
  const tooLong = Object.keys(RESTAURANT_LIMITS).find((field) => data[field].length > RESTAURANT_LIMITS[field]);
  if (tooLong) {
    sendJson(res, 400, { errors: { [tooLong]: 'Տեքստը չափազանց երկար է' } });
    return null;
  }
  if (data.imageUrl && !/^https:\/\/\S+$/.test(data.imageUrl)) {
    sendJson(res, 400, { errors: { imageUrl: 'Լուսանկարի հղումը պետք է սկսվի https://-ով' } });
    return null;
  }
  return data;
}

// ---------- Importing a restaurant from its web page ----------

const IMPORT_TIMEOUT_MS = 8000;
const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
const IMPORT_MAX_REDIRECTS = 3;

// The server must not be used to reach the local network (127.0.0.1, 192.168.x.x and so on)
function isPrivateAddress(ip) {
  if (net.isIPv6(ip)) {
    const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
    if (v4) return isPrivateAddress(v4[1]);
    const lower = ip.toLowerCase();
    return lower === '::1' || lower === '::' || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function assertPublicUrl(url) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('bad-url');
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) throw new Error('bad-url');
}

// Downloads the page's HTML, following a few redirects and checking every address on the way
async function fetchPage(link) {
  let url = new URL(link);
  for (let i = 0; i <= IMPORT_MAX_REDIRECTS; i++) {
    await assertPublicUrl(url);
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(IMPORT_TIMEOUT_MS),
      headers: { 'User-Agent': 'TableBook/1.0 (restaurant import)', Accept: 'text/html' },
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      url = new URL(response.headers.get('location'), url);
      continue;
    }
    if (!response.ok || !/html/i.test(response.headers.get('content-type') || '')) throw new Error('no-page');

    // Read at most IMPORT_MAX_BYTES; restaurant data is near the top of the page anyway
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (size < IMPORT_MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    return { html: Buffer.concat(chunks).toString('utf8'), url };
  }
  throw new Error('no-page');
}

function decodeEntities(text) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return text
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (m, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&(\w+);/g, (m, name) => named[name.toLowerCase()] ?? m);
}

const cleanText = (value) => decodeEntities(String(value ?? '')).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const firstOf = (value) => (Array.isArray(value) ? value[0] : value);

// The page's <meta> tags (og:title, description, ...) as { name: content }
function readMetaTags(html) {
  const meta = {};
  for (const [tag] of html.matchAll(/<meta\s[^>]*>/gi)) {
    const attr = (name) => {
      const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag);
      return m ? (m[2] ?? m[3]) : null;
    };
    const key = (attr('property') || attr('name') || '').toLowerCase();
    const content = attr('content');
    if (key && content && !(key in meta)) meta[key] = cleanText(content);
  }
  return meta;
}

// Restaurant data that many sites put in <script type="application/ld+json"> (schema.org)
function readRestaurantJsonLd(html) {
  const PLACE_TYPES = /Restaurant|FoodEstablishment|CafeOrCoffeeShop|BarOrPub|Bakery|LocalBusiness/i;
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const type = [].concat(node['@type'] || []).join(' ');
    if (PLACE_TYPES.test(type)) found.push(node);
    if (node['@graph']) walk(node['@graph']);
  };
  for (const [, json] of html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(json.trim())); } catch (e) { /* broken JSON on the page: skip it */ }
  }
  // A Restaurant is a better match than a general LocalBusiness
  return found.sort((x, y) => /Restaurant/i.test([].concat(y['@type']).join(' ')) - /Restaurant/i.test([].concat(x['@type']).join(' ')))[0] || null;
}

// Turns the page into the restaurant form's fields; city is the raw place name, the page matches it to a city
function restaurantFromPage(html, pageUrl) {
  const meta = readMetaTags(html);
  const place = readRestaurantJsonLd(html) || {};
  const address = firstOf(place.address);
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);

  let street = '';
  let locality = '';
  if (typeof address === 'string') {
    street = cleanText(address);
  } else if (address && typeof address === 'object') {
    street = cleanText(address.streetAddress);
    locality = cleanText(address.addressLocality);
  }

  // schema.org image can be a link or { url }; og:image is the usual fallback
  const placeImage = firstOf(place.image);
  const image = cleanText((placeImage && typeof placeImage === 'object' ? placeImage.url : placeImage) || meta['og:image']);
  let imageUrl = '';
  try {
    imageUrl = image ? new URL(image, pageUrl).href.replace(/^http:\/\//, 'https://') : '';
  } catch (e) { /* not a link: leave the photo empty */ }

  const result = {
    name: cleanText(place.name || meta['og:site_name'] || meta['og:title'] || (titleTag && titleTag[1])),
    cuisine: cleanText([].concat(place.servesCuisine || []).join(', ')),
    address: street || cleanText(meta['restaurant:contact_info:street_address'] || meta['business:contact_data:street_address']),
    city: locality || cleanText(meta['restaurant:contact_info:locality'] || meta['business:contact_data:locality']),
    description: cleanText(place.description || meta['og:description'] || meta.description),
    // The form accepts only https:// photos; a relative link is made absolute
    imageUrl: /^https:\/\/\S+$/.test(imageUrl) ? imageUrl : '',
  };
  for (const [field, limit] of Object.entries(RESTAURANT_LIMITS)) {
    if (result[field].length > limit) result[field] = result[field].slice(0, limit - 1).trimEnd() + '…';
  }
  return result;
}

// ---------- API ----------

const routes = {
  'GET /api/me': (req, res) => {
    sendJson(res, 200, { user: getSessionUser(req) });
  },

  // ---------- Restaurants: everyone can see the list, only the admin can change it ----------

  'GET /api/restaurants': (req, res) => {
    const restaurants = db.prepare(`
      SELECT id, name, cuisine, address, city, description, image_url AS imageUrl
      FROM restaurants ORDER BY id
    `).all();
    sendJson(res, 200, { restaurants: restaurants.map((r) => ({ ...r })) });
  },

  'POST /api/restaurants': async (req, res) => {
    if (!requireAdmin(req, res, RESTAURANTS_ADMIN_ONLY)) return;
    const data = readRestaurant(await readJson(req), res);
    if (!data) return;

    const { lastInsertRowid } = db
      .prepare('INSERT INTO restaurants (name, cuisine, address, city, description, image_url) VALUES (?, ?, ?, ?, ?, ?)')
      .run(data.name, data.cuisine, data.address, data.city, data.description, data.imageUrl);
    addDefaultTables(lastInsertRowid);
    sendJson(res, 201, { restaurant: { id: Number(lastInsertRowid), ...data } });
  },

  'POST /api/restaurants/update': async (req, res) => {
    if (!requireAdmin(req, res, RESTAURANTS_ADMIN_ONLY)) return;
    const body = await readJson(req);
    const id = Number(body.id);
    if (!Number.isInteger(id) || !db.prepare('SELECT 1 FROM restaurants WHERE id = ?').get(id)) {
      return sendJson(res, 404, { error: 'Այդպիսի ռեստորան չկա' });
    }
    const data = readRestaurant(body, res);
    if (!data) return;

    db.prepare('UPDATE restaurants SET name = ?, cuisine = ?, address = ?, city = ?, description = ?, image_url = ? WHERE id = ?')
      .run(data.name, data.cuisine, data.address, data.city, data.description, data.imageUrl, id);
    sendJson(res, 200, { restaurant: { id, ...data } });
  },

  'POST /api/restaurants/delete': async (req, res) => {
    if (!requireAdmin(req, res, RESTAURANTS_ADMIN_ONLY)) return;
    const id = Number((await readJson(req)).id);
    const { changes } = Number.isInteger(id)
      ? db.prepare('DELETE FROM restaurants WHERE id = ?').run(id)
      : { changes: 0 };
    if (!changes) return sendJson(res, 404, { error: 'Այդպիսի ռեստորան չկա' });

    // Guests' bookings at a removed restaurant are cancelled; the rows stay so they still see them
    db.prepare(`
      UPDATE reservations SET status = 'cancelled'
      WHERE status != 'cancelled' AND table_id IN (SELECT id FROM tables WHERE restaurant_id = ?)
    `).run(id);
    sendJson(res, 200, { ok: true });
  },

  // ---------- Menu: everyone can see it, only the admin can change it ----------

  'GET /api/menu': (req, res, url) => {
    const restaurantId = Number(url.searchParams.get('restaurantId'));
    if (!Number.isInteger(restaurantId) || !db.prepare('SELECT 1 FROM restaurants WHERE id = ?').get(restaurantId)) {
      return sendJson(res, 404, { error: 'Այդպիսի ռեստորան չկա' });
    }
    const items = db.prepare(`
      SELECT id, category, name, description, price, image_url AS imageUrl FROM menu_items WHERE restaurant_id = ? ORDER BY id
    `).all(restaurantId);
    sendJson(res, 200, { categories: MENU_CATEGORIES, items: items.map((i) => ({ ...i })) });
  },

  'POST /api/admin/menu': async (req, res) => {
    if (!requireAdmin(req, res, RESTAURANTS_ADMIN_ONLY)) return;
    const body = await readJson(req);
    const restaurantId = Number(body.restaurantId);
    if (!Number.isInteger(restaurantId) || !db.prepare('SELECT 1 FROM restaurants WHERE id = ?').get(restaurantId)) {
      return sendJson(res, 404, { error: 'Այդպիսի ռեստորան չկա' });
    }
    const item = readMenuItem(body, res);
    if (!item) return;

    const { lastInsertRowid } = db
      .prepare('INSERT INTO menu_items (restaurant_id, category, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)')
      .run(restaurantId, item.category, item.name, item.description, item.price, item.imageUrl);
    sendJson(res, 201, { item: { id: Number(lastInsertRowid), ...item } });
  },

  'POST /api/admin/menu/update': async (req, res) => {
    if (!requireAdmin(req, res, RESTAURANTS_ADMIN_ONLY)) return;
    const body = await readJson(req);
    const id = Number(body.id);
    if (!Number.isInteger(id) || !db.prepare('SELECT 1 FROM menu_items WHERE id = ?').get(id)) {
      return sendJson(res, 404, { error: 'Այդպիսի ուտեստ չկա' });
    }
    const item = readMenuItem(body, res);
    if (!item) return;

    db.prepare('UPDATE menu_items SET category = ?, name = ?, description = ?, price = ?, image_url = ? WHERE id = ?')
      .run(item.category, item.name, item.description, item.price, item.imageUrl, id);
    sendJson(res, 200, { item: { id, ...item } });
  },

  'POST /api/admin/menu/delete': async (req, res) => {
    if (!requireAdmin(req, res, RESTAURANTS_ADMIN_ONLY)) return;
    const id = Number((await readJson(req)).id);
    const { changes } = Number.isInteger(id) ? db.prepare('DELETE FROM menu_items WHERE id = ?').run(id) : { changes: 0 };
    if (!changes) return sendJson(res, 404, { error: 'Այդպիսի ուտեստ չկա' });
    sendJson(res, 200, { ok: true });
  },

  // Reads a restaurant's web page and returns its data for the admin's form (nothing is saved)
  'POST /api/admin/restaurants/import': async (req, res) => {
    if (!requireAdmin(req, res, RESTAURANTS_ADMIN_ONLY)) return;
    const link = asText((await readJson(req)).url);
    if (!/^https?:\/\/\S+$/i.test(link) || link.length > 2000) {
      return sendJson(res, 400, { error: 'Տեղադրեք ճիշտ հղում (https://…)' });
    }

    let page;
    try {
      page = await fetchPage(link);
    } catch (err) {
      const badUrl = err.message === 'bad-url' || err.code === 'ENOTFOUND' || err instanceof TypeError && /URL/i.test(err.message);
      return sendJson(res, 400, { error: badUrl ? 'Հղումը սխալ է' : 'Էջը բացել չհաջողվեց' });
    }

    const restaurant = restaurantFromPage(page.html, page.url);
    if (!restaurant.name && !restaurant.description) {
      return sendJson(res, 422, { error: 'Էջում ռեստորանի տվյալներ չգտնվեցին' });
    }
    sendJson(res, 200, { restaurant });
  },

  'POST /api/signup': async (req, res) => {
    const body = await readJson(req);
    const firstName = asText(body.firstName);
    const lastName = asText(body.lastName);
    const email = asText(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const errors = {};

    if (!firstName) errors.firstName = 'Գրեք ձեր անունը';
    if (!lastName) errors.lastName = 'Գրեք ձեր ազգանունը';
    if (!EMAIL_RE.test(email)) errors.email = 'Email-ը սխալ է գրված';
    if (password.length < 6) errors.password = 'Գաղտնաբառը պետք է լինի առնվազն 6 նիշ';
    if (Object.keys(errors).length) return sendJson(res, 400, { errors });

    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      return sendJson(res, 409, { errors: { email: 'Այս email-ով արդեն գրանցված օգտատեր կա' } });
    }

    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)')
      .run(firstName, lastName, email, hashPassword(password));

    sendJson(res, 201, { user: { firstName, lastName, email } }, { 'Set-Cookie': startSession(lastInsertRowid) });
  },

  'POST /api/login': async (req, res) => {
    const body = await readJson(req);
    const email = asText(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return sendJson(res, 401, { error: 'Email-ը կամ գաղտնաբառը սխալ է' });
    }

    sendJson(
      res, 200,
      { user: { firstName: user.first_name, lastName: user.last_name, email: user.email, role: user.role, isAdmin: user.role === 'admin' } },
      { 'Set-Cookie': startSession(user.id) }
    );
  },

  // Login form of the admin page: guests are refused and are NOT logged in
  'POST /api/admin/login': async (req, res) => {
    const body = await readJson(req);
    const email = asText(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return sendJson(res, 401, { error: 'Email-ը կամ գաղտնաբառը սխալ է' });
    }
    if (user.role !== 'admin') {
      return sendJson(res, 403, { error: 'Մուտքն արգելված է' });
    }

    sendJson(
      res, 200,
      { user: { firstName: user.first_name, lastName: user.last_name, email: user.email, role: user.role, isAdmin: true } },
      { 'Set-Cookie': startSession(user.id, ADMIN_COOKIE) }
    );
  },

  // Who is signed in on the admin page (independent of the main page's login)
  'GET /api/admin/me': (req, res) => {
    sendJson(res, 200, { user: getSessionUser(req, ADMIN_COOKIE) });
  },

  'POST /api/admin/logout': (req, res) => {
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': endSession(req, ADMIN_COOKIE) });
  },

  'POST /api/logout': (req, res) => {
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': endSession(req, USER_COOKIE) });
  },

  // A restaurant's tables with their availability for a given date and time
  'GET /api/tables': (req, res, url) => {
    const restaurantId = Number(url.searchParams.get('restaurantId'));
    const date = url.searchParams.get('date') || '';
    const time = url.searchParams.get('time') || '';
    if (!Number.isInteger(restaurantId) || !db.prepare('SELECT 1 FROM restaurants WHERE id = ?').get(restaurantId)) {
      return sendJson(res, 404, { error: 'Այդպիսի ռեստորան չկա' });
    }
    if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
      return sendJson(res, 400, { error: 'Նշեք ճիշտ օր և ժամ' });
    }

    const start = toMinutes(time);
    const tables = db.prepare('SELECT id, number, seats FROM tables WHERE restaurant_id = ? ORDER BY number').all(restaurantId);

    sendJson(res, 200, {
      duration: BOOKING_MINUTES,
      tables: tables.map((t) => ({ ...t, free: !isTableBusy(t.id, date, start, BOOKING_MINUTES) })),
    });
  },

  // The signed-in user's own reservations
  'GET /api/reservations': (req, res) => {
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Մուտք գործեք' });

    const reservations = db.prepare(`
      SELECT r.id, r.date, r.time, r.duration, r.guests, r.status, r.reject_reason AS rejectReason, t.number AS tableNumber,
        COALESCE(rest.name, '') AS restaurantName
      FROM reservations r
      JOIN tables t ON t.id = r.table_id
      LEFT JOIN restaurants rest ON rest.id = t.restaurant_id
      WHERE r.user_id = ? ORDER BY r.date, r.time
    `).all(user.id);

    // Bookings whose hour is over (the guests have been served) are no longer shown; they stay in the database
    const upcoming = reservations.filter((r) => !hasEnded(r));
    const orders = ordersFor(upcoming.map((r) => r.id));
    sendJson(res, 200, {
      reservations: upcoming.map((r) => ({
        ...r, order: orders[r.id] || [], payment: paymentView(paymentOf(r.id)),
        canCancel: r.status !== 'cancelled' && canStillCancel(r),
      })),
    });
  },

  // ---------- Admin: every guest's upcoming bookings, and confirming them ----------

  'GET /api/admin/reservations': (req, res) => {
    if (!requireAdmin(req, res)) return;

    const reservations = db.prepare(`
      SELECT r.id, r.date, r.time, r.duration, r.guests, r.status, r.reject_reason AS rejectReason, t.number AS tableNumber,
        COALESCE(rest.name, '') AS restaurantName, COALESCE(rest.city, '') AS restaurantCity,
        u.first_name || ' ' || u.last_name AS guestName, u.email AS guestEmail
      FROM reservations r
      JOIN tables t ON t.id = r.table_id
      JOIN users u ON u.id = r.user_id
      LEFT JOIN restaurants rest ON rest.id = t.restaurant_id
      ORDER BY r.date, r.time
    `).all();

    // Same rule as the guests' list: bookings whose hour is over are not shown
    const upcoming = reservations.filter((r) => !hasEnded(r));
    const orders = ordersFor(upcoming.map((r) => r.id));
    sendJson(res, 200, {
      reservations: upcoming.map((r) => ({ ...r, order: orders[r.id] || [], payment: paymentView(paymentOf(r.id)) })),
    });
  },

  // A restaurant's tables on a given date, each with its bookings that day.
  // Without a time the whole day is shown; with a time only the booking holding the table then.
  'GET /api/admin/tables': (req, res, url) => {
    if (!requireAdmin(req, res)) return;
    const restaurantId = Number(url.searchParams.get('restaurantId'));
    const date = url.searchParams.get('date') || '';
    const time = url.searchParams.get('time') || '';
    if (!Number.isInteger(restaurantId) || !db.prepare('SELECT 1 FROM restaurants WHERE id = ?').get(restaurantId)) {
      return sendJson(res, 404, { error: 'Այդպիսի ռեստորան չկա' });
    }
    if (!DATE_RE.test(date) || (time && !TIME_RE.test(time))) {
      return sendJson(res, 400, { error: 'Նշեք ճիշտ օր և ժամ' });
    }

    const tables = db.prepare('SELECT id, number, seats FROM tables WHERE restaurant_id = ? ORDER BY number').all(restaurantId);
    const bookingsOf = db.prepare(`
      SELECT r.time, r.duration, r.guests, r.status, u.first_name || ' ' || u.last_name AS guestName
      FROM reservations r JOIN users u ON u.id = r.user_id
      WHERE r.table_id = ? AND r.date = ? AND r.status != 'cancelled'
      ORDER BY r.time
    `);

    sendJson(res, 200, {
      tables: tables.map((t) => {
        let bookings = bookingsOf.all(t.id, date);
        if (time) {
          // Only the booking that overlaps the hour starting at the chosen time
          const start = toMinutes(time);
          bookings = bookings.filter((r) => {
            const otherStart = toMinutes(r.time);
            return start < otherStart + r.duration && otherStart < start + BOOKING_MINUTES;
          });
        }
        // Only confirmed bookings make the table busy; pending ones are still listed for the admin
        const free = !bookings.some((r) => r.status === 'confirmed');
        return { ...t, free, bookings: bookings.map((r) => ({ ...r })) };
      }),
    });
  },

  'POST /api/admin/reservations/confirm': async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = Number((await readJson(req)).id);
    const reservation = Number.isInteger(id) && db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);

    if (!reservation) return sendJson(res, 404, { error: 'Այդպիսի ամրագրում չկա' });
    if (reservation.status === 'cancelled') {
      return sendJson(res, 400, { error: 'Չեղարկված ամրագրումը հնարավոր չէ հաստատել' });
    }
    // A booking with a deposit can be confirmed only after the guest paid it
    const payment = paymentOf(id);
    if (payment && payment.status !== 'held') {
      return sendJson(res, 400, { error: 'Ամրագրումը դեռ վճարված չէ' });
    }
    // Another guest's booking for the same table and hour may already be confirmed
    if (isTableBusy(reservation.table_id, reservation.date, toMinutes(reservation.time), reservation.duration, id)) {
      return sendJson(res, 409, { error: 'Այս սեղանն այդ ժամին արդեն զբաղված է' });
    }

    db.prepare("UPDATE reservations SET status = 'confirmed' WHERE id = ?").run(id);
    // The deposit held on the card is charged only now
    if (payment) {
      db.prepare("UPDATE payments SET status = 'captured', captured_at = datetime('now') WHERE id = ?").run(payment.id);
      const info = bookingInfo(id);
      notify('user', info.userId, 'paymentCaptured', { ...info, amount: payment.amount });
    }
    sendJson(res, 200, { reservation: { id, status: 'confirmed' } });
  },

  // Reject a booking with a message the guest sees in "My bookings"
  'POST /api/admin/reservations/reject': async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const body = await readJson(req);
    const id = Number(body.id);
    const reason = asText(body.reason);
    const reservation = Number.isInteger(id) && db.prepare('SELECT status FROM reservations WHERE id = ?').get(id);

    if (!reservation) return sendJson(res, 404, { error: 'Այդպիսի ամրագրում չկա' });
    if (reservation.status === 'cancelled') {
      return sendJson(res, 400, { error: 'Ամրագրումն արդեն չեղարկված է' });
    }
    if (!reason) return sendJson(res, 400, { error: 'Գրեք մերժման պատճառը' });
    if (reason.length > REJECT_REASON_MAX) return sendJson(res, 400, { error: 'Տեքստը չափազանց երկար է' });

    db.prepare("UPDATE reservations SET status = 'cancelled', reject_reason = ?, rejected_at = datetime('now') WHERE id = ?").run(reason, id);
    const returned = returnDeposit(id);
    if (returned) {
      const info = bookingInfo(id);
      notify('user', info.userId, 'depositReturnedReject', { ...info, amount: returned });
    }
    sendJson(res, 200, { reservation: { id, status: 'cancelled', rejectReason: reason } });
  },

  // Cancel one of the signed-in user's own reservations
  'POST /api/reservations/cancel': async (req, res) => {
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Մուտք գործեք' });

    const body = await readJson(req);
    const id = Number(body.id);
    const reservation = Number.isInteger(id) &&
      db.prepare('SELECT * FROM reservations WHERE id = ? AND user_id = ?').get(id, user.id);

    if (!reservation) return sendJson(res, 404, { error: 'Այդպիսի ամրագրում չկա' });
    if (reservation.status === 'cancelled') {
      return sendJson(res, 400, { error: 'Ամրագրումն արդեն չեղարկված է' });
    }
    if (!canStillCancel(reservation)) {
      return sendJson(res, 400, { error: 'Ամրագրումը կարելի է չեղարկել առնվազն 1 ժամ առաջ' });
    }

    db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?").run(id);
    const returned = returnDeposit(id);
    notify('admin', null, 'guestCancelled', { ...bookingInfo(id), amount: returned });
    sendJson(res, 200, { reservation: { id, status: 'cancelled' }, returned });
  },

  'POST /api/reservations': async (req, res) => {
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Ամրագրելու համար մուտք գործեք' });

    const body = await readJson(req);
    const date = asText(body.date);
    const time = asText(body.time);
    const tableId = Number(body.tableId);
    const guests = Number(body.guests);

    if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
      return sendJson(res, 400, { error: 'Նշեք ճիշտ օր և ժամ' });
    }
    if (new Date(`${date}T${time}`) < new Date()) {
      return sendJson(res, 400, { error: 'Անցած ժամի համար ամրագրել հնարավոր չէ' });
    }
    if (toMinutes(time) + BOOKING_MINUTES > CLOSING_MINUTES) {
      return sendJson(res, 400, { error: 'Ամրագրումը պետք է ավարտվի մինչև 23:00' });
    }
    if (!Number.isInteger(guests) || guests < 1) {
      return sendJson(res, 400, { error: 'Նշեք հյուրերի քանակը' });
    }

    // The table must belong to a restaurant that still exists
    const table = Number.isInteger(tableId) && db.prepare(`
      SELECT t.*, rest.name AS restaurantName
      FROM tables t JOIN restaurants rest ON rest.id = t.restaurant_id
      WHERE t.id = ?
    `).get(tableId);
    if (!table) return sendJson(res, 400, { error: 'Այդպիսի սեղան չկա' });
    if (guests > table.seats) {
      return sendJson(res, 400, { error: `Այս սեղանին տեղավորվում է առավելագույնը ${table.seats} հոգի` });
    }

    // The table must be free for the whole hour, not just at the start time
    if (isTableBusy(table.id, date, toMinutes(time), BOOKING_MINUTES)) {
      return sendJson(res, 409, { error: 'Այս սեղանն այդ ժամին արդեն զբաղված է' });
    }

    // Dishes chosen from this restaurant's menu (optional)
    const { lines: order, error: orderError } = readOrder(body.order, table.restaurant_id);
    if (orderError) return sendJson(res, 400, { error: orderError });

    try {
      db.exec('BEGIN');
      const { lastInsertRowid } = db
        .prepare('INSERT INTO reservations (user_id, table_id, date, time, guests, duration) VALUES (?, ?, ?, ?, ?, ?)')
        .run(user.id, table.id, date, time, guests, BOOKING_MINUTES);
      const insertLine = db.prepare('INSERT INTO reservation_items (reservation_id, name, price, qty) VALUES (?, ?, ?, ?)');
      order.forEach((line) => insertLine.run(lastInsertRowid, line.name, line.price, line.qty));
      const { lastInsertRowid: paymentId } = db.prepare(`
        INSERT INTO payments (reservation_id, amount, expires_at) VALUES (?, ?, datetime('now', ?))
      `).run(lastInsertRowid, DEPOSIT_AMOUNT, `+${PAYMENT_MINUTES} minutes`);
      db.exec('COMMIT');
      sendJson(res, 201, {
        reservation: {
          id: Number(lastInsertRowid), date, time, duration: BOOKING_MINUTES, guests, status: 'pending',
          tableNumber: table.number, restaurantName: table.restaurantName, order,
        },
        payment: paymentView(db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId)),
      });
    } catch (err) {
      if (db.isTransaction) db.exec('ROLLBACK');
      if (/UNIQUE/.test(err.message)) {
        return sendJson(res, 409, { error: 'Այս սեղանն այդ ժամին արդեն զբաղված է' });
      }
      throw err;
    }
  },

  // ---------- Test payment page ----------

  // The deposit of one of the signed-in guest's bookings, for the payment page
  'GET /api/payment': (req, res, url) => {
    if (!isLocalRequest(req)) return sendJson(res, 403, { error: 'Թեստային վճարումը աշխատում է միայն localhost-ում' });
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Մուտք գործեք' });
    expireUnpaid();
    const id = Number(url.searchParams.get('id'));
    const payment = Number.isInteger(id) && db.prepare(`
      SELECT p.* FROM payments p JOIN reservations r ON r.id = p.reservation_id WHERE p.id = ? AND r.user_id = ?
    `).get(id, user.id);
    if (!payment) return sendJson(res, 404, { error: 'Այդպիսի վճարում չկա' });
    sendJson(res, 200, { payment: paymentView(payment), booking: bookingInfo(payment.reservation_id) });
  },

  // Pays the deposit with a card: the amount is held on the card until the admin confirms the booking
  'POST /api/payment/pay': async (req, res) => {
    if (!isLocalRequest(req)) return sendJson(res, 403, { error: 'Թեստային վճարումը աշխատում է միայն localhost-ում' });
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Մուտք գործեք' });
    expireUnpaid();

    const body = await readJson(req);
    const id = Number(body.id);
    const payment = Number.isInteger(id) && db.prepare(`
      SELECT p.* FROM payments p JOIN reservations r ON r.id = p.reservation_id WHERE p.id = ? AND r.user_id = ?
    `).get(id, user.id);
    if (!payment) return sendJson(res, 404, { error: 'Այդպիսի վճարում չկա' });
    if (payment.status === 'expired') return sendJson(res, 400, { error: 'Վճարման 15 րոպեն անցել է, ամրագրումը չեղարկվել է' });
    if (payment.status !== 'awaiting') return sendJson(res, 400, { error: 'Այս ամրագրումն արդեն վճարված է' });

    // Card checks: number (Luhn), expiry date in the future, 3–4 digit code, name
    const number = asText(body.number).replace(/[\s-]/g, '');
    const expiry = /^(\d{2})\s*\/\s*(\d{2})$/.exec(asText(body.expiry));
    const errors = {};
    if (!/^\d{12,19}$/.test(number) || !luhnValid(number)) errors.number = 'Քարտի համարը սխալ է';
    if (!expiry || Number(expiry[1]) < 1 || Number(expiry[1]) > 12 ||
        new Date(2000 + Number(expiry[2]), Number(expiry[1])) <= new Date()) errors.expiry = 'Ժամկետը սխալ է կամ անցել է';
    if (!/^\d{3,4}$/.test(asText(body.cvc))) errors.cvc = 'Գրեք քարտի 3 կամ 4 նիշանոց կոդը';
    if (!asText(body.name)) errors.name = 'Գրեք քարտատիրոջ անունը';
    if (Object.keys(errors).length) return sendJson(res, 400, { errors });
    if (number === DECLINED_TEST_CARD) return sendJson(res, 402, { error: 'Քարտը մերժվեց. փորձեք այլ քարտ' });

    db.prepare(`
      UPDATE payments SET status = 'held', card_brand = ?, card_last4 = ?, paid_at = datetime('now') WHERE id = ?
    `).run(cardBrand(number), number.slice(-4), payment.id);
    // Both sides are told: the admin (to confirm the booking) and the guest (the amount is held)
    const info = bookingInfo(payment.reservation_id);
    notify('admin', null, 'paymentHeld', { ...info, amount: payment.amount, card: cardBrand(number) });
    notify('user', info.userId, 'paymentHeldGuest', { ...info, amount: payment.amount, card: cardBrand(number), last4: number.slice(-4) });
    sendJson(res, 200, { payment: paymentView(db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id)) });
  },

  // ---------- Notifications ----------

  'GET /api/notifications': (req, res) => {
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Մուտք գործեք' });
    expireUnpaid();
    sendJson(res, 200, notificationsFor('user', user.id));
  },

  'POST /api/notifications/read': (req, res) => {
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Մուտք գործեք' });
    db.prepare("UPDATE notifications SET is_read = 1 WHERE audience = 'user' AND user_id = ?").run(user.id);
    sendJson(res, 200, { ok: true });
  },

  'GET /api/admin/notifications': (req, res) => {
    if (!requireAdmin(req, res)) return;
    expireUnpaid();
    sendJson(res, 200, notificationsFor('admin', null));
  },

  'POST /api/admin/notifications/read': (req, res) => {
    if (!requireAdmin(req, res)) return;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE audience = 'admin'").run();
    sendJson(res, 200, { ok: true });
  },
};

// The last 30 notifications and how many are unread
function notificationsFor(audience, userId) {
  // Older than 48 hours are removed first, so they never show even between the cleanups
  deleteOldNotifications();
  const rows = audience === 'admin'
    ? db.prepare("SELECT * FROM notifications WHERE audience = 'admin' ORDER BY id DESC LIMIT 30").all()
    : db.prepare("SELECT * FROM notifications WHERE audience = 'user' AND user_id = ? ORDER BY id DESC LIMIT 30").all(userId);
  return {
    unread: rows.filter((n) => !n.is_read).length,
    notifications: rows.map((n) => ({
      id: n.id, type: n.type, params: JSON.parse(n.params), read: Boolean(n.is_read), createdAt: isoTime(n.created_at),
    })),
  };
}

// ---------- Static files ----------

function serveStatic(res, urlPath) {
  const filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  const relative = path.relative(ROOT, filePath);
  const parts = relative.split(path.sep);

  // Block requests that escape the project folder, hidden files (.git) and the database folder
  if (relative.startsWith('..') || path.isAbsolute(relative) || parts.some((p) => p.startsWith('.')) || parts[0] === 'data') {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    // The browser checks for a newer file every time, so changes to the pages show up without Ctrl+F5
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith('/api/')) {
      const route = routes[`${req.method} ${url.pathname}`];
      if (!route) return sendJson(res, 404, { error: 'Not found' });
      return await route(req, res, url);
    }

    serveStatic(res, decodeURIComponent(url.pathname));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Սերվերի սխալ, փորձեք կրկին' });
  }
});

server.listen(PORT, () => {
  console.log(`TableBook running at http://localhost:${PORT}/`);
});
