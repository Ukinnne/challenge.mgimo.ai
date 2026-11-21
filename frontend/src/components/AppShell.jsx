
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import { initials, roleLabel } from '../utils.js'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'

const ITEMS = [
  { to: '/', label: 'Главная', icon: 'home', end: true },
  { to: '/schedule', label: 'Расписание', icon: 'schedule', roles: ['student'] },
  { to: '/grades', label: 'Оценки', icon: 'grades', roles: ['student'] },
  { to: '/requests', label: 'Заявки', icon: 'requests' },
  { to: '/notifications', label: 'Уведомления', icon: 'bell' },
  { to: '/profile', label: 'Профиль', icon: 'profile' },
]

export default function AppShell() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  const name = user.profile?.full_name ?? user.login
  const items = ITEMS.filter((item) => !item.roles || item.roles.includes(user.role))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    let active = true

    async function loadUnreadCount() {
      try {
        const data = await api('/notifications')

        if (active) {
          setUnreadCount(data.unread_count ?? 0)
        }
      } catch {
        // Не блокируем навигацию, если уведомления временно недоступны
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadUnreadCount()
      }
    }

    loadUnreadCount()

    const interval = window.setInterval(loadUnreadCount, 15000)

    window.addEventListener('focus', loadUnreadCount)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', loadUnreadCount)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname])

  return (
    <div className="app">
      <a href="#main" className="skip-link">Перейти к содержимому</a>

      <aside className="sidebar">
        <div className="brand">
          <Logo size={36} />
          <span>Деканат Next</span>
        </div>

        <nav className="nav" aria-label="Основное меню">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="nav-link"
            >
              <span className="nav-ico">
                <Icon name={item.icon} size={22} />
              </span>

              <span className="nav-label">{item.label}</span>

              {item.to === '/notifications' && unreadCount > 0 && (
                <span
                  className="nav-unread-count"
                  aria-label={`${unreadCount} непрочитанных уведомлений`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar avatar-sm" aria-hidden="true">
            {initials(name)}
          </div>

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

      <main id="main" className="main" tabIndex={-1}>
        <div className="content">
          <Outlet />

          <p className="note">
            Концепт для конкурса. Не официальный сервис вуза, все данные вымышленные.
          </p>
        </div>
      </main>
    </div>
  )
}
