import { useEffect, useState } from 'react'

const labels = {
  loading: 'проверяем…',
  ok: 'сервер отвечает',
  error: 'нет связи с сервером',
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
    <main>
      <h1>Деканат Next</h1>
      <p>Связь с сервером: {labels[status]}</p>
    </main>
  )
}