// Presentation metadata for each sim. Keys mirror the server catalog (server/src/lib/catalog.js).
// `className` drives the color theme via CSS in styles/race.css.
export const SIM_THEME = {
	lmu: { label: 'Le Mans Ultimate', short: 'LMU', className: 'sim-lmu', emoji: '🟠' },
	iracing: { label: 'iRacing', short: 'iRacing', className: 'sim-iracing', emoji: '🔵' },
};

export function simTheme(sim) {
	return SIM_THEME[sim] || { label: sim || '—', short: sim || '—', className: 'sim-unknown', emoji: '🏁' };
}

// Class display labels.
export const CLASS_LABEL = { HY: 'Hypercar (HY)', LMP2: 'LMP2', GT3: 'GT3' };
export const classLabel = (c) => CLASS_LABEL[c] || c;
