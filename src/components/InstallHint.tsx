import { useEffect, useState } from 'react'
import { canPromptInstall, isIos, isStandalone, onInstallChange, promptInstall } from '../lib/pwa'
import { IconClose } from './Icons'

const DISMISS_KEY = 'club-entre-amigos:install-hint-cerrado'

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Invita a instalar la app (solo si todavía no está instalada y se puede) */
export default function InstallHint() {
  const [, rerender] = useState(0)
  const [dismissed, setDismissed] = useState(wasDismissed)
  const [showSteps, setShowSteps] = useState(false)

  useEffect(() => onInstallChange(() => rerender((n) => n + 1)), [])

  const ios = isIos()
  if (dismissed || isStandalone() || (!ios && !canPromptInstall())) return null

  function close() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Sin almacenamiento: se vuelve a mostrar la próxima vez
    }
    setDismissed(true)
  }

  async function install() {
    if (ios) return setShowSteps((s) => !s)
    if (await promptInstall()) close()
  }

  return (
    <section aria-label="Instalar la app" className="relative flex flex-col gap-2 rounded-2xl border border-linea bg-white p-3.5 pr-11">
      <div className="flex items-center gap-3">
        <img src="/brand/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl border border-linea object-contain" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Tené el club a un toque</p>
          <p className="text-xs text-gris">Instalá la app en tu celular, sin pasar por la tienda.</p>
        </div>
      </div>
      <button onClick={install} className="h-10 rounded-full bg-tinta text-sm font-medium text-white">
        {ios ? (showSteps ? 'Ocultar pasos' : 'Cómo instalarla') : 'Instalar'}
      </button>
      {showSteps && (
        <ol className="ml-4 list-decimal text-[13px] leading-relaxed text-texto">
          <li>
            Tocá el botón <b className="font-medium">Compartir</b> de Safari (el cuadrado con la flecha).
          </li>
          <li>
            Elegí <b className="font-medium">Agregar a inicio</b>.
          </li>
          <li>Abrí el club desde el ícono nuevo.</li>
        </ol>
      )}
      <button onClick={close} aria-label="No mostrar más" className="absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center text-gris">
        <IconClose size={18} />
      </button>
    </section>
  )
}
