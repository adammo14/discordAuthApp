// Helpers to bridge epoch-ms (what the API uses) and <input type="datetime-local"> (local wall time).

// epoch ms → "YYYY-MM-DDTHH:mm" in the browser's local timezone.
export function toLocalInput(ms) {
	if (ms == null) return '';
	const d = new Date(ms);
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "YYYY-MM-DDTHH:mm" (local) → epoch ms.
export function fromLocalInput(value) {
	if (!value) return null;
	return new Date(value).getTime();
}

export function fmtTime(ms) {
	return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(ms) {
	return new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}
