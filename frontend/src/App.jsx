import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Загрузка">
      <span className="spinner" />
    </div>
  )
}

// Пускает дальше только вошедших. Остальных отправляет на страницу входа.
function Protected() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}