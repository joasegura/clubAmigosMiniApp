import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import AppLayout from './components/AppLayout'
import { Loading } from './components/ui'
import Login from './pages/Login'
import Feed from './pages/Feed'

// El resto de las pantallas se descarga recién cuando se abre
const Welcome = lazy(() => import('./pages/Welcome'))
const Ranking = lazy(() => import('./pages/Ranking'))
const Upload = lazy(() => import('./pages/Upload'))
const WineDetail = lazy(() => import('./pages/WineDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Admin = lazy(() => import('./pages/Admin'))
const Legal = lazy(() => import('./pages/Legal'))

function Club() {
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

function Gate() {
  const { profile } = useAuth()
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Términos y privacidad se pueden leer sin ingresar */}
        <Route path="terminos" element={<Legal kind="terminos" />} />
        <Route path="privacidad" element={<Legal kind="privacidad" />} />
        <Route path="*" element={!profile ? <Login /> : !profile.display_name ? <Welcome /> : <Club />} />
      </Routes>
    </Suspense>
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
