import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { PERMISSIONS } from '../lib/permissions.js';
import { getCatalog, SIM_KEYS, CLASS_KEYS, isValidTrack } from '../lib/catalog.js';
import { recordAudit } from '../services/audit.service.js';
import * as race from '../services/race.service.js';

const router = Router();
router.use(requireAuth);

const SETUP_ROOT = path.resolve(process.cwd(), env.DB_PATH, '..', 'setups');

// --- validation schemas -----------------------------------------------------

const idParam = z.object({ id: z.coerce.number().int().positive() });
const setupIdParam = z.object({ id: z.coerce.number().int().positive() });
const carParam = z.object({ id: z.coerce.number().int().positive(), carId: z.coerce.number().int().positive() });

const eventBody = z
	.object({
		name: z.string().min(1).max(120),
		startAt: z.number().int(),
		endAt: z.number().int(),
		stintMinutes: z.number().int().min(1).max(600),
		sim: z.enum(SIM_KEYS),
		carClass: z.enum(CLASS_KEYS),
		track: z.string().min(1).max(120),
	})
	.refine((v) => v.endAt > v.startAt, { message: 'endAt must be after startAt' })
	.refine((v) => isValidTrack(v.sim, v.track), { message: 'track is not valid for this sim' });

const updateEventBody = z.object({
	name: z.string().min(1).max(120).optional(),
	startAt: z.number().int().optional(),
	endAt: z.number().int().optional(),
	stintMinutes: z.number().int().min(1).max(600).optional(),
	status: z.enum(['planning', 'locked']).optional(),
});

const carBody = z.object({ name: z.string().min(1).max(80) });
const voteBody = z.object({ carId: z.number().int().positive() });
const chosenCarBody = z.object({ carId: z.number().int().positive() });
const availabilityBody = z.object({
	windows: z
		.array(z.object({ startAt: z.number().int(), endAt: z.number().int() }).refine((w) => w.endAt > w.startAt))
		.max(20),
});

// Ensure the referenced event exists; attach it to req.
function loadEvent(req, _res, next) {
	const event = race.getEvent(req.params.id);
	if (!event) throw new HttpError(404, 'Event not found');
	req.event = event;
	next();
}

// --- events -----------------------------------------------------------------

// Static catalog (sims, classes, cars, tracks) for the creation wizard.
router.get('/catalog', requirePermission(PERMISSIONS.VIEW_RACE_PLANNER), (_req, res) => {
	res.json(getCatalog());
});

router.get('/events', requirePermission(PERMISSIONS.VIEW_RACE_PLANNER), (_req, res) => {
	res.json({ events: race.listEvents() });
});

router.post('/events', requirePermission(PERMISSIONS.MANAGE_EVENTS), validateBody(eventBody), (req, res) => {
	const event = race.createEvent({ ...req.body, createdBy: req.user.id });
	recordAudit({ actorId: req.user.id, action: 'event.create', targetId: String(event.id), detail: req.body });
	res.status(201).json({ event });
});

router.get('/events/:id', requirePermission(PERMISSIONS.VIEW_RACE_PLANNER), validateParams(idParam), loadEvent, (req, res) => {
	res.json(race.getEventDetail(req.params.id, req.user.id));
});

router.patch(
	'/events/:id',
	requirePermission(PERMISSIONS.MANAGE_EVENTS),
	validateParams(idParam),
	loadEvent,
	validateBody(updateEventBody),
	(req, res) => {
		const map = { name: 'name', startAt: 'start_at', endAt: 'end_at', stintMinutes: 'stint_minutes', status: 'status' };
		const fields = {};
		for (const [k, col] of Object.entries(map)) if (req.body[k] !== undefined) fields[col] = req.body[k];
		const event = race.updateEvent(req.params.id, fields);
		recordAudit({ actorId: req.user.id, action: 'event.update', targetId: String(event.id), detail: req.body });
		res.json({ event });
	},
);

router.delete('/events/:id', requirePermission(PERMISSIONS.MANAGE_EVENTS), validateParams(idParam), loadEvent, (req, res) => {
	race.deleteEvent(req.params.id);
	// Best-effort cleanup of the event's setup files.
	fs.rmSync(path.join(SETUP_ROOT, String(req.params.id)), { recursive: true, force: true });
	recordAudit({ actorId: req.user.id, action: 'event.delete', targetId: String(req.params.id) });
	res.json({ ok: true });
});

// --- cars & voting ----------------------------------------------------------

router.post(
	'/events/:id/cars',
	requirePermission(PERMISSIONS.MANAGE_EVENTS),
	validateParams(idParam),
	loadEvent,
	validateBody(carBody),
	(req, res) => {
		const car = race.addCar(req.params.id, req.body.name);
		recordAudit({ actorId: req.user.id, action: 'event.car.add', targetId: String(req.params.id), detail: car });
		res.status(201).json({ car });
	},
);

router.delete(
	'/events/:id/cars/:carId',
	requirePermission(PERMISSIONS.MANAGE_EVENTS),
	validateParams(carParam),
	loadEvent,
	(req, res) => {
		race.deleteCar(req.params.carId);
		res.json({ ok: true });
	},
);

router.put(
	'/events/:id/vote',
	requirePermission(PERMISSIONS.VOTE_CAR),
	validateParams(idParam),
	loadEvent,
	validateBody(voteBody),
	(req, res) => {
		if (!race.setVote(req.params.id, req.user.id, req.body.carId)) throw new HttpError(400, 'Invalid car for this event');
		res.json({ ok: true, carId: req.body.carId });
	},
);

router.put(
	'/events/:id/chosen-car',
	requirePermission(PERMISSIONS.MANAGE_EVENTS),
	validateParams(idParam),
	loadEvent,
	validateBody(chosenCarBody),
	(req, res) => {
		if (!race.setChosenCar(req.params.id, req.body.carId)) throw new HttpError(400, 'Invalid car for this event');
		recordAudit({ actorId: req.user.id, action: 'event.car.lock', targetId: String(req.params.id), detail: req.body });
		res.json({ ok: true });
	},
);

// --- availability & plan ----------------------------------------------------

router.put(
	'/events/:id/availability',
	requirePermission(PERMISSIONS.SUBMIT_AVAILABILITY),
	validateParams(idParam),
	loadEvent,
	validateBody(availabilityBody),
	(req, res) => {
		race.setAvailability(req.params.id, req.user.id, req.body.windows);
		res.json({ ok: true });
	},
);

router.get('/events/:id/plan', requirePermission(PERMISSIONS.VIEW_RACE_PLANNER), validateParams(idParam), loadEvent, (req, res) => {
	res.json(race.generatePlan(req.params.id));
});

// --- setups (file upload / download) ---------------------------------------

const MAX_SETUP_BYTES = 5 * 1024 * 1024;

const upload = multer({
	storage: multer.diskStorage({
		destination(req, _file, cb) {
			const dir = path.join(SETUP_ROOT, String(req.params.id));
			fs.mkdirSync(dir, { recursive: true });
			cb(null, dir);
		},
		// Never trust the client filename on disk: generate a random name, keep the extension only.
		filename(_req, file, cb) {
			const ext = path.extname(file.originalname).slice(0, 10).replace(/[^.a-zA-Z0-9]/g, '');
			cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
		},
	}),
	limits: { fileSize: MAX_SETUP_BYTES, files: 1 },
});

router.post(
	'/events/:id/setups',
	requirePermission(PERMISSIONS.MANAGE_SETUPS),
	validateParams(idParam),
	loadEvent,
	upload.single('file'),
	(req, res) => {
		if (!req.file) throw new HttpError(400, 'No file uploaded');
		const carId = req.body.carId ? Number(req.body.carId) : null;
		const name = (req.body.name || req.file.originalname).slice(0, 120);
		const setup = race.addSetup({
			event_id: Number(req.params.id),
			car_id: Number.isInteger(carId) ? carId : null,
			name,
			original_name: req.file.originalname.slice(0, 200),
			stored_name: req.file.filename,
			size: req.file.size,
			uploaded_by: req.user.id,
		});
		res.status(201).json({ setup });
	},
);

router.get('/setups/:id/download', requirePermission(PERMISSIONS.VIEW_RACE_PLANNER), validateParams(setupIdParam), (req, res) => {
	const setup = race.getSetup(req.params.id);
	if (!setup) throw new HttpError(404, 'Setup not found');
	// Reconstruct the path from stored (server-generated) names only — no client input in the path.
	const filePath = path.join(SETUP_ROOT, String(setup.event_id), setup.stored_name);
	if (!filePath.startsWith(SETUP_ROOT) || !fs.existsSync(filePath)) throw new HttpError(404, 'File missing');
	res.download(filePath, setup.original_name);
});

router.delete('/setups/:id', requirePermission(PERMISSIONS.MANAGE_SETUPS), validateParams(setupIdParam), (req, res) => {
	const setup = race.getSetup(req.params.id);
	if (!setup) throw new HttpError(404, 'Setup not found');
	// Only the uploader or an admin may delete.
	if (setup.uploaded_by !== req.user.id && !req.user.is_admin) throw new HttpError(403, 'Not allowed');
	race.deleteSetup(setup.id);
	fs.rmSync(path.join(SETUP_ROOT, String(setup.event_id), setup.stored_name), { force: true });
	res.json({ ok: true });
});

// Multer errors (e.g. file too large) → clean 400 instead of a 500.
router.use((err, _req, _res, next) => {
	if (err instanceof multer.MulterError) return next(new HttpError(400, `Upload failed: ${err.code}`));
	next(err);
});

export default router;
