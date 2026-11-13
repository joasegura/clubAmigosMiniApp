import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { FEATURES, getMemberCard } from '../lib/backend'
import { memberSince, timeAgo } from '../lib/format'
import { POINTS_RULES } from '../lib/seed'
import type { MemberCard as Card } from '../lib/types'
import { ErrorBox, Loading, PageHeader } from '../components/ui'
import QrCode from '../components/QrCode'

/** "EA001001" → "EA 001 001", más fácil de dictar en la caja */
const prettyCode = (code: string) => code.replace(/^([A-Z]+)(\d{3})(\d{3})$/, '$1 $2 $3')

export default function MemberCard() {
  const { profile } = useAuth()
  const profileId = profile?.id
  const [card, setCard] = useState<Card | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profileId) return
    setError('')
    try {
      setCard(await getMemberCard(profileId))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [profileId])

  useEffect(() => {
    void load()
  }, [load])

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!card) return <Loading />

  // Con Nexus los beneficios son los niveles reales del club; en la demo, las reglas de ejemplo
  const rewards = card.rewards ?? POINTS_RULES.rewards
  const prev = [...rewards].reverse().find((r) => r.points <= card.balance)
  const from = prev?.points ?? 0
  const progress = card.next_reward ? Math.min(100, ((card.balance - from) / (card.next_reward.points - from)) * 100) : 100

  return (
    <>
      <PageHeader title="Mi tarjeta" />
      <div className="flex flex-col gap-5 px-5 py-5">
        <section aria-label="Tarjeta de socio" className="flex flex-col items-center gap-4 rounded-[22px] bg-tinta px-5 pb-6 pt-5 text-white shadow-lg shadow-tinta/20">
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-2">
              <img src="/brand/icon-192.png" alt="" className="h-8 w-8 rounded-full bg-white object-contain p-0.5" />
              <span className="leading-tight">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F08A8F]">Club</span>
                <span className="block text-sm font-medium">Entre amigos</span>
              </span>
            </span>
            <span className="text-right leading-tight">
              <span className="block text-[26px] font-semibold">{card.balance.toLocaleString('es-AR')}</span>
              <span className="block text-[11px] text-[#CFC6C1]">puntos</span>
            </span>
          </div>

          {card.qr_pending ? (
            <div className="flex min-h-[232px] w-[232px] flex-col items-center justify-center gap-2 rounded-2xl bg-white/10 p-5 text-center text-sm text-[#CFC6C1]">
              <span>Tu QR todavía no está asignado. Pedilo en la vinoteca y aparece acá al instante.</span>
              {card.member_ref && (
                <span className="text-xs">
                  Decile al vendedor tu número de cliente{' '}
                  <b className="font-mono text-base font-semibold tracking-wider text-white">#{card.member_ref.customer_id}</b>
                  {!card.member_ref.has_dni && <span className="block">y tu DNI, para completar tus datos.</span>}
                </span>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-3">
              <QrCode value={card.code} size={208} label={`Código QR de socio ${prettyCode(card.code)}`} />
            </div>
          )}

          <div className="text-center leading-snug">
            <p className="text-lg font-medium">{card.display_name}</p>
            {card.code && <p className="font-mono text-[15px] tracking-[0.12em] text-[#CFC6C1]">{prettyCode(card.code)}</p>}
            {card.level_label && <p className="mt-1 text-sm font-medium text-[#F08A8F]">Nivel {card.level_label}</p>}
            <p className="mt-1 text-xs text-[#CFC6C1]">Socio desde {memberSince(card.created_at)}</p>
          </div>
        </section>

        <p className="-mt-2 text-center text-[13px] text-gris">Mostrá este código en la caja para sumar puntos con tus compras.</p>

        <section className="flex flex-col gap-2.5 rounded-2xl border border-linea bg-white p-4">
          {card.next_reward ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-medium">Tu próximo beneficio</h2>
                <span className="shrink-0 text-xs text-gris">
                  {card.balance} / {card.next_reward.points}
                </span>
              </div>
              <p className="text-sm text-texto">{card.next_reward.label}</p>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-arena"
                role="progressbar"
                aria-valuemin={from}
                aria-valuemax={card.next_reward.points}
                aria-valuenow={card.balance}
              >
                <div className="h-full rounded-full bg-vino" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gris">
                Te faltan <b className="font-medium text-tinta">{card.next_reward.points - card.balance} puntos</b>.
                {card.rewards
                  ? ' Sumás puntos con cada compra en la vinoteca.'
                  : ` Sumás 1 punto cada $${POINTS_RULES.pesosPerPoint.toLocaleString('es-AR')} de compra.`}
              </p>
            </>
          ) : (
            <p className="text-sm text-texto">¡Llegaste al máximo beneficio del club! Consultá en la vinoteca cómo canjearlo.</p>
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-base font-medium">Beneficios</h2>
          <ul className="flex flex-col divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-white">
            {rewards.length === 0 && <li className="px-3.5 py-3 text-sm text-gris">La vinoteca todavía no cargó los beneficios.</li>}
            {rewards.map((r) => {
              const reached = card.balance >= r.points
              return (
                <li key={r.points} className="flex items-center gap-3 px-3.5 py-3">
                  <span
                    className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-[13px] font-semibold leading-none ${
                      reached ? 'bg-vino text-white' : 'bg-arena text-tinta'
                    }`}
                  >
                    {r.points}
                    <span className="mt-0.5 text-[9px] font-normal">pts</span>
                  </span>
                  <span className="min-w-0 flex-1 text-sm">{r.label}</span>
                  {reached && <span className="shrink-0 text-xs font-medium text-ok">Disponible</span>}
                </li>
              )
            })}
          </ul>
        </section>

        {/* Nexus todavía no guarda el historial de puntos: la sección se muestra solo en la demo */}
        <section hidden={!FEATURES.demoTools} className="flex flex-col gap-2.5">
          <h2 className="text-base font-medium">Últimos movimientos</h2>
          {card.movements.length === 0 ? (
            <p className="text-sm text-gris">Todavía no tenés movimientos.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-white">
              {card.movements.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{m.concept}</span>
                    <span className="block text-xs text-gris">{timeAgo(m.created_at)}</span>
                  </span>
                  <span className={`shrink-0 text-sm font-semibold ${m.points >= 0 ? 'text-ok' : 'text-vino'}`}>
                    {m.points >= 0 ? '+' : ''}
                    {m.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p hidden={!FEATURES.demoTools} className="rounded-xl bg-crema p-3 text-xs leading-relaxed text-gris">
          Demo: los puntos, las reglas y los beneficios son de ejemplo. Cuando se conecte el sistema de la vinoteca (Nexus), la caja va a leer
          este QR y los puntos se van a sumar solos con cada compra.
        </p>
      </div>
    </>
  )
}
