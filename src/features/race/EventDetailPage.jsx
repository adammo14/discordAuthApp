import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { PERMISSIONS } from '../../auth/permissions';
import { fmtDateTime } from './time';
import SimBadge from './SimBadge';
import CarVote from './CarVote';
import AvailabilityForm from './AvailabilityForm';
import SetupRepo from './SetupRepo';
import StintPlan from './StintPlan';
import '../../styles/race.css';

export default function EventDetailPage() {
	const { id } = useParams();
	const { loading, hasPermission } = useAuth();
	const navigate = useNavigate();
	const [detail, setDetail] = useState(null);
	const [state, setState] = useState('loading');

	const remove = async (event) => {
		if (!confirm(`Delete “${event.name}”? This removes its votes, availability and setups.`)) return;
		try {
			await api.deleteEvent(event.id);
			navigate('/race');
		} catch (e) {
			alert(`Could not delete: ${e.message}`);
		}
	};

	const load = useCallback(async () => {
		try {
			const d = await api.event(id);
			setDetail(d);
			setState('ready');
		} catch (e) {
			setState(e.status === 403 ? 'forbidden' : e.status === 404 ? 'notfound' : 'error');
		}
	}, [id]);

	useEffect(() => {
		// load() sets state only after awaiting the network, not synchronously.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (!loading) load();
	}, [loading, load]);

	if (loading || state === 'loading') return <div className="loading">Loading…</div>;
	if (state === 'forbidden') return <Shell><p>You don’t have access to the race planner.</p></Shell>;
	if (state === 'notfound') return <Shell><p>Event not found.</p></Shell>;
	if (state === 'error' || !detail) return <Shell><p className="race-error">Failed to load event.</p></Shell>;

	const { event } = detail;

	return (
		<div className="race-page">
			<header className="race-header">
				<div>
					<h1>{event.name}</h1>
					{event.sim && <div className="detail-badges"><SimBadge sim={event.sim} carClass={event.car_class} track={event.track} size="md" /></div>}
					<p className="muted">
						{fmtDateTime(event.start_at)} → {fmtDateTime(event.end_at)} · {event.stint_minutes}-min stints ·{' '}
						<span className={`status status-${event.status}`}>{event.status}</span>
					</p>
				</div>
				<div className="race-header-actions">
					{hasPermission(PERMISSIONS.MANAGE_EVENTS) && (
						<button className="link-btn danger" onClick={() => remove(event)}>Delete event</button>
					)}
					<Link to="/race">← All events</Link>
				</div>
			</header>

			<div className="race-grid">
				<CarVote detail={detail} onChange={load} />
				<AvailabilityForm detail={detail} onChange={load} />
				<SetupRepo detail={detail} onChange={load} />
				<StintPlan eventId={event.id} />
			</div>
		</div>
	);
}

function Shell({ children }) {
	return (
		<div className="race-page">
			<header className="race-header">
				<h1>Race Planner</h1>
				<Link to="/race">← All events</Link>
			</header>
			{children}
		</div>
	);
}
