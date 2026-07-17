import { env } from '../config/env.js';
import { SESSION_COOKIE } from '../services/sessions.service.js';

// Shared attributes for the session cookie.
// - httpOnly: never readable by JavaScript → immune to XSS token theft.
// - secure: sent only over HTTPS in production.
// - sameSite 'lax': fine here because the client and API share a registrable domain
//   (e.g. localhost, or app/api on the same domain). If you deploy the API on a truly
//   cross-site domain, switch to sameSite:'none' (which requires secure:true / HTTPS).
function baseCookieOptions() {
	return {
		httpOnly: true,
		secure: env.isProd,
		sameSite: 'lax',
		path: '/',
	};
}

export function setSessionCookie(res, token, expiresAt) {
	res.cookie(SESSION_COOKIE, token, {
		...baseCookieOptions(),
		expires: new Date(expiresAt),
	});
}

export function clearSessionCookie(res) {
	res.clearCookie(SESSION_COOKIE, baseCookieOptions());
}
