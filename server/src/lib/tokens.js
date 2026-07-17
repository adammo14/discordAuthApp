import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Generate a high-entropy opaque token (used as the raw session token handed to the client
// in an httpOnly cookie). 32 bytes = 256 bits of entropy.
export function generateToken(bytes = 32) {
	return crypto.randomBytes(bytes).toString('base64url');
}

// Hash a token for storage at rest. We never store the raw session token in the database, so a
// leaked DB dump cannot be used to impersonate users. Keyed with SESSION_SECRET (HMAC).
export function hashToken(token) {
	return crypto.createHmac('sha256', env.SESSION_SECRET).update(token).digest('hex');
}

// Constant-time comparison helper for any secret string comparisons.
export function safeEqual(a, b) {
	const bufA = Buffer.from(String(a));
	const bufB = Buffer.from(String(b));
	if (bufA.length !== bufB.length) return false;
	return crypto.timingSafeEqual(bufA, bufB);
}
