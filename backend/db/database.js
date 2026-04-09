const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "linkedmail.db"));

// Enable WAL for better concurrent read performance
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    usage_count INTEGER NOT NULL DEFAULT 0,
    usage_reset_at TEXT NOT NULL DEFAULT (strftime('%Y-%m', 'now')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
