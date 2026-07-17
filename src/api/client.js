// Central API client. Every request includes credentials so the httpOnly session cookie is sent;
// the session token is never touched by JavaScript.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const DEV_LOGIN_ENABLED = import.meta.env.DEV;

async function request(path, { method = 'GET', body, formData } = {}) {
	const res = await fetch(`${API_URL}${path}`, {
		method,
		credentials: 'include',
		headers: body ? { 'Content-Type': 'application/json' } : undefined,
		body: formData ? formData : body ? JSON.stringify(body) : undefined,
	});

	let data = null;
	try {
		data = await res.json();
	} catch {
		// non-JSON response (e.g. empty body)
	}

	if (!res.ok) {
		const err = new Error(data?.error || `Request failed (${res.status})`);
		err.status = res.status;
		throw err;
	}
	return data;
}

export const api = {
	// auth
	me: () => request('/api/auth/me'),
	logout: () => request('/api/auth/logout', { method: 'POST' }),
	discordLoginUrl: () => `${API_URL}/api/auth/discord`,

	// dev-only demo login
	demoUsers: () => request('/api/dev/demo-users'),
	demoLogin: (id) => request(`/api/dev/login/${encodeURIComponent(id)}`, { method: 'POST' }),

	// admin
	adminPermissions: () => request('/api/admin/permissions'),
	adminUsers: () => request('/api/admin/users'),
	adminRoles: () => request('/api/admin/roles'),
	adminAudit: () => request('/api/admin/audit'),
	setUserRoles: (id, roleIds) => request(`/api/admin/users/${encodeURIComponent(id)}/roles`, { method: 'PUT', body: { roleIds } }),
	setUserPermissions: (id, overrides) => request(`/api/admin/users/${encodeURIComponent(id)}/permissions`, { method: 'PUT', body: { overrides } }),
	setRolePermissions: (id, permissions) => request(`/api/admin/roles/${id}/permissions`, { method: 'PUT', body: { permissions } }),

	// race planner
	catalog: () => request('/api/race/catalog'),
	events: () => request('/api/race/events'),
	createEvent: (body) => request('/api/race/events', { method: 'POST', body }),
	event: (id) => request(`/api/race/events/${id}`),
	updateEvent: (id, body) => request(`/api/race/events/${id}`, { method: 'PATCH', body }),
	deleteEvent: (id) => request(`/api/race/events/${id}`, { method: 'DELETE' }),
	addCar: (id, name) => request(`/api/race/events/${id}/cars`, { method: 'POST', body: { name } }),
	deleteCar: (id, carId) => request(`/api/race/events/${id}/cars/${carId}`, { method: 'DELETE' }),
	vote: (id, carId) => request(`/api/race/events/${id}/vote`, { method: 'PUT', body: { carId } }),
	lockCar: (id, carId) => request(`/api/race/events/${id}/chosen-car`, { method: 'PUT', body: { carId } }),
	setAvailability: (id, windows) => request(`/api/race/events/${id}/availability`, { method: 'PUT', body: { windows } }),
	plan: (id) => request(`/api/race/events/${id}/plan`),
	uploadSetup: (id, formData) => request(`/api/race/events/${id}/setups`, { method: 'POST', formData }),
	deleteSetup: (setupId) => request(`/api/race/setups/${setupId}`, { method: 'DELETE' }),
	setupDownloadUrl: (setupId) => `${API_URL}/api/race/setups/${setupId}/download`,
};
