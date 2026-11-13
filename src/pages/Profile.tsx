import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { FEATURES, getMemberCard, getUserTastings, getWishlist, updateDisplayName } from '../lib/backend'
import { resetStore } from '../lib/store'
import { formatPrice, memberSince, wineSubtitle } from '../lib/format'
import type { FeedItem, Wine } from '../lib/types'
import { Avatar, Copas, Empty, ErrorBox, Loading, WineThumb } from '../components/ui'
import { IconLogout, IconQr, IconShield } from '../components/Icons'
import { useFeedback } from '../components/feedback'

export default function Profile() {
  const { profile, isAdmin, signOut, refreshProfile } = useAuth()
  const { confirm } = useFeedback()
  const [points, setPoints] = useState<number | null>(null)
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'quiero' ? 'quiero' : 'mios'
  const [tastings, setTastings] = useState<FeedItem[] | null>(null)
  const [wishlist, setWishlist] = useState<Wine[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const profileId = profile?.id

  const load = useCallback(async () => {
    if (!profileId) return
    setError('')
    try {
      const [t, w, card] = await Promise.all([getUserTastings(profileId), getWishlist(profileId), getMemberCard(profileId)])
      setTastings(t)
      setWishlist(w)
      setPoints(card.balance)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [profileId])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const ts = tastings ?? []
    const wines = new Set(ts.map((t) => t.wine_id))
    const wineries = new Set(ts.map((t) => t.wine?.winery).filter(Boolean))
    const byVarietal = new Map<string, number>()
    for (const t of ts) {
      const v = t.wine?.varietal
      if (v) byVarietal.set(v, (byVarietal.get(v) ?? 0) + 1)
    }
    const fav = [...byVarietal.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '–'
    return { wines: wines.size, wineries: wineries.size, fav }
  }, [tastings])

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !name.trim()) return
    setNameError('')
    try {
      await updateDisplayName(profile.id, name.trim())
      await refreshProfile()
      setEditing(false)
    } catch (err) {
      setNameError((err as Error).message)
    }
  }

  async function resetDemo() {
    await resetStore()
    // Recargar deja la app limpia, con los datos de ejemplo y sin sesión
    window.location.assign('/')
  }

  if (!profile) return <Loading />

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-linea bg-white px-5 pb-4 pt-6">
        <div className="flex items-center gap-3.5">
          <Avatar name={profile.display_name} url={profile.avatar_url} id={profile.id} size={64} />
          <div className="min-w-0 flex-1">
            {editing ? (
              <form onSubmit={saveName} className="flex gap-2">
                <label htmlFor="nombre" className="sr-only">
                  Tu nombre
                </label>
                <input
                  id="nombre"
                  autoFocus
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-borde px-3 outline-none focus:border-vino"
                />
                <button className="h-10 rounded-lg bg-tinta px-3 text-sm text-white">OK</button>
              </form>
            ) : (
              <>
                <p className="truncate text-xl font-medium">{profile.display_name}</p>
                <button
                  onClick={() => {
                    setName(profile.display_name)
                    setEditing(true)
                  }}
                  className="text-xs text-vino"
                >
                  Editar nombre
                </button>
              </>
            )}
            {editing && nameError && (
              <p className="mt-1 text-xs text-vino" role="alert">
                {nameError}
              </p>
            )}
            <p className="text-[13px] text-gris">Socio del club desde {memberSince(profile.created_at)}</p>
          </div>
          <button
            onClick={async () => {
              if (await confirm({ title: '¿Cerrar sesión?', confirmLabel: 'Cerrar sesión' })) await signOut()
            }}
            aria-label="Cerrar sesión"
            className="flex h-11 w-11 items-center justify-center rounded-full text-gris active:bg-crema"
          >
            <IconLogout />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col rounded-xl bg-crema px-3 py-2.5">
            <span className="text-[22px] font-semibold">{stats.wines}</span>
            <span className="text-xs text-gris">vinos probados</span>
          </div>
          <div className="flex flex-col rounded-xl bg-crema px-3 py-2.5">
            <span className="text-[22px] font-semibold">{stats.wineries}</span>
            <span className="text-xs text-gris">bodegas</span>
          </div>
          <div className="flex min-w-0 flex-col rounded-xl bg-crema px-3 py-2.5">
            <span className="truncate text-[17px] font-semibold leading-[33px]">{stats.fav}</span>
            <span className="text-xs text-gris">cepa favorita</span>
          </div>
        </div>

        {points !== null && (
          <Link
            to="/tarjeta"
            className="flex items-center gap-3 rounded-2xl bg-tinta px-4 py-3 text-white no-underline active:opacity-90"
          >
            <IconQr size={22} className="text-[#F08A8F]" />
            <span className="flex-1 text-sm">
              Tenés <b className="font-semibold">{points.toLocaleString('es-AR')} puntos</b>
            </span>
            <span className="text-[13px] text-[#CFC6C1]">Ver mi tarjeta ›</span>
          </Link>
        )}

        {isAdmin && (
          <Link to="/admin" className="flex h-11 items-center justify-center gap-2 rounded-full bg-tinta text-sm font-medium text-white no-underline">
            <IconShield size={18} /> Panel de la vinoteca
          </Link>
        )}
      </header>

      <div role="tablist" className="flex border-b border-linea bg-white px-5">
        {(
          [
            ['mios', 'Mis vinos'],
            ['quiero', `Quiero probar${wishlist ? ` (${wishlist.length})` : ''}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setParams(key === 'quiero' ? { tab: 'quiero' } : {})}
            className={`h-12 flex-1 border-b-2 text-sm ${tab === key ? 'border-vino font-medium text-vino' : 'border-transparent text-gris'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!error && (tastings === null || wishlist === null) && <Loading />}

      {tab === 'mios' && tastings && (
        <>
          {tastings.length === 0 ? (
            <Empty title="Todavía no subiste vinos">
              <Link to="/subir">Subí el primero</Link>
            </Empty>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 px-5 py-4">
              {tastings.map((t) => (
                <Link key={t.id} to={`/vino/${t.wine_id}`} className="flex flex-col gap-1.5 text-tinta no-underline">
                  <WineThumb
                    wine={t.wine}
                    photoPath={t.photo_path}
                    className={`h-[120px] w-full rounded-xl ${t.wine?.source === 'externo' && !t.photo_path ? 'border border-dashed border-borde !bg-white' : ''}`}
                    bottleSize={64}
                  />
                  <span className="line-clamp-2 text-xs leading-tight">{t.wine?.name}</span>
                  <Copas value={t.rating} size={11} />
                  {t.wine?.source === 'externo' && <span className="text-[11px] text-gris">No entra al ranking</span>}
                  {t.hidden && <span className="text-[11px] text-vino">Oculto</span>}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'quiero' && wishlist && (
        <>
          {wishlist.length === 0 ? (
            <Empty title="Tu lista está vacía">Tocá el marcador en la ficha de un vino para guardarlo acá.</Empty>
          ) : (
            <ul className="flex flex-col gap-2.5 px-5 py-4">
              {wishlist.map((w) => (
                <li key={w.id}>
                  <Link to={`/vino/${w.id}`} className="flex items-center gap-3 rounded-2xl border border-linea bg-white p-3 text-tinta no-underline">
                    <WineThumb wine={w} className="h-16 w-11 rounded-lg" bottleSize={50} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{w.name}</span>
                      <span className="block truncate text-xs text-gris">{wineSubtitle(w)}</span>
                      {w.source === 'catalogo' && (
                        <span className={`text-xs font-medium ${w.in_stock ? 'text-ok' : 'text-gris'}`}>
                          {w.in_stock ? `Disponible · ${formatPrice(w.price)}` : 'Sin stock por ahora'}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <footer className="flex flex-col items-center gap-3 px-5 pb-6 pt-8 text-xs text-gris">
        <div className="flex gap-4">
          <Link to="/terminos" className="text-gris underline">
            Términos
          </Link>
          <Link to="/privacidad" className="text-gris underline">
            Privacidad
          </Link>
        </div>
        {!FEATURES.demoTools ? null : confirmReset ? (
          <div className="flex w-full flex-col gap-2 rounded-xl border border-vino/30 bg-white p-3 text-center">
            <p className="text-texto">Se borra todo lo cargado en este dispositivo y vuelven los datos de ejemplo.</p>
            <div className="flex gap-2">
              <button onClick={resetDemo} className="h-9 flex-1 rounded-full bg-vino text-white">
                Reiniciar
              </button>
              <button onClick={() => setConfirmReset(false)} className="h-9 flex-1 rounded-full border border-borde">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)} className="underline">
            Reiniciar demo
          </button>
        )}
      </footer>
    </>
  )
}
