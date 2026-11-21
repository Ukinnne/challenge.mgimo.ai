import { useAuth } from '../auth.jsx'
import { initials, roleLabel } from '../utils.js'

export default function Profile() {
  const { user, signOut } = useAuth()
  const profile = user.profile

  if (!profile) {
    return (
      <div className="panel empty">
        <h2>Профиль пока пуст</h2>
        <p>Для этой учётной записи не заполнены данные. Обратитесь в деканат.</p>
      </div>
    )
  }

  const rows =
    user.role === 'student'
      ? [
          ['Факультет', profile.faculty],
          ['Направление', profile.program],
          ['Курс', profile.course],
          ['Группа', profile.group_name],
          ['Номер зачётки', profile.record_book],
        ]
      : [['Должность', profile.position]]

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Профиль</h1>
      </div>

      <div className="profile-grid">
        <section className="panel profile-card">
          <div className="avatar avatar-lg" aria-hidden="true">{initials(profile.full_name)}</div>
          <h2>{profile.full_name}</h2>
          <span className="role">{roleLabel(user.role)}</span>
          <button className="btn btn-ghost" onClick={signOut}>Выйти из кабинета</button>
        </section>

        <section className="panel">
          <h2 className="panel-title">{user.role === 'student' ? 'Данные студента' : 'Данные сотрудника'}</h2>
          <dl className="facts">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  )
}