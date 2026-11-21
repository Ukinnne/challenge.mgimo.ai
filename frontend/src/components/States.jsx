import Icon from './Icon.jsx'

// Серые заглушки на время загрузки
export function Skeleton({ blocks = 3 }) {
  return (
    <div className="skeleton" role="status" aria-label="Загрузка">
      {Array.from({ length: blocks }).map((_, i) => (
        <span key={i} className="skeleton-block" />
      ))}
    </div>
  )
}

export function ErrorBox({ text = 'Не удалось загрузить данные.', onRetry }) {
  return (
    <div className="panel empty" role="alert">
      <span className="empty-ico"><Icon name="alert" size={30} /></span>
      <h2>Что-то пошло не так</h2>
      <p>{text}</p>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon = 'check', title, text }) {
  return (
    <div className="panel empty">
      <span className="empty-ico"><Icon name={icon} size={30} /></span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  )
}