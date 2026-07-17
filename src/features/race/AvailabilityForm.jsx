import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { PERMISSIONS } from '../../auth/permissions';
import { toLocalInput, fromLocalInput, fmtTime } from './time';

// A driver submits their own availability windows; everyone sees who's available.
export default function AvailabilityForm({ detail, onChange }) {
	const { hasPermission } = useAuth();
	const { event, myAvailability, availability } = detail;
	const canSubmit = hasPermission(PERMISSIONS.SUBMIT_AVAILABILITY);

	// Local editable copy of my windows (default to the whole race window if none yet).
	const [windows, setWindows] = useState(() =>
		myAvailability.length
			? myAvailability.map((w) => ({ start: toLocalInput(w.start_at), end: toLocalInput(w.end_at) }))
			: [{ start: toLocalInput(event.start_at), end: toLocalInput(event.end_at) }],
	);
	const [busy, setBusy] = useState(false);

	const update = (i, key, val) => setWindows((w) => w.map((row, j) => (j === i ? { ...row, [key]: val } : row)));
	const addRow = () => setWindows((w) => [...w, { start: toLocalInput(event.start_at), end: toLocalInput(event.end_at) }]);
	const removeRow = (i) => setWindows((w) => w.filter((_, j) => j !== i));

	const save = async () => {
		setBusy(true);
		try {
			const payload = windows
				.map((w) => ({ startAt: fromLocalInput(w.start), endAt: fromLocalInput(w.end) }))
				.filter((w) => w.startAt && w.endAt && w.endAt > w.startAt);
			await api.setAvailability(event.id, payload);
			await onChange();
		} catch (e) {
			alert(e.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="card">
			<h2>🕒 Availability</h2>

			{canSubmit ? (
				<div className="avail-edit">
					<p className="muted">Your availability windows:</p>
					{windows.map((w, i) => (
						<div className="field-row avail-row" key={i}>
							<input type="datetime-local" value={w.start} onChange={(e) => update(i, 'start', e.target.value)} />
							<span>→</span>
							<input type="datetime-local" value={w.end} onChange={(e) => update(i, 'end', e.target.value)} />
							<button className="link-btn danger" onClick={() => removeRow(i)} type="button">✕</button>
						</div>
					))}
					<div className="avail-actions">
						<button className="link-btn" type="button" onClick={addRow}>+ add window</button>
						<button className="save-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save availability'}</button>
					</div>
				</div>
			) : (
				<p className="muted">You don’t have permission to submit availability.</p>
			)}

			<div className="avail-summary">
				<p className="muted">Team ({availability.length} available):</p>
				{availability.length === 0 && <p className="muted">Nobody has submitted yet.</p>}
				<ul>
					{availability.map((d) => (
						<li key={d.id}>
							<strong>{d.name}</strong>{' '}
							<span className="muted">{d.windows.map((w) => `${fmtTime(w.start_at)}–${fmtTime(w.end_at)}`).join(', ')}</span>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
