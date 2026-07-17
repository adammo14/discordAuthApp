import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import AuthCallback from './auth/AuthCallback'
import AdminPage from './features/admin/AdminPage'
import RacePlannerPage from './features/race/RacePlannerPage'
import EventWizard from './features/race/EventWizard'
import EventDetailPage from './features/race/EventDetailPage'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/auth/callback" element={<AuthCallback />} />
					<Route path="/admin" element={<AdminPage />} />
					<Route path="/race" element={<RacePlannerPage />} />
					<Route path="/race/new" element={<EventWizard />} />
					<Route path="/race/:id" element={<EventDetailPage />} />
					<Route path="*" element={<App />} />
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	</StrictMode>,
)
