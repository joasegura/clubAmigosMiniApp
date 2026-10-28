import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabaseConfigured } from '../lib/supabase'
import { GoogleLogo } from '../components/Icons'

export default function Login() {
  const { signInWithGoogle, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function google() {
    setError('')
    try {
      await signInWithGoogle()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInWithEmail(email.trim())
      setSent(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-7 pt-10 text-center">
        <img src="/brand/logo.png" alt="Entre amigos vinoteca" className="w-60" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-vino">Club de amigos</span>
        <h1 className="max-w-[290px] text-2xl font-normal leading-snug">Contá qué vinos tomás y descubrí los favoritos del club</h1>
      </div>

      <div className="flex flex-col gap-3.5 px-6 pb-8 pt-7">
        {!supabaseConfigured && (
          <p className="rounded-xl bg-vino-suave p-3 text-sm text-vino-oscuro" role="alert">
            Falta configurar Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).
          </p>
        )}

        {sent ? (
          <div className="rounded-2xl border border-linea bg-crema p-5 text-center" role="status">
            <p className="text-base font-medium">Revisá tu mail</p>
            <p className="mt-1 text-sm text-gris">
              Te mandamos un link a <b className="font-medium text-tinta">{email}</b> para entrar al club.
            </p>
            <button onClick={() => setSent(false)} className="mt-3 text-sm text-vino underline">
              Usar otro mail
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={google}
              className="flex h-13 items-center justify-center gap-2.5 rounded-full border border-borde bg-white text-[15px] font-medium active:bg-crema"
            >
              <GoogleLogo />
              Continuar con Google
            </button>

            <div className="flex items-center gap-3 text-[13px] text-gris">
              <span className="h-px flex-1 bg-linea" />o con tu mail<span className="h-px flex-1 bg-linea" />
            </div>

            <form onSubmit={sendLink} className="flex flex-col gap-3.5">
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
                {busy ? 'Enviando…' : 'Recibir link de ingreso'}
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
          Al ingresar confirmás que sos mayor de 18 años y aceptás los términos del club.
          <br />
          Beber con moderación. Prohibida su venta a menores de 18 años.
        </p>
      </div>
    </div>
  )
}
