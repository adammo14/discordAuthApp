import { simTheme, classLabel } from './sims';

// Sim badge (colored by sim), optionally showing the car class and/or track.
export default function SimBadge({ sim, carClass, track, size = 'sm' }) {
	if (!sim) return null;
	const t = simTheme(sim);
	return (
		<span className={`sim-badge ${t.className} sim-${size}`}>
			<span className="sim-badge-name">{t.short}</span>
			{carClass && <span className="sim-badge-sep">{classLabel(carClass)}</span>}
			{track && <span className="sim-badge-sep">{track}</span>}
		</span>
	);
}
