const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

function resolveDbPath() {
  const explicitPath = String(process.env.DB_PATH || '').trim();
  if (explicitPath) return path.resolve(explicitPath);

  const railwayMount = String(process.env.RAILWAY_VOLUME_MOUNT_PATH || '').trim();
  if (railwayMount) return path.join(railwayMount, 'app.db');

  return path.join(__dirname, 'app.db');
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

// Schema
const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'Oyuncu',
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 100.0,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    base_price REAL NOT NULL,
    weight REAL NOT NULL,
    payout_percent REAL NOT NULL,
    rarity TEXT NOT NULL DEFAULT 'common'
  );`,
  `CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    creator TEXT NOT NULL DEFAULT 'system',
    price REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS case_items (
    case_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY(case_id, item_id),
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(item_id) REFERENCES items(id)
  );`,
  `CREATE TABLE IF NOT EXISTS case_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    case_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    payout REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(item_id) REFERENCES items(id)
  );`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );`
];

for (const sql of migrations) {
  db.prepare(sql).run();
}

// Migration for legacy DB: add is_admin if missing
const userColumns = db.prepare("PRAGMA table_info('users')").all();
if (!userColumns.some(c => c.name === 'name')) {
  db.prepare("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT 'Oyuncu'").run();
}
if (!userColumns.some(c => c.name === 'is_admin')) {
  db.prepare('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0').run();
}
db.prepare(`
  UPDATE users
  SET name = trim(substr(email, 1, CASE
    WHEN instr(email, '@') > 0 THEN instr(email, '@') - 1
    ELSE length(email)
  END))
  WHERE name IS NULL OR trim(name) = '' OR name = 'Oyuncu'
`).run();

// Migration for items: add rarity if missing
const itemColumns = db.prepare("PRAGMA table_info('items')").all();
if (!itemColumns.some(c => c.name === 'rarity')) {
  db.prepare('ALTER TABLE items ADD COLUMN rarity TEXT NOT NULL DEFAULT \'common\'').run();
}

// Demo data
const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
if (itemCount === 0) {
  // Create demo items
  db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run('Bronze Sword', 5, 70, 80, 'common');
  db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run('Silver Shield', 10, 50, 90, 'rare');
  db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run('Gold Armor', 20, 30, 100, 'epic');
  db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run('Diamond Ring', 50, 10, 120, 'legendary');
  db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run('Legendary Sword', 100, 5, 150, 'mythic');
  
  // New fair case items
  db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run('Wooden Box', 10, 25, 100, 'common');
  db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run('Metal Chest', 20, 25, 100, 'rare');
  db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run('Golden Vault', 30, 25, 100, 'epic');
  db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run('Diamond Treasure', 40, 25, 100, 'legendary');

  // First community item
  db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run('Doge Portresi', 0, 12, 60, 'rare');
}

const dogeRow = db.prepare('SELECT id FROM items WHERE name = ?').get('Doge Portresi');
if (!dogeRow) {
  db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run('Doge Portresi', 0, 12, 60, 'rare');
}

const ensureItemExists = (name, basePrice, weight, payoutPercent, rarity = 'common') => {
  const existing = db.prepare('SELECT id FROM items WHERE name = ?').get(name);
  if (!existing) {
    db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run(
      name,
      basePrice,
      weight,
      payoutPercent,
      rarity
    );
    return;
  }

  db.prepare('UPDATE items SET base_price = ?, weight = ?, payout_percent = ?, rarity = ? WHERE name = ?').run(
    basePrice,
    weight,
    payoutPercent,
    rarity,
    name
  );
};

ensureItemExists('Vozol 6k', 75, 1, 100, 'rare');
ensureItemExists('Vozol 1k', 50, 1, 100, 'rare');
ensureItemExists('Vozol 10k', 100, 1, 100, 'rare');
ensureItemExists('Vozol 15k', 150, 1, 100, 'rare');
ensureItemExists('Vozol 25k', 1300, 1, 100, 'legendary');
ensureItemExists('Vozol 50k', 1500, 1, 100, 'legendary');
ensureItemExists('Stitch', 4000, 1, 100, 'legendary');
ensureItemExists('Kitty', 5000, 1, 100, 'mythic');
ensureItemExists('Draculara', 10000, 1, 100, 'mythic');

const caseCount = db.prepare('SELECT COUNT(*) as count FROM cases').get().count;
if (caseCount === 0) {
  // Create demo case
  const caseId = db.prepare('INSERT INTO cases(name, price, creator) VALUES(?, ?, ?)').run('Starter Case', 5, 'system').lastInsertRowid;
  db.prepare('INSERT OR REPLACE INTO case_items(case_id, item_id, quantity) VALUES(?, ?, ?)').run(caseId, 1, 70); // Bronze Sword x70
  db.prepare('INSERT OR REPLACE INTO case_items(case_id, item_id, quantity) VALUES(?, ?, ?)').run(caseId, 2, 50); // Silver Shield x50
  db.prepare('INSERT OR REPLACE INTO case_items(case_id, item_id, quantity) VALUES(?, ?, ?)').run(caseId, 3, 30); // Gold Armor x30
  db.prepare('INSERT OR REPLACE INTO case_items(case_id, item_id, quantity) VALUES(?, ?, ?)').run(caseId, 4, 10); // Diamond Ring x10
  db.prepare('INSERT OR REPLACE INTO case_items(case_id, item_id, quantity) VALUES(?, ?, ?)').run(caseId, 5, 5);  // Legendary Sword x5
  
  // New fair case - 4 items, each 25% chance
  const fairCaseId = db.prepare('INSERT INTO cases(name, price, creator) VALUES(?, ?, ?)').run('Fair Case', 25, 'system').lastInsertRowid; // Expected value = 25
  db.prepare('INSERT OR REPLACE INTO case_items(case_id, item_id, quantity) VALUES(?, ?, ?)').run(fairCaseId, 6, 25); // Wooden Box x25 (10$)
  db.prepare('INSERT OR REPLACE INTO case_items(case_id, item_id, quantity) VALUES(?, ?, ?)').run(fairCaseId, 7, 25); // Metal Chest x25 (20$)
  db.prepare('INSERT OR REPLACE INTO case_items(case_id, item_id, quantity) VALUES(?, ?, ?)').run(fairCaseId, 8, 25); // Golden Vault x25 (30$)
  db.prepare('INSERT OR REPLACE INTO case_items(case_id, item_id, quantity) VALUES(?, ?, ?)').run(fairCaseId, 9, 25); // Diamond Treasure x25 (40$)
}

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  // Create demo user
  db.prepare('INSERT INTO users(name, email, password, balance, is_admin) VALUES(?, ?, ?, ?, ?)').run('test', 'test@test.com', '3596ceda0ad2d821d3d2cb0a52063c8b:c25c5d4e7ce947e22d1a1eb49d1b6831347540c351818ac24e5e07beb20241da', 1000.0, 1); // password: 'test'
}

module.exports = {
  db,
  findUserByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email),
  getUserById: (id) => db.prepare('SELECT id, name, email, balance, is_admin, created_at FROM users WHERE id = ?').get(id),
  getUserPublicByEmail: (email) => db.prepare('SELECT id, name, email, balance, is_admin, created_at FROM users WHERE email = ?').get(email),
  getAllUsers: () => db.prepare('SELECT id, name, email, password, balance, is_admin, created_at FROM users ORDER BY created_at DESC, id DESC').all(),
  createUser: (name, email, password, isAdmin = 0) => db.prepare('INSERT INTO users(name, email, password, is_admin) VALUES(?, ?, ?, ?)').run(name, email, password, isAdmin),
  updateBalance: (id, amount) => db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(amount, id),
  setUserAdminByEmail: (email, isAdmin = 1) => db.prepare('UPDATE users SET is_admin = ? WHERE email = ?').run(isAdmin, email),

  createItem: (name, base_price, weight, payout_percent, rarity = 'common') => db.prepare('INSERT INTO items(name, base_price, weight, payout_percent, rarity) VALUES(?, ?, ?, ?, ?)').run(name, base_price, weight, payout_percent, rarity),
  updateItem: (id, name, base_price, weight, payout_percent, rarity = 'common') => db.prepare('UPDATE items SET name = ?, base_price = ?, weight = ?, payout_percent = ?, rarity = ? WHERE id = ?').run(name, base_price, weight, payout_percent, rarity, id),
  deleteItem: (id) => db.prepare('DELETE FROM items WHERE id = ?').run(id),
  getItem: (id) => db.prepare('SELECT * FROM items WHERE id = ?').get(id),
  getAllItems: () => db.prepare('SELECT * FROM items').all(),

  createCase: (name, price, creator = 'system') => db.prepare('INSERT INTO cases(name, price, creator) VALUES(?, ?, ?)').run(name, price, creator),
  getCase: (id) => db.prepare('SELECT * FROM cases WHERE id = ? AND active = 1').get(id),
  getCaseById: (id) => db.prepare('SELECT * FROM cases WHERE id = ?').get(id),
  getAllCases: () => db.prepare('SELECT * FROM cases WHERE active = 1').all(),
  updateCase: (id, name, price, active) => db.prepare('UPDATE cases SET name = ?, price = ?, active = ? WHERE id = ?').run(name, price, active, id),
  deactivateCase: (id) => db.prepare('UPDATE cases SET active = 0 WHERE id = ?').run(id),
  addCaseItem: (case_id, item_id, quantity=1) => db.prepare('INSERT OR REPLACE INTO case_items(case_id, item_id, quantity) VALUES(?, ?, ?)').run(case_id, item_id, quantity),
  getCaseItems: (case_id) => db.prepare('SELECT i.*, ci.quantity FROM case_items ci JOIN items i on ci.item_id = i.id WHERE ci.case_id = ?').all(case_id),

  addCaseHistory: (user_id, case_id, item_id, payout) => db.prepare('INSERT INTO case_history(user_id, case_id, item_id, payout) VALUES(?, ?, ?, ?)').run(user_id, case_id, item_id, payout),
  getCaseHistoryByUser: (user_id) => db.prepare('SELECT ch.*, c.name as case_name, i.name as item_name FROM case_history ch JOIN cases c ON ch.case_id = c.id JOIN items i ON ch.item_id = i.id WHERE ch.user_id = ? ORDER BY ch.created_at DESC LIMIT 50').all(user_id),
};
