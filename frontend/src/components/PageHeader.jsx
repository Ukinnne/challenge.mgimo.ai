import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

export default function PageHeader({ title, sub, back = false }) {
  return (
    <header className="page-head">
      {back && (
        <Link to="/" className="back">
          <Icon name="back" size={20} />
          <span>На главную</span>
        </Link>
      )}
      <h1 className="page-title">{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
    </header>
  )
}