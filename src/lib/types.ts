export type Role = 'socio' | 'admin'

export interface Profile {
  id: string
  email: string | null
  /** Vacío hasta que el socio elige cómo lo llamamos (primer ingreso por mail) */
  display_name: string
  avatar_url: string | null
  role: Role
  created_at: string
  /** Número de socio que va en el QR de la tarjeta (ej. EA001001). Se asigna la primera vez que se abre la tarjeta */
  member_code?: string
}

export interface Wine {
  id: string
  nexus_id: string | null
  name: string
  winery: string | null
  varietal: string | null
  vintage: number | null
  region: string | null
  price: number | null
  in_stock: boolean
  image_url: string | null
  source: 'catalogo' | 'externo'
  active: boolean
  created_by: string | null
}

export interface RankedWine extends Wine {
  /** Promedio real (un voto por socio: su último puntaje) */
  avg_rating: number
  votes: number
  /** Promedio ponderado usado para ordenar: un vino con pocos votos no salta al primer puesto */
  score: number
}

export interface WineSummary {
  avg: number | null
  votes: number
  position: number | null
}

export interface Tasting {
  id: string
  user_id: string
  wine_id: string
  rating: number
  comment: string | null
  occasion: string | null
  photo_path: string | null
  hidden: boolean
  created_at: string
}

export type PublicProfile = Pick<Profile, 'id' | 'display_name' | 'avatar_url'>

/** Publicación del feed con autor, vino y contadores */
export interface FeedItem extends Tasting {
  profile: PublicProfile | null
  wine: Wine | null
  cheer_count: number
  comment_count: number
}

export interface CommentRow {
  id: string
  tasting_id: string
  user_id: string
  body: string
  hidden: boolean
  created_at: string
}

export interface Comment extends CommentRow {
  profile: PublicProfile | null
}

export interface Report {
  id: string
  target_type: 'tasting' | 'comment'
  target_id: string
  reporter_id: string
  reason: string | null
  status: 'pendiente' | 'oculto' | 'mantenido'
  created_at: string
}

export interface ClubSettings {
  wine_of_month_id: string | null
  wine_of_month_note: string | null
}

/** Movimiento de puntos. Hoy los carga la demo; a futuro vienen de Nexus */
export interface PointsMovement {
  id: string
  user_id: string
  points: number
  concept: string
  created_at: string
}

export interface Reward {
  points: number
  label: string
}

export interface MemberCard {
  code: string
  display_name: string
  created_at: string
  balance: number
  movements: PointsMovement[]
  /** Próximo beneficio que todavía no alcanzó (null si ya llegó al último) */
  next_reward: Reward | null
}

export interface WeekStats {
  new_members: number
  tastings: number
  want_clicks: number
  pending_reports: number
}
