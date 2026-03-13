import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const cancelled = searchParams.get('error') === 'cancelled';

	useEffect(() => {
		if (cancelled) {
			const timer = setTimeout(() => navigate('/', { replace: true }), 1500);
			return () => clearTimeout(timer);
		}

		const token = searchParams.get('token');
		if (token) {
			localStorage.setItem('session_token', token);
		}
		navigate('/', { replace: true });
	}, [cancelled, searchParams, navigate]);

	return <p>{cancelled ? 'Login cancelled. Redirecting…' : 'Logging in…'}</p>;
}
