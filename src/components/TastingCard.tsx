import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { addComment, deleteComment, deleteTasting, FEATURES, getComments, reportContent, setCheer } from '../lib/backend'
import { RATING_LABELS, timeAgo, wineSubtitle } from '../lib/format'
import type { Comment, FeedItem } from '../lib/types'
import { Avatar, Copas, WineThumb } from './ui'
import { IconChat, IconGlass, IconMore } from './Icons'
import { useFeedback } from './feedback'

interface Props {
  item: FeedItem
  cheered: boolean
  onCheerChange?: (id: string, on: boolean) => void
  onDeleted?: (id: string) => void
  showWine?: boolean
}

export default function TastingCard({ item, cheered, onCheerChange, onDeleted, showWine = true }: Props) {
  const { profile } = useAuth()
  const { toast, confirm } = useFeedback()
  const [cheerCount, setCheerCount] = useState(item.cheer_count)
  const [isCheered, setIsCheered] = useState(cheered)
  const [commentCount, setCommentCount] = useState(item.comment_count)
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [menu, setMenu] = useState(false)
  const [error, setError] = useState('')

  const mine = profile?.id === item.user_id
  const wine = item.wine

  /** Corre una acción y, si falla, se lo muestra al socio en la tarjeta */
  async function attempt(fn: () => Promise<void>) {
    setError('')
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message || 'Algo salió mal, probá de nuevo.')
    }
  }

  async function toggleCheer() {
    if (!profile) return
    const on = !isCheered
    setIsCheered(on)
    setCheerCount((c) => c + (on ? 1 : -1))
    try {
      await setCheer(profile.id, item.id, on)
      onCheerChange?.(item.id, on)
    } catch {
      setIsCheered(!on)
      setCheerCount((c) => c + (on ? -1 : 1))
    }
  }

  async function toggleComments() {
    const next = !open
    setOpen(next)
    if (next && comments === null) await attempt(async () => setComments(await getComments(item.id)))
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !draft.trim()) return
    setSending(true)
    await attempt(async () => {
      await addComment(profile.id, item.id, draft.trim())
      setDraft('')
      setComments(await getComments(item.id))
      setCommentCount((c) => c + 1)
    })
    setSending(false)
  }

  async function report(type: 'tasting' | 'comment', id: string) {
    if (!profile) return
    setMenu(false)
    await attempt(async () => {
      await reportContent(profile.id, type, id)
      toast('Gracias, la vinoteca lo va a revisar')
    })
  }

  async function remove() {
    setMenu(false)
    const ok = await confirm({
      title: '¿Borrar esta publicación?',
      message: FEATURES.photos
        ? 'Se borran también la foto, los brindis y los comentarios.'
        : 'Tu puntaje deja de contar para el ranking del club.',
      confirmLabel: 'Borrar',
      danger: true,
    })
    if (!ok) return
    await attempt(async () => {
      await deleteTasting(item.id)
      onDeleted?.(item.id)
      toast('Publicación borrada')
    })
  }

  async function removeComment(id: string) {
    if (!(await confirm({ title: '¿Borrar tu comentario?', confirmLabel: 'Borrar', danger: true }))) return
    await attempt(async () => {
      await deleteComment(id)
      setComments((cs) => cs?.filter((x) => x.id !== id) ?? null)
      setCommentCount((n) => n - 1)
    })
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-linea bg-white">
      <div className="relative flex items-center gap-2.5 py-2.5 pl-3.5 pr-1.5">
        <Avatar name={item.profile?.display_name} url={item.profile?.avatar_url} id={item.user_id} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{item.profile?.display_name ?? 'Socio'}</p>
          <p className="text-xs text-gris">
            {timeAgo(item.created_at)}
            {item.occasion ? ` · ${item.occasion}` : ''}
          </p>
        </div>
        {(mine || FEATURES.reports) && (
          <button aria-label="Opciones" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="flex h-10 w-10 items-center justify-center rounded-full text-gris active:bg-crema">
            <IconMore />
          </button>
        )}
        {menu && <button aria-label="Cerrar menú" tabIndex={-1} onClick={() => setMenu(false)} className="fixed inset-0 z-10 cursor-default" />}
        {menu && (
          <div className="sheet-in absolute right-3 top-12 z-20 w-52 overflow-hidden rounded-xl border border-linea bg-white text-sm shadow-lg">
            {mine ? (
              <button onClick={remove} className="block w-full px-4 py-3 text-left text-vino active:bg-crema">
                Borrar publicación
              </button>
            ) : (
              <button onClick={() => report('tasting', item.id)} className="block w-full px-4 py-3 text-left active:bg-crema">
                Reportar publicación
              </button>
            )}
            <button onClick={() => setMenu(false)} className="block w-full border-t border-linea px-4 py-3 text-left text-gris active:bg-crema">
              Cancelar
            </button>
          </div>
        )}
      </div>

      {item.photo_path && (
        <Link to={wine ? `/vino/${wine.id}` : '#'} className="block">
          <WineThumb wine={wine} photoPath={item.photo_path} className="aspect-[4/3] w-full" />
        </Link>
      )}

      <div className="flex flex-col gap-2.5 px-3.5 pb-1.5 pt-3">
        {showWine && wine && (
          <Link to={`/vino/${wine.id}`} className="flex items-center gap-3 rounded-xl bg-crema p-2.5 text-tinta no-underline active:bg-arena">
            {!item.photo_path && <WineThumb wine={wine} className="h-14 w-10 shrink-0 rounded-lg" bottleSize={44} />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium leading-tight">{wine.name}</span>
              <span className="block truncate text-xs text-gris">{wineSubtitle(wine)}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <Copas value={item.rating} size={15} />
              <span className="text-[11px] text-gris">{RATING_LABELS[item.rating]}</span>
            </span>
          </Link>
        )}
        {!showWine && (
          <div className="flex items-center gap-2">
            <Copas value={item.rating} size={16} />
            <span className="text-xs text-gris">{RATING_LABELS[item.rating]}</span>
          </div>
        )}
        {item.comment && <p className="whitespace-pre-line text-[15px] leading-relaxed text-texto">{item.comment}</p>}
        {item.hidden && <p className="text-xs font-medium text-vino">Oculta por la vinoteca (solo la ves vos)</p>}
        {error && (
          <p className="text-xs text-vino" role="alert">
            {error}
          </p>
        )}

        {(FEATURES.cheers || FEATURES.threadComments) && (
          <div className="-mx-2 flex gap-1 text-[13px]">
            {FEATURES.cheers && (
              <button
                onClick={toggleCheer}
                aria-pressed={isCheered}
                className={`flex h-10 items-center gap-1.5 rounded-full px-2.5 transition-colors active:bg-crema ${isCheered ? 'font-medium text-vino' : 'text-gris'}`}
              >
                <IconGlass size={18} filled={isCheered} />
                {cheerCount > 0 ? `${cheerCount} brindis` : 'Brindar'}
              </button>
            )}
            {FEATURES.threadComments && (
              <button onClick={toggleComments} aria-expanded={open} className="flex h-10 items-center gap-1.5 rounded-full px-2.5 text-gris active:bg-crema">
                <IconChat size={18} />
                {commentCount > 0 ? `${commentCount} ${commentCount === 1 ? 'comentario' : 'comentarios'}` : 'Comentar'}
              </button>
            )}
          </div>
        )}

        {open && (
          <div className="flex flex-col gap-3 border-t border-linea pb-2 pt-3">
            {comments === null && <p className="text-xs text-gris">Cargando…</p>}
            {comments?.length === 0 && <p className="text-xs text-gris">Sé el primero en comentar.</p>}
            {comments?.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Avatar name={c.profile?.display_name} url={c.profile?.avatar_url} id={c.user_id} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="rounded-2xl rounded-tl-sm bg-crema px-3 py-2 text-[13px]">
                    <span className="block font-medium">{c.profile?.display_name ?? 'Socio'}</span>
                    <span className="text-texto">{c.body}</span>
                  </p>
                  <div className="mt-0.5 flex gap-3 pl-3 text-[11px] text-gris">
                    <span>{timeAgo(c.created_at)}</span>
                    {c.user_id === profile?.id ? (
                      <button onClick={() => removeComment(c.id)}>Borrar</button>
                    ) : (
                      <button onClick={() => report('comment', c.id)}>Reportar</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <form onSubmit={send} className="flex gap-2">
              <label htmlFor={`c-${item.id}`} className="sr-only">
                Escribí un comentario
              </label>
              <input
                id={`c-${item.id}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                enterKeyHint="send"
                placeholder="Escribí un comentario…"
                className="h-10 min-w-0 flex-1 rounded-full border border-borde px-4 text-sm outline-none focus:border-vino"
              />
              <button disabled={sending || !draft.trim()} className="h-10 rounded-full bg-tinta px-4 text-sm text-white disabled:opacity-40">
                Enviar
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  )
}
