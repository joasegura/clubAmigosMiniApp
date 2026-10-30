import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  addPurchase,
  getClubSettings,
  getCommentById,
  getHiddenContent,
  getPendingReports,
  getTasting,
  getWeekStats,
  importCatalogCsv,
  listCatalog,
  moderate,
  saveCatalogWine,
  setWineOfMonth,
  uploadPhoto,
} from '../lib/api'
import { CSV_TEMPLATE } from '../lib/csv'
import { formatPrice, photoUrl, WHATSAPP_NUMBER, wineSubtitle } from '../lib/format'
import type { Comment, FeedItem, WeekStats, Wine } from '../lib/types'
import { Empty, ErrorBox, Loading, PageHeader, WineThumb } from '../components/ui'

interface PendingItem {
  type: 'tasting' | 'comment'
  id: string
  count: number
  reasons: string[]
  tasting?: FeedItem | null
  comment?: Comment | null
}

type Hidden = { tastings: FeedItem[]; comments: Comment[] }

export default function Admin() {
  const { isAdmin, profile } = useAuth()
  const [stats, setStats] = useState<WeekStats | null>(null)
  const [catalog, setCatalog] = useState<Wine[] | null>(null)
  const [womId, setWomId] = useState('')
  const [womNote, setWomNote] = useState('')
  const [womSaved, setWomSaved] = useState(false)
  const [pending, setPending] = useState<PendingItem[] | null>(null)
  const [hidden, setHidden] = useState<Hidden | null>(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState<Partial<Wine> | null>(null)
  const [wineError, setWineError] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [buyCode, setBuyCode] = useState('')
  const [buyAmount, setBuyAmount] = useState('')
  const [buyMsg, setBuyMsg] = useState('')
  const csvRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const [s, c, settings, reports, h] = await Promise.all([
        getWeekStats(),
        listCatalog(),
        getClubSettings(),
        getPendingReports(),
        getHiddenContent(),
      ])
      setStats(s)
      setCatalog(c)
      setHidden(h)
      setWomId(settings.wine_of_month_id ?? '')
      setWomNote(settings.wine_of_month_note ?? '')

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

  if (!isAdmin) return <Empty title="Esta sección es solo para la vinoteca" />

  /** Corre una acción del panel y muestra el error arriba si falla */
  async function attempt(fn: () => Promise<void>) {
    setActionError('')
    try {
      await fn()
    } catch (e) {
      setActionError((e as Error).message || 'No se pudo guardar, probá de nuevo.')
    }
  }

  const saveWom = (e: React.FormEvent) => {
    e.preventDefault()
    void attempt(async () => {
      await setWineOfMonth(womId || null, womNote.trim() || null)
      setWomSaved(true)
      setTimeout(() => setWomSaved(false), 2500)
    })
  }

  const act = (item: PendingItem, action: 'ocultar' | 'mantener') =>
    attempt(async () => {
      await moderate(item.type, item.id, action)
      setPending((p) => p?.filter((x) => !(x.type === item.type && x.id === item.id)) ?? null)
      setStats((s) => (s ? { ...s, pending_reports: Math.max(0, s.pending_reports - 1) } : s))
      if (action === 'ocultar') setHidden(await getHiddenContent())
    })

  const unhide = (type: 'tasting' | 'comment', id: string) =>
    attempt(async () => {
      await moderate(type, id, 'mostrar')
      setHidden(await getHiddenContent())
    })

  const toggleStock = (w: Wine) =>
    attempt(async () => {
      await saveCatalogWine({ id: w.id, name: w.name, in_stock: !w.in_stock })
      setCatalog((c) => c?.map((x) => (x.id === w.id ? { ...x, in_stock: !x.in_stock } : x)) ?? null)
    })

  async function saveWine(e: React.FormEvent) {
    e.preventDefault()
    if (!editing?.name?.trim()) return
    setWineError('')
    try {
      await saveCatalogWine({
        id: editing.id,
        name: editing.name.trim(),
        winery: editing.winery || null,
        varietal: editing.varietal || null,
        vintage: editing.vintage ? Number(editing.vintage) : null,
        region: editing.region || null,
        price: editing.price != null && String(editing.price) !== '' ? Number(editing.price) : null,
        in_stock: editing.in_stock ?? true,
        active: editing.active ?? true,
        image_url: editing.image_url ?? null,
      })
      setEditing(null)
      setCatalog(await listCatalog())
    } catch (err) {
      setWineError((err as Error).message)
    }
  }

  async function pickWinePhoto(file: File | undefined) {
    if (!file || !profile || !editing) return
    setWineError('')
    try {
      const path = await uploadPhoto(profile.id, file)
      setEditing((ed) => (ed ? { ...ed, image_url: path } : ed))
    } catch (err) {
      setWineError((err as Error).message)
    }
  }

  async function importCsv(file: File | undefined) {
    if (!file) return
    setImportMsg('')
    await attempt(async () => {
      const r = await importCatalogCsv(await file.text())
      setImportMsg(
        `Listo: ${r.created} ${r.created === 1 ? 'vino nuevo' : 'vinos nuevos'} y ${r.updated} ${r.updated === 1 ? 'actualizado' : 'actualizados'}` +
          (r.skipped ? ` (${r.skipped} ${r.skipped === 1 ? 'fila sin nombre salteada' : 'filas sin nombre salteadas'})` : '') +
          '.',
      )
      setCatalog(await listCatalog())
    })
    if (csvRef.current) csvRef.current.value = ''
  }

  const loadPurchase = (e: React.FormEvent) => {
    e.preventDefault()
    setBuyMsg('')
    void attempt(async () => {
      const r = await addPurchase(buyCode, Number(buyAmount))
      setBuyMsg(`Se sumaron ${r.points} puntos a ${r.display_name}. Ahora tiene ${r.balance}.`)
      setBuyCode('')
      setBuyAmount('')
    })
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob(['﻿' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-catalogo.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const hiddenCount = (hidden?.tastings.length ?? 0) + (hidden?.comments.length ?? 0)

  return (
    <>
      <PageHeader
        title={<img src="/brand/logo.png" alt="Entre amigos vinoteca" className="h-12" />}
        right={<span className="mr-2 rounded-lg bg-tinta px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">Admin</span>}
      />
      {error && <ErrorBox message={error} onRetry={load} />}

      <div className="flex flex-col gap-6 px-5 py-5">
        {!WHATSAPP_NUMBER && (
          <p className="rounded-xl border border-vino/30 bg-vino-suave p-3 text-[13px] text-vino-oscuro" role="alert">
            Falta configurar el WhatsApp de la vinoteca (<code>VITE_WHATSAPP_NUMBER</code>). Mientras tanto, "Lo quiero" abre WhatsApp sin
            destinatario.
          </p>
        )}
        {actionError && (
          <p className="rounded-xl border border-vino/30 bg-vino-suave p-3 text-[13px] text-vino-oscuro" role="alert">
            {actionError}
          </p>
        )}

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
          <div>
            <h2 className="text-base font-medium">Cargar compra</h2>
            <p className="mt-0.5 text-xs text-gris">
              Demo: simula lo que va a hacer la caja con Nexus al escanear el QR de la tarjeta del socio.
            </p>
          </div>
          <form onSubmit={loadPurchase} className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="buy-code" className="text-xs text-texto">
                N.º de socio
              </label>
              <input
                id="buy-code"
                required
                autoCapitalize="characters"
                value={buyCode}
                onChange={(e) => setBuyCode(e.target.value)}
                placeholder="EA 001 001"
                className="h-11 rounded-lg border border-borde px-3 text-sm uppercase"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="buy-amount" className="text-xs text-texto">
                Monto ($)
              </label>
              <input
                id="buy-amount"
                required
                type="number"
                inputMode="numeric"
                min={1}
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="18500"
                className="h-11 rounded-lg border border-borde px-3 text-sm"
              />
            </div>
            <button className="col-span-2 h-11 rounded-full bg-tinta text-sm font-medium text-white">Sumar puntos</button>
          </form>
          {buyMsg && (
            <p className="text-xs text-ok" role="status">
              {buyMsg}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-linea bg-white p-4">
          <h2 className="text-base font-medium">Vino del mes</h2>
          <form onSubmit={saveWom} className="flex flex-col gap-2.5">
            <label htmlFor="wom" className="text-xs text-texto">
              Vino
            </label>
            <select id="wom" value={womId} onChange={(e) => setWomId(e.target.value)} className="h-11 rounded-lg border border-borde bg-white px-3 text-sm">
              <option value="">— Ninguno —</option>
              {catalog
                ?.filter((w) => w.active)
                .map((w) => (
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

        {hiddenCount > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-base font-medium">Ocultos por la vinoteca</h2>
            <ul className="flex flex-col divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-white">
              {hidden?.tastings.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1 text-[13px]">
                    <span className="block truncate font-medium">
                      Publicación de {t.profile?.display_name ?? 'socio'} · {t.wine?.name ?? 'vino'}
                    </span>
                    {t.comment && <span className="block truncate text-gris">“{t.comment}”</span>}
                  </span>
                  <button onClick={() => unhide('tasting', t.id)} className="h-8 shrink-0 rounded-full border border-borde px-3 text-xs">
                    Volver a mostrar
                  </button>
                </li>
              ))}
              {hidden?.comments.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1 text-[13px]">
                    <span className="block truncate font-medium">Comentario de {c.profile?.display_name ?? 'socio'}</span>
                    <span className="block truncate text-gris">“{c.body}”</span>
                  </span>
                  <button onClick={() => unhide('comment', c.id)} className="h-8 shrink-0 rounded-full border border-borde px-3 text-xs">
                    Volver a mostrar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Catálogo</h2>
            <button
              onClick={() => {
                setWineError('')
                setEditing({ in_stock: true, active: true })
              }}
              className="h-9 rounded-full border border-borde bg-white px-4 text-[13px]"
            >
              + Agregar vino
            </button>
          </div>
          <p className="text-xs text-gris">Mientras no esté conectado Nexus, los precios y el stock se manejan desde acá.</p>

          <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-borde bg-white p-3.5">
            <p className="text-[13px] text-texto">
              <b className="font-medium">Cargar muchos vinos de una vez:</b> subí un CSV (exportado de Nexus o Excel) con las columnas código, nombre,
              bodega, cepa, año, región, precio y stock. Si el código ya existe, se actualiza.
            </p>
            <input ref={csvRef} id="csv" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => importCsv(e.target.files?.[0])} />
            <div className="flex gap-2">
              <label htmlFor="csv" className="flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full bg-tinta text-[13px] text-white">
                Importar CSV
              </label>
              <button onClick={downloadTemplate} className="h-9 flex-1 rounded-full border border-borde text-[13px]">
                Descargar plantilla
              </button>
            </div>
            {importMsg && (
              <p className="text-xs text-ok" role="status">
                {importMsg}
              </p>
            )}
          </div>

          {editing && (
            <form onSubmit={saveWine} className="grid grid-cols-2 gap-2 rounded-2xl border border-vino/40 bg-white p-3.5">
              <div className="col-span-2 flex items-center gap-3">
                <WineThumb wine={{ name: editing.name ?? '', varietal: editing.varietal ?? null, image_url: editing.image_url ?? null }} className="h-20 w-14 rounded-lg" bottleSize={60} />
                <div className="flex flex-col gap-1">
                  <label htmlFor="w-foto" className="cursor-pointer text-[13px] text-vino underline">
                    {editing.image_url ? 'Cambiar foto' : 'Agregar foto de la botella'}
                  </label>
                  <input id="w-foto" type="file" accept="image/*" className="sr-only" onChange={(e) => pickWinePhoto(e.target.files?.[0])} />
                  {editing.image_url && (
                    <button type="button" onClick={() => setEditing({ ...editing, image_url: null })} className="self-start text-xs text-gris underline">
                      Quitar foto
                    </button>
                  )}
                </div>
              </div>
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
                    required={k === 'name'}
                    inputMode={type === 'number' ? 'numeric' : undefined}
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
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Visible en la app
              </label>
              {wineError && (
                <p className="col-span-2 text-xs text-vino" role="alert">
                  {wineError}
                </p>
              )}
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
              <li key={w.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${w.active ? '' : 'opacity-50'}`}>
                <button
                  onClick={() => {
                    setWineError('')
                    setEditing(w)
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-medium">
                    {w.name}
                    {!w.active && <span className="font-normal text-gris"> · oculto</span>}
                  </span>
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
