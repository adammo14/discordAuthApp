-- Users: every Discord account that has ever logged in (or a seeded demo user).
CREATE TABLE IF NOT EXISTS users (
	id          TEXT PRIMARY KEY,          -- Discord user id (or "demo:*" for demo users)
	username    TEXT NOT NULL,
	global_name TEXT,
	avatar      TEXT,
	email       TEXT,
	is_admin    INTEGER NOT NULL DEFAULT 0, -- derived from ADMIN_DISCORD_IDS on each login
	is_demo     INTEGER NOT NULL DEFAULT 0,
	first_seen  INTEGER NOT NULL,           -- epoch ms
	last_login  INTEGER NOT NULL
);

-- Sessions: only a keyed hash of the token is stored, never the raw token.
CREATE TABLE IF NOT EXISTS sessions (
	token_hash TEXT PRIMARY KEY,
	user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL,
	expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Single-use OAuth state + PKCE verifier, short-lived.
CREATE TABLE IF NOT EXISTS oauth_states (
	state         TEXT PRIMARY KEY,
	code_verifier TEXT NOT NULL,
	created_at    INTEGER NOT NULL,
	expires_at    INTEGER NOT NULL
);

-- Roles bundle permissions.
CREATE TABLE IF NOT EXISTS roles (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	name        TEXT NOT NULL UNIQUE,
	description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
	role_id    INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
	permission TEXT NOT NULL,
	PRIMARY KEY (role_id, permission)
);

CREATE TABLE IF NOT EXISTS user_roles (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
	PRIMARY KEY (user_id, role_id)
);

-- Per-user override on top of role-derived permissions. granted=1 allow, granted=0 deny.
CREATE TABLE IF NOT EXISTS user_permissions (
	user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	permission TEXT NOT NULL,
	granted    INTEGER NOT NULL,
	PRIMARY KEY (user_id, permission)
);

-- Audit trail of every admin mutation.
CREATE TABLE IF NOT EXISTS audit_log (
	id        INTEGER PRIMARY KEY AUTOINCREMENT,
	actor_id  TEXT NOT NULL,
	action    TEXT NOT NULL,
	target_id TEXT,
	detail    TEXT,        -- JSON string
	ts        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);

-- ---------------------------------------------------------------------------
-- Race planner
-- ---------------------------------------------------------------------------

-- A sim-racing event the team is planning for.
CREATE TABLE IF NOT EXISTS events (
	id            INTEGER PRIMARY KEY AUTOINCREMENT,
	name          TEXT NOT NULL,
	start_at      INTEGER NOT NULL,      -- epoch ms
	end_at        INTEGER NOT NULL,      -- epoch ms
	stint_minutes INTEGER NOT NULL,
	status        TEXT NOT NULL DEFAULT 'planning',  -- 'planning' | 'locked'
	chosen_car_id INTEGER,               -- references event_cars(id) once locked
	sim           TEXT,                  -- catalog sim key: 'lmu' | 'iracing'
	car_class     TEXT,                  -- catalog class key: 'HY' | 'LMP2' | 'GT3'
	track         TEXT,                  -- catalog track name
	created_by    TEXT NOT NULL,
	created_at    INTEGER NOT NULL
);

-- Car options for an event that drivers vote on.
CREATE TABLE IF NOT EXISTS event_cars (
	id       INTEGER PRIMARY KEY AUTOINCREMENT,
	event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	name     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_event_cars_event ON event_cars(event_id);

-- One (changeable) car vote per user per event.
CREATE TABLE IF NOT EXISTS car_votes (
	event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	car_id   INTEGER NOT NULL REFERENCES event_cars(id) ON DELETE CASCADE,
	PRIMARY KEY (event_id, user_id)
);

-- Availability windows a driver submits for an event (multiple rows allowed).
CREATE TABLE IF NOT EXISTS availability (
	id       INTEGER PRIMARY KEY AUTOINCREMENT,
	event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	start_at INTEGER NOT NULL,
	end_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_availability_event ON availability(event_id);

-- Uploaded car setup files (stored on disk; only metadata lives here).
CREATE TABLE IF NOT EXISTS setups (
	id            INTEGER PRIMARY KEY AUTOINCREMENT,
	event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	car_id        INTEGER REFERENCES event_cars(id) ON DELETE SET NULL,
	name          TEXT NOT NULL,
	original_name TEXT NOT NULL,
	stored_name   TEXT NOT NULL,        -- generated filename on disk (never client-supplied)
	size          INTEGER NOT NULL,
	uploaded_by   TEXT NOT NULL,
	created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_setups_event ON setups(event_id);
