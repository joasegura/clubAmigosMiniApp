import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getFeed, getMemberCard, getMyCheers, getWineOfMonth, logWantClick } from '../lib/api'
import { formatPrice, whatsappLink, wineSubtitle } from '../lib/format'
import type { FeedItem, Wine } from '../lib/types'
import TastingCard from '../components/TastingCard'
import InstallHint from '../components/InstallHint'
import { Empty, ErrorBox, WineThumb } from '../components/ui'
import { IconChat, IconQr } from '../components/Icons'

const PAGE = 15

/** Lo que el socio ya había cargado y dónde estaba, para volver al mismo lugar desde la ficha de un vino */
let saved: { pages: number; scrollY: number } | null = null

function FeedSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-linea bg-white p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="skeleton h-9 w-9 !rounded-full" />
            <span className="flex flex-col gap-1.5">
              <span className="skeleton h-3 w-28" />
              <span className="skeleton h-2.5 w-16" />
            </span>
          </div>
          <span className="skeleton h-[76px] w-full !rounded-xl" />
          <span className="skeleton h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}

export default function Feed() {
  const { profile } = useAuth()
  // Depender del id (no del objeto) evita recargar el feed y perder lo ya cargado
  const profileId = profile?.id
  const [items, setItems] = useState<FeedItem[]>([])
  const [cheers, setCheers] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [more, setMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wom, setWom] = useState<{ wine: Wine; note: string | null } | null>(null)
  const [points, setPoints] = useState<number | null>(null)
  const pageRef = useRef(0)
  // Recién publicado: mostrar el feed desde arriba, con la publicación nueva
  const justPublished = Boolean((useLocation().state as { published?: boolean } | null)?.published)
  const skipRestore = useRef(justPublished)

  /** Carga desde la página 0 hasta `upTo` (inclusive) de una vez, o agrega la página `upTo` */
  const load = useCallback(
    async (upTo: number, append = false) => {
      if (!profileId) return
      setLoading(true)
      setError('')
      try {
        const data = append ? await getFeed(upTo, PAGE) : await getFeed(0, PAGE * (upTo + 1))
        const mine = await getMyCheers(profileId, data.map((d) => d.id))
        setItems((prev) => (append ? [...prev, ...data] : data))
        setCheers((prev) => new Set([...(append ? prev : []), ...mine]))
        setMore(data.length === (append ? PAGE : PAGE * (upTo + 1)))
        setPage(upTo)
        pageRef.current = upTo
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [profileId],
  )

  useEffect(() => {
    const restore = skipRestore.current ? null : saved
    skipRestore.current = false
    saved = null
    void load(restore ? restore.pages - 1 : 0).then(() => {
      if (restore) requestAnimationFrame(() => window.scrollTo(0, restore.scrollY))
    })
    getWineOfMonth()
      .then(setWom)
      .catch(() => undefined)
    if (profileId) {
      getMemberCard(profileId)
        .then((c) => setPoints(c.balance))
        .catch(() => undefined)
    }
    return () => {
      saved = { pages: pageRef.current + 1, scrollY: window.scrollY }
    }
  }, [load, profileId])

  const firstName = profile?.display_name.split(' ')[0]

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-linea bg-white/95 px-5 py-2.5 backdrop-blur">
        <img src="/brand/icon-192.png" alt="" className="h-10 w-10 object-contain" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-vino">Club Entre amigos</p>
          <p className="truncate text-lg font-medium">Hola, {firstName}</p>
        </div>
        {points !== null && (
          <Link
            to="/tarjeta"
            aria-label={`Mi tarjeta: ${points} puntos`}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-linea bg-crema pl-2.5 pr-3.5 text-tinta no-underline active:bg-arena"
          >
            <IconQr size={18} className="text-vino" />
            <span className="text-sm font-semibold">{points.toLocaleString('es-AR')}</span>
            <span className="text-xs text-gris">pts</span>
          </Link>
        )}
      </header>

      <div className="flex flex-col gap-5 px-4 pt-4">
        <InstallHint />

        {wom && (
          <section aria-label="Vino del mes" className="relative overflow-hidden rounded-[22px] bg-tinta text-white">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-vino/30 blur-2xl" />
            <div className="relative flex gap-4 p-4">
              <Link to={`/vino/${wom.wine.id}`} className="shrink-0">
                <WineThumb wine={wom.wine} className="h-32 w-[78px] rounded-xl !bg-[#2B2725]" bottleSize={104} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="self-start rounded-full bg-vino px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">Vino del mes</span>
                <Link to={`/vino/${wom.wine.id}`} className="mt-1 text-xl font-medium leading-tight text-white no-underline">
                  {wom.wine.name}
                </Link>
                <span className="truncate text-[13px] text-[#CFC6C1]">{wineSubtitle(wom.wine)}</span>
                {wom.note && <span className="text-xs font-medium text-[#F08A8F]">{wom.note}</span>}
              </div>
            </div>
            <div className="relative flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
              <span className="text-lg font-semibold">{wom.wine.in_stock ? formatPrice(wom.wine.price) : 'Sin stock por ahora'}</span>
              {wom.wine.in_stock && (
                <a
                  href={whatsappLink(wom.wine)}
                  target="_blank"
                  rel="noopener"
                  onClick={() => profileId && logWantClick(profileId, wom.wine.id)}
                  className="flex h-10 items-center gap-1.5 rounded-full bg-vino px-4 text-sm font-medium text-white no-underline active:bg-vino-oscuro"
                >
                  <IconChat size={16} /> Lo quiero
                </a>
              )}
            </div>
          </section>
        )}

        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Lo último del club</h2>
          <Link to="/ranking" className="text-[13px] text-vino no-underline">
            Ver ranking
          </Link>
        </div>

        {error && <ErrorBox message={error} onRetry={() => load(0)} />}

        {!loading && !error && items.length === 0 && (
          <Empty title="Todavía no hay vinos en el club">
            <Link to="/subir">Sé el primero en subir uno</Link>
          </Empty>
        )}

        {loading && items.length === 0 ? (
          <FeedSkeleton />
        ) : (
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
        )}

        {more && items.length > 0 && (
          <button
            onClick={() => load(page + 1, true)}
            disabled={loading}
            className="mx-auto mb-2 h-11 rounded-full border border-borde bg-white px-6 text-sm active:bg-crema disabled:opacity-50"
          >
            {loading ? 'Cargando…' : 'Ver más'}
          </button>
        )}
        {!more && items.length > 0 && <p className="pb-2 text-center text-xs text-gris">Ya viste todo lo del club 🍷</p>}
      </div>
    </>
  )
}
