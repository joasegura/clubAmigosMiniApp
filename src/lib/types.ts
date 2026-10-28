export type Role = 'socio' | 'admin'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  role: Role
  created_at: string
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
  avg_rating: number
  votes: number
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

/** Publicación del feed con autor, vino y contadores */
export interface FeedItem extends Tasting {
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
  wine: Wine | null
  cheers: { count: number }[]
  comments: { count: number }[]
}

export interface Comment {
  id: string
  tasting_id: string
  user_id: string
  body: string
  hidden: boolean
  created_at: string
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}

export interface Report {
  id: string
  target_type: 'tasting' | 'comment'
  target_id: string
  reason: string | null
  status: 'pendiente' | 'oculto' | 'mantenido'
  created_at: string
}

export interface ClubSettings {
  wine_of_month_id: string | null
  wine_of_month_note: string | null
}

export interface WeekStats {
  new_members: number
  tastings: number
  want_clicks: number
  pending_reports: number
}
