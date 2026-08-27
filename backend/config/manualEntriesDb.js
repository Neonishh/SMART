import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/*
=========================================================
MANUAL ENTRIES DB
=========================================================
Local SQLite file, completely separate from the Neo4j
knowledge graph and the NLP pipeline. This is intentional:
manual contributions are captured here first and are NOT
part of the live dashboard data until someone deliberately
runs them through the NLP/KG pipeline later.

Using SQLite (not a JSON file) so concurrent submissions
can't corrupt each other — each write is a real transaction
on disk, not a read-modify-write over a single file.
=========================================================
*/

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "manual_entries.db");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS manual_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        submitted_by TEXT,
        submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
`);

export default db;
