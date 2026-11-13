/**
 * Punto único de acceso a datos para las pantallas.
 *
 * - Con VITE_NEXUS_API_URL + VITE_NEXUS_CATALOG_SLUG → datos reales de Nexus (`nexusApi.ts`).
 * - Sin esas variables → demo en el dispositivo (`api.ts`, sin cambios).
 *
 * El tipado `typeof demo` obliga a que las dos implementaciones tengan las mismas funciones.
 */
import * as demo from './api'
import * as nexus from './nexusApi'
import { NEXUS_ENABLED } from './nexus/client'

export { NEXUS_ENABLED }

const impl: typeof demo = NEXUS_ENABLED ? nexus : demo

/** Funciones disponibles según el modo: la UI oculta lo que todavía no existe en Nexus */
export const FEATURES = {
  /** Fotos en las publicaciones */
  photos: !NEXUS_ENABLED,
  /** Brindis */
  cheers: !NEXUS_ENABLED,
  /** Comentarios en hilo sobre una publicación (el comentario de la valoración sí existe) */
  threadComments: !NEXUS_ENABLED,
  /** Reportar contenido (en Nexus modera la vinoteca desde el panel) */
  reports: !NEXUS_ENABLED,
  /** Cargar vinos que no están en el catálogo */
  externalWines: !NEXUS_ENABLED,
  /** Ocasión de la cata (Nexus guarda solo puntaje y comentario) */
  occasions: !NEXUS_ENABLED,
  /** Panel de la vinoteca dentro de la app y "Reiniciar demo" */
  demoTools: !NEXUS_ENABLED,
} as const

export const {
  getCurrentProfile,
  signInDemo,
  signInAsShop,
  signOutDemo,
  getProfile,
  updateDisplayName,
  searchCatalog,
  listCatalog,
  getWine,
  createExternalWine,
  saveCatalogWine,
  importCatalogCsv,
  getRanking,
  getWineSummary,
  getMostLoggedThisMonth,
  getFeed,
  getWineTastings,
  getUserTastings,
  getTasting,
  getMyLastRating,
  uploadPhoto,
  createTasting,
  deleteTasting,
  getMyCheers,
  setCheer,
  getComments,
  addComment,
  deleteComment,
  getWishlist,
  isInWishlist,
  setWishlist,
  logWantClick,
  reportContent,
  getPendingReports,
  getCommentById,
  moderate,
  getHiddenContent,
  getWeekStats,
  getMemberCard,
  findMemberByCode,
  addPurchase,
  getClubSettings,
  getWineOfMonth,
  setWineOfMonth,
} = impl

/** Ingreso con DNI (solo modo Nexus) */
export const { nexusSendCode, nexusRegister, nexusVerifyCode } = nexus
