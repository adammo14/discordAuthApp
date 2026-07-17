import { db } from './index.js';
import { PERMISSION_LIST, PERMISSIONS } from '../lib/permissions.js';
import { ensureRole, getRoleByName } from '../services/roles.service.js';

// Seeded demo users so the whole permission system can be exercised without extra Discord
// accounts. They carry is_demo=1 and can only be logged into via the dev-only demo-login route.
export const DEMO_USERS = [
	{
		id: 'demo:admin',
		username: 'demo_admin',
		globalName: 'Demo Admin',
		email: 'demo-admin@example.test',
		is_admin: 1,
		roles: ['admin'],
		overrides: [],
	},
	{
		id: 'demo:reports',
		username: 'demo_reports',
		globalName: 'Demo Reports',
		email: 'demo-reports@example.test',
		is_admin: 0,
		roles: ['member'],
		overrides: [{ permission: PERMISSIONS.VIEW_REPORTS, granted: 1 }],
	},
	{
		id: 'demo:basic',
		username: 'demo_basic',
		globalName: 'Demo Basic',
		email: 'demo-basic@example.test',
		is_admin: 0,
		roles: ['member'],
		overrides: [],
	},
	// Driver demo users for exercising the race planner / stint scheduler.
	{
		id: 'demo:driverA',
		username: 'driver_a',
		globalName: 'Driver A',
		email: 'driver-a@example.test',
		is_admin: 0,
		roles: ['driver'],
		overrides: [],
	},
	{
		id: 'demo:driverB',
		username: 'driver_b',
		globalName: 'Driver B',
		email: 'driver-b@example.test',
		is_admin: 0,
		roles: ['driver'],
		overrides: [],
	},
	{
		id: 'demo:driverC',
		username: 'driver_c',
		globalName: 'Driver C',
		email: 'driver-c@example.test',
		is_admin: 0,
		roles: ['driver'],
		overrides: [],
	},
];

// Idempotent: safe to run on every boot.
export const seed = db.transaction(() => {
	// Default roles.
	ensureRole({ name: 'admin', description: 'Full access to everything.', permissions: PERMISSION_LIST });
	ensureRole({
		name: 'member',
		description: 'Default role for new users.',
		// All logged-in users can see the race calendar (read-only); write actions stay gated.
		permissions: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_RACE_PLANNER],
	});
	ensureRole({
		name: 'driver',
		description: 'Team driver: race planner access with limited write.',
		permissions: [
			PERMISSIONS.VIEW_DASHBOARD,
			PERMISSIONS.VIEW_RACE_PLANNER,
			PERMISSIONS.VOTE_CAR,
			PERMISSIONS.SUBMIT_AVAILABILITY,
			PERMISSIONS.MANAGE_SETUPS,
		],
	});

	const now = Date.now();
	for (const u of DEMO_USERS) {
		const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(u.id);
		if (!exists) {
			db.prepare(
				`INSERT INTO users (id, username, global_name, avatar, email, is_admin, is_demo, first_seen, last_login)
				 VALUES (?, ?, ?, NULL, ?, ?, 1, ?, ?)`,
			).run(u.id, u.username, u.globalName, u.email, u.is_admin, now, now);
		}

		// (Re)apply demo roles + overrides so the demo state is deterministic.
		db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(u.id);
		for (const roleName of u.roles) {
			const role = getRoleByName(roleName);
			if (role) {
				db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)').run(u.id, role.id);
			}
		}
		db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(u.id);
		for (const o of u.overrides) {
			db.prepare('INSERT INTO user_permissions (user_id, permission, granted) VALUES (?, ?, ?)').run(
				u.id,
				o.permission,
				o.granted,
			);
		}
	}
});
