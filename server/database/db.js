const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Initializes and returns SQLite Database connection
 * @param {string} [customPath] - Optional custom path for DB (useful for tests or in-memory)
 * @returns {Database.Database}
 */
function initDb(customPath) {
    const dbPath = customPath || process.env.DATABASE_PATH || path.join(__dirname, 'friend_recommendation.db');
    const db = new Database(dbPath);

    // Enable foreign key support and WAL mode for high concurrency
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    // Run schema setup
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    // Normalize any legacy message timestamps without 'Z' to ISO UTC strings
    try {
        db.prepare("UPDATE messages SET created_at = replace(datetime(created_at), ' ', 'T') || '.000Z' WHERE created_at NOT LIKE '%Z%'").run();
    } catch (_) { }

    // Ensure interests column exists in users table for existing databases
    try {
        db.prepare("ALTER TABLE users ADD COLUMN interests TEXT DEFAULT ''").run();
    } catch (_) { }

    // Ensure is_active status column exists in users table
    try {
        db.prepare("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1").run();
    } catch (_) { }

    return db;
}

const db = initDb();

module.exports = db;
module.exports.initDb = initDb;
