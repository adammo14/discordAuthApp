import 'dotenv/config';
import { z } from 'zod';

// Fail-fast validation of environment configuration. If anything required is missing or
// malformed the server refuses to boot rather than starting in an insecure/half-configured state.
const schema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().int().positive().default(3001),

	DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
	DISCORD_CLIENT_SECRET: z.string().min(1, 'DISCORD_CLIENT_SECRET is required'),
	DISCORD_REDIRECT_URI: z.string().url('DISCORD_REDIRECT_URI must be a valid URL'),

	// Used as an extra secret when hashing session tokens at rest.
	SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
	SESSION_TTL_HOURS: z.coerce.number().positive().default(24),

	CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),

	DB_PATH: z.string().min(1).default('./server/data/app.db'),

	// Comma-separated Discord user IDs that are always treated as admins.
	ADMIN_DISCORD_IDS: z.string().default(''),

	ENABLE_DEV_LOGIN: z
		.string()
		.optional()
		.transform((v) => v === '1' || v === 'true'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
	console.error('\n❌ Invalid environment configuration:\n');
	for (const issue of parsed.error.issues) {
		console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
	}
	console.error('\nFix your .env file and restart.\n');
	process.exit(1);
}

const data = parsed.data;

const isProd = data.NODE_ENV === 'production';

export const env = {
	...data,
	isProd,
	// Dev login is only ever available outside production, regardless of the flag.
	devLoginEnabled: !isProd && data.ENABLE_DEV_LOGIN,
	adminDiscordIds: new Set(
		data.ADMIN_DISCORD_IDS.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
	),
	sessionTtlMs: data.SESSION_TTL_HOURS * 60 * 60 * 1000,
};

export function isAdminDiscordId(discordId) {
	return env.adminDiscordIds.has(String(discordId));
}
