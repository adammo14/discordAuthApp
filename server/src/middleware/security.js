import helmet from 'helmet';
import cors from 'cors';
import { env } from '../config/env.js';

// Security headers. This is a JSON API (the SPA is served separately by Vite), so a strict
// default CSP is appropriate.
export const securityHeaders = helmet({
	crossOriginResourcePolicy: { policy: 'same-site' },
});

// CORS locked to the known client origin, with credentials enabled so the browser will send the
// session cookie on cross-origin API calls.
export const corsMiddleware = cors({
	origin: env.CLIENT_URL,
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
});
