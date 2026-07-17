import { db } from '../db/index.js';

// Record an admin mutation. `detail` is any JSON-serializable object (e.g. before/after state).
export function recordAudit({ actorId, action, targetId = null, detail = null }) {
	db.prepare(
		'INSERT INTO audit_log (actor_id, action, target_id, detail, ts) VALUES (?, ?, ?, ?, ?)',
	).run(actorId, action, targetId, detail == null ? null : JSON.stringify(detail), Date.now());
}

export function listAudit(limit = 100) {
	return db
		.prepare('SELECT * FROM audit_log ORDER BY ts DESC LIMIT ?')
		.all(limit)
		.map((r) => ({ ...r, detail: r.detail ? JSON.parse(r.detail) : null }));
}
