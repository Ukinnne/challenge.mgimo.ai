import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import AppShell from './components/AppShell.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Profile from './pages/Profile.jsx'
import Schedule from './pages/Schedule.jsx'
import Grades from './pages/Grades.jsx'

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Загрузка">
      <span className="spinner" />
    </div>
  )
}

// Пускает дальше только вошедших и оборачивает страницы в каркас кабинета
function Protected() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return <AppShell />
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <Splash /> : user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route element={<Protected />}>
        <Route path="/" element={<Home />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/grades" element={<Grades />} />
        <Route
          path="/requests"
          element={<ComingSoon title="Заявки и справки" icon="requests" text="Здесь можно будет заказать справку и следить за статусом." />}
        />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}