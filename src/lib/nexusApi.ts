/**
 * Acceso a datos contra Nexus. Exporta EXACTAMENTE las mismas funciones que `api.ts`
 * (la demo), así las pantallas no cambian: `backend.ts` elige cuál usar.
 *
 * Qué viene de Nexus:
 *  - Catálogo: el catálogo público (slug) que la vinoteca selecciona en Nexus, con precio y stock.
 *  - "Publicaciones": son las valoraciones del canal CLUB_AMIGOS (1 por socio y vino, la última cuenta).
 *  - Tarjeta: el QR asignado en Nexus, los puntos y los niveles del club.
 *  - Vino del mes: el producto marcado como "destacado" dentro del catálogo.
 *
 * Fuera de esta etapa (se ocultan en la UI con FEATURES): fotos, brindis, comentarios en hilo,
 * reportes, vinos externos y panel de la vinoteca (se administra desde Nexus).
 */
import { authPath, clubPath, loadSession, nexusRequest, NexusError, saveSession, updateStoredProfile } from './nexus/client'
import { getGoogleIdToken } from './nexus/firebase'
import type {
  NxGoogleLoginResponse,
  NxHighlights,
  NxMe,
  NxPaginated,
  NxRankedWine,
  NxRegisterInput,
  NxReview,
  NxSendCodeResponse,
  NxVerifyResponse,
  NxWine,
  NxWineDetail,
} from './nexus/dto'
import type {
  ClubSettings,
  Comment,
  FeedItem,
  MemberCard,
  Profile,
  RankedWine,
  Report,
  Wine,
  WeekStats,
  WineSummary,
} from './types'

const MANAGED_IN_NEXUS = 'Esto se administra desde Nexus'
const COMING_SOON = 'Disponible en una próxima versión del club'
const MAX_PAGE = 100

// ---------- Mapeos Nexus → tipos de la app ----------

function toWine(w: NxWine): Wine {
  return {
    id: w.id,
    nexus_id: w.id,
    name: w.name,
    winery: w.winery,
    varietal: w.varietal,
    vintage: null,
    region: null,
    price: w.price,
    in_stock: w.inStock,
    image_url: w.imageUrl,
    source: 'catalogo',
    active: true,
    created_by: null,
  }
}

/** Para borrar una "publicación" hace falta el vino: se recuerda al mapear */
const reviewProduct = new Map<string, string>()

function toFeedItem(r: NxReview): FeedItem {
  if (r.productId) reviewProduct.set(r.id, r.productId)
  const userId = r.customerId !== null ? String(r.customerId) : `anon-${r.id}`
  return {
    id: r.id,
    user_id: userId,
    wine_id: r.productId ?? '',
    rating: r.rating,
    comment: r.comment,
    occasion: null,
    photo_path: null,
    hidden: false,
    created_at: r.updatedAt ?? r.createdAt,
    profile: { id: userId, display_name: r.authorName ?? 'Socio', avatar_url: null },
    wine: r.wine ? toWine(r.wine) : null,
    cheer_count: 0,
    comment_count: 0,
  }
}

function toProfile(me: NxMe): Profile {
  return {
    id: String(me.profile.id),
    email: me.profile.email,
    display_name: me.profile.name,
    avatar_url: null,
    role: 'socio',
    created_at: me.profile.clubJoinedAt ?? new Date().toISOString(),
    member_code: me.card.qrCode ?? undefined,
  }
}

const levelLabel = (l: { name: string; discountPercent: number }) =>
  l.discountPercent > 0 ? `${l.name} · ${l.discountPercent}% de descuento` : l.name

function isMe(userId: string) {
  return loadSession()?.profile.id === userId
}

async function notFoundAsNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p
  } catch (e) {
    if (e instanceof NexusError && (e.status === 404 || e.status === 400)) return null
    throw e
  }
}

// ---------- Ingreso (DNI + código por mail, flujo de catálogo público de Nexus) ----------

/** Pide el código para un DNI registrado. Si el DNI no existe lanza NexusError 404 (USER_NOT_FOUND) */
export async function nexusSendCode(documentNumber: string): Promise<NxSendCodeResponse> {
  const dni = documentNumber.replace(/\D/g, '')
  if (dni.length < 6) throw new Error('Ingresá tu DNI sin puntos')
  return nexusRequest<NxSendCodeResponse>('POST', authPath('/send-code'), { body: { documentNumber: dni } })
}

/** Registra un cliente nuevo en Nexus (queda en el club si está activo) y le manda el código */
export async function nexusRegister(input: NxRegisterInput): Promise<NxSendCodeResponse> {
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Revisá el mail, parece que tiene un error')
  if (!input.name.trim()) throw new Error('Contanos tu nombre')
  return nexusRequest<NxSendCodeResponse>('POST', authPath('/register'), {
    body: {
      documentNumber: input.documentNumber.replace(/\D/g, ''),
      name: input.name.trim().slice(0, 40),
      lastName: input.lastName.trim().slice(0, 60),
      email,
      phone: input.phone?.trim() || undefined,
    },
  })
}

export async function nexusVerifyCode(documentNumber: string, code: string): Promise<Profile> {
  const res = await nexusRequest<NxVerifyResponse>('POST', authPath('/verify-code'), {
    body: { documentNumber: documentNumber.replace(/\D/g, ''), code: code.replace(/\D/g, '') },
  })
  if (!res.sessionToken) throw new Error('Nexus no devolvió la sesión. Avisale a la vinoteca.')

  // Guardar el token y traer el perfil completo (tarjeta, nivel)
  saveSession({
    token: res.sessionToken,
    profile: {
      id: String(res.user.id),
      email: res.user.email,
      display_name: res.user.name,
      avatar_url: null,
      role: 'socio',
      created_at: new Date().toISOString(),
      member_code: res.user.clubQr ?? undefined,
    },
  })
  if (!res.user.isClubMember) {
    await nexusRequest('POST', clubPath('/me/join'), { auth: true }).catch(() => undefined)
  }
  const me = await nexusRequest<NxMe>('GET', clubPath('/me'), { auth: true })
  const profile = toProfile(me)
  updateStoredProfile(profile)
  return profile
}

/**
 * Ingreso con Google: Firebase da el ID token y Nexus lo valida. Si el mail no existe en la
 * vinoteca, Nexus crea el cliente sin DNI (el vendedor se lo completa para asignarle el QR).
 * Devuelve null si el socio cerró la ventana de Google.
 */
export async function nexusSignInWithGoogle(): Promise<Profile | null> {
  const idToken = await getGoogleIdToken()
  if (!idToken) return null
  const res = await nexusRequest<NxGoogleLoginResponse>('POST', clubPath('/auth/google'), { body: { idToken } })
  if (!res.sessionToken) throw new Error('Nexus no devolvió la sesión. Avisale a la vinoteca.')
  const profile = toProfile(res.me)
  saveSession({ token: res.sessionToken, profile })
  return profile
}

// ---------- Sesión ----------

export function getCurrentProfile(): Profile | null {
  return loadSession()?.profile ?? null
}

export async function signInDemo(_email: string, _displayName = ''): Promise<Profile> {
  throw new Error('Ingresá con tu DNI')
}

export async function signInAsShop(): Promise<Profile> {
  throw new Error(MANAGED_IN_NEXUS)
}

export async function signOutDemo() {
  saveSession(null)
}

// ---------- Perfil ----------

export async function getProfile(id: string): Promise<Profile | null> {
  return isMe(id) ? getCurrentProfile() : null
}

export async function updateDisplayName(id: string, display_name: string) {
  if (!isMe(id)) throw new Error('No podés hacer esto en nombre de otro socio')
  const name = display_name.trim()
  if (name.length < 1 || name.length > 40) throw new Error('El nombre tiene que tener entre 1 y 40 letras')
  await nexusRequest('PATCH', clubPath('/me'), { auth: true, body: { name } })
  const current = getCurrentProfile()
  if (current) updateStoredProfile({ ...current, display_name: name })
}

// ---------- Catálogo ----------

export async function searchCatalog(q: string, limit = 8): Promise<Wine[]> {
  const res = await nexusRequest<NxPaginated<NxWine>>('GET', clubPath('/wines'), {
    query: { search: q.trim(), limit: Math.min(limit, MAX_PAGE), page: 1 },
  })
  return res.data.map(toWine)
}

export async function listCatalog(): Promise<Wine[]> {
  throw new Error(MANAGED_IN_NEXUS)
}

export async function getWine(id: string): Promise<Wine | null> {
  const w = await notFoundAsNull(nexusRequest<NxWineDetail>('GET', clubPath(`/wines/${encodeURIComponent(id)}`)))
  return w ? toWine(w) : null
}

export async function createExternalWine(_userId: string, _w: Pick<Wine, 'name' | 'winery' | 'varietal' | 'vintage'>): Promise<Wine> {
  throw new Error('Por ahora solo se pueden valorar vinos del catálogo de la vinoteca')
}

export async function saveCatalogWine(_w: Partial<Wine> & { name: string }) {
  throw new Error(MANAGED_IN_NEXUS)
}

export async function importCatalogCsv(_text: string): Promise<{ created: number; updated: number; skipped: number }> {
  throw new Error(MANAGED_IN_NEXUS)
}

// ---------- Ranking ----------

export async function getRanking(): Promise<RankedWine[]> {
  const rows = await nexusRequest<NxRankedWine[]>('GET', clubPath('/ranking'), { query: { limit: MAX_PAGE } })
  return rows.map((r) => ({ ...toWine(r), avg_rating: r.avgRating ?? 0, votes: r.votes, score: r.score }))
}

export async function getWineSummary(wineId: string): Promise<WineSummary> {
  const w = await notFoundAsNull(nexusRequest<NxWineDetail>('GET', clubPath(`/wines/${encodeURIComponent(wineId)}`)))
  return { avg: w?.avgRating ?? null, votes: w?.votes ?? 0, position: w?.position ?? null }
}

export async function getMostLoggedThisMonth(): Promise<{ wine_id: string; name: string; winery: string | null; total: number } | null> {
  const h = await nexusRequest<NxHighlights>('GET', clubPath('/highlights'))
  const m = h.mostLoggedThisMonth
  return m ? { wine_id: m.wine.id, name: m.wine.name, winery: m.wine.winery, total: m.total } : null
}

// ---------- Publicaciones (= valoraciones del club) ----------

export async function getFeed(page = 0, pageSize = 15): Promise<FeedItem[]> {
  const res = await nexusRequest<NxPaginated<NxReview>>('GET', clubPath('/reviews'), {
    query: { page: page + 1, limit: Math.min(pageSize, MAX_PAGE) },
  })
  return res.data.map(toFeedItem)
}

export async function getWineTastings(wineId: string): Promise<FeedItem[]> {
  const res = await nexusRequest<NxPaginated<NxReview>>('GET', clubPath(`/wines/${encodeURIComponent(wineId)}/reviews`), {
    query: { page: 1, limit: 50 },
  })
  return res.data.map(toFeedItem)
}

export async function getUserTastings(userId: string): Promise<FeedItem[]> {
  // Nexus solo expone las valoraciones propias del socio
  if (!isMe(userId)) return []
  const res = await nexusRequest<NxPaginated<NxReview>>('GET', clubPath('/me/reviews'), {
    auth: true,
    query: { page: 1, limit: MAX_PAGE },
  })
  return res.data.map(toFeedItem)
}

export async function getTasting(_id: string): Promise<FeedItem | null> {
  return null
}

export async function getMyLastRating(_userId: string, wineId: string): Promise<number | null> {
  const mine = await notFoundAsNull(
    nexusRequest<{ rating: number; comment: string | null } | null>('GET', clubPath(`/wines/${encodeURIComponent(wineId)}/my-review`), {
      auth: true,
    }),
  )
  return mine?.rating ?? null
}

export async function uploadPhoto(_userId: string, _file: File): Promise<string> {
  throw new Error(COMING_SOON)
}

export async function createTasting(t: {
  wine_id: string
  rating: number
  comment: string | null
  occasion: string | null
  photo_path: string | null
  user_id: string
}) {
  if (!isMe(t.user_id)) throw new Error('No podés hacer esto en nombre de otro socio')
  if (!Number.isInteger(t.rating) || t.rating < 1 || t.rating > 5) throw new Error('El puntaje va de 1 a 5 copas')
  const res = await nexusRequest<{ id: string }>('PUT', clubPath(`/wines/${encodeURIComponent(t.wine_id)}/my-review`), {
    auth: true,
    body: { rating: t.rating, comment: t.comment?.trim().slice(0, 1000) || undefined },
  })
  reviewProduct.set(res.id, t.wine_id)
  return { id: res.id }
}

export async function deleteTasting(id: string) {
  const productId = reviewProduct.get(id)
  if (!productId) throw new Error('Actualizá la pantalla y probá de nuevo')
  await nexusRequest('DELETE', clubPath(`/wines/${encodeURIComponent(productId)}/my-review`), { auth: true })
  reviewProduct.delete(id)
}

// ---------- Brindis y comentarios en hilo (próxima etapa) ----------

export async function getMyCheers(_userId: string, _tastingIds: string[]): Promise<Set<string>> {
  return new Set()
}

export async function setCheer(_userId: string, _tastingId: string, _on: boolean) {
  throw new Error(COMING_SOON)
}

export async function getComments(_tastingId: string): Promise<Comment[]> {
  return []
}

export async function addComment(_userId: string, _tastingId: string, _body: string) {
  throw new Error(COMING_SOON)
}

export async function deleteComment(_id: string) {
  throw new Error(COMING_SOON)
}

// ---------- Quiero probar ----------

export async function getWishlist(userId: string): Promise<Wine[]> {
  if (!isMe(userId)) return []
  const res = await nexusRequest<NxPaginated<NxWine>>('GET', clubPath('/me/wishlist'), {
    auth: true,
    query: { page: 1, limit: MAX_PAGE },
  })
  return res.data.map(toWine)
}

export async function isInWishlist(_userId: string, wineId: string) {
  const res = await notFoundAsNull(
    nexusRequest<{ inWishlist: boolean }>('GET', clubPath(`/me/wishlist/${encodeURIComponent(wineId)}`), { auth: true }),
  )
  return res?.inWishlist ?? false
}

export async function setWishlist(_userId: string, wineId: string, on: boolean) {
  await nexusRequest(on ? 'PUT' : 'DELETE', clubPath(`/me/wishlist/${encodeURIComponent(wineId)}`), { auth: true })
}

// ---------- Ventas ----------

export function logWantClick(_userId: string, _wineId: string) {
  // Medición de "Lo quiero" pendiente en Nexus; nunca bloquea WhatsApp
}

// ---------- Reportes y moderación (se modera desde Nexus) ----------

export async function reportContent(_userId: string, _target_type: 'tasting' | 'comment', _target_id: string, _reason = '') {
  throw new Error(COMING_SOON)
}

export async function getPendingReports(): Promise<Report[]> {
  throw new Error(MANAGED_IN_NEXUS)
}

export async function getCommentById(_id: string): Promise<Comment | null> {
  return null
}

export async function moderate(_target_type: 'tasting' | 'comment', _target_id: string, _action: 'ocultar' | 'mantener' | 'mostrar') {
  throw new Error(MANAGED_IN_NEXUS)
}

export async function getHiddenContent(): Promise<{ tastings: FeedItem[]; comments: Comment[] }> {
  throw new Error(MANAGED_IN_NEXUS)
}

export async function getWeekStats(): Promise<WeekStats> {
  throw new Error(MANAGED_IN_NEXUS)
}

// ---------- Tarjeta de socio (QR y puntos de Nexus) ----------

export async function getMemberCard(userId: string): Promise<MemberCard> {
  if (!isMe(userId)) throw new Error('No podés ver la tarjeta de otro socio')
  const me = await nexusRequest<NxMe>('GET', clubPath('/me'), { auth: true })
  updateStoredProfile(toProfile(me))
  const { card } = me
  return {
    code: card.qrCode ?? '',
    qr_pending: !card.qrCode,
    display_name: me.profile.name,
    created_at: me.profile.clubJoinedAt ?? new Date().toISOString(),
    balance: card.points,
    // Nexus todavía no guarda el historial de movimientos de puntos
    movements: [],
    next_reward: card.nextLevel ? { points: card.nextLevel.pointsRequired, label: levelLabel(card.nextLevel) } : null,
    rewards: card.levels.map((l) => ({ points: l.pointsRequired, label: levelLabel(l) })),
    level_label: card.level ? levelLabel(card.level) : null,
    member_ref: {
      customer_id: String(me.profile.id),
      email: me.profile.email,
      has_dni: Boolean(me.profile.documentNumber),
    },
  }
}

export async function findMemberByCode(_code: string): Promise<{ id: string; display_name: string; balance: number } | null> {
  throw new Error(MANAGED_IN_NEXUS)
}

export async function addPurchase(_code: string, _amount: number): Promise<{ display_name: string; points: number; balance: number }> {
  throw new Error('Los puntos se suman solos cuando la caja de Nexus registra la compra')
}

// ---------- Configuración del club ----------

export async function getClubSettings(): Promise<ClubSettings> {
  const h = await nexusRequest<NxHighlights>('GET', clubPath('/highlights'))
  return { wine_of_month_id: h.wineOfMonth?.wine.id ?? null, wine_of_month_note: h.wineOfMonth?.note ?? null }
}

export async function getWineOfMonth(): Promise<{ wine: Wine; note: string | null } | null> {
  const h = await nexusRequest<NxHighlights>('GET', clubPath('/highlights'))
  return h.wineOfMonth ? { wine: toWine(h.wineOfMonth.wine), note: h.wineOfMonth.note } : null
}

export async function setWineOfMonth(_wineId: string | null, _note: string | null) {
  throw new Error('Marcá el vino como "destacado" en el catálogo de Nexus')
}
