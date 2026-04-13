import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Hub from './pages/Hub'
import Admin from './pages/Admin'

function RutaProtegida({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#5a7a94', background: '#f0f4f8' }}>
      Cargando...
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function RutaAdmin({ children }) {
  const { perfil, loading } = useAuth()
  if (loading) return null
  return perfil?.super_admin ? children : <Navigate to="/hub" replace />
}

function RutaPublica({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/hub" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<RutaPublica><Login /></RutaPublica>} />
      <Route path="/hub" element={<RutaProtegida><Hub /></RutaProtegida>} />
      <Route path="/admin" element={<RutaProtegida><RutaAdmin><Admin /></RutaAdmin></RutaProtegida>} />
      <Route path="*" element={<Navigate to="/hub" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
