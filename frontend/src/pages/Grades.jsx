import PageHeader from '../components/PageHeader.jsx'
import { EmptyState, ErrorBox, Skeleton } from '../components/States.jsx'
import { useFetch } from '../hooks.js'
import { daysLeftText, formatDay, num } from '../utils.js'

const CONTROL = { exam: 'Экзамен', credit: 'Зачёт' }
const LEVEL = { good: 'В порядке', mid: 'Нужно подтянуть', risk: 'Риск' }
const MARK_TEXT = { 5: '5', 4: '4', 3: '3', 2: '2', pass: 'Зачёт', fail: 'Незачёт' }

function Summary({ summary, passPoints }) {
  const { average_points: avg, counts, focus, next_control: next } = summary

  return (
    <section className="hero hero-wide">
      <p className="hero-kicker">Баллы за текущий семестр</p>
      <div className="gr-avg">
        <strong>{num(avg)}</strong>
        <span>из 100 в среднем</span>
      </div>

      <ul className="gr-counts">
        <li><i className="dot-good" /> {counts.good} в порядке</li>
        <li><i className="dot-mid" /> {counts.mid} подтянуть</li>
        <li><i className="dot-risk" /> {counts.risk} в зоне риска</li>
      </ul>

      {focus && (
        <p className="gr-note">
          <strong>Больше всего внимания: {focus.subject}.</strong>{' '}
          {focus.to_pass > 0
            ? `Набрано ${focus.points}, до порога в ${passPoints} баллов не хватает ${focus.to_pass}.`
            : `Баллов хватает, но запас небольшой: ${focus.points} из 100.`}
        </p>
      )}

      {next && (
        <p className="gr-note">
          Ближайший контроль: {CONTROL[next.control].toLowerCase()} по «{next.subject}»{' '}
          {daysLeftText(next.days_left)}, {formatDay(next.exam_date)}.
        </p>
      )}
    </section>
  )
}

function Course({ course }) {
  return (
    <li className={`course course-${course.level}`}>
      <div className="course-main">
        <h3>{course.subject}</h3>
        <p>{CONTROL[course.control]} · {course.teacher}</p>
      </div>

      <div className="course-score">
        <strong>{course.points}</strong>
        <span>/100</span>
      </div>

      <div
        className="meter"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={course.points}
        aria-label={`${course.points} баллов из 100`}
      >
        <i style={{ width: `${course.points}%` }} />
        <b />
      </div>

      <div className="course-foot">
        <span className={`tag tag-lv-${course.level}`}>{LEVEL[course.level]}</span>
        <span>
          {course.exam_date
            ? `${CONTROL[course.control]} ${formatDay(course.exam_date)} · ${daysLeftText(course.days_left)}`
            : 'Дата уточняется'}
        </span>
      </div>
    </li>
  )
}

function History({ history }) {
  if (!history.length) {
    return (
      <EmptyState
        icon="grades"
        title="Прошлых сессий пока нет"
        text="Когда вы сдадите первую сессию, её итоги появятся здесь."
      />
    )
  }
  return (
    <div className="terms">
      {history.map((term) => (
        <section key={term.term} className="panel">
          <div className="term-head">
            <h3>{term.term}</h3>
            {term.gpa && <span>Средний балл экзаменов: {num(term.gpa)}</span>}
          </div>
          <ul className="marks">
            {term.items.map((item) => (
              <li key={item.subject}>
                <div>
                  <strong>{item.subject}</strong>
                  <small>{CONTROL[item.control]} · {item.teacher}</small>
                </div>
                <span className={`mark mark-${item.mark}`}>{MARK_TEXT[item.mark]}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default function Grades() {
  const { data, error, reload } = useFetch('/grades')

  let body
  if (error) {
    body = (
      <ErrorBox
        text={
          error.status === 403
            ? 'Раздел доступен только студентам.'
            : 'Не удалось загрузить оценки. Проверьте соединение и повторите.'
        }
        onRetry={error.status === 403 ? undefined : reload}
      />
    )
  } else if (!data) {
    body = <Skeleton blocks={4} />
  } else {
    body = (
      <>
        {data.courses.length ? (
          <>
            <Summary summary={data.summary} passPoints={data.pass_points} />
            <h2 className="section-title">Дисциплины</h2>
            <ul className="courses">
              {data.courses.map((c) => (
                <Course key={c.id} course={c} />
              ))}
            </ul>
            <p className="legend">
              Тёмная отметка на шкале показывает порог зачёта: {data.pass_points} баллов.
            </p>
          </>
        ) : (
          <EmptyState
            icon="grades"
            title="Дисциплин в этом семестре пока нет"
            text="Как только деканат внесёт дисциплины, здесь появятся баллы."
          />
        )}

        <h2 className="section-title">Прошлые сессии</h2>
        <History history={data.history} />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Оценки" sub={data?.term ?? undefined} />
      {body}
    </>
  )
}