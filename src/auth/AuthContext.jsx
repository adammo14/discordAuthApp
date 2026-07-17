import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [permissions, setPermissions] = useState([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		try {
			const data = await api.me();
			setUser(data.user);
			setIsAdmin(Boolean(data.isAdmin));
			setPermissions(data.permissions || []);
		} catch {
			setUser(null);
			setIsAdmin(false);
			setPermissions([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const login = useCallback(() => {
		window.location.href = api.discordLoginUrl();
	}, []);

	const logout = useCallback(async () => {
		try {
			await api.logout();
		} finally {
			setUser(null);
			setIsAdmin(false);
			setPermissions([]);
		}
	}, []);

	// Admins implicitly hold every permission.
	const hasPermission = useCallback(
		(perm) => isAdmin || permissions.includes(perm),
		[isAdmin, permissions],
	);

	return (
		<AuthContext.Provider value={{ user, isAdmin, permissions, loading, login, logout, refresh, hasPermission }}>
			{children}
		</AuthContext.Provider>
	);
}
