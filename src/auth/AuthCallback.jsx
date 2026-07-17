import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';

// The server has already set the session cookie (or an error param) by the time we land here.
// No token handling happens in JS anymore — we just refresh auth state and redirect home.
const MESSAGES = {
	cancelled: 'Login cancelled. Redirecting…',
	invalid_state: 'Login could not be verified. Redirecting…',
	login_failed: 'Login failed. Redirecting…',
};

export default function AuthCallback() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { refresh } = useAuth();
	const error = searchParams.get('error');

	useEffect(() => {
		let active = true;
		(async () => {
			if (!error) {
				await refresh();
			}
			if (active) {
				const delay = error ? 1500 : 0;
				setTimeout(() => navigate('/', { replace: true }), delay);
			}
		})();
		return () => { active = false; };
	}, [error, refresh, navigate]);

	return <p style={{ padding: 24 }}>{error ? (MESSAGES[error] || 'Redirecting…') : 'Finishing sign-in…'}</p>;
}
