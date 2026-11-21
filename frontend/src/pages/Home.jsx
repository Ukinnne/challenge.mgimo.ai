import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import Icon from '../components/Icon.jsx'
import { Skeleton } from '../components/States.jsx'
import { useFetch } from '../hooks.js'
import { firstName, formatDay, greeting, lessonsWord } from '../utils.js'

const STATUS = { moved: 'Перенос', cancelled: 'Отмена', replaced: 'Замена' }

const TILES = [
  { to: '/schedule', icon: 'schedule', title: 'Расписание', text: 'Занятия на сегодня и неделю', roles: ['student'] },
  { to: '/grades', icon: 'grades', title: 'Оценки', text: 'Зачёты и итоги сессии', roles: ['student'] },
  { to: '/requests', icon: 'requests', title: 'Заявки и справки', text: 'Заказ справок и статус заявки', soon: true },
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
        <h2 className="hero-title">Не удалось загрузить расписание</h2>
        <button className="btn btn-light" onClick={reload}>Повторить</button>
      </section>
    )
  }
  if (!data) {
    return <section className="hero hero-loading" role="status" aria-label="Загрузка" />
  }

  const count = data.today_lessons.filter((l) => l.status !== 'cancelled').length
  const next = data.next

  return (
    <section className="hero">
      <p className="hero-kicker">{data.weekday}, {formatDay(data.today)}</p>
      <h2 className="hero-title">
        {count ? `Сегодня ${count} ${lessonsWord(count)}` : 'Сегодня занятий нет'}
      </h2>

      {data.current && <FocusCard label="Идёт сейчас" lesson={data.current} />}
      {next ? (
        <FocusCard
          label={next.is_today ? 'Дальше сегодня' : 'Ближайшее занятие'}
          lesson={next.lesson}
          day={next.is_today ? '' : next.weekday}
        />
      ) : (
        !data.current && <p className="hero-text">Ближайших занятий в расписании нет.</p>
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
  if (error) body = <p className="muted-line">Не удалось загрузить изменения.</p>
  else if (!data) body = <Skeleton blocks={2} />
  else if (!list.length) {
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
            <span className={`tag tag-${lesson.status}`}>{STATUS[lesson.status]}</span>
            <div>
              <strong>{lesson.subject}</strong>
              <span>{weekday}, {formatDay(date)} · {lesson.start}</span>
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

export default function Home() {
  const { user } = useAuth()
  const isStudent = user.role === 'student'
  const { data, error, reload } = useFetch(isStudent ? '/schedule/upcoming' : null)

  const name = firstName(user.profile?.full_name ?? user.login)
  const tiles = TILES.filter((t) => !t.roles || t.roles.includes(user.role))

  return (
    <>
      <header className="home-head">
        <h1 className="page-title">
          {isStudent ? greeting(data?.now) : 'Здравствуйте'}, {name}
        </h1>
        <p className="page-sub">
          {isStudent ? `Группа ${user.profile?.group_name ?? ''}` : user.profile?.position}
        </p>
      </header>

      <div className="home-grid">
        {isStudent ? (
          <>
            <Hero data={data} error={error} reload={reload} />
            <Changes data={data} error={error} />
          </>
        ) : (
          <section className="hero hero-wide">
            <p className="hero-kicker">Рабочее место</p>
            <h2 className="hero-title">Заявки студентов</h2>
            <p className="hero-text">Здесь появятся входящие заявки и справки на обработку.</p>
            <Link to="/requests" className="btn btn-light">
              Открыть заявки <Icon name="right" size={18} />
            </Link>
          </section>
        )}

        <div className="tiles">
          {tiles.map((t) => (
            <Link key={t.to} to={t.to} className="tile">
              <span className="tile-icon"><Icon name={t.icon} /></span>
              <span className="tile-text">
                <strong>{t.title}</strong>
                <span>{t.text}</span>
              </span>
              {t.soon ? <span className="badge">Скоро</span> : <Icon name="right" size={18} />}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}