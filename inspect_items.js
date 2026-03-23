const { db } = require('./db');
const rows = db.prepare('SELECT name FROM items').all();
console.log(rows.map(r => r.name));
