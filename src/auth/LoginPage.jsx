import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { api, DEV_LOGIN_ENABLED } from '../api/client';
import discord from '../assets/discord.svg';

export default function LoginPage() {
	const { login } = useAuth();

	return (
		<div className="login-page">
			<h1 style={{ marginBottom: 10 }}>Welcome</h1>
			<p style={{ marginTop: 0 }}>Please sign in with Discord to continue.</p>
			<button className="discord-btn" onClick={login}>
				<img src={discord} height={30} alt="Discord logo" />
				Sign in with Discord
			</button>
			{DEV_LOGIN_ENABLED && <DemoLoginPanel />}
		</div>
	);
}

// Development-only shortcut to sign in as a seeded demo user (no Discord account needed).
// Only renders in dev builds; the backend route is also disabled in production.
function DemoLoginPanel() {
	const { refresh } = useAuth();
	const [users, setUsers] = useState([]);
	const [error, setError] = useState(null);

	useEffect(() => {
		api.demoUsers()
			.then((d) => setUsers(d.users))
			.catch(() => setError('Demo login unavailable (enable ENABLE_DEV_LOGIN on the server).'));
	}, []);

	if (error) return <p className="demo-note">{error}</p>;
	if (!users.length) return null;

	const loginAs = async (id) => {
		await api.demoLogin(id);
		await refresh();
	};

	return (
		<div className="demo-panel">
			<span className="demo-note">Dev demo login</span>
			<div className="demo-buttons">
				{users.map((u) => (
					<button key={u.id} className="demo-btn" onClick={() => loginAs(u.id)}>
						{u.globalName || u.username}
					</button>
				))}
			</div>
		</div>
	);
}
