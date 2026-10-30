import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { IconCheck } from './Icons'

/**
 * Avisos breves ("toast") y confirmaciones propias de la app, en lugar de los
 * carteles nativos del navegador, que en una app instalada se ven fuera de lugar.
 */
interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}

interface Feedback {
  toast: (text: string) => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const FeedbackContext = createContext<Feedback | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)
  const confirmBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!dialog) return
    confirmBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      dialog.resolve(false)
      setDialog(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog])

  function close(ok: boolean) {
    dialog?.resolve(ok)
    setDialog(null)
  }

  const value: Feedback = {
    toast: useCallback((text: string) => setToast({ id: Date.now(), text }), []),
    confirm: useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), []),
  }

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-50 mx-auto flex max-w-md justify-center px-5">
        {toast && (
          <p key={toast.id} className="toast-in flex items-center gap-2 rounded-full bg-tinta px-4 py-2.5 text-sm text-white shadow-lg">
            <IconCheck size={16} className="text-[#F08A8F]" />
            {toast.text}
          </p>
        )}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 sm:items-center" onClick={() => close(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
            className="sheet-in pb-safe w-full max-w-md rounded-t-3xl bg-white px-5 pt-5 sm:rounded-3xl sm:pb-5"
          >
            <h2 id="confirm-title" className="text-lg font-medium">
              {dialog.title}
            </h2>
            {dialog.message && <p className="mt-1 text-sm text-gris">{dialog.message}</p>}
            <div className="mt-5 flex flex-col gap-2">
              <button
                ref={confirmBtn}
                onClick={() => close(true)}
                className={`h-12 rounded-full text-[15px] font-medium text-white ${dialog.danger ? 'bg-vino' : 'bg-tinta'}`}
              >
                {dialog.confirmLabel ?? 'Confirmar'}
              </button>
              <button onClick={() => close(false)} className="h-12 rounded-full text-[15px] text-texto">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback fuera de FeedbackProvider')
  return ctx
}
