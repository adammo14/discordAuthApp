import { env } from './config/env.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { purgeExpired } from './services/sessions.service.js';
import { createApp } from './app.js';

// Prepare the database before serving traffic.
migrate();
seed();
purgeExpired();

// Periodic housekeeping of expired sessions / oauth states.
setInterval(purgeExpired, 60 * 60 * 1000).unref();

const app = createApp();

app.listen(env.PORT, () => {
	console.log(`Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
