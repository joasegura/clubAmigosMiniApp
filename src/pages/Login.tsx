import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { GoogleLogo } from '../components/Icons'

export default function Login() {
  const { signInWithGoogle, sendCode, verifyCode, signInAsShop } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  /** DEMO: el código que en producción llega por mail */
  const [demoCode, setDemoCode] = useState<string | null>(null)
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
      setDemoCode(await sendCode(email))
      setCode('')
    })
  }

  const enter = (e: React.FormEvent) => {
    e.preventDefault()
    void run(() => verifyCode(email, code))
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-7 pt-10 text-center">
        <img src="/brand/logo.png" alt="Entre amigos vinoteca" className="w-60" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-vino">Club de amigos</span>
        <h1 className="max-w-[290px] text-2xl font-normal leading-snug">Contá qué vinos tomás y descubrí los favoritos del club</h1>
      </div>

      <div className="flex flex-col gap-3.5 px-6 pb-8 pt-7">
        {demoCode ? (
          <form onSubmit={enter} className="flex flex-col gap-3.5">
            <div className="rounded-2xl border border-linea bg-crema p-4 text-center" role="status">
              <p className="text-base font-medium">Revisá tu mail</p>
              <p className="mt-1 text-sm text-gris">
                Te mandamos un código de 6 números a <b className="font-medium text-tinta">{email.trim()}</b>.
              </p>
              <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[13px] text-texto">
                Demo: tu código es <b className="font-semibold tracking-[0.2em] text-vino">{demoCode}</b>
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
            <button
              disabled={busy || code.length !== 6}
              className="h-13 rounded-full bg-vino text-base font-medium text-white active:bg-vino-oscuro disabled:opacity-60"
            >
              {busy ? 'Entrando…' : 'Entrar al club'}
            </button>
            <button type="button" onClick={() => setDemoCode(null)} className="text-sm text-vino underline">
              Usar otro mail
            </button>
          </form>
        ) : (
          <>
            <button
              onClick={() => void run(signInWithGoogle)}
              disabled={busy}
              className="flex h-13 items-center justify-center gap-2.5 rounded-full border border-borde bg-white text-[15px] font-medium active:bg-crema"
            >
              <GoogleLogo />
              Continuar con Google
            </button>

            <div className="flex items-center gap-3 text-[13px] text-gris">
              <span className="h-px flex-1 bg-linea" />o con tu mail<span className="h-px flex-1 bg-linea" />
            </div>

            <form onSubmit={askCode} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[13px] font-medium text-texto">
                  Tu mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@mail.com"
                  className="h-12 rounded-xl border border-borde px-4 text-[15px] outline-none focus:border-vino"
                />
              </div>
              <button disabled={busy} className="h-13 rounded-full bg-vino text-base font-medium text-white active:bg-vino-oscuro disabled:opacity-60">
                {busy ? 'Enviando…' : 'Recibir código de ingreso'}
              </button>
            </form>
          </>
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

        <div className="mt-2 rounded-xl border border-dashed border-borde px-4 py-3 text-center text-xs text-gris">
          Versión de demostración: los datos se guardan solo en este dispositivo.
          <button onClick={() => void run(signInAsShop)} className="mt-1.5 block w-full font-medium text-tinta underline">
            Entrar como la vinoteca (panel de administración)
          </button>
        </div>
      </div>
    </div>
  )
}
