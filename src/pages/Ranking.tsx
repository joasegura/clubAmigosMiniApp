import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMostLoggedThisMonth, getRanking } from '../lib/backend'
import { useClubUpdates } from '../lib/nexus/realtime'
import { formatPrice, formatRating, wineSubtitle } from '../lib/format'
import type { RankedWine } from '../lib/types'
import { Chip, Empty, ErrorBox, Loading, PageHeader, WineThumb } from '../components/ui'
import { IconSpark } from '../components/Icons'

const WHITES = ['Torrontés', 'Chardonnay', 'Sauvignon Blanc', 'Viognier', 'Semillón', 'Chenin', 'Riesling', 'Blanco']

// Podio: oro, plata y bronce, en tonos suaves que acompañan la paleta de la marca
const PODIUM = ['bg-[#E9C46A] text-[#5B4508]', 'bg-[#D9DDE1] text-[#3E464D]', 'bg-[#E4B48F] text-[#5C3415]']

const PRICE_RANGES = [
  { id: 'todos', label: 'Cualquier precio', test: () => true },
  { id: 'hasta10', label: 'Hasta $10.000', test: (p: number) => p <= 10000 },
  { id: '10a20', label: '$10.000 a $20.000', test: (p: number) => p > 10000 && p <= 20000 },
  { id: 'mas20', label: 'Más de $20.000', test: (p: number) => p > 20000 },
]

export default function Ranking() {
  const [wines, setWines] = useState<RankedWine[] | null>(null)
  const [top, setTop] = useState<{ wine_id: string; name: string } | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [price, setPrice] = useState('todos')

  async function load() {
    setError('')
    try {
      const [r, m] = await Promise.all([getRanking(), getMostLoggedThisMonth()])
      setWines(r)
      setTop(m)
    } catch (e) {
      setError((e as Error).message)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  useClubUpdates(() => void load())

  // Chips: las 3 cepas tintas con más vinos rankeados + "Blancos"
  const chips = useMemo(() => {
    const count = new Map<string, number>()
    for (const w of wines ?? []) {
      if (w.varietal && !WHITES.includes(w.varietal)) count.set(w.varietal, (count.get(w.varietal) ?? 0) + 1)
    }
    const reds = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v]) => v)
    return ['Todos', ...reds, 'Blancos']
  }, [wines])

  const list = useMemo(() => {
    const range = PRICE_RANGES.find((r) => r.id === price)!
    return (wines ?? []).filter((w) => {
      if (filter === 'Blancos' && !WHITES.includes(w.varietal ?? '')) return false
      if (filter !== 'Todos' && filter !== 'Blancos' && w.varietal !== filter) return false
      if (price !== 'todos' && (w.price == null || !range.test(Number(w.price)))) return false
      return true
    })
  }, [wines, filter, price])

  return (
    <>
      <PageHeader title={<span className="text-[26px]">Ranking del club</span>} />
      <div className="flex flex-col gap-3 border-b border-linea bg-white px-5 pb-3.5">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pt-1">
          {chips.map((c) => (
            <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-gris">
          Precio
          <select
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-9 rounded-full border border-borde bg-white px-3 text-[13px] text-tinta"
          >
            {PRICE_RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2.5 px-5 pt-4">
        {error && <ErrorBox message={error} onRetry={load} />}
        {!wines && !error && <Loading />}
        {wines && list.length === 0 && (
          <Empty title="Todavía no hay vinos en este ranking">Cuando los socios suban vinos del catálogo, aparecen acá.</Empty>
        )}

        {list.map((w, i) => (
          <Link
            key={w.id}
            to={`/vino/${w.id}`}
            className={`flex items-center gap-3.5 rounded-2xl border bg-white p-3.5 text-tinta no-underline active:bg-crema ${i === 0 ? 'border-vino' : 'border-linea'}`}
          >
            {i < 3 ? (
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${PODIUM[i]}`}>{i + 1}</span>
            ) : (
              <span className="w-8 shrink-0 text-center text-2xl font-light text-gris">{i + 1}</span>
            )}
            <WineThumb wine={w} className="h-[72px] w-12 shrink-0 rounded-[10px]" bottleSize={58} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-medium">{w.name}</span>
              <span className="truncate text-xs text-gris">{wineSubtitle(w)}</span>
              {w.in_stock ? (
                <span className="text-xs font-medium text-ok">Disponible · {formatPrice(w.price)}</span>
              ) : (
                <span className="text-xs text-gris">Sin stock por ahora</span>
              )}
            </span>
            <span className="flex flex-col items-end">
              <span className="text-xl font-semibold">{formatRating(w.avg_rating)}</span>
              <span className="text-[11px] text-gris">
                {w.votes} {w.votes === 1 ? 'voto' : 'votos'}
              </span>
            </span>
          </Link>
        ))}

        {list.length > 0 && (
          <p className="px-1 text-[11px] leading-relaxed text-gris">
            Cuenta un voto por socio (su último puntaje). Para ordenar se pondera por la cantidad de votos: un vino con un solo voto no pasa
            adelante de uno que muchos socios puntuaron alto.
          </p>
        )}

        {top && (
          <Link to={`/vino/${top.wine_id}`} className="mt-1 flex items-center gap-2.5 rounded-[14px] bg-vino-suave px-3.5 py-3 text-[13px] text-vino-oscuro no-underline">
            <IconSpark size={20} className="text-vino" />
            <span>
              El más tomado del mes: <b className="font-semibold">{top.name}</b>
            </span>
          </Link>
        )}
      </div>
    </>
  )
}
