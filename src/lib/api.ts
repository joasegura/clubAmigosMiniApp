/**
 * Todo el acceso a datos de la app pasa por acá.
 *
 * DEMO: los datos se guardan en este dispositivo (ver `store.ts`). Las reglas
 * de permisos que en producción va a aplicar el servidor (quién ve qué, quién
 * puede editar) están replicadas acá, así la demo se comporta igual. Para
 * conectar el backend real alcanza con reemplazar este archivo manteniendo
 * las mismas funciones; las pantallas no cambian.
 */
import { deletePhoto, getDB, getSessionUserId, mutate, savePhoto, setSessionUserId, uid } from './store'
import { compressImage, formatPrice, normalizeText } from './format'
import { parseCatalogCsv } from './csv'
import { memberCode, POINTS_RULES, SHOP_ID } from './seed'
import type {
  ClubSettings,
  Comment,
  CommentRow,
  FeedItem,
  MemberCard,
  Profile,
  PublicProfile,
  RankedWine,
  Report,
  Tasting,
  WeekStats,
  Wine,
  WineSummary,
} from './types'

const DAY = 86400_000
/**
 * Promedio ponderado del ranking: cada vino arranca con 3 votos "fantasma" de
 * 3 copas (el medio de la escala). Con pocos votos el puntaje queda cerca de 3;
 * con muchos, se acerca al promedio real. Así, a igual promedio, más votos
 * siempre suben, y un único 5 no salta al primer puesto.
 */
const RANKING_PRIOR_VOTES = 3
const RANKING_PRIOR_RATING = 3

const monthKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
})

// ---------- Permisos (lo que en producción hace el servidor) ----------

interface Viewer {
  id: string | null
  admin: boolean
}

function viewer(): Viewer {
  const id = getSessionUserId()
  const p = id ? getDB().profiles.find((x) => x.id === id) : undefined
  return { id: p?.id ?? null, admin: p?.role === 'admin' }
}

function requireUser(userId?: string): Viewer & { id: string } {
  const v = viewer()
  if (!v.id) throw new Error('Tenés que ingresar al club')
  if (userId && userId !== v.id) throw new Error('No podés hacer esto en nombre de otro socio')
  return v as Viewer & { id: string }
}

function requireAdmin() {
  const v = requireUser()
  if (!v.admin) throw new Error('Solo para la vinoteca')
  return v
}

const canSeeWine = (w: Wine, v: Viewer) => w.active || w.created_by === v.id || v.admin
const canSeeTasting = (t: Tasting, v: Viewer) => !t.hidden || t.user_id === v.id || v.admin
const canSeeComment = (c: CommentRow, v: Viewer) => !c.hidden || c.user_id === v.id || v.admin

// ---------- Armado de respuestas ----------

function publicProfile(id: string): PublicProfile | null {
  const p = getDB().profiles.find((x) => x.id === id)
  return p ? { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url } : null
}

function visibleWine(id: string, v: Viewer): Wine | null {
  const w = getDB().wines.find((x) => x.id === id)
  return w && canSeeWine(w, v) ? { ...w } : null
}

function toFeedItem(t: Tasting, v: Viewer): FeedItem {
  const db = getDB()
  return {
    ...t,
    profile: publicProfile(t.user_id),
    wine: visibleWine(t.wine_id, v),
    cheer_count: db.cheers.filter((c) => c.tasting_id === t.id).length,
    comment_count: db.comments.filter((c) => c.tasting_id === t.id && canSeeComment(c, v)).length,
  }
}

function toComment(c: CommentRow): Comment {
  return { ...c, profile: publicProfile(c.user_id) }
}

const newestFirst = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at)

// ---------- Sesión (demo) ----------

export function getCurrentProfile(): Profile | null {
  const id = getSessionUserId()
  const p = id ? getDB().profiles.find((x) => x.id === id) : undefined
  return p ? { ...p } : null
}

/** Ingresa con un mail; si no existe el socio, lo crea (como haría el login real) */
export async function signInDemo(email: string, displayName = ''): Promise<Profile> {
  const clean = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Revisá el mail, parece que tiene un error')
  const profile = mutate((db) => {
    let p = db.profiles.find((x) => x.email === clean)
    if (!p) {
      p = {
        id: uid(),
        email: clean,
        display_name: displayName.slice(0, 40),
        avatar_url: null,
        role: 'socio',
        created_at: new Date().toISOString(),
      }
      db.profiles.push(p)
    }
    return p
  })
  setSessionUserId(profile.id)
  return { ...profile }
}

export async function signInAsShop(): Promise<Profile> {
  const shop = getDB().profiles.find((p) => p.id === SHOP_ID)
  if (!shop) throw new Error('No está el usuario de la vinoteca en la demo')
  setSessionUserId(shop.id)
  return { ...shop }
}

export async function signOutDemo() {
  setSessionUserId(null)
}

// ---------- Perfil ----------

export async function getProfile(id: string): Promise<Profile | null> {
  const p = getDB().profiles.find((x) => x.id === id)
  return p ? { ...p } : null
}

export async function updateDisplayName(id: string, display_name: string) {
  requireUser(id)
  const name = display_name.trim()
  if (name.length < 1 || name.length > 40) throw new Error('El nombre tiene que tener entre 1 y 40 letras')
  mutate((db) => {
    const p = db.profiles.find((x) => x.id === id)
    if (p) p.display_name = name
  })
}

// ---------- Catálogo ----------

export async function searchCatalog(q: string, limit = 8): Promise<Wine[]> {
  const words = normalizeText(q).split(/\s+/).filter(Boolean)
  return getDB()
    .wines.filter((w) => w.source === 'catalogo' && w.active)
    .filter((w) => {
      const haystack = normalizeText([w.name, w.winery, w.varietal, w.region, w.vintage].filter(Boolean).join(' '))
      return words.every((word) => haystack.includes(word))
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
    .map((w) => ({ ...w }))
}

export async function listCatalog(): Promise<Wine[]> {
  requireAdmin()
  return getDB()
    .wines.filter((w) => w.source === 'catalogo')
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map((w) => ({ ...w }))
}

export async function getWine(id: string): Promise<Wine | null> {
  return visibleWine(id, viewer())
}

export async function createExternalWine(userId: string, w: Pick<Wine, 'name' | 'winery' | 'varietal' | 'vintage'>): Promise<Wine> {
  requireUser(userId)
  const name = w.name.trim().slice(0, 120)
  if (!name) throw new Error('Falta el nombre del vino')
  const vintage = w.vintage && w.vintage >= 1900 && w.vintage <= 2100 ? w.vintage : null
  const wine: Wine = {
    id: uid(),
    nexus_id: null,
    name,
    winery: w.winery?.slice(0, 120) || null,
    varietal: w.varietal?.slice(0, 60) || null,
    vintage,
    region: null,
    price: null,
    in_stock: false,
    image_url: null,
    source: 'externo',
    active: true,
    created_by: userId,
  }
  mutate((db) => db.wines.push(wine))
  return { ...wine }
}

export async function saveCatalogWine(w: Partial<Wine> & { name: string }) {
  requireAdmin()
  const name = w.name.trim().slice(0, 120)
  if (!name) throw new Error('Falta el nombre del vino')
  if (w.price != null && (!Number.isFinite(w.price) || w.price < 0)) throw new Error('El precio no es válido')
  if (w.vintage != null && (w.vintage < 1900 || w.vintage > 2100)) throw new Error('El año no es válido')
  mutate((db) => {
    const existing = w.id ? db.wines.find((x) => x.id === w.id) : undefined
    if (existing) {
      const { id: _id, source: _source, created_by: _createdBy, ...rest } = w
      Object.assign(existing, rest, { name })
    } else {
      db.wines.push({
        nexus_id: null,
        winery: null,
        varietal: null,
        vintage: null,
        region: null,
        price: null,
        in_stock: true,
        image_url: null,
        active: true,
        ...w,
        id: uid(),
        name,
        source: 'catalogo',
        created_by: null,
      })
    }
  })
}

/** Carga o actualiza el catálogo desde un CSV. Actualiza por código (o por nombre + bodega + año si no hay código). */
export async function importCatalogCsv(text: string): Promise<{ created: number; updated: number; skipped: number }> {
  requireAdmin()
  const { rows, skipped } = parseCatalogCsv(text)
  if (!rows.length) throw new Error('No encontramos vinos en el archivo')
  const key = (w: Pick<Wine, 'name' | 'winery' | 'vintage'>) => normalizeText(`${w.name}|${w.winery ?? ''}|${w.vintage ?? ''}`)
  let created = 0
  let updated = 0
  mutate((db) => {
    for (const row of rows) {
      const catalog = db.wines.filter((w) => w.source === 'catalogo')
      const existing = row.nexus_id ? catalog.find((w) => w.nexus_id === row.nexus_id) : catalog.find((w) => key(w) === key(row))
      if (existing) {
        Object.assign(existing, row, { active: true })
        updated++
      } else {
        db.wines.push({ ...row, id: uid(), image_url: null, source: 'catalogo', active: true, created_by: null })
        created++
      }
    }
  })
  return { created, updated, skipped }
}

// ---------- Ranking ----------

/** Último puntaje visible de cada socio por vino: subir el mismo vino muchas veces no suma votos */
function latestVotes(): Map<string, number[]> {
  const latest = new Map<string, Tasting>()
  for (const t of getDB().tastings) {
    if (t.hidden) continue
    const k = `${t.wine_id}:${t.user_id}`
    const prev = latest.get(k)
    if (!prev || t.created_at > prev.created_at) latest.set(k, t)
  }
  const byWine = new Map<string, number[]>()
  for (const t of latest.values()) byWine.set(t.wine_id, [...(byWine.get(t.wine_id) ?? []), t.rating])
  return byWine
}

function computeRanking(): RankedWine[] {
  const votes = latestVotes()
  const catalog = getDB().wines.filter((w) => w.source === 'catalogo' && w.active && votes.has(w.id))
  return catalog
    .map((w) => {
      const rs = votes.get(w.id)!
      const sum = rs.reduce((s, r) => s + r, 0)
      return {
        ...w,
        avg_rating: sum / rs.length,
        votes: rs.length,
        score: (sum + RANKING_PRIOR_VOTES * RANKING_PRIOR_RATING) / (rs.length + RANKING_PRIOR_VOTES),
      }
    })
    .sort((a, b) => b.score - a.score || b.votes - a.votes || a.name.localeCompare(b.name, 'es'))
}

export async function getRanking(): Promise<RankedWine[]> {
  return computeRanking()
}

/** Puntaje, votos y puesto en el ranking de un vino, en una sola consulta */
export async function getWineSummary(wineId: string): Promise<WineSummary> {
  const rs = latestVotes().get(wineId) ?? []
  const idx = computeRanking().findIndex((w) => w.id === wineId)
  return {
    avg: rs.length ? rs.reduce((s, r) => s + r, 0) / rs.length : null,
    votes: rs.length,
    position: idx >= 0 ? idx + 1 : null,
  }
}

/** El más tomado del mes en curso (mes calendario de Argentina), contando socios distintos */
export async function getMostLoggedThisMonth(): Promise<{ wine_id: string; name: string; winery: string | null; total: number } | null> {
  const db = getDB()
  const thisMonth = monthKey.format(new Date())
  const counts = new Map<string, { users: Set<string>; last: string }>()
  for (const t of db.tastings) {
    if (t.hidden || monthKey.format(new Date(t.created_at)) !== thisMonth) continue
    const w = db.wines.find((x) => x.id === t.wine_id)
    if (!w || w.source !== 'catalogo' || !w.active) continue
    const c = counts.get(w.id) ?? { users: new Set<string>(), last: '' }
    c.users.add(t.user_id)
    if (t.created_at > c.last) c.last = t.created_at
    counts.set(w.id, c)
  }
  const best = [...counts.entries()].sort((a, b) => b[1].users.size - a[1].users.size || b[1].last.localeCompare(a[1].last))[0]
  if (!best) return null
  const w = db.wines.find((x) => x.id === best[0])!
  return { wine_id: w.id, name: w.name, winery: w.winery, total: best[1].users.size }
}

// ---------- Publicaciones ----------

export async function getFeed(page = 0, pageSize = 15): Promise<FeedItem[]> {
  const v = viewer()
  const from = page * pageSize
  return getDB()
    .tastings.filter((t) => !t.hidden)
    .sort(newestFirst)
    .slice(from, from + pageSize)
    .map((t) => toFeedItem(t, v))
}

export async function getWineTastings(wineId: string): Promise<FeedItem[]> {
  const v = viewer()
  return getDB()
    .tastings.filter((t) => t.wine_id === wineId && !t.hidden)
    .sort(newestFirst)
    .slice(0, 50)
    .map((t) => toFeedItem(t, v))
}

export async function getUserTastings(userId: string): Promise<FeedItem[]> {
  const v = viewer()
  return getDB()
    .tastings.filter((t) => t.user_id === userId && canSeeTasting(t, v))
    .sort(newestFirst)
    .map((t) => toFeedItem(t, v))
}

export async function getTasting(id: string): Promise<FeedItem | null> {
  const v = viewer()
  const t = getDB().tastings.find((x) => x.id === id)
  return t && canSeeTasting(t, v) ? toFeedItem(t, v) : null
}

/** Último puntaje que el socio le dio a un vino (para avisarle que cuenta el último) */
export async function getMyLastRating(userId: string, wineId: string): Promise<number | null> {
  const mine = getDB()
    .tastings.filter((t) => t.user_id === userId && t.wine_id === wineId && !t.hidden)
    .sort(newestFirst)
  return mine[0]?.rating ?? null
}

export async function uploadPhoto(userId: string, file: File): Promise<string> {
  requireUser(userId)
  const blob = await compressImage(file)
  const path = `${userId}/${uid()}.jpg`
  await savePhoto(path, blob)
  return path
}

export async function createTasting(t: Pick<Tasting, 'wine_id' | 'rating' | 'comment' | 'occasion' | 'photo_path'> & { user_id: string }) {
  const v = requireUser(t.user_id)
  if (!Number.isInteger(t.rating) || t.rating < 1 || t.rating > 5) throw new Error('El puntaje va de 1 a 5 copas')
  if (!visibleWine(t.wine_id, v)) throw new Error('No encontramos ese vino')
  if (t.photo_path && !t.photo_path.startsWith(`${v.id}/`)) throw new Error('La foto no es tuya')
  const tasting: Tasting = {
    id: uid(),
    user_id: v.id,
    wine_id: t.wine_id,
    rating: t.rating,
    comment: t.comment?.slice(0, 600) || null,
    occasion: t.occasion?.slice(0, 40) || null,
    photo_path: t.photo_path,
    hidden: false,
    created_at: new Date().toISOString(),
  }
  mutate((db) => db.tastings.push(tasting))
  return { id: tasting.id }
}

export async function deleteTasting(id: string) {
  const v = requireUser()
  const t = getDB().tastings.find((x) => x.id === id)
  if (!t) return
  if (t.user_id !== v.id && !v.admin) throw new Error('Solo podés borrar tus publicaciones')
  mutate((db) => {
    const commentIds = new Set(db.comments.filter((c) => c.tasting_id === id).map((c) => c.id))
    db.tastings = db.tastings.filter((x) => x.id !== id)
    db.cheers = db.cheers.filter((c) => c.tasting_id !== id)
    db.comments = db.comments.filter((c) => c.tasting_id !== id)
    db.reports = db.reports.filter(
      (r) => !(r.target_type === 'tasting' && r.target_id === id) && !(r.target_type === 'comment' && commentIds.has(r.target_id)),
    )
  })
  await deletePhoto(t.photo_path)
}

// ---------- Brindis y comentarios ----------

export async function getMyCheers(userId: string, tastingIds: string[]): Promise<Set<string>> {
  const ids = new Set(tastingIds)
  return new Set(getDB().cheers.filter((c) => c.user_id === userId && ids.has(c.tasting_id)).map((c) => c.tasting_id))
}

export async function setCheer(userId: string, tastingId: string, on: boolean) {
  requireUser(userId)
  mutate((db) => {
    db.cheers = db.cheers.filter((c) => !(c.tasting_id === tastingId && c.user_id === userId))
    if (on) db.cheers.push({ tasting_id: tastingId, user_id: userId, created_at: new Date().toISOString() })
  })
}

export async function getComments(tastingId: string): Promise<Comment[]> {
  const v = viewer()
  return getDB()
    .comments.filter((c) => c.tasting_id === tastingId && !c.hidden)
    .filter((c) => canSeeComment(c, v))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(toComment)
}

export async function addComment(userId: string, tastingId: string, body: string) {
  const v = requireUser(userId)
  const text = body.trim()
  if (text.length < 1 || text.length > 500) throw new Error('El comentario tiene que tener entre 1 y 500 letras')
  const t = getDB().tastings.find((x) => x.id === tastingId)
  if (!t || !canSeeTasting(t, v)) throw new Error('Esta publicación ya no está disponible')
  mutate((db) =>
    db.comments.push({ id: uid(), tasting_id: tastingId, user_id: userId, body: text, hidden: false, created_at: new Date().toISOString() }),
  )
}

export async function deleteComment(id: string) {
  const v = requireUser()
  const c = getDB().comments.find((x) => x.id === id)
  if (!c) return
  if (c.user_id !== v.id && !v.admin) throw new Error('Solo podés borrar tus comentarios')
  mutate((db) => {
    db.comments = db.comments.filter((x) => x.id !== id)
    db.reports = db.reports.filter((r) => !(r.target_type === 'comment' && r.target_id === id))
  })
}

// ---------- Quiero probar ----------

export async function getWishlist(userId: string): Promise<Wine[]> {
  const v = viewer()
  return getDB()
    .wishlist.filter((x) => x.user_id === userId)
    .sort(newestFirst)
    .map((x) => visibleWine(x.wine_id, v))
    .filter((w): w is Wine => Boolean(w))
}

export async function isInWishlist(userId: string, wineId: string) {
  return getDB().wishlist.some((x) => x.user_id === userId && x.wine_id === wineId)
}

export async function setWishlist(userId: string, wineId: string, on: boolean) {
  requireUser(userId)
  mutate((db) => {
    db.wishlist = db.wishlist.filter((x) => !(x.user_id === userId && x.wine_id === wineId))
    if (on) db.wishlist.push({ user_id: userId, wine_id: wineId, created_at: new Date().toISOString() })
  })
}

// ---------- Ventas ----------

/** Registra el toque en "Lo quiero" (para medir); nunca bloquea la apertura de WhatsApp */
export function logWantClick(userId: string, wineId: string) {
  try {
    mutate((db) => db.wantClicks.push({ id: uid(), user_id: userId, wine_id: wineId, created_at: new Date().toISOString() }))
  } catch {
    // Medir no es crítico
  }
}

// ---------- Reportes y moderación ----------

export async function reportContent(userId: string, target_type: 'tasting' | 'comment', target_id: string, reason = '') {
  requireUser(userId)
  mutate((db) => {
    // Si ya lo había reportado, no es un error para el usuario
    if (db.reports.some((r) => r.reporter_id === userId && r.target_type === target_type && r.target_id === target_id)) return
    db.reports.push({
      id: uid(),
      target_type,
      target_id,
      reporter_id: userId,
      reason: reason.slice(0, 200) || null,
      status: 'pendiente',
      created_at: new Date().toISOString(),
    })
  })
}

export async function getPendingReports(): Promise<Report[]> {
  requireAdmin()
  return getDB()
    .reports.filter((r) => r.status === 'pendiente')
    .sort(newestFirst)
    .map((r) => ({ ...r }))
}

export async function getCommentById(id: string): Promise<Comment | null> {
  const c = getDB().comments.find((x) => x.id === id)
  return c && canSeeComment(c, viewer()) ? toComment(c) : null
}

/** Ocultar, mantener o volver a mostrar una publicación o comentario, y cerrar sus reportes */
export async function moderate(target_type: 'tasting' | 'comment', target_id: string, action: 'ocultar' | 'mantener' | 'mostrar') {
  requireAdmin()
  mutate((db) => {
    const target = target_type === 'tasting' ? db.tastings.find((t) => t.id === target_id) : db.comments.find((c) => c.id === target_id)
    if (target) target.hidden = action === 'ocultar'
    for (const r of db.reports) {
      if (r.target_type === target_type && r.target_id === target_id && r.status === 'pendiente') {
        r.status = action === 'ocultar' ? 'oculto' : 'mantenido'
      }
    }
  })
}

/** Lo que ocultó la vinoteca, para poder volver a mostrarlo */
export async function getHiddenContent(): Promise<{ tastings: FeedItem[]; comments: Comment[] }> {
  const v = requireAdmin()
  const db = getDB()
  return {
    tastings: db.tastings.filter((t) => t.hidden).sort(newestFirst).map((t) => toFeedItem(t, v)),
    comments: db.comments.filter((c) => c.hidden).sort(newestFirst).map(toComment),
  }
}

export async function getWeekStats(): Promise<WeekStats> {
  requireAdmin()
  const db = getDB()
  const since = new Date(Date.now() - 7 * DAY).toISOString()
  const pending = new Set(db.reports.filter((r) => r.status === 'pendiente').map((r) => `${r.target_type}:${r.target_id}`))
  return {
    new_members: db.profiles.filter((p) => p.role === 'socio' && p.created_at >= since).length,
    tastings: db.tastings.filter((t) => t.created_at >= since).length,
    want_clicks: db.wantClicks.filter((c) => c.created_at >= since).length,
    pending_reports: pending.size,
  }
}

// ---------- Tarjeta de socio y puntos ----------
// DEMO: los puntos se cargan desde el panel ("Cargar compra"). A futuro los va a
// informar Nexus cuando la caja escanee el QR; el QR solo lleva el número de socio.

/** Número de socio normalizado: "ea 001 001" → "EA001001" */
const cleanCode = (code: string) => code.replace(/[\s-]/g, '').toUpperCase()

export async function getMemberCard(userId: string): Promise<MemberCard> {
  requireUser(userId)
  const profile = mutate((db) => {
    const p = db.profiles.find((x) => x.id === userId)
    if (!p) throw new Error('No encontramos tu perfil')
    // Primer uso de la tarjeta: número de socio correlativo y puntos de bienvenida
    if (!p.member_code) {
      const taken = new Set(db.profiles.map((x) => x.member_code).filter(Boolean))
      let n = db.profiles.length
      while (taken.has(memberCode(n))) n++
      p.member_code = memberCode(n)
    }
    if (p.role === 'socio' && !db.points.some((m) => m.user_id === userId)) {
      db.points.push({ id: uid(), user_id: userId, points: POINTS_RULES.welcome, concept: 'Bienvenida al club', created_at: new Date().toISOString() })
    }
    return { ...p }
  })
  const movements = getDB().points.filter((m) => m.user_id === userId).sort(newestFirst)
  const balance = movements.reduce((sum, m) => sum + m.points, 0)
  return {
    code: profile.member_code!,
    display_name: profile.display_name,
    created_at: profile.created_at,
    balance,
    movements: movements.slice(0, 10),
    next_reward: POINTS_RULES.rewards.find((r) => r.points > balance) ?? null,
  }
}

/** Busca un socio por el número de su tarjeta (lo que leería la caja al escanear el QR) */
export async function findMemberByCode(code: string): Promise<{ id: string; display_name: string; balance: number } | null> {
  requireAdmin()
  const db = getDB()
  const p = db.profiles.find((x) => x.member_code === cleanCode(code))
  if (!p) return null
  return { id: p.id, display_name: p.display_name, balance: db.points.filter((m) => m.user_id === p.id).reduce((s, m) => s + m.points, 0) }
}

/** Simula lo que va a hacer Nexus: registrar una compra y sumarle los puntos al socio */
export async function addPurchase(code: string, amount: number): Promise<{ display_name: string; points: number; balance: number }> {
  requireAdmin()
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Ingresá el monto de la compra')
  const member = await findMemberByCode(code)
  if (!member) throw new Error('No hay ningún socio con ese número')
  const points = Math.floor(amount / POINTS_RULES.pesosPerPoint)
  if (points < 1) throw new Error(`La compra tiene que ser de al menos ${formatPrice(POINTS_RULES.pesosPerPoint)} para sumar puntos`)
  mutate((db) =>
    db.points.push({
      id: uid(),
      user_id: member.id,
      points,
      concept: `Compra en la vinoteca · ${formatPrice(amount)}`,
      created_at: new Date().toISOString(),
    }),
  )
  return { display_name: member.display_name, points, balance: member.balance + points }
}

// ---------- Configuración del club ----------

export async function getClubSettings(): Promise<ClubSettings> {
  return { ...getDB().settings }
}

/** Vino del mes con sus datos, en una sola consulta */
export async function getWineOfMonth(): Promise<{ wine: Wine; note: string | null } | null> {
  const { wine_of_month_id, wine_of_month_note } = getDB().settings
  const wine = wine_of_month_id ? visibleWine(wine_of_month_id, viewer()) : null
  return wine && wine.active ? { wine, note: wine_of_month_note } : null
}

export async function setWineOfMonth(wineId: string | null, note: string | null) {
  requireAdmin()
  mutate((db) => {
    db.settings = { wine_of_month_id: wineId, wine_of_month_note: note?.slice(0, 200) || null }
  })
}
