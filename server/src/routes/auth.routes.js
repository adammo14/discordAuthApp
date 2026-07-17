import { Router } from 'express';
import { env, isAdminDiscordId } from '../config/env.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { setSessionCookie, clearSessionCookie } from '../lib/cookies.js';
import { createAuthRequest, buildAuthorizeUrl, exchangeCode, fetchDiscordUser } from '../lib/oauth.js';
import { saveOAuthState, consumeOAuthState } from '../services/auth.service.js';
import { upsertUserOnLogin, getEffectivePermissions } from '../services/users.service.js';
import { createSession, deleteSession, SESSION_COOKIE } from '../services/sessions.service.js';

const router = Router();
router.use(authLimiter);

// Kick off the Discord OAuth2 flow (authorization code + PKCE + state).
router.get('/discord', (_req, res) => {
	const { state, codeVerifier, codeChallenge } = createAuthRequest();
	saveOAuthState({ state, codeVerifier });
	res.redirect(buildAuthorizeUrl({ state, codeChallenge }));
});

// OAuth2 callback: verify state, exchange the code, upsert the user, start a session.
router.get('/discord/callback', async (req, res) => {
	const { code, state, error } = req.query;
	const failRedirect = (reason) => res.redirect(`${env.CLIENT_URL}/auth/callback?error=${reason}`);

	try {
		if (error === 'access_denied') return failRedirect('cancelled');

		// State must be present and match a pending, unexpired, single-use entry (CSRF guard).
		const codeVerifier = typeof state === 'string' ? consumeOAuthState(state) : null;
		if (!code || !codeVerifier) return failRedirect('invalid_state');

		const tokenData = await exchangeCode({ code, codeVerifier });
		const profile = await fetchDiscordUser(tokenData.access_token);

		const isAdmin = isAdminDiscordId(profile.id);
		upsertUserOnLogin(profile, { isAdmin });

		// New session token on every login (rotation / anti-fixation).
		const { token, expiresAt } = createSession(profile.id);
		setSessionCookie(res, token, expiresAt);

		res.redirect(`${env.CLIENT_URL}/auth/callback`);
	} catch (err) {
		// Log details server-side; send the user to a generic error state.
		console.error('OAuth callback error:', err);
		return failRedirect('login_failed');
	}
});

// Current authenticated user + their effective permissions.
router.get('/me', (req, res) => {
	if (!req.user) return res.json({ user: null, isAdmin: false, permissions: [] });
	const u = req.user;
	res.json({
		user: {
			id: u.id,
			username: u.username,
			globalName: u.global_name,
			avatar: u.avatar,
			email: u.email,
			isDemo: Boolean(u.is_demo),
		},
		isAdmin: Boolean(u.is_admin),
		permissions: getEffectivePermissions(u),
	});
});

// Logout: destroy the session server-side and clear the cookie.
router.post('/logout', requireAuth, (req, res) => {
	deleteSession(req.cookies?.[SESSION_COOKIE]);
	clearSessionCookie(res);
	res.json({ ok: true });
});

export default router;
