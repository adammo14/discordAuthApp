import { Router } from 'express';
import { z } from 'zod';
import { adminLimiter } from '../middleware/rateLimit.js';
import { requireAdmin } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { PERMISSION_META, PERMISSION_LIST } from '../lib/permissions.js';
import { HttpError } from '../middleware/errorHandler.js';
import { listUsers, getUserById, setUserRoles, setUserOverrides } from '../services/users.service.js';
import { listRoles, getRoleById, createRole, setRolePermissions } from '../services/roles.service.js';
import { recordAudit, listAudit } from '../services/audit.service.js';

const router = Router();
router.use(adminLimiter, requireAdmin);

const permissionEnum = z.enum(PERMISSION_LIST);
const userIdParam = z.object({ id: z.string().min(1).max(64) });
const roleIdParam = z.object({ id: z.coerce.number().int().positive() });

// --- Read endpoints ---------------------------------------------------------

router.get('/permissions', (_req, res) => {
	res.json({ permissions: PERMISSION_META });
});

router.get('/users', (_req, res) => {
	res.json({ users: listUsers() });
});

router.get('/roles', (_req, res) => {
	res.json({ roles: listRoles() });
});

router.get('/audit', (_req, res) => {
	res.json({ entries: listAudit(200) });
});

// --- Role management --------------------------------------------------------

const createRoleSchema = z.object({
	name: z.string().min(2).max(40),
	description: z.string().max(200).optional().nullable(),
	permissions: z.array(permissionEnum).default([]),
});

router.post('/roles', validateBody(createRoleSchema), (req, res) => {
	if (getRoleByNameSafe(req.body.name)) throw new HttpError(409, 'A role with that name already exists');
	const role = createRole(req.body);
	recordAudit({ actorId: req.user.id, action: 'role.create', targetId: String(role.id), detail: req.body });
	res.status(201).json({ role });
});

const rolePermsSchema = z.object({ permissions: z.array(permissionEnum) });

router.put('/roles/:id/permissions', validateParams(roleIdParam), validateBody(rolePermsSchema), (req, res) => {
	const role = getRoleById(req.params.id);
	if (!role) throw new HttpError(404, 'Role not found');
	const before = role;
	const permissions = setRolePermissions(role.id, req.body.permissions);
	recordAudit({
		actorId: req.user.id,
		action: 'role.permissions.set',
		targetId: String(role.id),
		detail: { role: role.name, permissions },
	});
	res.json({ role: { ...before, permissions } });
});

// --- Per-user access management --------------------------------------------

const setRolesSchema = z.object({ roleIds: z.array(z.number().int().positive()) });

router.put('/users/:id/roles', validateParams(userIdParam), validateBody(setRolesSchema), (req, res) => {
	const user = requireExistingUser(req.params.id);
	const roleIds = setUserRoles(user.id, req.body.roleIds);
	recordAudit({ actorId: req.user.id, action: 'user.roles.set', targetId: user.id, detail: { roleIds } });
	res.json({ ok: true, roleIds });
});

// Overrides can only ever reference canonical feature permissions — never is_admin. is_admin is
// derived solely from ADMIN_DISCORD_IDS and is unreachable from any API, so no request can
// escalate a user to admin.
const setOverridesSchema = z.object({
	overrides: z.array(z.object({ permission: permissionEnum, granted: z.boolean() })),
});

router.put('/users/:id/permissions', validateParams(userIdParam), validateBody(setOverridesSchema), (req, res) => {
	const user = requireExistingUser(req.params.id);
	const overrides = setUserOverrides(user.id, req.body.overrides);
	recordAudit({ actorId: req.user.id, action: 'user.permissions.set', targetId: user.id, detail: { overrides } });
	res.json({ ok: true, overrides });
});

// --- helpers ---------------------------------------------------------------

function requireExistingUser(id) {
	const user = getUserById(id);
	if (!user) throw new HttpError(404, 'User not found');
	return user;
}

function getRoleByNameSafe(name) {
	return listRoles().find((r) => r.name === name);
}

export default router;
