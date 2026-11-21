import { useAuth } from '../auth.jsx'
import Logo from '../components/Logo.jsx'

export default function Home() {
  const { user, signOut } = useAuth()
  const name = user.profile?.full_name ?? user.login

  return (
    <div className="page">
      <section className="card">
        <div className="brand">
          <Logo size={40} />
          <span>Деканат Next</span>
        </div>
        <h1>Здравствуйте, {name}</h1>
        <p className="lead">
          Вы вошли как {user.role === 'student' ? 'студент' : 'сотрудник деканата'}. Скоро здесь
          появятся расписание, оценки и справки.
        </p>
        <button className="btn btn-ghost" onClick={signOut}>
          Выйти
        </button>
      </section>
    </div>
  )
}