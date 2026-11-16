import { useEffect, useState } from 'react'
import Logo from './components/Logo.jsx'

const labels = {
  loading: 'проверяем…',
  ok: 'на связи',
  error: 'нет связи',
}

export default function App() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
  }, [])

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
        <div className="pill" data-state={status} role="status">
          <span className="dot" />
          Сервер: {labels[status]}
        </div>
        <p className="note">
          Концепт для конкурса. Не официальный сервис вуза, все данные вымышленные.
        </p>
      </section>
    </div>
  )
}