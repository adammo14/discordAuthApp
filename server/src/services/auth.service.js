import { db } from '../db/index.js';

const STATE_TTL_MS = 10 * 60 * 1000; // OAuth round-trip must complete within 10 minutes.

// Persist a pending OAuth state + PKCE verifier before redirecting to Discord.
export function saveOAuthState({ state, codeVerifier }) {
	const now = Date.now();
	db.prepare(
		'INSERT INTO oauth_states (state, code_verifier, created_at, expires_at) VALUES (?, ?, ?, ?)',
	).run(state, codeVerifier, now, now + STATE_TTL_MS);
}

// Look up and immediately delete a state (single-use). Returns the code verifier, or null if the
// state is unknown/expired — either of which must abort the login as a CSRF signal.
export const consumeOAuthState = db.transaction((state) => {
	const row = db.prepare('SELECT * FROM oauth_states WHERE state = ?').get(state);
	if (row) db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
	if (!row || row.expires_at <= Date.now()) return null;
	return row.code_verifier;
});
