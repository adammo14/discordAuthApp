import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import UserTable from './UserTable';
import RoleEditor from './RoleEditor';
import '../../styles/admin.css';

export default function AdminPage() {
	const { isAdmin, loading } = useAuth();
	const [data, setData] = useState({ users: [], roles: [], permissions: [] });
	const [state, setState] = useState('loading'); // loading | ready | error

	const load = useCallback(async () => {
		try {
			const [u, r, p] = await Promise.all([api.adminUsers(), api.adminRoles(), api.adminPermissions()]);
			setData({ users: u.users, roles: r.roles, permissions: p.permissions });
			setState('ready');
		} catch {
			setState('error');
		}
	}, []);

	useEffect(() => {
		// load() sets state only after awaiting network calls, not synchronously.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (isAdmin) load();
	}, [isAdmin, load]);

	if (loading) return <div className="loading">Loading…</div>;

	// Client-side guard; the API enforces this server-side regardless.
	if (!isAdmin) {
		return (
			<div className="admin-page">
				<h1>Admin</h1>
				<p>You don’t have access to this page.</p>
				<Link to="/">← Back</Link>
			</div>
		);
	}

	return (
		<div className="admin-page">
			<header className="admin-header">
				<h1>Admin · Users &amp; Access</h1>
				<Link to="/">← Back to app</Link>
			</header>

			{state === 'loading' && <p>Loading…</p>}
			{state === 'error' && <p className="admin-error">Failed to load admin data.</p>}
			{state === 'ready' && (
				<>
					<section>
						<h2>Users ({data.users.length})</h2>
						<UserTable users={data.users} roles={data.roles} permissions={data.permissions} onChange={load} />
					</section>
					<section>
						<h2>Roles</h2>
						<RoleEditor roles={data.roles} permissions={data.permissions} onChange={load} />
					</section>
				</>
			)}
		</div>
	);
}
