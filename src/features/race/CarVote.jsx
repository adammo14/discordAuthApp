import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { PERMISSIONS } from '../../auth/permissions';

// Car voting. Options are auto-generated from the catalog (sim + class), so there can be many —
// the driver picks from a dropdown, and the tally shows cars that have received votes.
export default function CarVote({ detail, onChange }) {
	const { hasPermission } = useAuth();
	const { event, cars, myVote, chosenCarId } = detail;
	const canManage = hasPermission(PERMISSIONS.MANAGE_EVENTS);
	const canVote = hasPermission(PERMISSIONS.VOTE_CAR);
	const [busy, setBusy] = useState(false);
	const [lockChoice, setLockChoice] = useState(chosenCarId || '');

	const run = async (fn) => {
		setBusy(true);
		try { await fn(); await onChange(); }
		catch (e) { alert(e.message); }
		finally { setBusy(false); }
	};

	const totalVotes = cars.reduce((n, c) => n + c.votes, 0);
	const voted = cars.filter((c) => c.votes > 0).sort((a, b) => b.votes - a.votes);
	const chosen = cars.find((c) => c.id === chosenCarId);

	if (cars.length === 0) {
		return (
			<section className="card">
				<h2>🚗 Car choice</h2>
				<p className="muted">No car options — this event has no sim/class set.</p>
			</section>
		);
	}

	return (
		<section className="card">
			<h2>🚗 Car choice</h2>

			{chosen && <p className="chosen-line">Locked car: <strong>{chosen.name}</strong> <span className="badge badge-admin">chosen</span></p>}

			{canVote && (
				<div className="field">
					<label>Your pick ({cars.length} options)</label>
					<select
						value={myVote || ''}
						disabled={busy}
						onChange={(e) => run(() => api.vote(event.id, Number(e.target.value)))}
					>
						<option value="" disabled>— Select a car —</option>
						{cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
					</select>
				</div>
			)}

			<div className="tally">
				<p className="muted">{totalVotes} vote{totalVotes === 1 ? '' : 's'}{voted.length ? '' : ' yet'}</p>
				<ul className="car-list">
					{voted.map((c) => {
						const pct = totalVotes ? Math.round((c.votes / totalVotes) * 100) : 0;
						return (
							<li key={c.id} className={`car-row ${c.id === chosenCarId ? 'chosen' : ''}`}>
								<span className="car-name">{c.name}</span>
								<div className="vote-bar"><span style={{ width: `${pct}%` }} /></div>
								<span className="muted vote-count">{c.votes}</span>
							</li>
						);
					})}
				</ul>
			</div>

			{canManage && (
				<div className="lock-row">
					<select value={lockChoice} onChange={(e) => setLockChoice(e.target.value)}>
						<option value="" disabled>— Lock final car —</option>
						{cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
					</select>
					<button className="save-btn" disabled={busy || !lockChoice} onClick={() => run(() => api.lockCar(event.id, Number(lockChoice)))}>
						Lock
					</button>
				</div>
			)}
		</section>
	);
}
