export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')

// «Тестова Алина Сергеевна» → «Алина»
export const firstName = (name = '') => {
  const parts = name.split(' ').filter(Boolean)
  return parts[1] ?? parts[0] ?? ''
}

export const roleLabel = (role) => (role === 'student' ? 'Студент' : 'Сотрудник деканата')

// «2026-11-23» → «23 ноября». Читаем как UTC, чтобы часовой пояс зрителя ничего не сдвигал
export const formatDay = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })