import { useAuth } from './AuthContext';

// Render children only if the current user holds `permission` (admins always pass).
// Optional `fallback` renders otherwise. Use to gate any feature UI.
export default function RequirePermission({ permission, fallback = null, children }) {
	const { hasPermission } = useAuth();
	return hasPermission(permission) ? children : fallback;
}
