import { useAuth } from './AuthContext';
import discord from '../assets/discord.svg';

export default function LoginPage() {
	const { login } = useAuth();

	return (
		<div className="login-page">
			<h1 style={{marginBottom: 10}}>Welcome</h1>
			<p style={{marginTop: 0}}>Please sign in with Discord to continue.</p>
			<button className="discord-btn" onClick={login}>
				<img src={discord} height={30} alt="Discord logo"/>
				Sign in with Discord
			</button>
		</div>
	);
}
