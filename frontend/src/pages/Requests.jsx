import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import PageHeader from '../components/PageHeader.jsx'
import { EmptyState, ErrorBox, Skeleton } from '../components/States.jsx'
import './Requests.css'

const TYPE_LABELS = {
  study_certificate: 'Справка об обучении',
  academic_transcript: 'Академическая справка',
  other: 'Другое обращение',
}

const STATUS_LABELS = {
  new: 'Новая',
  in_progress: 'В работе',
  completed: 'Выполнена',
  rejected: 'Отклонена',
}

const NEXT_STATUSES = {
  new: ['in_progress', 'rejected'],
  in_progress: ['completed', 'rejected'],
  completed: [],
  rejected: [],
}

const ARCHIVED_STATUSES = ['completed', 'rejected']

function formatDate(value) {
  if (!value) return 'Дата не указана'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Дата не указана'

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function Status({ value }) {
  return (
    <span className={`request-status request-status-${value}`}>
      {STATUS_LABELS[value] ?? value}
    </span>
  )
}

function StudentDetails({ student }) {
  return (
    <div className="request-student">
      <div className="request-section-heading">
        <div>
          <span className="request-eyebrow">Заявитель</span>
          <h4>{student?.full_name || 'Данные студента не найдены'}</h4>
        </div>
      </div>

      {student && (
        <div className="request-student-details">
          {student.faculty && (
            <div>
              <span>Факультет</span>
              <strong>{student.faculty}</strong>
            </div>
          )}

          {student.program && (
            <div>
              <span>Образовательная программа</span>
              <strong>{student.program}</strong>
            </div>
          )}

          <div>
            <span>Курс</span>
            <strong>{student.course ?? 'Не указан'}</strong>
          </div>

          <div>
            <span>Группа</span>
            <strong>{student.group_name || 'Не указана'}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

function RequestHistory({ history }) {
  if (!history?.length) return null

  return (
    <div className="request-history">
      <h4>История обработки</h4>

      <ol className="request-timeline">
        {history.map((event, index) => (
          <li key={`${event.created_at}-${index}`}>
            <span className="timeline-dot" />
            <div className="timeline-content">
              <strong>
                {event.old_status
                  ? `${STATUS_LABELS[event.old_status] ?? event.old_status} → ${STATUS_LABELS[event.new_status] ?? event.new_status}`
                  : 'Заявка создана'}
              </strong>

              <span>{formatDate(event.created_at)}</span>

              {event.comment && <p>{event.comment}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function RequestCard({ item, isStaff, onUpdate }) {
  const [nextStatus, setNextStatus] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const availableStatuses = NEXT_STATUSES[item.status] ?? []

  async function handleUpdate(event) {
    event.preventDefault()

    if (!nextStatus || saving) return

    setSaving(true)
    setError('')

    try {
      await api(`/requests/${item.id}/status`, {
        method: 'PATCH',
        body: {
          status: nextStatus,
          comment: comment.trim() || null,
        },
      })

      setNextStatus('')
      setComment('')
      await onUpdate()
    } catch (err) {
      setError(
        err.status === 409
          ? 'Этот переход статуса недоступен. Обновите список.'
          : 'Не удалось обновить заявку. Попробуйте ещё раз.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="request-card">
      <div className="request-card-head">
        <div>
          <span className="request-number">Заявка №{item.id}</span>
          <h3>{TYPE_LABELS[item.request_type] ?? 'Обращение'}</h3>
        </div>

        <Status value={item.status} />
      </div>

      {isStaff && <StudentDetails student={item.student} />}

      <div className="request-meta">
        <span>Создана: {formatDate(item.created_at)}</span>
        {item.updated_at !== item.created_at && (
          <span>Обновлена: {formatDate(item.updated_at)}</span>
        )}
      </div>

      {item.comment && (
        <div className="request-comment">
          <span>Комментарий заявителя</span>
          <p>{item.comment}</p>
        </div>
      )}

      {isStaff && availableStatuses.length > 0 && (
        <form className="request-action" onSubmit={handleUpdate}>
          <h4>Обработка заявки</h4>

          <label className="request-field">
            Новый статус
            <select
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value)}
              required
            >
              <option value="">Выберите статус</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="request-field">
            Комментарий сотрудника
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Например, заявка принята в обработку"
              maxLength={1000}
              rows={2}
            />
          </label>

          {error && <p className="request-error">{error}</p>}

          <button
            className="btn btn-primary request-submit"
            disabled={saving || !nextStatus}
          >
            {saving ? 'Сохранение...' : 'Обновить статус'}
          </button>
        </form>
      )}

      {isStaff && availableStatuses.length === 0 && (
        <p className="request-final-note">
          Заявка завершена. Изменение статуса больше недоступно.
        </p>
      )}

      <RequestHistory history={item.history} />
    </article>
  )
}

function CreateRequest({ onCreated }) {
  const [requestType, setRequestType] = useState('study_certificate')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (submitting) return

    setSubmitting(true)
    setError('')
    setSuccess(false)

    try {
      await api('/requests', {
        method: 'POST',
        body: {
          request_type: requestType,
          comment: comment.trim() || null,
        },
      })

      setComment('')
      setRequestType('study_certificate')
      setSuccess(true)
      await onCreated()
    } catch (err) {
      setError(
        err.status === 403
          ? 'Создавать заявки могут только студенты.'
          : 'Не удалось отправить заявку. Проверьте соединение и повторите.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="request-create">
      <div className="request-section-heading">
        <div>
          <span className="request-eyebrow">Новое обращение</span>
          <h2>Заказать справку</h2>
          <p>Заполните форму, и заявка появится в вашем списке</p>
        </div>
      </div>

      <form className="request-form" onSubmit={handleSubmit}>
        <label className="request-field">
          Тип обращения
          <select
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
          >
            <option value="study_certificate">Справка об обучении</option>
            <option value="academic_transcript">Академическая справка</option>
            <option value="other">Другое обращение</option>
          </select>
        </label>

        <label className="request-field">
          Комментарий
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Укажите дополнительную информацию, если она необходима"
            maxLength={1000}
            rows={4}
          />
          <span className="request-counter">{comment.length}/1000</span>
        </label>

        {error && <p className="request-error">{error}</p>}
        {success && (
          <p className="request-success" role="status">
            Заявка успешно отправлена
          </p>
        )}

        <button className="btn btn-primary request-submit" disabled={submitting}>
          {submitting ? 'Отправка...' : 'Отправить заявку'}
        </button>
      </form>
    </section>
  )
}

export default function Requests() {
  const { user } = useAuth()
  const isStaff = user.role === 'staff'

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [requestView, setRequestView] = useState('active')

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await api('/requests')
      setRequests(data.requests ?? [])
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests, reloadKey])

  const activeRequests = requests.filter(
    (item) => !ARCHIVED_STATUSES.includes(item.status),
  )

  const archivedRequests = requests.filter(
    (item) => ARCHIVED_STATUSES.includes(item.status),
  )

  const visibleRequests = isStaff
    ? requestView === 'archive'
      ? archivedRequests
      : activeRequests
    : requests

  const countLabel = visibleRequests.length === 1
    ? 'заявка'
    : visibleRequests.length >= 2 && visibleRequests.length <= 4
      ? 'заявки'
      : 'заявок'

  return (
    <>
      <PageHeader
        title={isStaff ? 'Заявки студентов' : 'Заявки и справки'}
        sub={
          isStaff
            ? 'Входящие обращения и управление их обработкой'
            : 'Заказывайте справки и следите за ходом обработки'
        }
      />

      {!isStaff && <CreateRequest onCreated={loadRequests} />}

      <div className="request-list-heading">
        <div>
          <h2>{isStaff ? 'Рабочий список' : 'Мои заявки'}</h2>
          <p>
            {loading
              ? 'Загружаем список...'
              : `${visibleRequests.length} ${countLabel}`}
          </p>
        </div>

        <button className="btn btn-ghost" onClick={reload} disabled={loading}>
          Обновить
        </button>
      </div>

      {isStaff && (
        <div
          className="request-list-heading"
          role="tablist"
          aria-label="Разделы заявок"
        >
          <button
            type="button"
            role="tab"
            aria-selected={requestView === 'active'}
            className={`btn ${requestView === 'active' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setRequestView('active')}
          >
            Активные ({activeRequests.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={requestView === 'archive'}
            className={`btn ${requestView === 'archive' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setRequestView('archive')}
          >
            Архив ({archivedRequests.length})
          </button>
        </div>
      )}

      {error ? (
        <ErrorBox
          text={
            error.status === 403
              ? 'У вашей роли нет доступа к этому разделу.'
              : 'Не удалось загрузить заявки. Проверьте соединение и повторите.'
          }
          onRetry={reload}
        />
      ) : loading ? (
        <Skeleton blocks={3} />
      ) : visibleRequests.length === 0 ? (
        <EmptyState
          icon="requests"
          title={
            isStaff
              ? requestView === 'archive'
                ? 'Архив пока пуст'
                : 'Активных обращений нет'
              : 'У вас пока нет заявок'
          }
          text={
            isStaff
              ? requestView === 'archive'
                ? 'Здесь будут храниться выполненные и отклонённые заявки.'
                : 'Новые обращения студентов появятся здесь.'
              : 'Создайте первую заявку с помощью формы выше.'
          }
        />
      ) : (
        <div className="request-list">
          {visibleRequests.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              isStaff={isStaff}
              onUpdate={loadRequests}
            />
          ))}
        </div>
      )}
    </>
  )
}