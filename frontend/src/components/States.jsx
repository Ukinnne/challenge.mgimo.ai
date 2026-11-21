import Icon from './Icon.jsx'

// Заглушка на время загрузки: серые полоски вместо пустого экрана
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

export function EmptyState({ icon, title, text }) {
  return (
    <div className="panel empty">
      {icon && <Icon name={icon} size={36} />}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  )
}