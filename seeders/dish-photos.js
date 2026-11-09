// Gives dishes without a photo a matching food photo from Unsplash, chosen by the dish name and section:
// npm run seed:dish-photos
// Dishes that already have a photo (for example one the admin added) are left as they are.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_FILE = path.join(__dirname, '..', 'data', 'tablebook.db');

// The server creates and updates the database, so it must have run at least once
if (!fs.existsSync(DB_FILE)) {
  console.log('No database yet. Start the server once (npm start), then run npm run seed:dish-photos.');
  process.exit(1);
}

const db = new DatabaseSync(DB_FILE);
const menuColumns = db.prepare('PRAGMA table_info(menu_items)').all().map((c) => c.name);
if (!menuColumns.includes('image_url')) {
  console.log('The database is not updated yet. Restart the server (npm start), then run npm run seed:dish-photos.');
  process.exit(1);
}

const photo = (id) => `https://images.unsplash.com/photo-${id}?w=300&q=70&auto=format&fit=crop`;

// The first rule whose words appear in the dish name wins
const BY_NAME = [
  [/pizza/i, '1565299624946-b28f40a0ae38'],
  [/spaghetti|pasta|lasagna|carbonara/i, '1563379926898-05f4575a45d8'],
  [/roll|nigiri|sushi/i, '1579584425555-c3ce17fd4351'],
  [/burger/i, '1568901346375-23c9450c58cd'],
  [/steak|ribeye|tenderloin|tartare|beef/i, '1600891964092-4316c288032e'],
  [/rib|lamb|pork|mtsvadi/i, '1544025162-d76694265947'],
  [/curry|butter chicken|paneer|dal|tandoor/i, '1565557623262-b51c2513a641'],
  [/khorovats|kebab|lula|shawarma|tikka|skewer|chicken/i, '1555939594-58d7cb561ad1'],
  [/trout|fish|ishkhan|salmon|crayfish|shrimp|seafood|lobster/i, '1519708227418-c8fd9a32b7a2'],
  [/croissant|gata|bread|lavash|naan|khachapuri|pakhlava|baklava/i, '1555507036-ab1f4038808a'],
  [/sandwich|club/i, '1528735602780-2552fd46c7af'],
  [/breakfast|egg/i, '1484723091739-30a097e8f929'],
  [/tiramisu/i, '1571877227200-a0d98ea607e9'],
  [/cake|fondant|brownie|cheesecake|chocolate/i, '1578985545062-69928b1d9587'],
  [/coffee|espresso|cappuccino/i, '1509042239860-f550ce710b93'],
  [/wine|saperavi|bordeaux|areni/i, '1510812431401-41d2bd2722f3'],
];

// Otherwise a photo that fits the menu section
const BY_CATEGORY = {
  starters: '1512621776951-a57141f2eefd',
  salads: '1540189549336-e6e99c3679fe',
  soups: '1476718406336-bb5a9690ee2a',
  mains: '1504674900247-0877df9cc836',
  grill: '1555939594-58d7cb561ad1',
  desserts: '1551024601-bec78aea704b',
  drinks: '1544145945-f90425340c7e',
};

function photoFor(dish) {
  const rule = BY_NAME.find(([words]) => words.test(dish.name));
  const id = rule ? rule[1] : BY_CATEGORY[dish.category];
  return id ? photo(id) : '';
}

const dishes = db.prepare("SELECT id, name, category FROM menu_items WHERE image_url = ''").all();
const update = db.prepare('UPDATE menu_items SET image_url = ? WHERE id = ?');

let filled = 0;
db.exec('BEGIN');
for (const dish of dishes) {
  const url = photoFor(dish);
  if (!url) continue;
  update.run(url, dish.id);
  filled++;
}
db.exec('COMMIT');

console.log(filled ? `Added photos to ${filled} dishes.` : 'Every dish already has a photo. Nothing was changed.');
