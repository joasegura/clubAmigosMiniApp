import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  getClubSettings,
  getCommentById,
  getPendingReports,
  getTasting,
  getWeekStats,
  listCatalog,
  moderate,
  saveCatalogWine,
  setWineOfMonth,
} from '../lib/api'
import { formatPrice, photoUrl, wineSubtitle } from '../lib/format'
import type { Comment, FeedItem, WeekStats, Wine } from '../lib/types'
import { Empty, ErrorBox, Loading, PageHeader } from '../components/ui'

interface PendingItem {
  type: 'tasting' | 'comment'
  id: string
  count: number
  reasons: string[]
  tasting?: FeedItem | null
  comment?: Comment | null
}

export default function Admin() {
  const { isAdmin, loading } = useAuth()
  const [stats, setStats] = useState<WeekStats | null>(null)
  const [catalog, setCatalog] = useState<Wine[] | null>(null)
  const [womId, setWomId] = useState('')
  const [womNote, setWomNote] = useState('')
  const [womSaved, setWomSaved] = useState(false)
  const [pending, setPending] = useState<PendingItem[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<Wine> | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const [s, c, settings, reports] = await Promise.all([getWeekStats(), listCatalog(), getClubSettings(), getPendingReports()])
      setStats(s)
      setCatalog(c)
      setWomId(settings?.wine_of_month_id ?? '')
      setWomNote(settings?.wine_of_month_note ?? '')

      const groups = new Map<string, PendingItem>()
      for (const r of reports) {
        const key = `${r.target_type}:${r.target_id}`
        const g = groups.get(key) ?? { type: r.target_type, id: r.target_id, count: 0, reasons: [] }
        g.count++
        if (r.reason) g.reasons.push(r.reason)
        groups.set(key, g)
      }
      const items = await Promise.all(
        [...groups.values()].map(async (g) =>
          g.type === 'tasting' ? { ...g, tasting: await getTasting(g.id) } : { ...g, comment: await getCommentById(g.id) },
        ),
      )
      setPending(items)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) void load()
  }, [isAdmin, load])

  if (loading) return <Loading />
  if (!isAdmin) return <Empty title="Esta sección es solo para la vinoteca" />

  async function saveWom(e: React.FormEvent) {
    e.preventDefault()
    await setWineOfMonth(womId || null, womNote.trim() || null)
    setWomSaved(true)
    setTimeout(() => setWomSaved(false), 2500)
  }

  async function act(item: PendingItem, action: 'ocultar' | 'mantener') {
    await moderate(item.type, item.id, action)
    setPending((p) => p?.filter((x) => !(x.type === item.type && x.id === item.id)) ?? null)
    setStats((s) => (s ? { ...s, pending_reports: Math.max(0, s.pending_reports - 1) } : s))
  }

  async function toggleStock(w: Wine) {
    await saveCatalogWine({ id: w.id, name: w.name, in_stock: !w.in_stock })
    setCatalog((c) => c?.map((x) => (x.id === w.id ? { ...x, in_stock: !x.in_stock } : x)) ?? null)
  }

  async function saveWine(e: React.FormEvent) {
    e.preventDefault()
    if (!editing?.name?.trim()) return
    await saveCatalogWine({
      id: editing.id,
      name: editing.name.trim(),
      winery: editing.winery || null,
      varietal: editing.varietal || null,
      vintage: editing.vintage ? Number(editing.vintage) : null,
      region: editing.region || null,
      price: editing.price != null && String(editing.price) !== '' ? Number(editing.price) : null,
      in_stock: editing.in_stock ?? true,
    })
    setEditing(null)
    setCatalog(await listCatalog())
  }

  return (
    <>
      <PageHeader
        title={<img src="/brand/logo.png" alt="Entre amigos vinoteca" className="h-12" />}
        right={<span className="mr-2 rounded-lg bg-tinta px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">Admin</span>}
      />
      {error && <ErrorBox message={error} onRetry={load} />}

      <div className="flex flex-col gap-6 px-5 py-5">
        <section className="flex flex-col gap-2.5">
          <h2 className="text-base font-medium">Últimos 7 días</h2>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['new_members', 'socios nuevos'],
                ['tastings', 'vinos subidos'],
                ['want_clicks', '"Lo quiero"'],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className={`flex flex-col rounded-xl border bg-white px-3 py-2.5 ${k === 'want_clicks' ? 'border-vino' : 'border-linea'}`}>
                <span className={`text-[22px] font-semibold ${k === 'want_clicks' ? 'text-vino' : ''}`}>{stats ? stats[k] : '–'}</span>
                <span className="text-xs text-gris">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-linea bg-white p-4">
          <h2 className="text-base font-medium">Vino del mes</h2>
          <form onSubmit={saveWom} className="flex flex-col gap-2.5">
            <label htmlFor="wom" className="text-xs text-texto">
              Vino
            </label>
            <select id="wom" value={womId} onChange={(e) => setWomId(e.target.value)} className="h-11 rounded-lg border border-borde bg-white px-3 text-sm">
              <option value="">— Ninguno —</option>
              {catalog?.filter((w) => w.active).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} · {w.winery ?? ''} {w.vintage ?? ''}
                </option>
              ))}
            </select>
            <label htmlFor="womnote" className="text-xs text-texto">
              Frase corta (opcional)
            </label>
            <input
              id="womnote"
              maxLength={200}
              value={womNote}
              onChange={(e) => setWomNote(e.target.value)}
              placeholder="Ej.: 15% off para socios todo el mes"
              className="h-11 rounded-lg border border-borde px-3 text-sm"
            />
            <button className="h-11 rounded-full bg-tinta text-sm font-medium text-white">{womSaved ? 'Guardado ✓' : 'Guardar'}</button>
          </form>
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-medium">Para revisar</h2>
            {pending && pending.length > 0 && (
              <span className="text-[13px] font-medium text-vino">
                {pending.length} {pending.length === 1 ? 'reporte' : 'reportes'}
              </span>
            )}
          </div>
          {!pending && !error && <Loading />}
          {pending?.length === 0 && <p className="text-sm text-gris">No hay nada reportado. ¡Todo tranquilo!</p>}
          {pending?.map((p) => {
            const author = p.type === 'tasting' ? p.tasting?.profile?.display_name : p.comment?.profile?.display_name
            const text = p.type === 'tasting' ? p.tasting?.comment : p.comment?.body
            const img = p.type === 'tasting' ? photoUrl(p.tasting?.photo_path) : null
            return (
              <div key={`${p.type}:${p.id}`} className="flex flex-col gap-2.5 rounded-[14px] border border-linea bg-white p-3.5">
                <p className="text-[13px] text-gris">
                  {p.type === 'tasting' ? 'Publicación' : 'Comentario'} de <b className="font-medium text-tinta">{author ?? 'socio'}</b> · reportado{' '}
                  {p.count} {p.count === 1 ? 'vez' : 'veces'}
                </p>
                {p.type === 'tasting' && p.tasting?.wine && <p className="text-[13px]">Vino: {p.tasting.wine.name}</p>}
                <div className="flex gap-3">
                  {img && <img src={img} alt="Foto reportada" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
                  {text ? <p className="text-sm text-texto">“{text}”</p> : !img && <p className="text-sm text-gris">(sin texto)</p>}
                </div>
                {p.reasons.length > 0 && <p className="text-xs text-gris">Motivos: {p.reasons.join(' · ')}</p>}
                <div className="flex gap-2">
                  <button onClick={() => act(p, 'ocultar')} className="h-10 flex-1 rounded-full bg-tinta text-[13px] text-white">
                    Ocultar
                  </button>
                  <button onClick={() => act(p, 'mantener')} className="h-10 flex-1 rounded-full border border-borde bg-white text-[13px]">
                    Mantener
                  </button>
                </div>
              </div>
            )
          })}
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Catálogo</h2>
            <button onClick={() => setEditing({ in_stock: true })} className="h-9 rounded-full border border-borde bg-white px-4 text-[13px]">
              + Agregar vino
            </button>
          </div>
          <p className="text-xs text-gris">Mientras no esté conectado Nexus, los precios y el stock se manejan desde acá.</p>

          {editing && (
            <form onSubmit={saveWine} className="grid grid-cols-2 gap-2 rounded-2xl border border-vino/40 bg-white p-3.5">
              {(
                [
                  ['name', 'Nombre *', 'text', 2],
                  ['winery', 'Bodega', 'text', 2],
                  ['varietal', 'Cepa', 'text', 1],
                  ['vintage', 'Año', 'number', 1],
                  ['region', 'Región', 'text', 1],
                  ['price', 'Precio', 'number', 1],
                ] as const
              ).map(([k, label, type, span]) => (
                <div key={k} className={`flex flex-col gap-1 ${span === 2 ? 'col-span-2' : ''}`}>
                  <label htmlFor={`w-${k}`} className="text-xs text-texto">
                    {label}
                  </label>
                  <input
                    id={`w-${k}`}
                    type={type}
                    value={(editing[k] as string | number | null | undefined) ?? ''}
                    onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                    className="h-10 rounded-lg border border-borde px-3 text-sm"
                  />
                </div>
              ))}
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.in_stock ?? true} onChange={(e) => setEditing({ ...editing, in_stock: e.target.checked })} />
                Hay stock
              </label>
              <div className="col-span-2 flex gap-2">
                <button className="h-10 flex-1 rounded-full bg-vino text-sm text-white">Guardar</button>
                <button type="button" onClick={() => setEditing(null)} className="h-10 flex-1 rounded-full border border-borde text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <ul className="flex flex-col divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-white">
            {catalog?.map((w) => (
              <li key={w.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <button onClick={() => setEditing(w)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium">{w.name}</span>
                  <span className="block truncate text-xs text-gris">
                    {wineSubtitle(w)} · {formatPrice(w.price)}
                  </span>
                </button>
                <button
                  onClick={() => toggleStock(w)}
                  aria-pressed={w.in_stock}
                  className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium ${w.in_stock ? 'bg-ok/10 text-ok' : 'bg-arena text-gris'}`}
                >
                  {w.in_stock ? 'Con stock' : 'Sin stock'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
