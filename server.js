const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

  CREATE TABLE IF NOT EXISTS tables (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    number INTEGER NOT NULL UNIQUE,
    seats  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    table_id   INTEGER NOT NULL REFERENCES tables(id),
    date       TEXT NOT NULL,
    time       TEXT NOT NULL,
    guests     INTEGER NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- A table can have only one active reservation per time slot
  CREATE UNIQUE INDEX IF NOT EXISTS reservations_slot
    ON reservations (table_id, date, time) WHERE status != 'cancelled';
`);

// Add the cafe's tables on first run
if (db.prepare('SELECT COUNT(*) AS n FROM tables').get().n === 0) {
  const insertTable = db.prepare('INSERT INTO tables (number, seats) VALUES (?, ?)');
  [2, 2, 2, 4, 4, 4, 6, 8].forEach((seats, i) => insertTable.run(i + 1, seats));
}

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
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
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

function startSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`;
}

function getSessionToken(req) {
  const match = /(?:^|;\s*)session=([a-f0-9]+)/.exec(req.headers.cookie || '');
  return match ? match[1] : null;
}

function getSessionUser(req) {
  const token = getSessionToken(req);
  if (!token) return null;
  const user = db.prepare(`
    SELECT u.id, u.first_name AS firstName, u.last_name AS lastName, u.email
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.created_at > datetime('now', ?)
  `).get(token, `-${SESSION_DAYS} days`);
  return user ? { ...user } : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const asText = (value) => (typeof value === 'string' ? value.trim() : '');

// ---------- API ----------

const routes = {
  'GET /api/me': (req, res) => {
    sendJson(res, 200, { user: getSessionUser(req) });
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
      { user: { firstName: user.first_name, lastName: user.last_name, email: user.email } },
      { 'Set-Cookie': startSession(user.id) }
    );
  },

  'POST /api/logout': (req, res) => {
    const token = getSessionToken(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  },

  // Tables with their availability for a given date and time
  'GET /api/tables': (req, res, url) => {
    const date = url.searchParams.get('date') || '';
    const time = url.searchParams.get('time') || '';
    if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
      return sendJson(res, 400, { error: 'Նշեք ճիշտ օր և ժամ' });
    }

    const tables = db.prepare(`
      SELECT t.id, t.number, t.seats,
        NOT EXISTS (
          SELECT 1 FROM reservations r
          WHERE r.table_id = t.id AND r.date = ? AND r.time = ? AND r.status != 'cancelled'
        ) AS free
      FROM tables t ORDER BY t.number
    `).all(date, time);

    sendJson(res, 200, { tables: tables.map((t) => ({ ...t, free: t.free === 1 })) });
  },

  // The signed-in user's own reservations
  'GET /api/reservations': (req, res) => {
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Մուտք գործեք' });

    const reservations = db.prepare(`
      SELECT r.id, r.date, r.time, r.guests, r.status, t.number AS tableNumber
      FROM reservations r JOIN tables t ON t.id = r.table_id
      WHERE r.user_id = ? ORDER BY r.date, r.time
    `).all(user.id);

    sendJson(res, 200, { reservations: reservations.map((r) => ({ ...r })) });
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
    if (!Number.isInteger(guests) || guests < 1) {
      return sendJson(res, 400, { error: 'Նշեք հյուրերի քանակը' });
    }

    const table = Number.isInteger(tableId) && db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId);
    if (!table) return sendJson(res, 400, { error: 'Այդպիսի սեղան չկա' });
    if (guests > table.seats) {
      return sendJson(res, 400, { error: `Այս սեղանին տեղավորվում է առավելագույնը ${table.seats} հոգի` });
    }

    try {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO reservations (user_id, table_id, date, time, guests) VALUES (?, ?, ?, ?, ?)')
        .run(user.id, table.id, date, time, guests);
      sendJson(res, 201, {
        reservation: { id: Number(lastInsertRowid), date, time, guests, status: 'pending', tableNumber: table.number },
      });
    } catch (err) {
      if (/UNIQUE/.test(err.message)) {
        return sendJson(res, 409, { error: 'Այս սեղանն այդ ժամին արդեն զբաղված է' });
      }
      throw err;
    }
  },
};

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
    res.writeHead(200, { 'Content-Type': type });
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
