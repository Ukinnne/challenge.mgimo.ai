import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { EmptyState, ErrorBox, Skeleton } from '../components/States.jsx'
import { useFetch } from '../hooks.js'
import { formatDay } from '../utils.js'

const KIND = { lecture: 'Лекция', practice: 'Практика', lab: 'Лабораторная', exam: 'Экзамен' }
const STATUS = { moved: 'Перенос', cancelled: 'Отмена', replaced: 'Замена' }

function Lesson({ lesson }) {
  return (
    <li className={`lesson lesson-${lesson.status}`}>
      <div className="lesson-time">
        <strong>{lesson.start}</strong>
        <span>{lesson.end}</span>
      </div>
      <div className="lesson-body">
        <div className="lesson-head">
          <h3>{lesson.subject}</h3>
          {lesson.status !== 'normal' && (
            <span className={`tag tag-${lesson.status}`}>{STATUS[lesson.status]}</span>
          )}
        </div>
        <p className="lesson-meta">
          {KIND[lesson.kind]} · {lesson.teacher} · {lesson.room}
        </p>
        {lesson.note && <p className="lesson-note">{lesson.note}</p>}
      </div>
    </li>
  )
}

function Day({ day, isToday }) {
  return (
    <section className="day">
      <h2 className="day-head">
        {day.weekday}, {formatDay(day.date)}
        {isToday && <span className="tag tag-today">Сегодня</span>}
      </h2>
      {day.lessons.length ? (
        <ul className="lessons">
          {day.lessons.map((lesson) => (
            <Lesson key={lesson.id} lesson={lesson} />
          ))}
        </ul>
      ) : (
        <p className="day-empty">Занятий нет</p>
      )}
    </section>
  )
}

export default function Schedule() {
  const [offset, setOffset] = useState(0)
  const [view, setView] = useState('today')
  const { data, error, loading, reload } = useFetch(`/schedule?offset=${offset}`)

  const showToday = () => {
    setOffset(0)
    setView('today')
  }

  let content
  if (error) {
    content = (
      <ErrorBox
        text={
          error.status === 403
            ? 'Раздел доступен только студентам.'
            : 'Не удалось загрузить расписание. Проверьте соединение и повторите.'
        }
        onRetry={error.status === 403 ? undefined : reload}
      />
    )
  } else if (!data) {
    content = <Skeleton blocks={3} />
  } else if (view === 'today') {
    const today = data.days.find((d) => d.date === data.today)
    content = today?.lessons.length ? (
      <Day day={today} isToday />
    ) : (
      <EmptyState
        icon="schedule"
        title="Сегодня занятий нет"
        text="Загляните во вкладку «Неделя», чтобы увидеть ближайшие пары."
      />
    )
  } else {
    const changes = data.days.reduce(
      (n, d) => n + d.lessons.filter((l) => l.status !== 'normal').length,
      0,
    )
    content = (
      <>
        {changes > 0 && <div className="notice">Изменений в расписании на этой неделе: {changes}</div>}
        {data.days.map((day) => (
          <Day key={day.date} day={day} isToday={day.date === data.today} />
        ))}
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Расписание</h1>
        {data && <p className="page-sub">Группа {data.group}</p>}
      </div>

      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Режим просмотра">
          <button role="tab" aria-selected={view === 'today'} onClick={showToday}>
            Сегодня
          </button>
          <button role="tab" aria-selected={view === 'week'} onClick={() => setView('week')}>
            Неделя
          </button>
        </div>

        {view === 'week' && (
          <div className="week-nav">
            <button className="icon-btn" onClick={() => setOffset((n) => n - 1)} aria-label="Предыдущая неделя">
              <Icon name="left" />
            </button>
            <span>{data ? `${formatDay(data.week_start)} – ${formatDay(data.week_end)}` : '…'}</span>
            <button className="icon-btn" onClick={() => setOffset((n) => n + 1)} aria-label="Следующая неделя">
              <Icon name="right" />
            </button>
            {offset !== 0 && (
              <button className="btn-link" onClick={() => setOffset(0)}>
                Эта неделя
              </button>
            )}
          </div>
        )}
      </div>

      {content}
    </>
  )
}