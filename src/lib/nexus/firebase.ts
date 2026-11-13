/**
 * Ingreso con Google vía Firebase Authentication.
 * Usa el MISMO proyecto de Firebase que la API de Nexus (que verifica el token con firebase-admin).
 * El SDK se carga recién cuando el socio toca "Continuar con Google" (no pesa en la carga inicial).
 *
 * Variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID
 * (las mismas que usa atom-crm-front).
 */
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || '',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) || '',
}

export const GOOGLE_LOGIN_ENABLED = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId)

/** Códigos de Firebase que significan "el socio cerró o canceló": no son errores para mostrar */
const CANCELLED_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'])

const FRIENDLY_ERRORS: Record<string, string> = {
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes y probá de nuevo.',
  'auth/network-request-failed': 'No hay conexión. Revisá tu internet y probá de nuevo.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado para ingresar con Google. Avisale a la vinoteca.',
  'auth/operation-not-allowed': 'El ingreso con Google no está habilitado. Avisale a la vinoteca.',
}

/**
 * Abre el popup de Google y devuelve el ID token de Firebase para mandarle a Nexus.
 * Devuelve null si el socio cerró la ventana (no es un error).
 */
export async function getGoogleIdToken(): Promise<string | null> {
  if (!GOOGLE_LOGIN_ENABLED) throw new Error('El ingreso con Google no está configurado')

  const [{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, signInWithPopup, signOut }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ])
  const app = getApps()[0] ?? initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  try {
    const result = await signInWithPopup(auth, provider)
    const token = await result.user.getIdToken()
    // La sesión que vale es la de Nexus: no se deja abierta la sesión de Firebase en el dispositivo
    await signOut(auth).catch(() => undefined)
    return token
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    if (CANCELLED_CODES.has(code)) return null
    throw new Error(FRIENDLY_ERRORS[code] ?? 'No se pudo ingresar con Google, probá de nuevo.')
  }
}
