import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { PERMISSIONS } from '../../auth/permissions';
import { fmtDateTime, fmtTime } from './time';
import SimBadge from './SimBadge';
import '../../styles/race.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function EventCalendar() {
	const { loading, hasPermission } = useAuth();
	const navigate = useNavigate();
	const [events, setEvents] = useState([]);
	const [state, setState] = useState('loading');
	const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
	// Stable "now" captured once at mount (lazy initializer) so render stays pure.
	const [now] = useState(() => Date.now());

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

	// Map each day (that an event spans) → list of events, so cells render in O(1).
	const eventsByDay = useMemo(() => {
		const map = new Map();
		for (const ev of events) {
			const end = startOfDay(ev.end_at);
			for (let d = startOfDay(ev.start_at); d <= end; d.setDate(d.getDate() + 1)) {
				const k = dayKey(d);
				if (!map.has(k)) map.set(k, []);
				map.get(k).push(ev);
			}
		}
		return map;
	}, [events]);

	const upcoming = useMemo(
		() => events.filter((e) => e.end_at >= now).sort((a, b) => a.start_at - b.start_at).slice(0, 6),
		[events, now],
	);

	// 6-week grid starting on the Monday on/before the 1st of the cursor month.
	const cells = useMemo(() => {
		const first = new Date(cursor);
		const offset = (first.getDay() + 6) % 7; // 0 = Monday
		const start = new Date(first);
		start.setDate(first.getDate() - offset);
		return Array.from({ length: 42 }, (_, i) => {
			const d = new Date(start);
			d.setDate(start.getDate() + i);
			return d;
		});
	}, [cursor]);

	if (loading || state === 'loading') return <div className="loading">Loading…</div>;

	const today = new Date(now);
	const monthLabel = cursor.toLocaleString([], { month: 'long', year: 'numeric' });
	const shiftMonth = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
	const canManage = hasPermission(PERMISSIONS.MANAGE_EVENTS);

	return (
		<div className="race-page home-calendar">
			<div className="cal-top">
				<h1>🏁 Race Calendar</h1>
				{canManage && <Link className="save-btn" to="/race">Manage events</Link>}
			</div>

			{state === 'error' && <p className="race-error">Failed to load events.</p>}
			{state === 'forbidden' && <p className="muted">You don’t have access to the race calendar yet — ask an admin.</p>}

			{state === 'ready' && (
				<>
					<div className="cal-header">
						<div className="cal-nav">
							<button className="link-btn" onClick={() => shiftMonth(-1)}>← Prev</button>
							<button className="link-btn" onClick={() => setCursor(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; })}>Today</button>
							<button className="link-btn" onClick={() => shiftMonth(1)}>Next →</button>
						</div>
						<h2 className="cal-month">{monthLabel}</h2>
					</div>

					<div className="cal-grid">
						{WEEKDAYS.map((w) => <div key={w} className="cal-weekday">{w}</div>)}
						{cells.map((d, i) => {
							const inMonth = d.getMonth() === cursor.getMonth();
							const dayEvents = eventsByDay.get(dayKey(d)) || [];
							return (
								<div key={i} className={`cal-cell ${inMonth ? '' : 'cal-out'} ${sameDay(d, today) ? 'cal-today' : ''}`}>
									<span className="cal-date">{d.getDate()}</span>
									<div className="cal-events">
										{dayEvents.map((ev) => (
											<button
												key={ev.id}
												className={`cal-chip ${ev.sim ? `accent-${ev.sim}` : ''}`}
												title={`${ev.name}${ev.sim ? ` · ${ev.car_class} @ ${ev.track}` : ''} · ${fmtDateTime(ev.start_at)}`}
												onClick={() => navigate(`/race/${ev.id}`)}
											>
												<span className="cal-chip-time">{fmtTime(ev.start_at)}</span> {ev.name}
											</button>
										))}
									</div>
								</div>
							);
						})}
					</div>

					<section className="upcoming">
						<h2>Upcoming</h2>
						{upcoming.length === 0 ? (
							<p className="muted">No upcoming events.{canManage ? ' Create one from Manage events.' : ''}</p>
						) : (
							<ul className="event-list">
								{upcoming.map((e) => (
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
					</section>
				</>
			)}
		</div>
	);
}
