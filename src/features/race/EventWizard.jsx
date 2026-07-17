import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { PERMISSIONS } from '../../auth/permissions';
import { simTheme, classLabel } from './sims';
import { toLocalInput, fromLocalInput, fmtDateTime } from './time';
import '../../styles/race.css';

const STEPS = ['Sim', 'Class', 'Track', 'Details', 'Review'];

export default function EventWizard() {
	const { loading, hasPermission } = useAuth();
	const navigate = useNavigate();
	const [catalog, setCatalog] = useState(null);
	const [step, setStep] = useState(0);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	// Wizard state
	const [sim, setSim] = useState(null);
	const [carClass, setCarClass] = useState(null);
	const [track, setTrack] = useState('');
	const now = new Date();
	const [name, setName] = useState('');
	const [startAt, setStartAt] = useState(toLocalInput(now.getTime() + 60 * 60 * 1000));
	const [endAt, setEndAt] = useState(toLocalInput(now.getTime() + 7 * 60 * 60 * 1000));
	const [stint, setStint] = useState(40);

	const canManage = hasPermission(PERMISSIONS.MANAGE_EVENTS);

	const load = useCallback(async () => {
		try { setCatalog(await api.catalog()); }
		catch { setError('Could not load catalog.'); }
	}, []);
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (!loading && canManage) load();
	}, [loading, canManage, load]);

	const tracks = useMemo(() => (sim && catalog ? catalog.tracks[sim] : []), [sim, catalog]);
	const previewCars = useMemo(
		() => (sim && carClass && catalog ? catalog.cars[sim][carClass] : []),
		[sim, carClass, catalog],
	);

	if (loading) return <div className="loading">Loading…</div>;
	if (!canManage) {
		return (
			<div className="race-page"><h1>New event</h1><p>You don’t have permission to create events.</p><Link to="/race">← Back</Link></div>
		);
	}
	if (!catalog) return <div className="race-page"><p>{error || 'Loading catalog…'}</p></div>;

	// Per-step gating of the Next button.
	const canNext = [Boolean(sim), Boolean(carClass), Boolean(track), Boolean(name.trim()) && fromLocalInput(endAt) > fromLocalInput(startAt), true][step];

	const submit = async () => {
		setBusy(true);
		setError(null);
		try {
			const { event } = await api.createEvent({
				name: name.trim(),
				startAt: fromLocalInput(startAt),
				endAt: fromLocalInput(endAt),
				stintMinutes: Number(stint),
				sim,
				carClass,
				track,
			});
			navigate(`/race/${event.id}`);
		} catch (e) {
			setError(e.message);
			setBusy(false);
		}
	};

	return (
		<div className="race-page wizard">
			<header className="race-header">
				<h1>New event</h1>
				<Link to="/race">← Cancel</Link>
			</header>

			<ol className="wizard-steps">
				{STEPS.map((s, i) => (
					<li key={s} className={`${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
						<span className="wizard-step-num">{i + 1}</span>{s}
					</li>
				))}
			</ol>

			<div className="card wizard-body">
				{step === 0 && (
					<Choice title="Which sim?">
						{catalog.sims.map((s) => {
							const t = simTheme(s.key);
							return (
								<button key={s.key} className={`pick-card ${t.className} ${sim === s.key ? 'selected' : ''}`}
									onClick={() => { setSim(s.key); setCarClass(null); setTrack(''); }}>
									<span className="pick-emoji">{t.emoji}</span>
									<strong>{s.label}</strong>
								</button>
							);
						})}
					</Choice>
				)}

				{step === 1 && (
					<Choice title="Which car class?">
						{catalog.classes.map((c) => {
							const count = catalog.cars[sim]?.[c.key]?.length || 0;
							return (
								<button key={c.key} className={`pick-card ${carClass === c.key ? 'selected' : ''}`}
									onClick={() => setCarClass(c.key)}>
									<strong>{c.label}</strong>
									<span className="muted">{count} car{count === 1 ? '' : 's'}</span>
								</button>
							);
						})}
					</Choice>
				)}

				{step === 2 && (
					<div className="field">
						<label>Track ({simTheme(sim).short})</label>
						<select value={track} onChange={(e) => setTrack(e.target.value)}>
							<option value="">— Select a track —</option>
							{tracks.map((t) => <option key={t} value={t}>{t}</option>)}
						</select>
					</div>
				)}

				{step === 3 && (
					<>
						<div className="field">
							<label>Event name</label>
							<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spa 6 Hours" />
						</div>
						<div className="field-row">
							<div className="field"><label>Start</label>
								<input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div>
							<div className="field"><label>End</label>
								<input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></div>
							<div className="field"><label>Stint (min)</label>
								<input type="number" min="1" max="600" value={stint} onChange={(e) => setStint(e.target.value)} /></div>
						</div>
						{fromLocalInput(endAt) <= fromLocalInput(startAt) && <p className="race-error">End must be after start.</p>}
					</>
				)}

				{step === 4 && (
					<div className="review">
						<h2>Review</h2>
						<dl className="review-list">
							<div><dt>Sim</dt><dd>{simTheme(sim).label}</dd></div>
							<div><dt>Class</dt><dd>{classLabel(carClass)}</dd></div>
							<div><dt>Track</dt><dd>{track}</dd></div>
							<div><dt>Name</dt><dd>{name}</dd></div>
							<div><dt>When</dt><dd>{fmtDateTime(fromLocalInput(startAt))} → {fmtDateTime(fromLocalInput(endAt))}</dd></div>
							<div><dt>Stint</dt><dd>{stint} min</dd></div>
							<div><dt>Car options</dt><dd>{previewCars.length} {classLabel(carClass)} cars will be available to vote on</dd></div>
						</dl>
						{error && <p className="race-error">{error}</p>}
					</div>
				)}
			</div>

			<div className="wizard-nav">
				<button className="link-btn" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>← Back</button>
				{step < STEPS.length - 1 ? (
					<button className="save-btn" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Next →</button>
				) : (
					<button className="save-btn" disabled={busy} onClick={submit}>{busy ? 'Creating…' : 'Create event'}</button>
				)}
			</div>
		</div>
	);
}

function Choice({ title, children }) {
	return (
		<div className="choice">
			<h2>{title}</h2>
			<div className="pick-grid">{children}</div>
		</div>
	);
}
