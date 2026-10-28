import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { IconBookmark, IconHome, IconPlus, IconTrophy, IconUser } from './Icons'

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 text-[11px] ${isActive ? 'font-medium text-vino' : 'text-gris'}`

export default function AppLayout() {
  const location = useLocation()
  const onProfile = location.pathname === '/perfil'
  const onWishlist = onProfile && location.search.includes('quiero')
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-crema shadow-[0_0_0_1px_var(--color-linea)]">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      <nav
        aria-label="Navegación principal"
        className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center justify-around border-t border-linea bg-white px-2 pt-1.5"
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
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-vino text-white shadow-lg shadow-vino/30 active:scale-95"
        >
          <IconPlus size={26} />
        </Link>
        <NavLink to="/perfil?tab=quiero" className={() => itemClass({ isActive: onWishlist })}>
          <IconBookmark />
          Quiero probar
        </NavLink>
        <NavLink to="/perfil" end className={() => itemClass({ isActive: onProfile && !onWishlist })}>
          <IconUser />
          Perfil
        </NavLink>
      </nav>
    </div>
  )
}
