import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { env } from '../config/env.js';

// Resolve DB path (relative to project cwd) and ensure the directory exists.
const dbPath = path.resolve(process.cwd(), env.DB_PATH);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

// Pragmas for durability + integrity: WAL for concurrent reads, foreign keys enforced.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
