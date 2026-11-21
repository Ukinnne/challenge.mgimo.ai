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