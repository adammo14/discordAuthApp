import { db } from '../db/index.js';
import { isValidPermission, PERMISSION_LIST } from '../lib/permissions.js';
import { getRoleByName, getRolePermissions } from './roles.service.js';

// Insert a user on first login, or update their profile + last_login on subsequent logins.
// is_admin is always (re)derived from the caller — never trusted from client input.
export function upsertUserOnLogin(profile, { isAdmin }) {
	const now = Date.now();
	const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(profile.id);

	if (existing) {
		db.prepare(
			`UPDATE users SET username = ?, global_name = ?, avatar = ?, email = ?,
			 is_admin = ?, last_login = ? WHERE id = ?`,
		).run(profile.username, profile.globalName, profile.avatar, profile.email, isAdmin ? 1 : 0, now, profile.id);
	} else {
		db.prepare(
			`INSERT INTO users (id, username, global_name, avatar, email, is_admin, is_demo, first_seen, last_login)
			 VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
		).run(profile.id, profile.username, profile.globalName, profile.avatar, profile.email, isAdmin ? 1 : 0, now, now);
		// New users get the default "member" role.
		const member = getRoleByName('member');
		if (member) assignRole(profile.id, member.id);
	}
	return getUserById(profile.id);
}

export function getUserById(id) {
	return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getUserRoleIds(userId) {
	return db
		.prepare('SELECT role_id FROM user_roles WHERE user_id = ?')
		.all(userId)
		.map((r) => r.role_id);
}

function assignRole(userId, roleId) {
	db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, roleId);
}

export function getUserOverrides(userId) {
	return db.prepare('SELECT permission, granted FROM user_permissions WHERE user_id = ?').all(userId);
}

// Effective permissions = union(role perms) ∪ override-grants − override-denies.
// Admins implicitly hold every permission.
export function getEffectivePermissions(user) {
	if (!user) return [];
	if (user.is_admin) return [...PERMISSION_LIST];

	const set = new Set();
	for (const roleId of getUserRoleIds(user.id)) {
		for (const perm of getRolePermissions(roleId)) set.add(perm);
	}
	for (const { permission, granted } of getUserOverrides(user.id)) {
		if (granted) set.add(permission);
		else set.delete(permission);
	}
	return [...set].filter(isValidPermission);
}

// Full record for the admin UI.
export function listUsers() {
	const roles = db.prepare('SELECT id, name FROM roles').all();
	const roleName = new Map(roles.map((r) => [r.id, r.name]));
	return db
		.prepare('SELECT * FROM users ORDER BY last_login DESC')
		.all()
		.map((u) => ({
			id: u.id,
			username: u.username,
			globalName: u.global_name,
			avatar: u.avatar,
			email: u.email,
			isAdmin: Boolean(u.is_admin),
			isDemo: Boolean(u.is_demo),
			firstSeen: u.first_seen,
			lastLogin: u.last_login,
			roleIds: getUserRoleIds(u.id),
			roles: getUserRoleIds(u.id).map((id) => roleName.get(id)).filter(Boolean),
			overrides: getUserOverrides(u.id),
			permissions: getEffectivePermissions(u),
		}));
}

// Replace a user's roles. Only existing role ids are accepted.
export const setUserRoles = db.transaction((userId, roleIds) => {
	const valid = db.prepare('SELECT id FROM roles').all().map((r) => r.id);
	const validSet = new Set(valid);
	const clean = [...new Set(roleIds)].filter((id) => validSet.has(id));
	db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId);
	const insert = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
	for (const roleId of clean) insert.run(userId, roleId);
	return clean;
});

// Replace a user's per-feature overrides. Each entry: { permission, granted:boolean }.
// Only canonical permissions are accepted; is_admin can never be set this way.
export const setUserOverrides = db.transaction((userId, overrides) => {
	const clean = overrides.filter((o) => isValidPermission(o.permission));
	db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId);
	const insert = db.prepare(
		'INSERT INTO user_permissions (user_id, permission, granted) VALUES (?, ?, ?)',
	);
	for (const o of clean) insert.run(userId, o.permission, o.granted ? 1 : 0);
	return clean;
});
