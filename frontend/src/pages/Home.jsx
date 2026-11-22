
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import Icon from '../components/Icon.jsx'
import { Skeleton } from '../components/States.jsx'
import Waves from '../components/Waves.jsx'
import { useFetch } from '../hooks.js'
import { AnnouncementCard } from './Notifications.jsx'
import './Home.css'
import { firstName, formatDay, greeting, lessonsWord } from '../utils.js'

const STATUS = {
  moved: 'Перенос',
  cancelled: 'Отмена',
  replaced: 'Замена',
}

const TILES = [
  {
    to: '/schedule',
    icon: 'schedule',
    title: 'Расписание',
    text: 'Занятия на сегодня и неделю',
    roles: ['student'],
  },
  {
    to: '/grades',
    icon: 'grades',
    title: 'Оценки',
    text: 'Зачёты и итоги сессии',
    roles: ['student'],
  },
  {
    to: '/requests',
    icon: 'requests',
    title: 'Заявки и справки',
    text: 'Заказ справок и статус заявки',
  },
  {
    to: '/notifications',
    icon: 'bell',
    title: 'Объявления и уведомления',
    text: 'Новости деканата и важные напоминания',
  },
]

function FocusCard({ label, lesson, day }) {
  return (
    <div className="hero-card">
      <span className="hero-label">{label}</span>
      <strong>{lesson.subject}</strong>
      <span>
        {day ? `${day}, ` : ''}
        {lesson.start}–{lesson.end} · {lesson.room}
      </span>
    </div>
  )
}

function Hero({ data, error, reload }) {
  if (error) {
    return (
      <section className="hero">
        <Waves />
        <h2 className="hero-title">Не удалось загрузить расписание</h2>
        <button className="btn btn-light" onClick={reload}>
          Повторить
        </button>
      </section>
    )
  }

  if (!data) {
    return (
      <section
        className="hero hero-loading"
        role="status"
        aria-label="Загрузка"
      />
    )
  }

  const count = data.today_lessons.filter(
    (lesson) => lesson.status !== 'cancelled',
  ).length

  const next = data.next

  return (
    <section className="hero">
      <Waves />
      <p className="hero-kicker">
        {data.weekday}, {formatDay(data.today)}
      </p>

      <h2 className="hero-title">
        {count ? `Сегодня ${count} ${lessonsWord(count)}` : 'Сегодня занятий нет'}
      </h2>

      {data.current && (
        <FocusCard label="Идёт сейчас" lesson={data.current} />
      )}

      {next ? (
        <FocusCard
          label={next.is_today ? 'Дальше сегодня' : 'Ближайшее занятие'}
          lesson={next.lesson}
          day={next.is_today ? '' : next.weekday}
        />
      ) : (
        !data.current && (
          <p className="hero-text">Ближайших занятий в расписании нет.</p>
        )
      )}

      <Link to="/schedule" className="btn btn-light">
        Открыть расписание <Icon name="right" size={18} />
      </Link>
    </section>
  )
}

function Changes({ data, error }) {
  const list = data?.changes ?? []
  let body

  if (error) {
    body = <p className="muted-line">Не удалось загрузить изменения.</p>
  } else if (!data) {
    body = <Skeleton blocks={2} />
  } else if (!list.length) {
    body = (
      <p className="muted-line">
        <Icon name="check" size={20} /> Изменений нет, всё по плану
      </p>
    )
  } else {
    body = (
      <ul className="change-list">
        {list.map(({ date, weekday, lesson }) => (
          <li key={lesson.id} className="change">
            <span className={`tag tag-${lesson.status}`}>
              {STATUS[lesson.status]}
            </span>

            <div>
              <strong>{lesson.subject}</strong>
              <span>
                {weekday}, {formatDay(date)} · {lesson.start}
              </span>
              {lesson.note && <em>{lesson.note}</em>}
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="panel changes">
      <h2 className="panel-title">Изменения в расписании</h2>
      {body}
    </section>
  )
}

function StudentAnnouncements({ data, error, reload }) {
  const announcements = data?.announcements ?? []
  const unreadCount = data?.unread_announcement_count ?? 0

  return (
    <section className="panel home-announcements">
      <div className="home-announcements-head">
        <div className="home-announcements-title">
          <span className="section-eyebrow">Будь в курсе</span>
          <h2 className="panel-title">Новости деканата</h2>
        </div>

        <div className="home-announcements-actions">
          {unreadCount > 0 && (
            <span className="home-unread-bubble">
              <strong>{unreadCount > 99 ? '99+' : unreadCount}</strong>
              <span>непрочитанных</span>
            </span>
          )}

          <Link to="/notifications" className="home-announcements-link">
            Все уведомления <Icon name="right" size={16} />
          </Link>
        </div>
      </div>

      {error ? (
        <div className="notification-error" role="alert">
          <Icon name="alert" size={18} />
          <span>Не удалось загрузить объявления</span>
          <button type="button" onClick={reload}>
            Повторить
          </button>
        </div>
      ) : !data ? (
        <div className="notification-list">
          <div className="notification-skeleton" />
          <div className="notification-skeleton" />
        </div>
      ) : announcements.length > 0 ? (
        <div className="notification-list">
          {announcements.slice(0, 2).map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="notification-empty">
          <div className="notification-empty-icon">
            <Icon name="check" size={22} />
          </div>
          <h3>Новых объявлений пока нет</h3>
          <p>Здесь появятся важные новости и напоминания от деканата</p>
        </div>
      )}
    </section>
  )
}

export default function Home() {
  const { user } = useAuth()
  const isStudent = user.role === 'student'

  const { data, error, reload } = useFetch(
    isStudent ? '/schedule/upcoming' : null,
  )

  const notificationsFetch = useFetch(
    isStudent ? '/notifications' : null,
  )

  const name = firstName(user.profile?.full_name ?? user.login)

  const tiles = TILES.filter(
    (tile) => !tile.roles || tile.roles.includes(user.role),
  )

  return (
    <>
      <header className="home-head">
        <h1 className="page-title">
          {isStudent ? greeting(data?.now) : 'Здравствуйте'}, {name}
        </h1>

        <p className="page-sub">
          {isStudent
            ? `Группа ${user.profile?.group_name ?? ''}`
            : user.profile?.position}
        </p>
      </header>

      <div className={`home-grid ${isStudent ? '' : 'staff-home-grid'}`}>
        {isStudent ? (
          <>
            <Hero data={data} error={error} reload={reload} />
            <Changes data={data} error={error} />
            <StudentAnnouncements
              data={notificationsFetch.data}
              error={notificationsFetch.error}
              reload={notificationsFetch.reload}
            />
          </>
        ) : (
          <header className="staff-home-intro">
            <span className="section-eyebrow">Рабочее пространство</span>
            <h2>Управление деканатом</h2>
            <p>
              Обрабатывайте обращения студентов и публикуйте важные объявления
              в одном месте.
            </p>
          </header>
        )}

        <div className={`tiles ${isStudent ? '' : 'staff-tiles'}`}>
          {tiles.map((tile) => (
            <Link key={tile.to} to={tile.to} className="tile">
              <span className="tile-icon">
                <Icon name={tile.icon} />
              </span>

              <span className="tile-text">
                <strong>{tile.title}</strong>
                <span>{tile.text}</span>
              </span>

              <Icon name="right" size={18} />
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
