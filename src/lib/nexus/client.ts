/**
 * Cliente HTTP de la API de Nexus para la miniapp.
 *
 * Se activa con dos variables de entorno:
 *  - VITE_NEXUS_API_URL: URL de la API con el prefijo /api (ej. https://api-nexus.atomsolucionesit.com.ar/api)
 *  - VITE_NEXUS_SOCKET_URL (opcional): URL del socket; por defecto, la de la API sin /api
 *  - VITE_NEXUS_CATALOG_SLUG: slug del catálogo público que la vinoteca armó en Nexus para el club
 * Sin ellas la app sigue en modo demo (datos en el dispositivo).
 */
import type { Profile } from '../types'

/**
 * En desarrollo, si la app se abre desde el celular por la IP de la PC (ej. http://192.168.0.10:5174),
 * "localhost" apuntaría al celular: se reemplaza por el host actual (igual que el front de Nexus).
 */
function resolveLocalhost(url: string) {
  if (typeof window === 'undefined') return url
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1' || !/\/\/(localhost|127\.0\.0\.1)\b/.test(url)) return url
  return url.replace(/\/\/(localhost|127\.0\.0\.1)\b/, `//${host}`)
}

/** URL de la API de Nexus INCLUYENDO el prefijo global /api (ej. http://localhost:3001/api) */
export const NEXUS_API_URL = resolveLocalhost(((import.meta.env.VITE_NEXUS_API_URL as string | undefined) || '').trim().replace(/\/+$/, ''))
/** Socket.io vive en la raíz del servidor (sin /api): si se le pasa /api lo toma como namespace y no conecta */
export const NEXUS_SOCKET_URL = resolveLocalhost(
  ((import.meta.env.VITE_NEXUS_SOCKET_URL as string | undefined) || '').trim().replace(/\/+$/, '') ||
    NEXUS_API_URL.replace(/\/api$/, ''),
)
export const NEXUS_CATALOG_SLUG = ((import.meta.env.VITE_NEXUS_CATALOG_SLUG as string | undefined) || '').trim()
export const NEXUS_ENABLED = Boolean(NEXUS_API_URL && NEXUS_CATALOG_SLUG)

const SESSION_KEY = 'club-nexus-session'

interface StoredSession {
  token: string
  profile: Profile
}

/** Error de la API con el código HTTP, para que la pantalla pueda reaccionar (ej. 404 = DNI no registrado) */
export class NexusError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// ---------- Sesión del socio (token firmado por Nexus) ----------

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    // Almacenamiento bloqueado (modo privado) o dato corrupto: se pide ingresar de nuevo
    return null
  }
}

export function saveSession(session: StoredSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // Sin almacenamiento la sesión dura lo que dure la pestaña
  }
}

export function updateStoredProfile(profile: Profile) {
  const s = loadSession()
  if (s) saveSession({ ...s, profile })
}

// ---------- Requests ----------

type Query = Record<string, string | number | boolean | null | undefined>

function buildUrl(path: string, query?: Query) {
  const url = new URL(`${NEXUS_API_URL}${path.startsWith('/') ? path : `/${path}`}`)
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  return url.toString()
}

/** Mensaje legible desde las respuestas de error de Nest ({ message: string | string[] }) */
function errorMessage(body: unknown, status: number) {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message
    if (Array.isArray(m)) return m.join('. ')
    if (typeof m === 'string' && m) return m
  }
  if (status === 0) return 'No hay conexión con la vinoteca. Revisá tu internet.'
  return 'Algo salió mal, probá de nuevo.'
}

export async function nexusRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: { query?: Query; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.auth) {
    const token = loadSession()?.token
    if (!token) throw new NexusError('Tenés que ingresar al club', 401)
    headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new NexusError(errorMessage(null, 0), 0)
  }

  const text = await res.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    // Sesión vencida o inválida: se descarta para volver al ingreso
    if (res.status === 401 && options.auth) saveSession(null)
    throw new NexusError(errorMessage(body, res.status), res.status)
  }
  return body as T
}

/** Rutas de la API pública del club para el catálogo configurado */
export const clubPath = (suffix = '') => `/club-app/${encodeURIComponent(NEXUS_CATALOG_SLUG)}${suffix}`
export const authPath = (suffix: string) => `/public-catalogs/${encodeURIComponent(NEXUS_CATALOG_SLUG)}/auth${suffix}`
