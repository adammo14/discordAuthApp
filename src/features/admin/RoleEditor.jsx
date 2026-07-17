import { useState } from 'react';
import { api } from '../../api/client';

// Edit which permissions each role grants.
export default function RoleEditor({ roles, permissions, onChange }) {
	return (
		<div className="role-editor">
			{roles.map((role) => (
				<RoleCard key={role.id} role={role} permissions={permissions} onChange={onChange} />
			))}
		</div>
	);
}

function RoleCard({ role, permissions, onChange }) {
	const [selected, setSelected] = useState(() => new Set(role.permissions));
	const [saving, setSaving] = useState(false);

	const toggle = (key) => {
		setSelected((prev) => {
			const next = new Set(prev);
			next.has(key) ? next.delete(key) : next.add(key);
			return next;
		});
	};

	const save = async () => {
		setSaving(true);
		try {
			await api.setRolePermissions(role.id, [...selected]);
			await onChange();
		} catch (e) {
			alert(`Save failed: ${e.message}`);
		} finally {
			setSaving(false);
		}
	};

	const isAdminRole = role.name === 'admin';

	return (
		<div className="role-card">
			<div className="role-card-head">
				<strong>{role.name}</strong>
				{role.description && <span className="user-sub">{role.description}</span>}
			</div>
			<div className="checks">
				{permissions.map((p) => (
					<label key={p.key} className="check">
						<input type="checkbox" checked={selected.has(p.key)} onChange={() => toggle(p.key)} disabled={isAdminRole} />
						<span title={p.description}>{p.label}</span>
					</label>
				))}
			</div>
			<button className="save-btn" onClick={save} disabled={saving || isAdminRole}>
				{saving ? 'Saving…' : 'Save role'}
			</button>
			{isAdminRole && <span className="user-sub"> (admin role always has all permissions)</span>}
		</div>
	);
}
