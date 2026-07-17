import { db } from '../db/index.js';
import { env } from '../config/env.js';
import { generateToken, hashToken } from '../lib/tokens.js';
import { getUserById } from './users.service.js';

export const SESSION_COOKIE = 'sid';

// Create a fresh session for a user. Returns the raw token (only ever sent to the client in an
// httpOnly cookie) and its expiry. Called on every successful login, so a login always rotates
// to a brand-new token (prevents session fixation).
export function createSession(userId) {
	const token = generateToken();
	const now = Date.now();
	const expiresAt = now + env.sessionTtlMs;
	db.prepare(
		'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
	).run(hashToken(token), userId, now, expiresAt);
	return { token, expiresAt };
}

// Resolve a raw token to its user, enforcing expiry. Uses a sliding window: a still-valid
// session has its expiry pushed forward on use, so active users stay logged in.
export function getSessionUser(rawToken) {
	if (!rawToken) return null;
	const row = db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(hashToken(rawToken));
	if (!row) return null;

	const now = Date.now();
	if (row.expires_at <= now) {
		db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(row.token_hash);
		return null;
	}

	// Sliding renewal (throttled to avoid a write on every single request).
	const newExpiry = now + env.sessionTtlMs;
	if (newExpiry - row.expires_at > 60_000) {
		db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(newExpiry, row.token_hash);
	}

	return getUserById(row.user_id) ?? null;
}

export function deleteSession(rawToken) {
	if (!rawToken) return;
	db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(rawToken));
}

// Housekeeping: drop expired sessions and stale oauth states.
export function purgeExpired() {
	const now = Date.now();
	db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
	db.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').run(now);
}
