import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
	origin: process.env.CLIENT_URL,
	credentials: true,
}));
app.use(express.json());

// In-memory session store (replace with a database/Redis in production)
const sessions = new Map();

function createSession(user) {
	const token = crypto.randomBytes(32).toString('hex');
	sessions.set(token, { user, createdAt: Date.now() });
	return token;
}

// Redirect user to Discord OAuth2
app.get('/api/auth/discord', (_req, res) => {
	const params = new URLSearchParams({
		client_id: process.env.DISCORD_CLIENT_ID,
		redirect_uri: process.env.DISCORD_REDIRECT_URI,
		response_type: 'code',
		scope: 'identify email',
	});
	res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// Discord callback – exchange code for token, fetch user, create session
app.get('/api/auth/discord/callback', async (req, res) => {
	const { code, error } = req.query;

	// User cancelled the Discord consent screen
	if (error === 'access_denied') {
		return res.redirect(`${process.env.CLIENT_URL}/auth/callback?error=cancelled`);
	}

	if (!code) return res.status(400).send('Missing code');

	try {
		// Exchange code for access token
		const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: process.env.DISCORD_CLIENT_ID,
				client_secret: process.env.DISCORD_CLIENT_SECRET,
				grant_type: 'authorization_code',
				code,
				redirect_uri: process.env.DISCORD_REDIRECT_URI,
			}),
		});

		if (!tokenRes.ok) {
			return res.status(400).send('Failed to exchange code');
		}

		const tokenData = await tokenRes.json();

		// Fetch Discord user info
		const userRes = await fetch('https://discord.com/api/users/@me', {
			headers: { Authorization: `Bearer ${tokenData.access_token}` },
		});

		if (!userRes.ok) {
			return res.status(400).send('Failed to fetch user');
		}

		const discordUser = await userRes.json();
		const user = {
			id: discordUser.id,
			username: discordUser.username,
			globalName: discordUser.global_name,
			avatar: discordUser.avatar
				? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
				: null,
			email: discordUser.email,
		};

		const sessionToken = createSession(user);

		// Redirect back to client with session token
		res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${sessionToken}`);
	} catch (err) {
		console.error('OAuth callback error:', err);
		res.status(500).send('Internal server error');
	}
});

// Get current user from session token
app.get('/api/auth/me', (req, res) => {
	const token = req.headers.authorization?.replace('Bearer ', '');
	if (!token || !sessions.has(token)) {
		return res.status(401).json({ user: null });
	}
	res.json({ user: sessions.get(token).user });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
	const token = req.headers.authorization?.replace('Bearer ', '');
	if (token) sessions.delete(token);
	res.json({ ok: true });
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
