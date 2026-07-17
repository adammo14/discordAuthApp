import { HttpError } from './errorHandler.js';

// Validate req.body against a zod schema, replacing it with the parsed (typed, stripped) value.
// On failure, returns a 400 with a safe, generic message.
export function validateBody(schema) {
	return (req, _res, next) => {
		const result = schema.safeParse(req.body);
		if (!result.success) {
			throw new HttpError(400, 'Invalid request body');
		}
		req.body = result.data;
		next();
	};
}

export function validateParams(schema) {
	return (req, _res, next) => {
		const result = schema.safeParse(req.params);
		if (!result.success) {
			throw new HttpError(400, 'Invalid request parameters');
		}
		req.params = result.data;
		next();
	};
}
