/**
 * Almacenamiento local de la demo: los datos viven en localStorage y las
 * fotos en IndexedDB, solo en este dispositivo. No hay servidor ni base de
 * datos. Cuando se conecte el backend real, solo cambia `api.ts`.
 */
import type { ClubSettings, CommentRow, Profile, Report, Tasting, Wine } from './types'
import { buildSeed } from './seed'

export interface DB {
  version: 1
  profiles: Profile[]
  wines: Wine[]
  tastings: Tasting[]
  cheers: { tasting_id: string; user_id: string; created_at: string }[]
  comments: CommentRow[]
  wishlist: { user_id: string; wine_id: string; created_at: string }[]
  reports: Report[]
  wantClicks: { id: string; wine_id: string; user_id: string; created_at: string }[]
  settings: ClubSettings
}

const DATA_KEY = 'club-entre-amigos:demo:v1'
const SESSION_KEY = 'club-entre-amigos:demo:session'
const IDB_NAME = 'club-entre-amigos'
const IDB_STORE = 'fotos'

let db: DB = buildSeed()
let idb: IDBDatabase | null = null
/** path de la foto → object URL para mostrarla */
const photos = new Map<string, string>()

export function uid() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function readLocal(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Navegación privada o espacio lleno: la demo sigue funcionando en memoria
  }
}

export function getDB(): DB {
  return db
}

/** Aplica un cambio y lo guarda */
export function mutate<T>(fn: (db: DB) => T): T {
  const result = fn(db)
  writeLocal(DATA_KEY, JSON.stringify(db))
  return result
}

export function getSessionUserId(): string | null {
  const id = readLocal(SESSION_KEY)
  return id && db.profiles.some((p) => p.id === id) ? id : null
}

export function setSessionUserId(id: string | null) {
  writeLocal(SESSION_KEY, id)
}

// ---------- Fotos (IndexedDB) ----------

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbRequest<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!idb) return reject(new Error('Sin almacenamiento de fotos'))
    const req = fn(idb.transaction(IDB_STORE, mode).objectStore(IDB_STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function photoSrc(path: string): string | null {
  return photos.get(path) ?? null
}

export async function savePhoto(path: string, blob: Blob) {
  photos.set(path, URL.createObjectURL(blob))
  // Si IndexedDB no está disponible la foto queda solo hasta recargar
  await idbRequest('readwrite', (s) => s.put(blob, path)).catch(() => undefined)
}

export async function deletePhoto(path: string | null | undefined) {
  if (!path) return
  const url = photos.get(path)
  if (url) URL.revokeObjectURL(url)
  photos.delete(path)
  await idbRequest('readwrite', (s) => s.delete(path)).catch(() => undefined)
}

// ---------- Inicio y reinicio ----------

export async function initStore() {
  const raw = readLocal(DATA_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DB
      if (parsed?.version === 1) db = parsed
    } catch {
      // Datos corruptos: arrancamos con la demo limpia
    }
  }
  if (!raw) writeLocal(DATA_KEY, JSON.stringify(db))

  try {
    idb = await openIDB()
    const [keys, blobs] = await Promise.all([
      idbRequest('readonly', (s) => s.getAllKeys()),
      idbRequest('readonly', (s) => s.getAll() as IDBRequest<Blob[]>),
    ])
    keys.forEach((k, i) => photos.set(String(k), URL.createObjectURL(blobs[i])))
  } catch {
    idb = null
  }
}

/** Vuelve la demo a los datos de ejemplo (borra todo lo cargado en este dispositivo) */
export async function resetStore() {
  db = buildSeed()
  writeLocal(DATA_KEY, JSON.stringify(db))
  setSessionUserId(null)
  for (const url of photos.values()) URL.revokeObjectURL(url)
  photos.clear()
  await idbRequest('readwrite', (s) => s.clear()).catch(() => undefined)
}
