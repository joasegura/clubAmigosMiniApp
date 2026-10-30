import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import AppLayout from './components/AppLayout'
import { Loading } from './components/ui'
import { FeedbackProvider } from './components/feedback'
import Login from './pages/Login'
import Feed from './pages/Feed'

// El resto de las pantallas no viene en la carga inicial: se descargan en segundo plano después de entrar
const pages = {
  welcome: () => import('./pages/Welcome'),
  ranking: () => import('./pages/Ranking'),
  upload: () => import('./pages/Upload'),
  wine: () => import('./pages/WineDetail'),
  profile: () => import('./pages/Profile'),
  card: () => import('./pages/MemberCard'),
  admin: () => import('./pages/Admin'),
  legal: () => import('./pages/Legal'),
}
const Welcome = lazy(pages.welcome)
const Ranking = lazy(pages.ranking)
const Upload = lazy(pages.upload)
const WineDetail = lazy(pages.wine)
const Profile = lazy(pages.profile)
const MemberCard = lazy(pages.card)
const Admin = lazy(pages.admin)
const Legal = lazy(pages.legal)

/** Precarga las pantallas cuando el celular está libre, así al tocarlas abren al instante */
function usePrefetchPages(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const run = () => Object.values(pages).forEach((load) => void load().catch(() => undefined))
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const t = setTimeout(run, 1500)
    return () => clearTimeout(t)
  }, [enabled])
}

function Club() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Feed />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="subir" element={<Upload />} />
        <Route path="vino/:id" element={<WineDetail />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="tarjeta" element={<MemberCard />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Gate() {
  const { profile } = useAuth()
  usePrefetchPages(Boolean(profile))
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
        <FeedbackProvider>
          <Gate />
        </FeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
