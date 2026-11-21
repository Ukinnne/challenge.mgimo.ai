import { useState } from 'react'
import { useAuth } from '../auth.jsx'
import Logo from '../components/Logo.jsx'

const ACCOUNTS = [
  { label: 'Студентка', login: 'student1', password: 'Student1-Test!' },
  { label: 'Студент', login: 'student2', password: 'Student2-Test!' },
  { label: 'Деканат', login: 'dean', password: 'Dean-Test-2026!' },
]

function errorText(error) {
  if (error.status === 0 || error.status >= 500) {
    return 'Нет связи с сервером. Проверьте интернет и повторите.'
  }
  switch (error.message) {
    case 'invalid_credentials':
      return 'Неверный логин или пароль.'
    case 'invalid_input':
      return 'Введите логин и пароль.'
    case 'locked':
      return `Слишком много неудачных попыток. Повторите через ${error.data?.minutes ?? 15} мин.`
    default:
      return 'Что-то пошло не так. Попробуйте ещё раз.'
  }
}

export default function Login() {
  const { signIn } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!login.trim() || !password) {
      setError('Введите логин и пароль.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await signIn(login, password)
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <section className="auth-hero">
        <div className="brand">
          <Logo size={40} bg="#0A4560" />
          <span>Деканат Next</span>
        </div>
        <div className="auth-hero-text">
          <h1>Вся учёба в одном кабинете</h1>
          <p>Расписание, оценки и справки без очередей и поиска по чатам.</p>
        </div>
        <svg className="waves" viewBox="0 0 720 160" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 90C80 50 160 130 240 90S400 50 480 90 640 130 720 90" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="2" />
          <path d="M0 115C80 75 160 155 240 115S400 75 480 115 640 155 720 115" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
          <path d="M0 140C80 100 160 180 240 140S400 100 480 140 640 180 720 140" fill="none" stroke="#F2B21A" strokeWidth="3" />
        </svg>
      </section>

      <section className="auth-panel">
        <form className="card" onSubmit={handleSubmit} noValidate>
          <h2>Вход в кабинет</h2>

          <label className="field">
            <span>Логин</span>
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              aria-invalid={Boolean(error)}
            />
          </label>

          <label className="field">
            <span>Пароль</span>
            <div className="pw">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShow((s) => !s)}
                aria-pressed={show}
              >
                {show ? 'Скрыть' : 'Показать'}
              </button>
            </div>
          </label>

          <div className="form-error" role="alert">{error}</div>

          <button className="btn btn-primary" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner spinner-sm" /> Входим…
              </>
            ) : (
              'Войти'
            )}
          </button>
        </form>

        <div className="demo">
          <p>Тестовые аккаунты для жюри. Нажмите, чтобы подставить:</p>
          <div className="chips">
            {ACCOUNTS.map((a) => (
              <button
                key={a.login}
                type="button"
                className="chip"
                onClick={() => {
                  setLogin(a.login)
                  setPassword(a.password)
                  setError('')
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <p className="note">
          Концепт для конкурса. Не официальный сервис вуза, все данные вымышленные.
        </p>
      </section>
    </div>
  )
}