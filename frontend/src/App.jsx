import { useEffect, useState } from 'react'
import Logo from './components/Logo.jsx'

const labels = {
  loading: 'проверяем…',
  ok: 'на связи',
  error: 'нет связи',
}

function useCheck(url) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    fetch(url)
      .then((response) => (response.ok ? setStatus('ok') : Promise.reject()))
      .catch(() => setStatus('error'))
  }, [url])

  return status
}

function Pill({ name, status }) {
  return (
    <div className="pill" data-state={status} role="status">
      <span className="dot" />
      {name}: {labels[status]}
    </div>
  )
}

export default function App() {
  const server = useCheck('/api/health')
  const database = useCheck('/api/health/db')

  return (
    <div className="page">
      <section className="card">
        <div className="brand">
          <Logo size={40} />
          <span>Деканат Next</span>
        </div>
        <h1>Вся учёба в одном кабинете</h1>
        <p className="lead">
          Расписание, оценки и справки без очередей и поиска по чатам.
        </p>
        <div className="pills">
          <Pill name="Сервер" status={server} />
          <Pill name="База данных" status={database} />
        </div>
        <p className="note">
          Концепт для конкурса. Не официальный сервис вуза, все данные вымышленные.
        </p>
      </section>
    </div>
  )
}