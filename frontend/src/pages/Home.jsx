import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import Icon from '../components/Icon.jsx'
import { Skeleton } from '../components/States.jsx'
import Waves from '../components/Waves.jsx'
import { useFetch } from '../hooks.js'
import { firstName, formatDay, greeting, lessonsWord } from '../utils.js'
import {
  AnnouncementCard,
  AnnouncementForm,
} from './Notifications.jsx'

const STATUS = { moved: 'Перенос', cancelled: 'Отмена', replaced: 'Замена' }

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
      <section className="hero hero-loading" role="status" aria-label="Загрузка" />
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

function StaffAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnnouncements = useCallback(async () => {
    setError('')

    try {
      const data = await api('/notifications')
      setAnnouncements(data.announcements ?? [])
    } catch {
      setError('Не удалось загрузить объявления')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  return (
    <div className="notifications-page">
      <AnnouncementForm onCreated={loadAnnouncements} />

      <section className="notification-section">
        <div className="notification-section-heading">
          <div>
            <span className="section-eyebrow">Новости деканата</span>
            <h2>Последние объявления</h2>
          </div>

          <Link to="/notifications" className="btn-link">
            Все объявления
          </Link>
        </div>

        {error ? (
          <div className="notification-error" role="alert">
            <Icon name="alert" size={18} />
            <span>{error}</span>
            <button type="button" onClick={loadAnnouncements}>
              Повторить
            </button>
          </div>
        ) : loading ? (
          <div className="notification-list">
            <div className="notification-skeleton" />
            <div className="notification-skeleton" />
          </div>
        ) : announcements.length > 0 ? (
          <div className="notification-list">
            {announcements.slice(0, 3).map((item) => (
              <AnnouncementCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="notification-empty">
            <div className="notification-empty-icon">
              <Icon name="bell" size={22} />
            </div>
            <h3>Пока нет объявлений</h3>
            <p>Опубликуйте первое объявление для студентов</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const isStudent = user.role === 'student'

  const { data, error, reload } = useFetch(
    isStudent ? '/schedule/upcoming' : null,
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

      <div className="home-grid">
        {isStudent ? (
          <>
            <Hero data={data} error={error} reload={reload} />
            <Changes data={data} error={error} />
          </>
        ) : (
          <>
            <section className="hero hero-wide">
              <Waves />
              <p className="hero-kicker">Рабочее место</p>
              <h2 className="hero-title">Заявки студентов</h2>
              <p className="hero-text">
                Управляйте входящими обращениями, отслеживайте обработку
                и публикуйте важные новости для студентов.
              </p>
              <Link to="/requests" className="btn btn-light">
                Открыть заявки <Icon name="right" size={18} />
              </Link>
            </section>

            <StaffAnnouncements />
          </>
        )}

        <div className="tiles">
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