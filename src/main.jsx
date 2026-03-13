import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import AuthCallback from './auth/AuthCallback'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/auth/callback" element={<AuthCallback />} />
					<Route path="*" element={<App />} />
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	</StrictMode>,
)
