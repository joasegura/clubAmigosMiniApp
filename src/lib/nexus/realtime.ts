import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { NEXUS_CATALOG_SLUG, NEXUS_ENABLED, NEXUS_SOCKET_URL } from './client'

/** Eventos públicos que emite Nexus a la sala `club-catalog-<slug>` */
const EVENTS = ['club-catalog-updated', 'club-review-changed'] as const
/** Agrupa ráfagas (ej. varios socios votando a la vez) en una sola recarga */
const DEBOUNCE_MS = 600

let socket: Socket | null = null
let users = 0

function connect(): Socket {
  if (!socket) {
    socket = io(NEXUS_SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    })
    // Al reconectar hay que volver a unirse a la sala
    socket.on('connect', () => socket?.emit('join-club-catalog', { slug: NEXUS_CATALOG_SLUG }))
  }
  users++
  return socket
}

function release() {
  users--
  if (users <= 0 && socket) {
    socket.emit('leave-club-catalog', { slug: NEXUS_CATALOG_SLUG })
    socket.disconnect()
    socket = null
    users = 0
  }
}

/**
 * Llama a `onChange` cuando Nexus avisa que cambió el catálogo o un puntaje, y también
 * al volver a la app (por si el socket estuvo dormido). En modo demo no hace nada.
 */
export function useClubUpdates(onChange: () => void) {
  const callback = useRef(onChange)

  useEffect(() => {
    callback.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!NEXUS_ENABLED) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const fire = () => {
      clearTimeout(timer)
      timer = setTimeout(() => callback.current(), DEBOUNCE_MS)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') fire()
    }

    const s = connect()
    EVENTS.forEach((e) => s.on(e, fire))
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearTimeout(timer)
      EVENTS.forEach((e) => s.off(e, fire))
      document.removeEventListener('visibilitychange', onVisible)
      release()
    }
  }, [])
}
