// Creates the first staff account, named "Super Admin": npm run seed
// Gives Super Admin a new password (if the old one is lost): npm run seed -- --reset
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const EMAIL = 'admin@tablebook.local';
const DB_FILE = path.join(__dirname, '..', 'data', 'tablebook.db');

// The server creates and updates the database, so it must have run at least once
if (!fs.existsSync(DB_FILE)) {
  console.log('No database yet. Start the server once (npm start), then run npm run seed.');
  process.exit(1);
}

const db = new DatabaseSync(DB_FILE);
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('role')) {
  console.log('The database is not updated yet. Restart the server (npm start), then run npm run seed.');
  process.exit(1);
}

// Same password hashing as in server.js, so the server can check this password at login
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// A random 16-character password; only its hash is stored
const password = crypto.randomBytes(12).toString('base64url');
const reset = process.argv.includes('--reset');

// Running the seeder again must not create a second account
const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(EMAIL);
if (existing) {
  if (existing.role !== 'admin') {
    console.log(`${EMAIL} is already used by a guest account. Nothing was changed.`);
    process.exit(1);
  }
  if (!reset) {
    console.log(`Super Admin (${EMAIL}) already exists. Nothing was changed.`);
    console.log('Lost the password? Run: npm run seed -- --reset');
    process.exit(0);
  }

  // New password; the old one stops working and open logins are closed
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), existing.id);
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(existing.id);
  console.log('Super Admin password reset.');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${password}`);
  console.log('Save this password now: it is shown only once and cannot be recovered.');
  process.exit(0);
}

db.prepare(`
  INSERT INTO users (first_name, last_name, email, password_hash, role, is_admin)
  VALUES ('Super', 'Admin', ?, ?, 'admin', 1)
`).run(EMAIL, hashPassword(password));

console.log('Super Admin created.');
console.log(`  Email:    ${EMAIL}`);
console.log(`  Password: ${password}`);
console.log('Save this password now: it is shown only once and cannot be recovered.');
