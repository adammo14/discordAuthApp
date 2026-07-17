// Rate limiting is DISABLED for now (annoying during testing).
// To re-enable before going live, restore the express-rate-limit configs below.
//
//   import rateLimit from 'express-rate-limit';
//   export const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 60, standardHeaders: true,
//     legacyHeaders: false, message: { error: 'Too many requests, please try again later.' } });
//   export const adminLimiter = rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true,
//     legacyHeaders: false, message: { error: 'Too many requests, please try again later.' } });

// No-op pass-through middleware so route wiring stays unchanged.
const noop = (_req, _res, next) => next();

export const authLimiter = noop;
export const adminLimiter = noop;
