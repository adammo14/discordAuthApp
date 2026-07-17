// Client-side mirror of the server's canonical feature keys (server/src/lib/permissions.js).
// Used for gating UI. The server remains the source of truth and enforces access regardless.
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
