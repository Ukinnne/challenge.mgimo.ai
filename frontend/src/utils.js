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

// 1 занятие, 2 занятия, 5 занятий
export const lessonsWord = (n) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'занятие'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'занятия'
  return 'занятий'
}

// Приветствие по московскому времени «ЧЧ:ММ», которое присылает сервер
export const greeting = (hhmm) => {
  const hour = Number(hhmm?.slice(0, 2))
  if (Number.isNaN(hour)) return 'Здравствуйте'
  if (hour < 5) return 'Доброй ночи'
  if (hour < 12) return 'Доброе утро'
  if (hour < 18) return 'Добрый день'
  return 'Добрый вечер'
}

// 1 день, 2 дня, 5 дней
export const daysWord = (n) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'день'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дня'
  return 'дней'
}

export const daysLeftText = (n) => {
  if (n === 0) return 'сегодня'
  if (n === 1) return 'завтра'
  return `через ${n} ${daysWord(n)}`
}

// 71.5 → «71,5»
export const num = (value) => String(value).replace('.', ',')