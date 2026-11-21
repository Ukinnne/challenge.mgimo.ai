import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { initials, roleLabel } from '../utils.js'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'

const ITEMS = [
  { to: '/', label: 'Главная', icon: 'home', end: true },
  { to: '/schedule', label: 'Расписание', icon: 'schedule', roles: ['student'] },
  { to: '/grades', label: 'Оценки', icon: 'grades', roles: ['student'] },
  { to: '/requests', label: 'Заявки', icon: 'requests' },
  { to: '/profile', label: 'Профиль', icon: 'profile' },
]

export default function AppShell() {
  const { user, signOut } = useAuth()
  const name = user.profile?.full_name ?? user.login
  // Пункты без списка ролей видят все, остальные только указанные роли
  const items = ITEMS.filter((item) => !item.roles || item.roles.includes(user.role))

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <Logo size={36} />
          <span>Деканат Next</span>
        </div>

        <nav className="nav" aria-label="Основное меню">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar avatar-sm" aria-hidden="true">{initials(name)}</div>
          <div className="sidebar-user-text">
            <strong>{name}</strong>
            <span>{roleLabel(user.role)}</span>
          </div>
          <button className="icon-btn" onClick={signOut} aria-label="Выйти">
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <header className="mobilebar">
        <div className="brand">
          <Logo size={32} />
          <span>Деканат Next</span>
        </div>
        <button className="icon-btn" onClick={signOut} aria-label="Выйти">
          <Icon name="logout" />
        </button>
      </header>

      <main className="main">
        <Outlet />
        <p className="note">
          Концепт для конкурса. Не официальный сервис вуза, все данные вымышленные.
        </p>
      </main>
    </div>
  )
}