import { useAuth } from '../auth.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { EmptyState } from '../components/States.jsx'
import { initials, roleLabel } from '../utils.js'

export default function Profile() {
  const { user, signOut } = useAuth()
  const profile = user.profile

  if (!profile) {
    return (
      <>
        <PageHeader title="Профиль" />
        <EmptyState
          icon="profile"
          title="Профиль пока пуст"
          text="Для этой учётной записи не заполнены данные. Обратитесь в деканат."
        />
      </>
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
      <PageHeader title="Профиль" />

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