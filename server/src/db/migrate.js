import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Apply the schema (all statements are idempotent CREATE ... IF NOT EXISTS).
export function migrate() {
	const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
	db.exec(schema);
	addMissingColumns();
}

// Add columns introduced after a table was first created. CREATE TABLE IF NOT EXISTS won't alter
// an existing table, so we reconcile new nullable columns here. Idempotent.
function addMissingColumns() {
	const additions = {
		events: [
			{ name: 'sim', ddl: 'TEXT' },
			{ name: 'car_class', ddl: 'TEXT' },
			{ name: 'track', ddl: 'TEXT' },
		],
	};
	for (const [table, cols] of Object.entries(additions)) {
		const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
		for (const col of cols) {
			if (!existing.has(col.name)) {
				db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.ddl}`);
			}
		}
	}
}
