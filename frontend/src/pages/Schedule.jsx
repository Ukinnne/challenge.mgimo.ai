import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { EmptyState, ErrorBox, Skeleton } from '../components/States.jsx'
import { useFetch } from '../hooks.js'
import { formatDay, lessonsWord } from '../utils.js'

const KIND = { lecture: 'Лекция', practice: 'Практика', lab: 'Лабораторная', exam: 'Экзамен' }
const STATUS = { moved: 'Перенос', cancelled: 'Отмена', replaced: 'Замена' }
const SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// «ЧЧ:ММ» сравниваются как строки: так же, как по времени
function lessonState(lesson, isToday, now) {
  if (!isToday || lesson.status === 'cancelled') return ''
  if (lesson.end <= now) return 'past'
  if (lesson.start <= now) return 'live'
  return ''
}

function Lesson({ lesson, state }) {
  return (
    <li className={`lesson lesson-${lesson.status} ${state ? `is-${state}` : ''}`}>
      <div className="lesson-time">
        <strong>{lesson.start}</strong>
        <span>{lesson.end}</span>
      </div>
      <div className="lesson-card">
        <div className="lesson-top">
          <span className="kind">{KIND[lesson.kind]}</span>
          {state === 'live' && <span className="tag tag-live">Идёт сейчас</span>}
          {lesson.status !== 'normal' && (
            <span className={`tag tag-${lesson.status}`}>{STATUS[lesson.status]}</span>
          )}
        </div>
        <h3>{lesson.subject}</h3>
        <ul className="lesson-meta">
          <li><Icon name="profile" size={16} /> {lesson.teacher}</li>
          <li><Icon name="room" size={16} /> {lesson.room}</li>
        </ul>
        {lesson.note && (
          <p className="lesson-note">
            <Icon name="alert" size={16} /> <span>{lesson.note}</span>
          </p>
        )}
      </div>
    </li>
  )
}

function Lessons({ day, isToday, now }) {
  return (
    <ul className="lessons">
      {day.lessons.map((lesson) => (
        <Lesson key={lesson.id} lesson={lesson} state={lessonState(lesson, isToday, now)} />
      ))}
    </ul>
  )
}

function DayStrip({ days, selected, today, onSelect }) {
  return (
    <div className="strip" role="group" aria-label="Дни недели">
      {days.map((day, i) => {
        const active = day.lessons.filter((l) => l.status !== 'cancelled').length
        const changed = day.lessons.some((l) => l.status !== 'normal')
        return (
          <button
            key={day.date}
            className={`strip-day ${day.date === today ? 'is-today' : ''}`}
            aria-pressed={day.date === selected}
            onClick={() => onSelect(day.date)}
          >
            <span className="strip-wd">{SHORT[i]}</span>
            <span className="strip-num">{Number(day.date.slice(8))}</span>
            <span className={`strip-count ${active ? '' : 'is-zero'}`} aria-hidden="true">
              {active || '–'}
            </span>
            {changed && <span className="strip-flag" aria-hidden="true" />}
            <span className="sr-only">
              {active} {lessonsWord(active)}{changed ? ', есть изменения' : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function Schedule() {
  const [offset, setOffset] = useState(0)
  const [view, setView] = useState('day')
  const [picked, setPicked] = useState(null)
  const { data, error, reload } = useFetch(`/schedule?offset=${offset}`)

  // Какой день открыт: выбранный, а если его нет в этой неделе, то сегодня или понедельник
  const fallback = data && (data.days.some((d) => d.date === data.today) ? data.today : data.days[0].date)
  const selected = data && data.days.some((d) => d.date === picked) ? picked : fallback
  const day = data?.days.find((d) => d.date === selected)

  const goToday = () => {
    setOffset(0)
    setPicked(null)
    setView('day')
  }
  const notToday = data && (offset !== 0 || selected !== data.today)

  let body
  if (error) {
    body = (
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
    body = <Skeleton blocks={3} />
  } else if (view === 'day') {
    const isToday = day.date === data.today
    const list = day.lessons
    const active = list.filter((l) => l.status !== 'cancelled').length
    body = (
      <section>
        <div className="day-summary">
          <h2>{day.weekday}, {formatDay(day.date)}</h2>
          {list.length > 0 && (
            <p>
              {active} {lessonsWord(active)} · {list[0].start}–{list[list.length - 1].end}
            </p>
          )}
        </div>
        {list.length ? (
          <Lessons day={day} isToday={isToday} now={data.now} />
        ) : (
          <EmptyState
            icon="schedule"
            title={isToday ? 'Сегодня занятий нет' : 'В этот день занятий нет'}
            text="Можно отдохнуть или посмотреть другой день недели."
          />
        )}
      </section>
    )
  } else {
    const changes = data.days.reduce((n, d) => n + d.lessons.filter((l) => l.status !== 'normal').length, 0)
    body = (
      <>
        {changes > 0 && <div className="notice">Изменений в расписании на этой неделе: {changes}</div>}
        {data.days.map((d) => (
          <section key={d.date} className="week-day">
            <h2>
              {d.weekday}, {formatDay(d.date)}
              {d.date === data.today && <span className="tag tag-today">Сегодня</span>}
            </h2>
            {d.lessons.length ? (
              <Lessons day={d} isToday={d.date === data.today} now={data.now} />
            ) : (
              <p className="day-empty">Занятий нет</p>
            )}
          </section>
        ))}
      </>
    )
  }

  return (
    <>
      <PageHeader title="Расписание" sub={data ? `Группа ${data.group}` : undefined} />

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Режим просмотра">
          <button aria-pressed={view === 'day'} onClick={() => setView('day')}>День</button>
          <button aria-pressed={view === 'week'} onClick={() => setView('week')}>Неделя</button>
        </div>

        <div className="week-nav">
          <button className="icon-btn" onClick={() => setOffset((n) => n - 1)} aria-label="Предыдущая неделя">
            <Icon name="left" />
          </button>
          <span className="week-label">
            {data ? `${formatDay(data.week_start)} – ${formatDay(data.week_end)}` : '…'}
          </span>
          <button className="icon-btn" onClick={() => setOffset((n) => n + 1)} aria-label="Следующая неделя">
            <Icon name="right" />
          </button>
          {notToday && (
            <button className="btn-link" onClick={goToday}>Сегодня</button>
          )}
        </div>
      </div>

    {data && view === 'day' && (
        <>
          <DayStrip days={data.days} selected={selected} today={data.today} onSelect={setPicked} />
          <p className="strip-legend">
            Цифра: сколько занятий в день. <span className="legend-dot" /> есть перенос, замена или отмена.
          </p>
        </>
      )}

      {body}
    </>
  )
}