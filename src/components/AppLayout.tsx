import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { IconHome, IconPlus, IconQr, IconTrophy, IconUser } from './Icons'

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${isActive ? 'font-medium text-vino' : 'text-gris'}`

export default function AppLayout() {
  const { pathname } = useLocation()
  const nav = useRef<HTMLElement>(null)
  // Subir un vino es un paso enfocado: sin la barra de navegación
  const focusMode = pathname === '/subir'

  // Cada pantalla nueva arranca desde arriba (el feed después restaura su posición)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Publica la altura real de la barra para que las barras fijas y los avisos no la pisen
  useEffect(() => {
    const root = document.documentElement
    const el = nav.current
    if (!el) {
      root.style.setProperty('--nav-h', '0px')
      return
    }
    const update = () => root.style.setProperty('--nav-h', `${el.offsetHeight}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [focusMode])

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-crema shadow-[0_0_0_1px_var(--color-linea)]">
      <main className={`flex-1 ${focusMode ? '' : 'pb-24'}`}>
        <Outlet />
      </main>
      {!focusMode && (
        <nav
          ref={nav}
          aria-label="Navegación principal"
          className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center justify-around border-t border-linea bg-white/95 px-2 pt-1.5 backdrop-blur"
        >
          <NavLink to="/" end className={itemClass}>
            <IconHome />
            Inicio
          </NavLink>
          <NavLink to="/ranking" className={itemClass}>
            <IconTrophy />
            Ranking
          </NavLink>
          <Link
            to="/subir"
            aria-label="Subir un vino"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-vino text-white shadow-lg shadow-vino/30 transition-transform active:scale-95"
          >
            <IconPlus size={26} />
          </Link>
          <NavLink to="/tarjeta" className={itemClass}>
            <IconQr />
            Mi tarjeta
          </NavLink>
          <NavLink to="/perfil" className={itemClass}>
            <IconUser />
            Perfil
          </NavLink>
        </nav>
      )}
    </div>
  )
}
