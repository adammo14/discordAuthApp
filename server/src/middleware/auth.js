import { SESSION_COOKIE, getSessionUser } from '../services/sessions.service.js';
import { getEffectivePermissions } from '../services/users.service.js';
import { HttpError } from './errorHandler.js';

// Resolve the current user from the session cookie and attach { user, permissions } to req.
// Does not itself reject unauthenticated requests — that's requireAuth's job.
export function attachUser(req, _res, next) {
	const token = req.cookies?.[SESSION_COOKIE];
	const user = getSessionUser(token);
	req.user = user ?? null;
	req.permissions = user ? getEffectivePermissions(user) : [];
	next();
}

export function requireAuth(req, _res, next) {
	if (!req.user) throw new HttpError(401, 'Authentication required');
	next();
}

export function requireAdmin(req, _res, next) {
	if (!req.user) throw new HttpError(401, 'Authentication required');
	if (!req.user.is_admin) throw new HttpError(403, 'Admin access required');
	next();
}

// Gate a route behind a specific canonical permission (admins always pass).
export function requirePermission(permission) {
	return (req, _res, next) => {
		if (!req.user) throw new HttpError(401, 'Authentication required');
		if (!req.permissions.includes(permission)) throw new HttpError(403, 'Insufficient permissions');
		next();
	};
}
