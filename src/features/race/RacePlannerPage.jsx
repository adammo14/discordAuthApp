import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { PERMISSIONS } from '../../auth/permissions';
import { fmtDateTime } from './time';
import SimBadge from './SimBadge';
import '../../styles/race.css';

export default function RacePlannerPage() {
	const { loading, hasPermission } = useAuth();
	const [events, setEvents] = useState([]);
	const [state, setState] = useState('loading');

	const load = useCallback(async () => {
		try {
			const d = await api.events();
			setEvents(d.events);
			setState('ready');
		} catch (e) {
			setState(e.status === 403 ? 'forbidden' : 'error');
		}
	}, []);

	useEffect(() => {
		// load() sets state only after awaiting the network, not synchronously.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (!loading) load();
	}, [loading, load]);

	if (loading || state === 'loading') return <div className="loading">Loading…</div>;
	if (state === 'forbidden') {
		return (
			<div className="race-page">
				<h1>Race Planner</h1>
				<p>You don’t have access to the race planner. Ask an admin for the driver role.</p>
				<Link to="/">← Back</Link>
			</div>
		);
	}

	return (
		<div className="race-page">
			<header className="race-header">
				<h1>🏁 Race Planner</h1>
				<div className="race-header-actions">
					{hasPermission(PERMISSIONS.MANAGE_EVENTS) && <Link className="save-btn" to="/race/new">+ New event</Link>}
					<Link to="/">← Back to app</Link>
				</div>
			</header>

			{state === 'error' && <p className="race-error">Failed to load events.</p>}
			{events.length === 0 ? (
				<p className="muted">No events yet.</p>
			) : (
				<ul className="event-list">
					{events.map((e) => (
						<li key={e.id}>
							<Link to={`/race/${e.id}`} className={`event-card ${e.sim ? `accent-${e.sim}` : ''}`}>
								<div className="event-card-main">
									<strong>{e.name}</strong>
									<span className="muted">{fmtDateTime(e.start_at)} → {fmtDateTime(e.end_at)}</span>
									{e.sim && <SimBadge sim={e.sim} carClass={e.car_class} track={e.track} />}
								</div>
								<div className="event-card-meta">
									<span className={`status status-${e.status}`}>{e.status}</span>
									<span className="muted">{e.stint_minutes}-min stints · {e.carCount} cars · {e.voteCount} votes</span>
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
