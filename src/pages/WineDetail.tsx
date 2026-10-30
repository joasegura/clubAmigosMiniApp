import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getMyCheers, getWine, getWineSummary, getWineTastings, isInWishlist, logWantClick, setWishlist } from '../lib/api'
import { formatPrice, formatRating, photoUrl, whatsappLink } from '../lib/format'
import type { FeedItem, Wine, WineSummary } from '../lib/types'
import TastingCard from '../components/TastingCard'
import { Empty, ErrorBox, Loading, WineThumb } from '../components/ui'
import { IconBack, IconBookmark, IconChat, IconShare } from '../components/Icons'
import { useFeedback } from '../components/feedback'

export default function WineDetail() {
  const { id = '' } = useParams()
  const { profile } = useAuth()
  const profileId = profile?.id
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const [wine, setWine] = useState<Wine | null | undefined>(undefined)
  const [stats, setStats] = useState<WineSummary>({ avg: null, votes: 0, position: null })
  const [tastings, setTastings] = useState<FeedItem[]>([])
  const [cheers, setCheers] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profileId) return
    setError('')
    try {
      const [w, s, t, inList] = await Promise.all([getWine(id), getWineSummary(id), getWineTastings(id), isInWishlist(profileId, id)])
      setWine(w)
      setStats(s)
      setTastings(t)
      setSaved(inList)
      setCheers(await getMyCheers(profileId, t.map((x) => x.id)))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [id, profileId])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleSaved() {
    if (!profileId) return
    const on = !saved
    setSaved(on)
    try {
      await setWishlist(profileId, id, on)
      toast(on ? 'Guardado en Quiero probar' : 'Quitado de Quiero probar')
    } catch {
      setSaved(!on)
    }
  }

  async function share() {
    if (!wine) return
    const url = `${window.location.origin}/vino/${wine.id}`
    const text = `Mirá este vino en el Club Entre amigos: ${wine.name}`
    try {
      if (navigator.share) await navigator.share({ title: wine.name, text, url })
      else {
        await navigator.clipboard.writeText(url)
        toast('Link copiado')
      }
    } catch {
      // El socio canceló el menú de compartir
    }
  }

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (wine === undefined) return <Loading />
  if (wine === null) return <Empty title="No encontramos este vino" />

  const photos = tastings.filter((t) => t.photo_path).map((t) => photoUrl(t.photo_path)!)
  const isCatalog = wine.source === 'catalogo'

  return (
    <div className="bg-white">
      <div className="relative">
        {photos.length > 0 ? (
          <div className="flex h-72 snap-x snap-mandatory overflow-x-auto bg-arena">
            {photos.map((src, i) => (
              <img key={src} src={src} alt={`Foto ${i + 1} de ${wine.name}`} className="h-72 w-full shrink-0 snap-center object-cover" />
            ))}
          </div>
        ) : (
          <WineThumb wine={wine} className="h-72 w-full" bottleSize={200} />
        )}
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/ranking'))}
          aria-label="Volver"
          className="absolute left-3.5 top-3.5 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow"
        >
          <IconBack size={20} />
        </button>
        <div className="absolute right-3.5 top-3.5 flex gap-2">
          <button onClick={share} aria-label="Compartir este vino" className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-tinta shadow">
            <IconShare size={19} />
          </button>
          <button
            onClick={toggleSaved}
            aria-pressed={saved}
            aria-label={saved ? 'Quitar de Quiero probar' : 'Guardar en Quiero probar'}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-white shadow ${saved ? 'text-vino' : 'text-tinta'}`}
          >
            <IconBookmark size={20} filled={saved} />
          </button>
        </div>
        {photos.length > 1 && (
          <span className="absolute bottom-3 right-4 rounded-full bg-white/90 px-2.5 py-1 text-xs text-gris">{photos.length} fotos del club</span>
        )}
      </div>

      <div className="flex flex-col gap-4 px-5 pb-40 pt-5">
        <div className="flex flex-col gap-1">
          {stats.position && (
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-vino">#{stats.position} del ranking</span>
          )}
          {!isCatalog && <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gris">Vino externo</span>}
          <h1 className="text-[26px] font-medium leading-tight">
            {wine.name} {wine.vintage ?? ''}
          </h1>
          <p className="text-sm text-gris">{[wine.winery, wine.varietal, wine.region].filter(Boolean).join(' · ')}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[14px] border border-linea p-3">
            <p className="text-[26px] font-semibold">{formatRating(stats.avg)}</p>
            <p className="text-xs text-gris">
              Puntaje · {stats.votes} {stats.votes === 1 ? 'socio' : 'socios'}
            </p>
          </div>
          {isCatalog && (
            <div className="rounded-[14px] border border-linea p-3">
              <p className="text-[22px] font-semibold leading-9">{formatPrice(wine.price)}</p>
              <p className={`text-xs font-medium ${wine.in_stock ? 'text-ok' : 'text-gris'}`}>
                {wine.in_stock ? 'Disponible en la vinoteca' : 'Sin stock por ahora'}
              </p>
            </div>
          )}
        </div>

        <h2 className="mt-1 text-base font-medium">Lo que dicen los socios</h2>
        {tastings.length === 0 && <p className="text-sm text-gris">Nadie lo subió todavía. ¡Sé el primero!</p>}
        <div className="flex flex-col gap-3">
          {tastings.map((t) => (
            <TastingCard
              key={t.id}
              item={t}
              cheered={cheers.has(t.id)}
              showWine={false}
              onDeleted={(x) => setTastings((ts) => ts.filter((y) => y.id !== x))}
            />
          ))}
        </div>
      </div>

      <div className="bottom-nav fixed inset-x-0 z-10 mx-auto flex max-w-md gap-2.5 border-t border-linea bg-white/95 px-5 py-3 backdrop-blur">
        <Link
          to={`/subir?vino=${wine.id}`}
          className="flex h-13 flex-1 items-center justify-center rounded-full border border-tinta text-[15px] font-medium text-tinta no-underline"
        >
          Lo tomé
        </Link>
        {isCatalog && wine.in_stock ? (
          <a
            href={whatsappLink(wine)}
            target="_blank"
            rel="noopener"
            onClick={() => profileId && logWantClick(profileId, wine.id)}
            className="flex h-13 flex-[1.6] items-center justify-center gap-2 rounded-full bg-vino text-[15px] font-medium text-white no-underline"
          >
            <IconChat size={18} /> Lo quiero
          </a>
        ) : isCatalog ? (
          <a
            href={whatsappLink(wine, 'aviso')}
            target="_blank"
            rel="noopener"
            className="flex h-13 flex-[1.6] items-center justify-center rounded-full bg-tinta text-[15px] font-medium text-white no-underline"
          >
            Avisame cuando llegue
          </a>
        ) : null}
      </div>
    </div>
  )
}
