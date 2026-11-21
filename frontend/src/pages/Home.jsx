import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import Icon from '../components/Icon.jsx'
import { firstName } from '../utils.js'

const CARDS = [
  { to: '/schedule', icon: 'schedule', title: 'Расписание', text: 'Занятия на сегодня и неделю, переносы и замены.', roles: ['student'] },
  { to: '/grades', icon: 'grades', title: 'Успеваемость', text: 'Оценки, зачёты и итоги сессии.', roles: ['student'] },
  { to: '/requests', icon: 'requests', title: 'Заявки и справки', text: 'Закажите справку и следите за статусом заявки.' },
]

export default function Home() {
  const { user } = useAuth()
  const name = firstName(user.profile?.full_name ?? user.login)
  const cards = CARDS.filter((card) => !card.roles || card.roles.includes(user.role))

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Здравствуйте, {name}</h1>
        <p className="page-sub">Всё, что нужно для учёбы, собрано здесь.</p>
      </div>

      <div className="cards">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="tile">
            <span className="tile-icon"><Icon name={card.icon} /></span>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
            <span className="badge">Скоро</span>
          </Link>
        ))}
      </div>
    </>
  )
}