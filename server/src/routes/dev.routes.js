import { Router } from 'express';
import { z } from 'zod';
import { authLimiter } from '../middleware/rateLimit.js';
import { validateParams } from '../middleware/validate.js';
import { setSessionCookie } from '../lib/cookies.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getUserById } from '../services/users.service.js';
import { createSession } from '../services/sessions.service.js';
import { DEMO_USERS } from '../db/seed.js';

// These routes are only mounted when env.devLoginEnabled is true (development + explicit flag).
// They mint a real session for a *seeded demo user* so every permission path can be tested
// without additional Discord accounts. They are never available in production.
const router = Router();
router.use(authLimiter);

const demoIds = new Set(DEMO_USERS.map((u) => u.id));
const paramSchema = z.object({ id: z.string().min(1).max(64) });

// List the demo users available to log in as (for the dev login panel).
router.get('/demo-users', (_req, res) => {
	res.json({
		users: DEMO_USERS.map((u) => ({ id: u.id, username: u.username, globalName: u.globalName })),
	});
});

router.post('/login/:id', validateParams(paramSchema), (req, res) => {
	// Only seeded demo users are ever a valid target — real accounts cannot be impersonated.
	if (!demoIds.has(req.params.id)) throw new HttpError(404, 'Unknown demo user');
	const user = getUserById(req.params.id);
	if (!user || !user.is_demo) throw new HttpError(404, 'Unknown demo user');

	const { token, expiresAt } = createSession(user.id);
	setSessionCookie(res, token, expiresAt);
	res.json({ ok: true });
});

export default router;
