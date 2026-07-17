// Pure stint-scheduling logic. No DB or HTTP here so it stays easy to reason about and test.
//
// Given a race window, a stint length, and each driver's availability windows, produce a plan
// that assigns each stint to exactly one eligible driver, balancing load across drivers and
// flagging any stint that nobody can cover.

// Build the ordered list of stint intervals. The final stint may be shorter than stintMinutes if
// the race window doesn't divide evenly.
export function buildStints(startAt, endAt, stintMinutes) {
	const len = stintMinutes * 60 * 1000;
	const stints = [];
	let from = startAt;
	let index = 0;
	while (from < endAt) {
		const to = Math.min(from + len, endAt);
		stints.push({ index, from, to });
		from = to;
		index += 1;
	}
	return stints;
}

// A driver can take a stint only if one availability window fully covers it (no mid-stint handover).
function coversStint(windows, stint) {
	return windows.some((w) => w.start_at <= stint.from && w.end_at >= stint.to);
}

/**
 * @param {object} args
 * @param {number} args.startAt epoch ms
 * @param {number} args.endAt epoch ms
 * @param {number} args.stintMinutes
 * @param {Array<{ id: string, name: string, windows: Array<{start_at:number,end_at:number}> }>} args.drivers
 * @returns {{ stints, totals, uncovered, feasible }}
 */
export function planStints({ startAt, endAt, stintMinutes, drivers }) {
	const stints = buildStints(startAt, endAt, stintMinutes);

	// Eligibility per stint.
	const eligibility = stints.map((s) => drivers.filter((d) => coversStint(d.windows, s)).map((d) => d.id));

	const assignment = new Array(stints.length).fill(null);
	const load = new Map(drivers.map((d) => [d.id, 0]));

	// Count how many stints each driver is still eligible-and-unassigned for; used as a tie-break so
	// drivers with scarce availability get priority.
	const remainingEligible = new Map(drivers.map((d) => [d.id, 0]));
	eligibility.forEach((ids) => ids.forEach((id) => remainingEligible.set(id, remainingEligible.get(id) + 1)));

	// Assign most-constrained stints first (fewest eligible drivers).
	const order = stints
		.map((s, i) => i)
		.sort((a, b) => eligibility[a].length - eligibility[b].length);

	for (const i of order) {
		const candidates = eligibility[i];
		// This stint's candidates are no longer "remaining" once we decide it.
		candidates.forEach((id) => remainingEligible.set(id, remainingEligible.get(id) - 1));

		if (candidates.length === 0) continue; // uncovered — leave null

		// Pick: lowest current load, then scarcest remaining availability, then stable by id.
		let best = null;
		for (const id of candidates) {
			if (
				best === null ||
				load.get(id) < load.get(best) ||
				(load.get(id) === load.get(best) && remainingEligible.get(id) < remainingEligible.get(best)) ||
				(load.get(id) === load.get(best) && remainingEligible.get(id) === remainingEligible.get(best) && id < best)
			) {
				best = id;
			}
		}
		assignment[i] = best;
		load.set(best, load.get(best) + 1);
	}

	const nameById = new Map(drivers.map((d) => [d.id, d.name]));
	const planStintsOut = stints.map((s, i) => ({
		index: s.index,
		from: s.from,
		to: s.to,
		driverId: assignment[i],
		driverName: assignment[i] ? nameById.get(assignment[i]) : null,
		eligibleCount: eligibility[i].length,
	}));

	const totals = drivers
		.map((d) => ({ id: d.id, name: d.name, stints: load.get(d.id) }))
		.sort((a, b) => b.stints - a.stints);

	const uncovered = planStintsOut.filter((s) => s.driverId === null).map((s) => s.index);

	return { stints: planStintsOut, totals, uncovered, feasible: uncovered.length === 0 };
}
