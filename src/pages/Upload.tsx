import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { createExternalWine, createTasting, FEATURES, getMyLastRating, getRanking, getWine, searchCatalog, uploadPhoto } from '../lib/backend'
import { OCCASIONS, RATING_LABELS, wineSubtitle } from '../lib/format'
import type { Wine } from '../lib/types'
import { Chip, CopasInput, WineThumb } from '../components/ui'
import { IconCamera, IconCheck, IconClose, IconSearch } from '../components/Icons'
import { useFeedback } from '../components/feedback'

export default function Upload() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { toast, confirm } = useFeedback()

  const [query, setQuery] = useState('')
  /** null mientras busca, para no mostrar "no encontramos" antes de tiempo */
  const [results, setResults] = useState<Wine[] | null>(null)
  const [selected, setSelected] = useState<Wine | null>(null)
  const [external, setExternal] = useState(false)
  const [ext, setExt] = useState({ name: '', winery: '', varietal: '', vintage: '' })

  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [occasion, setOccasion] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastRating, setLastRating] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  /** Foto ya subida: si falla la publicación y se reintenta, no se sube de nuevo */
  const uploaded = useRef<{ file: File; path: string } | null>(null)

  // Si viene de "Lo tomé" en una ficha, el vino ya queda elegido
  useEffect(() => {
    const id = params.get('vino')
    if (id) getWine(id).then((w) => w && setSelected(w)).catch(() => undefined)
  }, [params])

  useEffect(() => {
    if (selected || external) return
    setResults(null)
    // Sin búsqueda, sugerimos los más votados del club; al escribir, buscamos en el catálogo
    const t = setTimeout(
      () => {
        const req = query.trim() ? searchCatalog(query, 6) : getRanking().then((r) => r.slice(0, 4))
        req.then(setResults).catch(() => setResults([]))
      },
      query.trim() ? 250 : 0,
    )
    return () => clearTimeout(t)
  }, [query, selected, external])

  // Si ya lo había puntuado, avisamos que para el ranking cuenta el último puntaje
  useEffect(() => {
    if (!selected || !profile) return setLastRating(null)
    getMyLastRating(profile.id, selected.id).then(setLastRating).catch(() => setLastRating(null))
  }, [selected, profile])

  useEffect(() => {
    if (!photo) return setPreview(null)
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const wineReady = selected || (external && ext.name.trim())
  const canPublish = Boolean(wineReady && rating > 0 && !saving)

  async function publish() {
    if (!profile || !canPublish) return
    setSaving(true)
    setError('')
    try {
      // Primero la foto: es lo que más puede fallar (conexión, formato)
      let photo_path: string | null = null
      if (photo) {
        if (uploaded.current?.file !== photo) uploaded.current = { file: photo, path: await uploadPhoto(profile.id, photo) }
        photo_path = uploaded.current.path
      }
      let wine = selected
      if (!wine) {
        wine = await createExternalWine(profile.id, {
          name: ext.name.trim(),
          winery: ext.winery.trim() || null,
          varietal: ext.varietal.trim() || null,
          vintage: ext.vintage ? Number(ext.vintage) : null,
        })
        // Queda elegido: si algo falla después, el reintento no lo crea dos veces
        setSelected(wine)
        setExternal(false)
      }
      await createTasting({
        user_id: profile.id,
        wine_id: wine.id,
        rating,
        comment: comment.trim() || null,
        occasion,
        photo_path,
      })
      toast('¡Listo! Tu vino ya está en el club')
      navigate('/', { replace: true, state: { published: true } })
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  const dirty = Boolean(rating || comment.trim() || photo || ext.name.trim())

  async function close() {
    if (dirty && !(await confirm({ title: '¿Descartar lo que cargaste?', confirmLabel: 'Descartar', danger: true }))) return
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <div className="flex min-h-svh flex-col bg-white">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-linea bg-white/95 px-3 py-2 backdrop-blur">
        <button onClick={close} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full text-tinta active:bg-crema">
          <IconClose />
        </button>
        <h1 className="text-[19px] font-medium">Subir un vino</h1>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-5 py-5">
        {/* 1. Qué vino */}
        <section className="flex flex-col gap-2">
          <label htmlFor="buscar" className="text-[13px] font-medium text-texto">
            ¿Qué vino tomaste?
          </label>

          {selected ? (
            <div className="flex items-center gap-3 rounded-xl border-[1.5px] border-vino bg-[#FDF6F6] px-3 py-2.5">
              <WineThumb wine={selected} className="h-[54px] w-9 rounded-lg" bottleSize={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {selected.name} {selected.vintage ?? ''}
                </p>
                <p className="truncate text-xs text-gris">
                  {selected.winery ?? ''} · {selected.source === 'catalogo' ? 'Del catálogo de la vinoteca' : 'Vino externo'}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="h-9 px-2 text-[13px] text-vino">
                Cambiar
              </button>
            </div>
          ) : external ? (
            <div className="flex flex-col gap-2.5 rounded-xl border border-linea bg-crema p-3">
              <p className="text-xs text-gris">Los vinos externos quedan en tu perfil pero no suman al ranking del club.</p>
              {(
                [
                  ['name', 'Nombre del vino *', 'text'],
                  ['winery', 'Bodega', 'text'],
                  ['varietal', 'Cepa', 'text'],
                  ['vintage', 'Año', 'number'],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key} className="flex flex-col gap-1">
                  <label htmlFor={`ext-${key}`} className="text-xs text-texto">
                    {label}
                  </label>
                  <input
                    id={`ext-${key}`}
                    type={type}
                    inputMode={type === 'number' ? 'numeric' : undefined}
                    value={ext[key]}
                    onChange={(e) => setExt({ ...ext, [key]: e.target.value })}
                    className="h-11 rounded-lg border border-borde bg-white px-3 text-sm outline-none focus:border-vino"
                  />
                </div>
              ))}
              <button onClick={() => setExternal(false)} className="self-start text-[13px] text-vino">
                Volver a buscar en el catálogo
              </button>
            </div>
          ) : (
            <>
              <div className="flex h-12 items-center gap-2 rounded-xl border border-borde px-3 text-gris focus-within:border-vino">
                <IconSearch size={18} />
                <input
                  id="buscar"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nombre, bodega o cepa"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-tinta outline-none"
                />
              </div>
              {!query.trim() && results && results.length > 0 && <p className="mt-1 text-xs text-gris">Los más votados del club</p>}
              <ul className="flex flex-col divide-y divide-linea overflow-hidden rounded-xl border border-linea">
                {results === null && <li className="px-3 py-3 text-sm text-gris">Buscando…</li>}
                {results?.map((w) => (
                  <li key={w.id}>
                    <button onClick={() => setSelected(w)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-crema">
                      <WineThumb wine={w} className="h-12 w-8 rounded-md" bottleSize={38} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{w.name}</span>
                        <span className="block truncate text-xs text-gris">{wineSubtitle(w)}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {results?.length === 0 && <li className="px-3 py-3 text-sm text-gris">No encontramos ese vino en el catálogo.</li>}
              </ul>
              {FEATURES.externalWines && (
                <button onClick={() => setExternal(true)} className="self-start text-[13px] text-vino underline">
                  ¿No está? Cargalo como vino externo
                </button>
              )}
            </>
          )}
        </section>

        {/* 2. Foto */}
        <section hidden={!FEATURES.photos}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            id="foto"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <div className="relative overflow-hidden rounded-2xl">
              <img src={preview} alt="Tu foto" className="h-56 w-full object-cover" />
              <button
                onClick={() => {
                  setPhoto(null)
                  if (fileRef.current) fileRef.current.value = ''
                }}
                className="absolute right-2 top-2 h-9 rounded-full bg-white/90 px-3 text-[13px]"
              >
                Quitar
              </button>
            </div>
          ) : (
            <label
              htmlFor="foto"
              className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-borde bg-crema text-texto"
            >
              <IconCamera size={28} />
              <span className="text-sm">Sacá o subí una foto (opcional)</span>
            </label>
          )}
        </section>

        {/* 3. Puntaje */}
        <section className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-texto">Tu puntaje</span>
          <div className="flex items-center gap-2">
            <CopasInput value={rating} onChange={setRating} />
            <span className="text-sm text-gris">{RATING_LABELS[rating]}</span>
          </div>
          {lastRating && (
            <p className="text-xs text-gris">
              Ya lo puntuaste con {lastRating} {lastRating === 1 ? 'copa' : 'copas'}. Para el ranking cuenta tu último puntaje.
            </p>
          )}
        </section>

        {/* 4. Comentario */}
        <section className="flex flex-col gap-1.5">
          <label htmlFor="coment" className="text-[13px] font-medium text-texto">
            Contale al club
          </label>
          <textarea
            id="coment"
            rows={3}
            maxLength={600}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Qué te pareció? ¿Con qué lo acompañaste?"
            className="resize-none rounded-xl border border-borde p-3 text-sm outline-none focus:border-vino"
          />
        </section>

        {/* 5. Ocasión */}
        <section hidden={!FEATURES.occasions} className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-texto">Ocasión (opcional)</span>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <Chip key={o} active={occasion === o} onClick={() => setOccasion(occasion === o ? null : o)}>
                {o}
              </Chip>
            ))}
          </div>
        </section>

        {error && (
          <p className="text-sm text-vino" role="alert">
            No se pudo publicar: {error}
          </p>
        )}
      </div>

      <div className="pb-safe sticky bottom-0 border-t border-linea bg-white/95 px-5 pt-3 backdrop-blur">
        <button
          onClick={publish}
          disabled={!canPublish}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-vino text-base font-medium text-white disabled:opacity-40"
        >
          {saving ? (
            'Publicando…'
          ) : (
            <>
              <IconCheck size={20} /> Publicar en el club
            </>
          )}
        </button>
        {!canPublish && !saving && (
          <p className="mt-1.5 text-center text-xs text-gris">{!wineReady ? 'Elegí el vino' : 'Poné tu puntaje'} para publicar</p>
        )}
      </div>
    </div>
  )
}
