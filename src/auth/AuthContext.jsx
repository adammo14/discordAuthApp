import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}

export function AuthProvider({ children }) {
	const [user, setUser] = useState(undefined);
	// Start loading only if a token is already stored; avoids a sync setState in the effect
	const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('session_token')));

	useEffect(() => {
		let cancelled = false;
		const token = localStorage.getItem('session_token');
		if (!token) {
			return;
		}

		fetch(`${API_URL}/api/auth/me`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((res) => res.json())
			.then((data) => {
				if (!cancelled) setUser(data.user);
			})
			.catch(() => {
				localStorage.removeItem('session_token');
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => { cancelled = true; };
	}, []);

	const login = useCallback(() => {
		window.location.href = `${API_URL}/api/auth/discord`;
	}, []);

	const logout = useCallback(async () => {
		const token = localStorage.getItem('session_token');
		await fetch(`${API_URL}/api/auth/logout`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` },
		});
		localStorage.removeItem('session_token');
		setUser(null);
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
}
