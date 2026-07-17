import { useState } from 'react';
import { api } from '../../api/client';

// Row per user: assign roles (checkboxes) and per-feature overrides (allow / inherit / deny).
export default function UserTable({ users, roles, permissions, onChange }) {
	return (
		<div className="table-scroll">
			<table className="admin-table">
				<thead>
					<tr>
						<th>User</th>
						<th>Email</th>
						<th>First seen</th>
						<th>Last login</th>
						<th>Roles</th>
						<th>Feature overrides</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{users.map((u) => (
						<UserRow key={u.id} user={u} roles={roles} permissions={permissions} onChange={onChange} />
					))}
				</tbody>
			</table>
		</div>
	);
}

function overrideValueFor(user, permKey) {
	const o = user.overrides.find((x) => x.permission === permKey);
	if (!o) return 'inherit';
	return o.granted ? 'allow' : 'deny';
}

function UserRow({ user, roles, permissions, onChange }) {
	const [roleIds, setRoleIds] = useState(() => new Set(user.roleIds));
	const [overrides, setOverrides] = useState(() => {
		const map = {};
		for (const p of permissions) map[p.key] = overrideValueFor(user, p.key);
		return map;
	});
	const [saving, setSaving] = useState(false);

	const toggleRole = (id) => {
		setRoleIds((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const save = async () => {
		setSaving(true);
		try {
			await api.setUserRoles(user.id, [...roleIds]);
			const overridePayload = Object.entries(overrides)
				.filter(([, v]) => v !== 'inherit')
				.map(([permission, v]) => ({ permission, granted: v === 'allow' }));
			await api.setUserPermissions(user.id, overridePayload);
			await onChange();
		} catch (e) {
			alert(`Save failed: ${e.message}`);
		} finally {
			setSaving(false);
		}
	};

	return (
		<tr>
			<td>
				<div className="user-cell">
					{user.avatar && <img src={user.avatar} alt="" className="row-avatar" />}
					<div>
						<div className="user-name">
							{user.globalName || user.username}
							{user.isAdmin && <span className="badge badge-admin">admin</span>}
							{user.isDemo && <span className="badge">demo</span>}
						</div>
						<div className="user-sub">{user.username}</div>
					</div>
				</div>
			</td>
			<td>{user.email || '—'}</td>
			<td>{new Date(user.firstSeen).toLocaleDateString()}</td>
			<td>{new Date(user.lastLogin).toLocaleString()}</td>
			<td>
				<div className="checks">
					{roles.map((r) => (
						<label key={r.id} className="check">
							<input type="checkbox" checked={roleIds.has(r.id)} onChange={() => toggleRole(r.id)} disabled={user.isAdmin} />
							{r.name}
						</label>
					))}
				</div>
			</td>
			<td>
				<div className="checks">
					{permissions.map((p) => (
						<label key={p.key} className="override">
							<span title={p.description}>{p.label}</span>
							<select
								value={user.isAdmin ? 'allow' : overrides[p.key]}
								disabled={user.isAdmin}
								onChange={(e) => setOverrides((prev) => ({ ...prev, [p.key]: e.target.value }))}
							>
								<option value="inherit">inherit</option>
								<option value="allow">allow</option>
								<option value="deny">deny</option>
							</select>
						</label>
					))}
				</div>
			</td>
			<td>
				<button className="save-btn" onClick={save} disabled={saving || user.isAdmin}>
					{saving ? 'Saving…' : 'Save'}
				</button>
				{user.isAdmin && <div className="user-sub">env admin</div>}
			</td>
		</tr>
	);
}
