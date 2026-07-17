// Typed error the app throws deliberately; its message is safe to show the client.
export class HttpError extends Error {
	constructor(status, message, { expose = true } = {}) {
		super(message);
		this.status = status;
		this.expose = expose;
	}
}

// 404 fallthrough.
export function notFound(_req, res) {
	res.status(404).json({ error: 'Not found' });
}

// Central error handler. Never leaks stack traces or internal messages to clients; full detail
// is logged server-side only.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
	const status = err.status ?? 500;
	const clientMessage = err.expose && err.status ? err.message : 'Internal server error';

	if (status >= 500) {
		console.error(`[error] ${req.method} ${req.originalUrl}`, err);
	}

	res.status(status).json({ error: clientMessage });
}
