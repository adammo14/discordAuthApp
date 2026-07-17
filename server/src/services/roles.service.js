import { db } from '../db/index.js';
import { isValidPermission } from '../lib/permissions.js';

export function getRoleByName(name) {
	return db.prepare('SELECT * FROM roles WHERE name = ?').get(name);
}

export function getRoleById(id) {
	return db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
}

export function getRolePermissions(roleId) {
	return db
		.prepare('SELECT permission FROM role_permissions WHERE role_id = ?')
		.all(roleId)
		.map((r) => r.permission);
}

export function listRoles() {
	const roles = db.prepare('SELECT * FROM roles ORDER BY name').all();
	return roles.map((r) => ({ ...r, permissions: getRolePermissions(r.id) }));
}

// Replace a role's permission set. Only canonical permissions are accepted.
export const setRolePermissions = db.transaction((roleId, permissions) => {
	const clean = [...new Set(permissions)].filter(isValidPermission);
	db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);
	const insert = db.prepare('INSERT INTO role_permissions (role_id, permission) VALUES (?, ?)');
	for (const perm of clean) insert.run(roleId, perm);
	return clean;
});

export function createRole({ name, description = null, permissions = [] }) {
	const info = db
		.prepare('INSERT INTO roles (name, description) VALUES (?, ?)')
		.run(name, description);
	const roleId = info.lastInsertRowid;
	setRolePermissions(roleId, permissions);
	return getRoleById(roleId);
}

// Idempotent create-or-update used by the seeder.
export function ensureRole({ name, description = null, permissions = [] }) {
	let role = getRoleByName(name);
	if (!role) {
		role = createRole({ name, description, permissions });
	} else {
		setRolePermissions(role.id, permissions);
	}
	return role;
}
