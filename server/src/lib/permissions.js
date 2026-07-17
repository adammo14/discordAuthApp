// Canonical list of feature permissions. This is the single source of truth: the admin UI
// only ever offers these, and any permission supplied by a client is validated against this
// set before touching the database. Add new gated features here.
export const PERMISSIONS = Object.freeze({
	VIEW_DASHBOARD: 'view_dashboard',
	VIEW_REPORTS: 'view_reports',
	MANAGE_USERS: 'manage_users',
	// Race planner
	VIEW_RACE_PLANNER: 'view_race_planner',
	MANAGE_EVENTS: 'manage_events',
	VOTE_CAR: 'vote_car',
	SUBMIT_AVAILABILITY: 'submit_availability',
	MANAGE_SETUPS: 'manage_setups',
});

// Permission strings in a plain array + Set for validation.
export const PERMISSION_LIST = Object.freeze(Object.values(PERMISSIONS));
const PERMISSION_SET = new Set(PERMISSION_LIST);

// Human-friendly metadata for rendering the admin UI.
export const PERMISSION_META = Object.freeze([
	{ key: PERMISSIONS.VIEW_DASHBOARD, label: 'View dashboard', description: 'Access the main dashboard.' },
	{ key: PERMISSIONS.VIEW_REPORTS, label: 'View reports', description: 'See the reports section.' },
	{ key: PERMISSIONS.MANAGE_USERS, label: 'Manage users', description: 'Access the admin panel and manage access.' },
	{ key: PERMISSIONS.VIEW_RACE_PLANNER, label: 'View race planner', description: 'See events, setups, votes and stint plans.' },
	{ key: PERMISSIONS.MANAGE_EVENTS, label: 'Manage events', description: 'Create/edit events and lock the chosen car.' },
	{ key: PERMISSIONS.VOTE_CAR, label: 'Vote on car', description: 'Cast a vote for the event car.' },
	{ key: PERMISSIONS.SUBMIT_AVAILABILITY, label: 'Submit availability', description: 'Enter own availability windows for stints.' },
	{ key: PERMISSIONS.MANAGE_SETUPS, label: 'Manage setups', description: 'Upload and delete car setup files.' },
]);

export function isValidPermission(perm) {
	return PERMISSION_SET.has(perm);
}
