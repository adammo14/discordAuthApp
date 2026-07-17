import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { securityHeaders, corsMiddleware } from './middleware/security.js';
import { attachUser } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import raceRoutes from './routes/race.routes.js';
import devRoutes from './routes/dev.routes.js';

export function createApp() {
	const app = express();

	// Behind a reverse proxy in production so Secure cookies / rate-limit see the real protocol+IP.
	if (env.isProd) app.set('trust proxy', 1);

	app.use(securityHeaders);
	app.use(corsMiddleware);
	app.use(express.json({ limit: '16kb' }));
	app.use(cookieParser());

	// Resolve the session cookie into req.user for every request.
	app.use(attachUser);

	app.get('/api/health', (_req, res) => res.json({ ok: true }));

	app.use('/api/auth', authRoutes);
	app.use('/api/admin', adminRoutes);
	app.use('/api/race', raceRoutes);

	// Dev-only demo login, mounted only when explicitly enabled outside production.
	if (env.devLoginEnabled) {
		app.use('/api/dev', devRoutes);
		console.log('⚠️  Dev demo-login routes are ENABLED (development only).');
	}

	app.use(notFound);
	app.use(errorHandler);

	return app;
}
