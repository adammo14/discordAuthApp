import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { useAuth } from './auth/AuthContext'
import LoginPage from './auth/LoginPage'
import './App.css'

function App() {
	const { user, loading, logout } = useAuth()
	const [count, setCount] = useState(0)

	if (loading) {
		return <div className="loading">Loading…</div>
	}

	if (!user) {
		return <LoginPage />
	}

	return (
		<>
			<header className="user-bar">
				{user.avatar && <img src={user.avatar} alt="" className="avatar" />}
				<span>{user.globalName || user.username}</span>
				<button onClick={logout}>Log out</button>
			</header>
			<section id="center">
				<div className="hero">
					<img src={heroImg} className="base" width="170" height="179" alt="" />
					<img src={reactLogo} className="framework" alt="React logo" />
					<img src={viteLogo} className="vite" alt="Vite logo" />
				</div>
				<div>
					<h1>Get started</h1>
					<p>Edit <code>src/App.jsx</code> and save to test <code>HMR</code></p>
				</div>
				<button className="counter" onClick={() => setCount((count) => count + 1)}>Count is {count}</button>
			</section>
		</>
	)
}

export default App
