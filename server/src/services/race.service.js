import { db } from '../db/index.js';
import { planStints } from '../lib/stintPlanner.js';
import { carsFor } from '../lib/catalog.js';

// --- Events -----------------------------------------------------------------

// Create an event and auto-seed its car-vote options from the catalog for the chosen sim+class.
export const createEvent = db.transaction(({ name, startAt, endAt, stintMinutes, sim, carClass, track, createdBy }) => {
	const info = db
		.prepare(
			`INSERT INTO events (name, start_at, end_at, stint_minutes, status, sim, car_class, track, created_by, created_at)
			 VALUES (?, ?, ?, ?, 'planning', ?, ?, ?, ?, ?)`,
		)
		.run(name, startAt, endAt, stintMinutes, sim ?? null, carClass ?? null, track ?? null, createdBy, Date.now());
	const eventId = info.lastInsertRowid;

	// Populate the vote options with every catalog car for this sim+class.
	if (sim && carClass) {
		const insertCar = db.prepare('INSERT INTO event_cars (event_id, name) VALUES (?, ?)');
		for (const carName of carsFor(sim, carClass)) insertCar.run(eventId, carName);
	}
	return getEvent(eventId);
});

export function getEvent(id) {
	return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}

export function listEvents() {
	return db
		.prepare('SELECT * FROM events ORDER BY start_at DESC')
		.all()
		.map((e) => ({ ...e, carCount: countCars(e.id), voteCount: countVotes(e.id) }));
}

export function updateEvent(id, fields) {
	const allowed = ['name', 'start_at', 'end_at', 'stint_minutes', 'status'];
	const keys = Object.keys(fields).filter((k) => allowed.includes(k));
	if (keys.length === 0) return getEvent(id);
	const setSql = keys.map((k) => `${k} = ?`).join(', ');
	db.prepare(`UPDATE events SET ${setSql} WHERE id = ?`).run(...keys.map((k) => fields[k]), id);
	return getEvent(id);
}

export function deleteEvent(id) {
	db.prepare('DELETE FROM events WHERE id = ?').run(id);
}

const countCars = (eventId) => db.prepare('SELECT COUNT(*) n FROM event_cars WHERE event_id = ?').get(eventId).n;
const countVotes = (eventId) => db.prepare('SELECT COUNT(*) n FROM car_votes WHERE event_id = ?').get(eventId).n;

// --- Cars & voting ----------------------------------------------------------

export function addCar(eventId, name) {
	const info = db.prepare('INSERT INTO event_cars (event_id, name) VALUES (?, ?)').run(eventId, name);
	return db.prepare('SELECT * FROM event_cars WHERE id = ?').get(info.lastInsertRowid);
}

export function getCar(carId) {
	return db.prepare('SELECT * FROM event_cars WHERE id = ?').get(carId);
}

export function deleteCar(carId) {
	db.prepare('DELETE FROM event_cars WHERE id = ?').run(carId);
}

// Cars with their vote counts.
export function carsWithVotes(eventId) {
	return db
		.prepare(
			`SELECT c.id, c.name, COUNT(v.user_id) AS votes
			 FROM event_cars c
			 LEFT JOIN car_votes v ON v.car_id = c.id
			 WHERE c.event_id = ?
			 GROUP BY c.id ORDER BY c.id`,
		)
		.all(eventId);
}

// Set (or change) a user's vote. Returns false if the car doesn't belong to the event.
export function setVote(eventId, userId, carId) {
	const car = getCar(carId);
	if (!car || car.event_id !== Number(eventId)) return false;
	db.prepare(
		`INSERT INTO car_votes (event_id, user_id, car_id) VALUES (?, ?, ?)
		 ON CONFLICT(event_id, user_id) DO UPDATE SET car_id = excluded.car_id`,
	).run(eventId, userId, carId);
	return true;
}

export function getUserVote(eventId, userId) {
	const row = db.prepare('SELECT car_id FROM car_votes WHERE event_id = ? AND user_id = ?').get(eventId, userId);
	return row ? row.car_id : null;
}

// Lock the chosen car for an event.
export function setChosenCar(eventId, carId) {
	const car = getCar(carId);
	if (!car || car.event_id !== Number(eventId)) return false;
	db.prepare("UPDATE events SET chosen_car_id = ?, status = 'locked' WHERE id = ?").run(carId, eventId);
	return true;
}

// --- Availability -----------------------------------------------------------

// Replace a user's availability windows for an event.
export const setAvailability = db.transaction((eventId, userId, windows) => {
	db.prepare('DELETE FROM availability WHERE event_id = ? AND user_id = ?').run(eventId, userId);
	const insert = db.prepare('INSERT INTO availability (event_id, user_id, start_at, end_at) VALUES (?, ?, ?, ?)');
	for (const w of windows) insert.run(eventId, userId, w.startAt, w.endAt);
});

// Availability grouped per user (with display name), for the detail view + scheduler.
export function availabilityByUser(eventId) {
	const rows = db
		.prepare(
			`SELECT a.user_id, a.start_at, a.end_at, u.global_name, u.username
			 FROM availability a JOIN users u ON u.id = a.user_id
			 WHERE a.event_id = ? ORDER BY a.start_at`,
		)
		.all(eventId);
	const map = new Map();
	for (const r of rows) {
		if (!map.has(r.user_id)) {
			map.set(r.user_id, { id: r.user_id, name: r.global_name || r.username, windows: [] });
		}
		map.get(r.user_id).windows.push({ start_at: r.start_at, end_at: r.end_at });
	}
	return [...map.values()];
}

// --- Setups -----------------------------------------------------------------

export function addSetup(meta) {
	const info = db
		.prepare(
			`INSERT INTO setups (event_id, car_id, name, original_name, stored_name, size, uploaded_by, created_at)
			 VALUES (@event_id, @car_id, @name, @original_name, @stored_name, @size, @uploaded_by, @created_at)`,
		)
		.run({ ...meta, created_at: Date.now() });
	return getSetup(info.lastInsertRowid);
}

export function getSetup(id) {
	return db.prepare('SELECT * FROM setups WHERE id = ?').get(id);
}

export function listSetups(eventId) {
	return db
		.prepare(
			`SELECT s.*, u.global_name, u.username, c.name AS car_name
			 FROM setups s
			 JOIN users u ON u.id = s.uploaded_by
			 LEFT JOIN event_cars c ON c.id = s.car_id
			 WHERE s.event_id = ? ORDER BY s.created_at DESC`,
		)
		.all(eventId)
		.map((s) => ({
			id: s.id,
			name: s.name,
			originalName: s.original_name,
			size: s.size,
			carId: s.car_id,
			carName: s.car_name,
			uploadedBy: s.uploaded_by,
			uploaderName: s.global_name || s.username,
			createdAt: s.created_at,
		}));
}

export function deleteSetup(id) {
	db.prepare('DELETE FROM setups WHERE id = ?').run(id);
}

// --- Detail + plan ----------------------------------------------------------

// Everything the event detail screen needs, tailored to the requesting user.
export function getEventDetail(eventId, userId) {
	const event = getEvent(eventId);
	if (!event) return null;
	return {
		event,
		cars: carsWithVotes(eventId),
		chosenCarId: event.chosen_car_id,
		myVote: getUserVote(eventId, userId),
		myAvailability: db
			.prepare('SELECT start_at, end_at FROM availability WHERE event_id = ? AND user_id = ? ORDER BY start_at')
			.all(eventId, userId),
		availability: availabilityByUser(eventId),
		setups: listSetups(eventId),
	};
}

// Run the scheduler over stored availability.
export function generatePlan(eventId) {
	const event = getEvent(eventId);
	if (!event) return null;
	const drivers = availabilityByUser(eventId);
	return planStints({
		startAt: event.start_at,
		endAt: event.end_at,
		stintMinutes: event.stint_minutes,
		drivers,
	});
}
