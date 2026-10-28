/**
 * Todo el acceso a datos de la app pasa por acá.
 *
 * Catálogo: la app lee los vinos de la tabla `wines` (source = 'catalogo').
 * Hoy esa tabla tiene datos de prueba; cuando se conecte Nexus, una
 * sincronización va a hacer upsert por `nexus_id` (nombre, precio, stock)
 * y el resto de la app no cambia.
 */
import { supabase } from './supabase'
import { compressImage } from './format'
import type { ClubSettings, Comment, FeedItem, Profile, RankedWine, Report, Tasting, WeekStats, Wine } from './types'

const FEED_SELECT =
  '*, profile:profiles(id, display_name, avatar_url), wine:wines(*), cheers:tasting_cheers(count), comments:tasting_comments(count)'

/** Lanza el error de Supabase o devuelve los datos (sin error, las listas nunca son null) */
function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message)
  return res.data as NonNullable<T>
}

// ---------- Perfil ----------

export async function getProfile(id: string): Promise<Profile | null> {
  return check(await supabase.from('profiles').select('*').eq('id', id).maybeSingle())
}

export async function updateDisplayName(id: string, display_name: string) {
  check(await supabase.from('profiles').update({ display_name }).eq('id', id))
}

// ---------- Catálogo ----------

export async function searchCatalog(q: string, limit = 8): Promise<Wine[]> {
  let query = supabase.from('wines').select('*').eq('source', 'catalogo').eq('active', true).order('name').limit(limit)
  const term = q.trim().replace(/[%,()]/g, ' ')
  if (term) {
    const words = term.split(/\s+/).filter(Boolean)
    for (const w of words) {
      query = query.or(`name.ilike.%${w}%,winery.ilike.%${w}%,varietal.ilike.%${w}%`)
    }
  }
  return check(await query)
}

export async function listCatalog(): Promise<Wine[]> {
  return check(await supabase.from('wines').select('*').eq('source', 'catalogo').order('name'))
}

export async function getWine(id: string): Promise<Wine | null> {
  return check(await supabase.from('wines').select('*').eq('id', id).maybeSingle())
}

export async function createExternalWine(userId: string, w: Pick<Wine, 'name' | 'winery' | 'varietal' | 'vintage'>): Promise<Wine> {
  return check(
    await supabase
      .from('wines')
      .insert({ ...w, source: 'externo', created_by: userId, in_stock: false })
      .select('*')
      .single(),
  )
}

export async function saveCatalogWine(w: Partial<Wine> & { name: string }) {
  if (w.id) {
    const { id, ...rest } = w
    check(await supabase.from('wines').update(rest).eq('id', id))
  } else {
    check(await supabase.from('wines').insert({ ...w, source: 'catalogo' }))
  }
}

// ---------- Ranking ----------

export async function getRanking(): Promise<RankedWine[]> {
  const data = check(
    await supabase.from('wine_ranking').select('*').order('avg_rating', { ascending: false }).order('votes', { ascending: false }),
  ) as RankedWine[]
  return data.map((w) => ({ ...w, avg_rating: Number(w.avg_rating), votes: Number(w.votes) }))
}

export async function getMostLoggedThisMonth(): Promise<{ wine_id: string; name: string; winery: string | null; total: number } | null> {
  const data = check(await supabase.rpc('most_logged_this_month'))
  return (data as { wine_id: string; name: string; winery: string | null; total: number }[])?.[0] ?? null
}

// ---------- Publicaciones ----------

export async function getFeed(page = 0, pageSize = 15): Promise<FeedItem[]> {
  const from = page * pageSize
  return check(
    await supabase.from('tastings').select(FEED_SELECT).eq('hidden', false).order('created_at', { ascending: false }).range(from, from + pageSize - 1),
  ) as unknown as FeedItem[]
}

export async function getWineTastings(wineId: string): Promise<FeedItem[]> {
  return check(
    await supabase.from('tastings').select(FEED_SELECT).eq('wine_id', wineId).eq('hidden', false).order('created_at', { ascending: false }).limit(50),
  ) as unknown as FeedItem[]
}

export async function getUserTastings(userId: string): Promise<FeedItem[]> {
  return check(
    await supabase.from('tastings').select(FEED_SELECT).eq('user_id', userId).order('created_at', { ascending: false }),
  ) as unknown as FeedItem[]
}

export async function getTasting(id: string): Promise<FeedItem | null> {
  return check(await supabase.from('tastings').select(FEED_SELECT).eq('id', id).maybeSingle()) as unknown as FeedItem | null
}

export async function uploadPhoto(userId: string, file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('fotos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw new Error(error.message)
  return path
}

export async function createTasting(t: Pick<Tasting, 'wine_id' | 'rating' | 'comment' | 'occasion' | 'photo_path'> & { user_id: string }) {
  return check(await supabase.from('tastings').insert(t).select('id').single())
}

export async function deleteTasting(id: string) {
  check(await supabase.from('tastings').delete().eq('id', id))
}

// ---------- Brindis y comentarios ----------

export async function getMyCheers(userId: string, tastingIds: string[]): Promise<Set<string>> {
  if (!tastingIds.length) return new Set()
  const data = check(await supabase.from('tasting_cheers').select('tasting_id').eq('user_id', userId).in('tasting_id', tastingIds))
  return new Set(data.map((r) => r.tasting_id as string))
}

export async function setCheer(userId: string, tastingId: string, on: boolean) {
  if (on) check(await supabase.from('tasting_cheers').upsert({ tasting_id: tastingId, user_id: userId }))
  else check(await supabase.from('tasting_cheers').delete().eq('tasting_id', tastingId).eq('user_id', userId))
}

export async function getComments(tastingId: string): Promise<Comment[]> {
  return check(
    await supabase
      .from('tasting_comments')
      .select('*, profile:profiles(id, display_name, avatar_url)')
      .eq('tasting_id', tastingId)
      .eq('hidden', false)
      .order('created_at'),
  ) as unknown as Comment[]
}

export async function addComment(userId: string, tastingId: string, body: string) {
  check(await supabase.from('tasting_comments').insert({ tasting_id: tastingId, user_id: userId, body }))
}

export async function deleteComment(id: string) {
  check(await supabase.from('tasting_comments').delete().eq('id', id))
}

// ---------- Quiero probar ----------

export async function getWishlist(userId: string): Promise<Wine[]> {
  const data = check(await supabase.from('wishlist').select('wine:wines(*)').eq('user_id', userId).order('created_at', { ascending: false }))
  return (data as unknown as { wine: Wine | null }[]).map((r) => r.wine).filter((w): w is Wine => Boolean(w))
}

export async function isInWishlist(userId: string, wineId: string) {
  const data = check(await supabase.from('wishlist').select('wine_id').eq('user_id', userId).eq('wine_id', wineId))
  return data.length > 0
}

export async function setWishlist(userId: string, wineId: string, on: boolean) {
  if (on) check(await supabase.from('wishlist').upsert({ user_id: userId, wine_id: wineId }))
  else check(await supabase.from('wishlist').delete().eq('user_id', userId).eq('wine_id', wineId))
}

// ---------- Ventas ----------

/** Registra el toque en "Lo quiero" (para medir); nunca bloquea la apertura de WhatsApp */
export function logWantClick(userId: string, wineId: string) {
  void supabase.from('want_clicks').insert({ user_id: userId, wine_id: wineId }).then(() => undefined)
}

// ---------- Reportes y moderación ----------

export async function reportContent(userId: string, target_type: 'tasting' | 'comment', target_id: string, reason = '') {
  const { error } = await supabase.from('reports').insert({ reporter_id: userId, target_type, target_id, reason })
  // Si ya lo había reportado, no es un error para el usuario
  if (error && !error.message.includes('duplicate')) throw new Error(error.message)
}

export async function getPendingReports(): Promise<Report[]> {
  return check(await supabase.from('reports').select('*').eq('status', 'pendiente').order('created_at', { ascending: false }))
}

export async function getCommentById(id: string): Promise<Comment | null> {
  return check(
    await supabase.from('tasting_comments').select('*, profile:profiles(id, display_name, avatar_url)').eq('id', id).maybeSingle(),
  ) as unknown as Comment | null
}

export async function moderate(target_type: 'tasting' | 'comment', target_id: string, action: 'ocultar' | 'mantener') {
  check(await supabase.rpc('moderate', { p_target_type: target_type, p_target_id: target_id, p_action: action }))
}

export async function getWeekStats(): Promise<WeekStats | null> {
  const data = check(await supabase.rpc('admin_week_stats'))
  return (data as WeekStats[])?.[0] ?? null
}

// ---------- Configuración del club ----------

export async function getClubSettings(): Promise<ClubSettings | null> {
  return check(await supabase.from('club_settings').select('wine_of_month_id, wine_of_month_note').eq('id', 1).maybeSingle())
}

export async function setWineOfMonth(wineId: string | null, note: string | null) {
  check(
    await supabase
      .from('club_settings')
      .update({ wine_of_month_id: wineId, wine_of_month_note: note, updated_at: new Date().toISOString() })
      .eq('id', 1),
  )
}

export async function getWineStats(wineId: string): Promise<{ avg: number | null; votes: number }> {
  const data = check(await supabase.from('tastings').select('rating').eq('wine_id', wineId).eq('hidden', false))
  if (!data.length) return { avg: null, votes: 0 }
  const sum = data.reduce((s, r) => s + (r.rating as number), 0)
  return { avg: sum / data.length, votes: data.length }
}
