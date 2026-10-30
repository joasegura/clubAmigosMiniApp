import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { getCurrentProfile, signInAsShop, signInDemo, signOutDemo } from './api'
import type { Profile } from './types'

/**
 * DEMO: el ingreso es simulado. En producción, "Continuar con Google" y el
 * código por mail los resuelve el proveedor de login; acá se simula el mismo
 * flujo para poder mostrarlo. El código de 6 dígitos se muestra en pantalla.
 */
interface AuthState {
  profile: Profile | null
  isAdmin: boolean
  refreshProfile: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  /** Devuelve el código (en la demo se muestra en pantalla en vez de mandarlo por mail) */
  sendCode: (email: string) => Promise<string>
  verifyCode: (email: string, code: string) => Promise<void>
  signInAsShop: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() => getCurrentProfile())
  const [pending, setPending] = useState<{ email: string; code: string } | null>(null)

  const refreshProfile = useCallback(async () => setProfile(getCurrentProfile()), [])

  const value: AuthState = {
    profile,
    isAdmin: profile?.role === 'admin',
    refreshProfile,
    signInWithGoogle: async () => {
      setProfile(await signInDemo('socio.demo@gmail.com', 'Socio Demo'))
    },
    sendCode: async (email: string) => {
      const clean = email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Revisá el mail, parece que tiene un error')
      const code = String(Math.floor(100000 + Math.random() * 900000))
      setPending({ email: clean, code })
      return code
    },
    verifyCode: async (email: string, code: string) => {
      const clean = email.trim().toLowerCase()
      if (!pending || pending.email !== clean) throw new Error('Pedí un código nuevo')
      if (code.replace(/\D/g, '') !== pending.code) throw new Error('El código no es correcto')
      setPending(null)
      setProfile(await signInDemo(clean))
    },
    signInAsShop: async () => {
      setProfile(await signInAsShop())
    },
    signOut: async () => {
      await signOutDemo()
      setProfile(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fuera de AuthProvider')
  return ctx
}
