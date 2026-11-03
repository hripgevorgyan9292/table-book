// Makes a registered user an admin: npm run make-admin -- someone@mail.com
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.log('Usage: npm run make-admin -- someone@mail.com');
  process.exit(1);
}

const db = new DatabaseSync(path.join(__dirname, 'data', 'tablebook.db'));

// The server adds the role column on start, so it must have run since the update
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('role')) {
  console.log('The database is not updated yet. Restart the server (npm start), then run this again.');
  process.exit(1);
}

const { changes } = db.prepare("UPDATE users SET role = 'admin', is_admin = 1 WHERE email = ?").run(email);
if (changes === 0) {
  console.log(`No user with email ${email}. Sign up on the site first.`);
  process.exit(1);
}
console.log(`${email} is now an admin. Refresh the site page.`);
