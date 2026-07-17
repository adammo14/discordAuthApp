import { useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { PERMISSIONS } from '../../auth/permissions';

const fmtSize = (b) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

// Setup repository: upload (drivers+admins), download (anyone with view), delete (uploader/admin).
export default function SetupRepo({ detail, onChange }) {
	const { user, isAdmin, hasPermission } = useAuth();
	const { event, cars, setups } = detail;
	const canManage = hasPermission(PERMISSIONS.MANAGE_SETUPS);
	const fileRef = useRef(null);
	const [name, setName] = useState('');
	const [carId, setCarId] = useState('');
	const [busy, setBusy] = useState(false);

	const upload = async (e) => {
		e.preventDefault();
		const file = fileRef.current?.files?.[0];
		if (!file) return;
		setBusy(true);
		try {
			const fd = new FormData();
			fd.append('file', file);
			if (name.trim()) fd.append('name', name.trim());
			if (carId) fd.append('carId', carId);
			await api.uploadSetup(event.id, fd);
			setName('');
			setCarId('');
			if (fileRef.current) fileRef.current.value = '';
			await onChange();
		} catch (err) {
			alert(`Upload failed: ${err.message}`);
		} finally {
			setBusy(false);
		}
	};

	const remove = async (id) => {
		if (!confirm('Delete this setup?')) return;
		try { await api.deleteSetup(id); await onChange(); }
		catch (err) { alert(err.message); }
	};

	return (
		<section className="card">
			<h2>📁 Setup repository</h2>
			{setups.length === 0 && <p className="muted">No setups uploaded yet.</p>}
			<ul className="setup-list">
				{setups.map((s) => (
					<li key={s.id} className="setup-row">
						<div>
							<strong>{s.name}</strong>
							<div className="muted">
								{s.carName ? `${s.carName} · ` : ''}{fmtSize(s.size)} · by {s.uploaderName}
							</div>
						</div>
						<div className="setup-actions">
							<a className="link-btn" href={api.setupDownloadUrl(s.id)}>download</a>
							{(s.uploadedBy === user.id || isAdmin) && (
								<button className="link-btn danger" onClick={() => remove(s.id)}>delete</button>
							)}
						</div>
					</li>
				))}
			</ul>

			{canManage && (
				<form className="upload-form" onSubmit={upload}>
					<input type="file" ref={fileRef} required />
					<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Label (optional)" />
					<select value={carId} onChange={(e) => setCarId(e.target.value)}>
						<option value="">Any car</option>
						{cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
					</select>
					<button className="save-btn" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
				</form>
			)}
		</section>
	);
}
