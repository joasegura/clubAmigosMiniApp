import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import AppLayout from './components/AppLayout'
import { Loading } from './components/ui'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Ranking from './pages/Ranking'
import Upload from './pages/Upload'
import WineDetail from './pages/WineDetail'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <Loading label="Abriendo el club…" />
  if (!session) return <Login />
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Feed />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="subir" element={<Upload />} />
        <Route path="vino/:id" element={<WineDetail />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  )
}
