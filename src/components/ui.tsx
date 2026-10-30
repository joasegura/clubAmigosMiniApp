import type { ReactNode } from 'react'
import { Bottle, IconGlass } from './Icons'
import { initials, photoUrl } from '../lib/format'
import type { Wine } from '../lib/types'

/** Puntaje en copas (solo lectura) */
export function Copas({ value, size = 16 }: { value: number; size?: number }) {
  const rounded = Math.round(value)
  return (
    <span role="img" aria-label={`${rounded} de 5 copas`} className="inline-flex gap-0.5 text-vino">
      {[1, 2, 3, 4, 5].map((i) => (
        <IconGlass key={i} size={size} filled={i <= rounded} className={i <= rounded ? 'text-vino' : 'text-borde'} strokeWidth={1.5} />
      ))}
    </span>
  )
}

/** Selector de puntaje en copas */
export function CopasInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Puntaje">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} ${i === 1 ? 'copa' : 'copas'}`}
          onClick={() => onChange(i)}
          className="flex h-11 w-11 items-center justify-center rounded-full active:scale-95"
        >
          <IconGlass size={30} filled={i <= value} className={i <= value ? 'text-vino' : 'text-borde'} strokeWidth={1.4} />
        </button>
      ))}
    </div>
  )
}

const AVATAR_COLORS = [
  ['#F3E3E4', '#B8232B'],
  ['#E6ECEF', '#34505E'],
  ['#EFEADF', '#6B5A2E'],
  ['#E7EEE8', '#2E5B3C'],
  ['#ECE6F0', '#5A3E6B'],
]

export function Avatar({ name, url, id = '', size = 36 }: { name: string | null | undefined; url?: string | null; id?: string; size?: number }) {
  if (url) {
    return <img src={url} alt="" referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  const idx = [...(id || name || '')].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  const [bg, fg] = AVATAR_COLORS[idx]
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  )
}

const BOTTLE_COLORS: Record<string, string> = {
  Torrontés: '#8E8A4E',
  Chardonnay: '#A39550',
  'Sauvignon Blanc': '#8E8A4E',
  Rosado: '#C46A72',
  Espumante: '#A39550',
}

export function WineThumb({
  wine,
  photoPath,
  className = '',
  bottleSize = 60,
}: {
  wine: Pick<Wine, 'image_url' | 'varietal' | 'name'> | null
  photoPath?: string | null
  className?: string
  bottleSize?: number
}) {
  const src = photoUrl(photoPath) ?? photoUrl(wine?.image_url)
  if (src) return <img src={src} alt={wine?.name ?? ''} loading="lazy" className={`object-cover ${className}`} />
  const color = (wine?.varietal && BOTTLE_COLORS[wine.varietal]) || '#5A1E22'
  return (
    <div className={`flex items-center justify-center bg-arena ${className}`}>
      <Bottle color={color} size={bottleSize} />
    </div>
  )
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gris" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-borde border-t-vino" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Bottle color="#DCD3CE" size={56} />
      <p className="mt-2 text-base font-medium">{title}</p>
      {children && <div className="text-sm text-gris">{children}</div>}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="m-5 rounded-2xl border border-vino/30 bg-vino-suave p-4 text-sm text-vino-oscuro" role="alert">
      <p>No pudimos cargar esto: {message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-medium underline">
          Reintentar
        </button>
      )}
    </div>
  )
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 shrink-0 rounded-full px-4 text-[13px] transition-colors ${
        active ? 'bg-tinta text-white' : 'border border-borde bg-white text-tinta'
      }`}
    >
      {children}
    </button>
  )
}

export function PageHeader({ title, right, left }: { title: ReactNode; right?: ReactNode; left?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-linea bg-white/95 px-3 py-2 backdrop-blur">
      {left}
      <h1 className="flex-1 truncate px-2 text-[19px] font-medium">{title}</h1>
      {right}
    </header>
  )
}
