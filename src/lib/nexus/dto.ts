/** Respuestas de la API pública del club en Nexus (`/club-app/:slug`) */

export interface NxPaginated<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface NxWine {
  id: string
  name: string
  winery: string | null
  varietal: string | null
  description: string | null
  price: number | null
  inStock: boolean
  imageUrl: string | null
  avgRating: number | null
  votes: number
}

export interface NxRankedWine extends NxWine {
  score: number
  position: number
}

export interface NxWineDetail extends NxWine {
  position: number | null
}

export interface NxReview {
  id: string
  productId: string | null
  rating: number
  comment: string | null
  authorName: string | null
  customerId: number | null
  createdAt: string
  updatedAt: string | null
  wine: NxWine | null
}

export interface NxHighlights {
  wineOfMonth: { wine: NxWine; note: string | null } | null
  mostLoggedThisMonth: { wine: NxWine; total: number } | null
}

export interface NxLevel {
  name: string
  discountPercent: number
  pointsRequired: number
}

export interface NxMemberProfile {
  id: number
  name: string
  lastName: string | null
  email: string | null
  phone: string | null
  documentNumber: string | null
  isClubMember: boolean
  clubJoinedAt: string | null
}

export interface NxMe {
  profile: NxMemberProfile
  card: {
    qrCode: string | null
    qrAssignedAt: string | null
    points: number
    level: (NxLevel & { id: number }) | null
    nextLevel: NxLevel | null
    levels: NxLevel[]
  }
}

/** POST public-catalogs/:slug/auth/send-code y /register */
export interface NxSendCodeResponse {
  message: string
  email: string
}

/** POST public-catalogs/:slug/auth/verify-code */
export interface NxVerifyResponse {
  message: string
  sessionToken: string
  user: {
    id: number
    name: string
    lastName: string | null
    documentNumber: string | null
    email: string | null
    isClubMember: boolean
    clubQr: string | null
  }
}

/** POST club-app/:slug/auth/google */
export interface NxGoogleLoginResponse {
  sessionToken: string
  /** true si Nexus creó el cliente en este ingreso */
  created: boolean
  me: NxMe
}

export interface NxRegisterInput {
  documentNumber: string
  name: string
  lastName: string
  email: string
  phone?: string
}
