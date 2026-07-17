import crypto from 'node:crypto';
import { env } from '../config/env.js';

const DISCORD_AUTHORIZE_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';
const SCOPE = 'identify email';

// Build the values needed to start an OAuth2 authorization-code + PKCE flow.
// - `state` guards against login-CSRF (verified on callback, single-use).
// - `codeVerifier`/`codeChallenge` are the PKCE pair; the verifier is kept server-side and only
//   sent during the token exchange, so an intercepted code alone is useless.
export function createAuthRequest() {
	const state = crypto.randomBytes(32).toString('base64url');
	const codeVerifier = crypto.randomBytes(32).toString('base64url');
	const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
	return { state, codeVerifier, codeChallenge };
}

export function buildAuthorizeUrl({ state, codeChallenge }) {
	const params = new URLSearchParams({
		client_id: env.DISCORD_CLIENT_ID,
		redirect_uri: env.DISCORD_REDIRECT_URI,
		response_type: 'code',
		scope: SCOPE,
		state,
		code_challenge: codeChallenge,
		code_challenge_method: 'S256',
		prompt: 'consent',
	});
	return `${DISCORD_AUTHORIZE_URL}?${params}`;
}

// Exchange an authorization code (+ PKCE verifier) for a Discord access token.
export async function exchangeCode({ code, codeVerifier }) {
	const res = await fetch(DISCORD_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: env.DISCORD_CLIENT_ID,
			client_secret: env.DISCORD_CLIENT_SECRET,
			grant_type: 'authorization_code',
			code,
			redirect_uri: env.DISCORD_REDIRECT_URI,
			code_verifier: codeVerifier,
		}),
	});
	if (!res.ok) {
		throw new Error(`Discord token exchange failed: ${res.status}`);
	}
	return res.json();
}

// Fetch the authenticated Discord user's profile. We use the access token exactly once here and
// never persist it — only the resulting profile fields we care about are stored.
export async function fetchDiscordUser(accessToken) {
	const res = await fetch(DISCORD_USER_URL, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) {
		throw new Error(`Discord user fetch failed: ${res.status}`);
	}
	const u = await res.json();
	return {
		id: u.id,
		username: u.username,
		globalName: u.global_name ?? null,
		avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null,
		email: u.email ?? null,
	};
}
