import { Link } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginPage from './auth/LoginPage'
import EventCalendar from './features/race/EventCalendar'
import { PERMISSIONS } from './auth/permissions'
import './App.css'

function App() {
	const { user, isAdmin, loading, logout, hasPermission } = useAuth()

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
				{hasPermission(PERMISSIONS.VIEW_RACE_PLANNER) && <Link className="admin-link" to="/race">🏁 Race Planner</Link>}
				{isAdmin && <Link className="admin-link" to="/admin">Admin</Link>}
				<button onClick={logout}>Log out</button>
			</header>
			<EventCalendar />
		</>
	)
}

export default App
