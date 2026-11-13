import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { updateDisplayName } from '../lib/backend'

/** Primer ingreso por mail: el socio elige cómo lo ven los demás */
export default function Welcome() {
  const { profile, refreshProfile, signOut } = useAuth()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setBusy(true)
    setError('')
    try {
      await updateDisplayName(profile.id, name)
      await refreshProfile()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 bg-white px-7 py-10">
      <img src="/brand/icon-192.png" alt="" className="h-16 w-16 self-center object-contain" />
      <div className="text-center">
        <h1 className="text-2xl font-normal">¡Bienvenido al club!</h1>
        <p className="mt-1 text-sm text-gris">¿Cómo querés que te vean los demás socios?</p>
      </div>
      <form onSubmit={save} className="flex flex-col gap-3.5">
        <label htmlFor="nombre" className="text-[13px] font-medium text-texto">
          Tu nombre
        </label>
        <input
          id="nombre"
          autoFocus
          required
          maxLength={40}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej.: Juan Pérez"
          className="h-12 rounded-xl border border-borde px-4 text-[15px] outline-none focus:border-vino"
        />
        {error && (
          <p className="text-sm text-vino" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy || !name.trim()} className="h-13 rounded-full bg-vino text-base font-medium text-white disabled:opacity-60">
          Entrar al club
        </button>
        <button type="button" onClick={() => void signOut()} className="text-sm text-gris underline">
          Usar otra cuenta
        </button>
      </form>
    </div>
  )
}
