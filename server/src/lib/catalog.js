// Sim → class → car and sim → track catalog. Single source of truth for the creation wizard and
// for auto-seeding an event's car-vote options. Presentation-only data; safe to extend.

export const SIMS = [
	{ key: 'lmu', label: 'Le Mans Ultimate' },
	{ key: 'iracing', label: 'iRacing' },
];

export const CLASSES = [
	{ key: 'HY', label: 'Hypercar (HY)' },
	{ key: 'LMP2', label: 'LMP2' },
	{ key: 'GT3', label: 'GT3' },
];

// Cars keyed by sim then class.
export const CARS = {
	lmu: {
		HY: [
			'Alpine A424',
			'Aston Martin Valkyrie AMR-LMH',
			'BMW M Hybrid V8',
			'Cadillac V-Series.R',
			'Ferrari 499P',
			'Glickenhaus SCG 007',
			'Isotta Fraschini Tipo 6',
			'Lamborghini SC63',
			'Peugeot 9X8',
			'Peugeot 9X8 2024',
			'Porsche 963',
			'Toyota GR010-Hybrid',
			'Vanwall Vandervell 680',
		],
		LMP2: ['ORECA 07 Gibson 2023', 'ORECA 07 Gibson 2024'],
		GT3: [
			'Ford Mustang LMGT3',
			'McLaren 720S LMGT3 Evo',
			'Mercedes-AMG LMGT3',
			'BMW M4 LMGT3',
			'Aston Martin Vantage AMR LMGT3',
			'Corvette Z06 LMGT3.R',
			'Ferrari 296 LMGT3',
			'Lamborghini Huracán LMGT3 Evo2',
			'Lexus RC F LMGT3',
			'Porsche 911 GT3 R',
		],
	},
	iracing: {
		HY: [
			'Acura ARX-06 GTP',
			'BMW M Hybrid V8 (Evo)',
			'Cadillac V-Series.R GTP',
			'Ferrari 499P',
			'Porsche 963 GTP',
		],
		LMP2: ['Dallara P217'],
		GT3: [
			'Acura NSX GT3 Evo 22',
			'Audi R8 LMS EVO II GT3',
			'BMW M4 GT3',
			'Chevrolet Corvette Z06 GT3.R',
			'Ferrari 296 GT3',
			'Ford Mustang GT3',
			'Lamborghini Huracán GT3 EVO',
			'McLaren 720S GT3 EVO',
			'Mercedes-AMG GT3 2020',
			'Porsche 911 GT3 R (992)',
		],
	},
};

// Tracks keyed by sim.
export const TRACKS = {
	lmu: [
		'Autodromo Nazionale Monza',
		'Circuit de Spa-Francorchamps',
		'Sebring International Raceway',
		'Bahrain International Circuit',
		'Algarve International Circuit (Portimão)',
		'Fuji Speedway',
		'Circuit de la Sarthe (Le Mans)',
		'Circuit Paul Ricard',
		'Circuit of the Americas',
		'Imola',
		'Interlagos',
		'Lusail International Circuit',
		'Silverstone Circuit',
	],
	iracing: [
		'Circuit de Spa-Francorchamps',
		'Autodromo Nazionale Monza',
		'Sebring International Raceway',
		'Circuit de la Sarthe (Le Mans)',
		'Nürburgring 24h Combined',
		'Daytona International Speedway (Road)',
		'Watkins Glen International',
		'Road America',
		'Circuit of the Americas',
		'Interlagos',
		'Suzuka Circuit',
		'Bahrain International Circuit',
		'Fuji Speedway',
		'Silverstone Circuit',
		'Imola',
	],
};

export const SIM_KEYS = SIMS.map((s) => s.key);
export const CLASS_KEYS = CLASSES.map((c) => c.key);

export function carsFor(sim, cls) {
	return CARS[sim]?.[cls] ?? [];
}

export function tracksFor(sim) {
	return TRACKS[sim] ?? [];
}

export function isValidSim(sim) {
	return SIM_KEYS.includes(sim);
}

export function isValidClass(cls) {
	return CLASS_KEYS.includes(cls);
}

export function isValidTrack(sim, track) {
	return tracksFor(sim).includes(track);
}

// Full catalog payload for the client wizard.
export function getCatalog() {
	return { sims: SIMS, classes: CLASSES, cars: CARS, tracks: TRACKS };
}
