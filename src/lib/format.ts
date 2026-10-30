import { photoSrc } from './store'
import type { Wine } from './types'

/** WhatsApp de la vinoteca (+54 9 3772 52-1783): solo números, con código de país. Se puede cambiar con VITE_WHATSAPP_NUMBER */
export const WHATSAPP_NUMBER = ((import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || '5493772521783').replace(/\D/g, '')

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function formatPrice(price: number | null | undefined) {
  if (price == null) return ''
  return pesos.format(Number(price))
}

export function formatRating(avg: number | string | null | undefined) {
  if (avg == null) return '–'
  return Number(avg).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'recién'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export function memberSince(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

export function initials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function wineSubtitle(w: Pick<Wine, 'winery' | 'varietal' | 'vintage'>) {
  return [w.varietal, w.winery, w.vintage].filter(Boolean).join(' · ')
}

/** Minúsculas y sin tildes, para buscar "torrontes" y encontrar "Torrontés" */
export function normalizeText(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

/** URL para mostrar una foto: las URLs completas pasan tal cual, las rutas son fotos guardadas en el dispositivo */
export function photoUrl(path: string | null | undefined) {
  if (!path) return null
  if (/^(https?:|blob:|data:|\/)/.test(path)) return path
  return photoSrc(path)
}

export function whatsappLink(wine: Pick<Wine, 'name' | 'winery' | 'vintage'>, kind: 'reservar' | 'aviso' = 'reservar') {
  const vino = [wine.name, wine.winery, wine.vintage].filter(Boolean).join(' ')
  const text =
    kind === 'reservar'
      ? `Hola! Quiero reservar el ${vino} que vi en el Club Entre amigos 🍷`
      : `Hola! Me avisan cuando vuelva a entrar el ${vino}? Lo vi en el Club Entre amigos 🍷`
  const base = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(text)}`
}

export const RATING_LABELS = ['', 'No me gustó', 'Regular', 'Bueno', 'Muy bueno', 'Excelente']

export const OCCASIONS = ['Asado', 'Cena', 'Con amigos', 'En pareja', 'Regalo', 'Celebración']

/** Achica la foto antes de subirla (máx. 1280px, JPEG) para ahorrar datos y espacio */
export async function compressImage(file: File, maxSize = 1280, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto'))), 'image/jpeg', quality),
  )
}
