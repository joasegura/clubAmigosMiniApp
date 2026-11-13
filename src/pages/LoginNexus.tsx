import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { NexusError } from '../lib/nexus/client'

type Step = 'dni' | 'registro' | 'codigo'

const inputClass = 'h-12 rounded-xl border border-borde px-4 text-[15px] outline-none focus:border-vino'
const primaryButton = 'h-13 rounded-full bg-vino text-base font-medium text-white active:bg-vino-oscuro disabled:opacity-60'

/** Ingreso al club conectado a Nexus: DNI → código por mail (alta si el DNI no está registrado) */
export default function LoginNexus() {
  const { requestDniCode, registerMember, verifyDniCode } = useAuth()
  const [step, setStep] = useState<Step>('dni')
  const [dni, setDni] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [form, setForm] = useState({ name: '', lastName: '', email: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(fn: () => Promise<void>) {
    setError('')
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const askCode = (e: React.FormEvent) => {
    e.preventDefault()
    void run(async () => {
      try {
        setSentTo(await requestDniCode(dni))
        setCode('')
        setStep('codigo')
      } catch (err) {
        // DNI sin registrar en la vinoteca: pasamos al alta
        if (err instanceof NexusError && err.status === 404) {
          setStep('registro')
          return
        }
        throw err
      }
    })
  }

  const register = (e: React.FormEvent) => {
    e.preventDefault()
    void run(async () => {
      setSentTo(await registerMember({ documentNumber: dni, ...form }))
      setCode('')
      setStep('codigo')
    })
  }

  const enter = (e: React.FormEvent) => {
    e.preventDefault()
    void run(() => verifyDniCode(dni, code))
  }

  const restart = () => {
    setStep('dni')
    setError('')
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-7 pt-10 text-center">
        <img src="/brand/logo.png" alt="Entre amigos vinoteca" className="w-60" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-vino">Club de amigos</span>
        <h1 className="max-w-[290px] text-2xl font-normal leading-snug">Contá qué vinos tomás y descubrí los favoritos del club</h1>
      </div>

      <div className="flex flex-col gap-3.5 px-6 pb-8 pt-7">
        {step === 'dni' && (
          <form onSubmit={askCode} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dni" className="text-[13px] font-medium text-texto">
                Tu DNI
              </label>
              <input
                id="dni"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="off"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="Sin puntos"
                className={inputClass}
              />
            </div>
            <button disabled={busy || dni.length < 6} className={primaryButton}>
              {busy ? 'Buscando…' : 'Recibir código de ingreso'}
            </button>
            <p className="text-center text-xs text-gris">Te mandamos un código al mail que tenés registrado en la vinoteca.</p>
          </form>
        )}

        {step === 'registro' && (
          <form onSubmit={register} className="flex flex-col gap-3">
            <div className="rounded-2xl border border-linea bg-crema p-4 text-center">
              <p className="text-base font-medium">¡Bienvenido al club!</p>
              <p className="mt-1 text-sm text-gris">
                No encontramos el DNI <b className="font-medium text-tinta">{dni}</b>. Completá tus datos para sumarte.
              </p>
            </div>
            {(
              [
                { key: 'name', label: 'Nombre', type: 'text', auto: 'given-name', required: true, max: 40 },
                { key: 'lastName', label: 'Apellido', type: 'text', auto: 'family-name', required: true, max: 60 },
                { key: 'email', label: 'Mail (ahí te llega el código)', type: 'email', auto: 'email', required: true, max: 120 },
                { key: 'phone', label: 'Celular (opcional)', type: 'tel', auto: 'tel', required: false, max: 30 },
              ] as const
            ).map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label htmlFor={`reg-${f.key}`} className="text-[13px] font-medium text-texto">
                  {f.label}
                </label>
                <input
                  id={`reg-${f.key}`}
                  type={f.type}
                  required={f.required}
                  autoComplete={f.auto}
                  maxLength={f.max}
                  value={form[f.key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className={inputClass}
                />
              </div>
            ))}
            <button disabled={busy} className={primaryButton}>
              {busy ? 'Registrando…' : 'Sumarme y recibir el código'}
            </button>
            <button type="button" onClick={restart} className="text-sm text-vino underline">
              Usar otro DNI
            </button>
          </form>
        )}

        {step === 'codigo' && (
          <form onSubmit={enter} className="flex flex-col gap-3.5">
            <div className="rounded-2xl border border-linea bg-crema p-4 text-center" role="status">
              <p className="text-base font-medium">Revisá tu mail</p>
              <p className="mt-1 text-sm text-gris">
                Te mandamos un código de 6 números a <b className="font-medium text-tinta">{sentTo || 'tu mail'}</b>. Vence en 15 minutos.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="codigo" className="text-[13px] font-medium text-texto">
                Código
              </label>
              <input
                id="codigo"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="h-12 rounded-xl border border-borde px-4 text-center text-xl tracking-[0.4em] outline-none focus:border-vino"
              />
            </div>
            <button disabled={busy || code.length !== 6} className={primaryButton}>
              {busy ? 'Entrando…' : 'Entrar al club'}
            </button>
            <button type="button" onClick={restart} className="text-sm text-vino underline">
              Usar otro DNI
            </button>
          </form>
        )}

        {error && (
          <p className="text-center text-sm text-vino" role="alert">
            {error}
          </p>
        )}

        <p className="mt-1 text-center text-xs leading-relaxed text-gris">
          Al ingresar confirmás que sos mayor de 18 años y aceptás los{' '}
          <Link to="/terminos" className="text-gris underline">
            términos del club
          </Link>{' '}
          y la{' '}
          <Link to="/privacidad" className="text-gris underline">
            política de privacidad
          </Link>
          .
          <br />
          Beber con moderación. Prohibida su venta a menores de 18 años.
        </p>
      </div>
    </div>
  )
}
