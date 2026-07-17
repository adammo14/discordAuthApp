import { useState } from 'react';
import { api } from '../../api/client';
import { fmtTime } from './time';

// Generate + display the suggested stint plan from submitted availability.
export default function StintPlan({ eventId }) {
	const [plan, setPlan] = useState(null);
	const [busy, setBusy] = useState(false);

	const generate = async () => {
		setBusy(true);
		try {
			setPlan(await api.plan(eventId));
		} catch (e) {
			alert(e.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="card stint-card">
			<div className="stint-head">
				<h2>📋 Suggested stint plan</h2>
				<button className="save-btn" disabled={busy} onClick={generate}>{busy ? 'Planning…' : plan ? 'Regenerate' : 'Generate plan'}</button>
			</div>

			{!plan && <p className="muted">Generate a plan from the team’s submitted availability.</p>}

			{plan && (
				<>
					{!plan.feasible && (
						<p className="race-error">
							⚠️ {plan.uncovered.length} stint(s) can’t be covered by anyone available. Add more availability.
						</p>
					)}
					<div className="table-scroll">
						<table className="stint-table">
							<thead>
								<tr><th>#</th><th>From</th><th>To</th><th>Driver</th></tr>
							</thead>
							<tbody>
								{plan.stints.map((s) => (
									<tr key={s.index} className={s.driverId ? '' : 'uncovered'}>
										<td>{s.index + 1}</td>
										<td>{fmtTime(s.from)}</td>
										<td>{fmtTime(s.to)}</td>
										<td>{s.driverName || <span className="race-error">— none available —</span>}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="stint-totals">
						{plan.totals.map((t) => (
							<span key={t.id} className="badge">{t.name}: {t.stints}</span>
						))}
					</div>
				</>
			)}
		</section>
	);
}
