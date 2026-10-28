import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getClubSettings, getFeed, getMyCheers, getWine, logWantClick } from '../lib/api'
import { formatPrice, whatsappLink, wineSubtitle } from '../lib/format'
import type { FeedItem, Wine } from '../lib/types'
import TastingCard from '../components/TastingCard'
import { Empty, ErrorBox, Loading, WineThumb } from '../components/ui'

const PAGE = 15

export default function Feed() {
  const { profile } = useAuth()
  const [items, setItems] = useState<FeedItem[]>([])
  const [cheers, setCheers] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [more, setMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wom, setWom] = useState<{ wine: Wine; note: string | null } | null>(null)

  const load = useCallback(
    async (p: number) => {
      if (!profile) return
      setLoading(true)
      setError('')
      try {
        const data = await getFeed(p, PAGE)
        const mine = await getMyCheers(profile.id, data.map((d) => d.id))
        setItems((prev) => (p === 0 ? data : [...prev, ...data]))
        setCheers((prev) => new Set([...(p === 0 ? [] : prev), ...mine]))
        setMore(data.length === PAGE)
        setPage(p)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [profile],
  )

  useEffect(() => {
    void load(0)
    getClubSettings()
      .then(async (s) => {
        if (!s?.wine_of_month_id) return
        const wine = await getWine(s.wine_of_month_id)
        if (wine) setWom({ wine, note: s.wine_of_month_note })
      })
      .catch(() => undefined)
  }, [load])

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-linea bg-white/95 px-5 py-3 backdrop-blur">
        <img src="/brand/icon-192.png" alt="" className="h-10 w-10 object-contain" />
        <div className="leading-tight">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-vino">Club</p>
          <p className="text-xl font-medium">Entre amigos</p>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-5 pt-5">
        {wom && (
          <section aria-label="Vino del mes" className="flex items-center gap-4 rounded-[18px] bg-tinta p-4 text-white">
            <Link to={`/vino/${wom.wine.id}`} className="shrink-0">
              <WineThumb wine={wom.wine} className="h-28 w-[70px] rounded-xl !bg-[#2B2725]" bottleSize={92} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F08A8F]">Vino del mes</span>
              <Link to={`/vino/${wom.wine.id}`} className="text-lg font-medium leading-tight text-white no-underline">
                {wom.wine.name}
              </Link>
              <span className="truncate text-[13px] text-[#CFC6C1]">{wineSubtitle(wom.wine)}</span>
              {wom.note && <span className="text-xs text-[#CFC6C1]">{wom.note}</span>}
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-[17px] font-semibold">{wom.wine.in_stock ? formatPrice(wom.wine.price) : 'Sin stock'}</span>
                {wom.wine.in_stock && (
                  <a
                    href={whatsappLink(wom.wine)}
                    target="_blank"
                    rel="noopener"
                    onClick={() => profile && logWantClick(profile.id, wom.wine.id)}
                    className="flex h-10 items-center rounded-full bg-vino px-4 text-sm font-medium text-white no-underline"
                  >
                    Lo quiero
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        <h2 className="text-lg font-medium">Lo último del club</h2>

        {error && <ErrorBox message={error} onRetry={() => load(0)} />}

        {!loading && !error && items.length === 0 && (
          <Empty title="Todavía no hay vinos en el club">
            <Link to="/subir">Sé el primero en subir uno</Link>
          </Empty>
        )}

        <div className="flex flex-col gap-4">
          {items.map((it) => (
            <TastingCard
              key={it.id}
              item={it}
              cheered={cheers.has(it.id)}
              onDeleted={(id) => setItems((xs) => xs.filter((x) => x.id !== id))}
            />
          ))}
        </div>

        {loading && <Loading />}
        {!loading && more && items.length > 0 && (
          <button onClick={() => load(page + 1)} className="mx-auto h-11 rounded-full border border-borde bg-white px-6 text-sm">
            Ver más
          </button>
        )}
      </div>
    </>
  )
}
