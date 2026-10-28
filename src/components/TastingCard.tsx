import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { addComment, deleteComment, deleteTasting, getComments, reportContent, setCheer } from '../lib/api'
import { RATING_LABELS, timeAgo, wineSubtitle } from '../lib/format'
import type { Comment, FeedItem } from '../lib/types'
import { Avatar, Copas, WineThumb } from './ui'
import { IconChat, IconGlass, IconMore } from './Icons'

interface Props {
  item: FeedItem
  cheered: boolean
  onCheerChange?: (id: string, on: boolean) => void
  onDeleted?: (id: string) => void
  showWine?: boolean
}

export default function TastingCard({ item, cheered, onCheerChange, onDeleted, showWine = true }: Props) {
  const { profile } = useAuth()
  const [cheerCount, setCheerCount] = useState(item.cheers?.[0]?.count ?? 0)
  const [isCheered, setIsCheered] = useState(cheered)
  const [commentCount, setCommentCount] = useState(item.comments?.[0]?.count ?? 0)
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [menu, setMenu] = useState(false)
  const [notice, setNotice] = useState('')

  const mine = profile?.id === item.user_id
  const wine = item.wine

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
    if (next && comments === null) setComments(await getComments(item.id))
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !draft.trim()) return
    setSending(true)
    try {
      await addComment(profile.id, item.id, draft.trim())
      setDraft('')
      setComments(await getComments(item.id))
      setCommentCount((c) => c + 1)
    } finally {
      setSending(false)
    }
  }

  async function report(type: 'tasting' | 'comment', id: string) {
    if (!profile) return
    await reportContent(profile.id, type, id)
    setMenu(false)
    setNotice('Gracias, la vinoteca lo va a revisar.')
  }

  async function remove() {
    if (!window.confirm('¿Borrar esta publicación?')) return
    await deleteTasting(item.id)
    onDeleted?.(item.id)
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-linea bg-white">
      <div className="relative flex items-center gap-2.5 px-3.5 py-3">
        <Avatar name={item.profile?.display_name} url={item.profile?.avatar_url} id={item.user_id} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{item.profile?.display_name ?? 'Socio'}</p>
          <p className="text-xs text-gris">
            {timeAgo(item.created_at)}
            {item.occasion ? ` · ${item.occasion}` : ''}
          </p>
        </div>
        <button aria-label="Opciones" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="flex h-10 w-10 items-center justify-center text-gris">
          <IconMore />
        </button>
        {menu && (
          <div className="absolute right-3 top-12 z-10 w-48 overflow-hidden rounded-xl border border-linea bg-white text-sm shadow-lg">
            {mine ? (
              <button onClick={remove} className="block w-full px-4 py-3 text-left text-vino">
                Borrar publicación
              </button>
            ) : (
              <button onClick={() => report('tasting', item.id)} className="block w-full px-4 py-3 text-left">
                Reportar publicación
              </button>
            )}
            <button onClick={() => setMenu(false)} className="block w-full border-t border-linea px-4 py-3 text-left text-gris">
              Cancelar
            </button>
          </div>
        )}
      </div>

      {item.photo_path && (
        <Link to={wine ? `/vino/${wine.id}` : '#'} className="block">
          <WineThumb wine={wine} photoPath={item.photo_path} className="h-64 w-full" />
        </Link>
      )}

      <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-3">
        {showWine && wine && (
          <Link to={`/vino/${wine.id}`} className="flex items-start justify-between gap-3 text-tinta no-underline">
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-medium">{wine.name}</span>
              <span className="block truncate text-xs text-gris">{wineSubtitle(wine)}</span>
            </span>
            <Copas value={item.rating} />
          </Link>
        )}
        {!showWine && (
          <div className="flex items-center gap-2">
            <Copas value={item.rating} />
            <span className="text-xs text-gris">{RATING_LABELS[item.rating]}</span>
          </div>
        )}
        {item.comment && <p className="whitespace-pre-line text-sm leading-relaxed text-texto">{item.comment}</p>}
        {item.hidden && <p className="text-xs font-medium text-vino">Oculta por la vinoteca (solo la ves vos)</p>}
        {notice && <p className="text-xs text-ok">{notice}</p>}

        <div className="flex gap-5 pt-0.5 text-[13px]">
          <button onClick={toggleCheer} aria-pressed={isCheered} className={`flex h-9 items-center gap-1.5 ${isCheered ? 'text-vino' : 'text-gris'}`}>
            <IconGlass size={18} filled={isCheered} />
            {cheerCount} {cheerCount === 1 ? 'brindis' : 'brindis'}
          </button>
          <button onClick={toggleComments} aria-expanded={open} className="flex h-9 items-center gap-1.5 text-gris">
            <IconChat size={18} />
            {commentCount} {commentCount === 1 ? 'comentario' : 'comentarios'}
          </button>
        </div>

        {open && (
          <div className="flex flex-col gap-3 border-t border-linea pt-3">
            {comments === null && <p className="text-xs text-gris">Cargando…</p>}
            {comments?.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Avatar name={c.profile?.display_name} url={c.profile?.avatar_url} id={c.user_id} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px]">
                    <span className="font-medium">{c.profile?.display_name ?? 'Socio'}</span>{' '}
                    <span className="text-texto">{c.body}</span>
                  </p>
                  <div className="flex gap-3 text-[11px] text-gris">
                    <span>{timeAgo(c.created_at)}</span>
                    {c.user_id === profile?.id ? (
                      <button
                        onClick={async () => {
                          await deleteComment(c.id)
                          setComments((cs) => cs?.filter((x) => x.id !== c.id) ?? null)
                          setCommentCount((n) => n - 1)
                        }}
                      >
                        Borrar
                      </button>
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
