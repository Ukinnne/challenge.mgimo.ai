import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import Icon from '../components/Icon.jsx'
import './Notifications.css'

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatEventDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function AnnouncementCard({ item }) {
  const isDeadline = item.category === 'deadline'

  return (
    <article className={`notification-card announcement-card ${isDeadline ? 'deadline-card' : ''}`}>
      <div className="notification-icon">
        <Icon name={isDeadline ? 'clock' : 'bell'} size={21} />
      </div>

      <div className="notification-content">
        <div className="notification-meta">
          <span className={`notification-tag ${isDeadline ? 'tag-deadline' : 'tag-announcement'}`}>
            {isDeadline ? 'Дедлайн' : 'Объявление'}
          </span>

          {item.target_group && (
            <span className="notification-audience">
              {item.target_group}
            </span>
          )}
        </div>

        <h3>{item.title}</h3>
        <p className="notification-body">{item.body}</p>

        {item.event_at && (
          <div className="notification-event">
            <Icon name="clock" size={15} />
            <span>Срок: {formatEventDate(item.event_at)}</span>
          </div>
        )}

        <time className="notification-date">
          {formatDate(item.created_at)}
        </time>
      </div>
    </article>
  )
}

function PersonalNotificationCard({ item, onRead, loading }) {
  const isRead = Boolean(item.read_at || item.is_read)

  return (
    <article className={`notification-card personal-card ${isRead ? 'is-read' : 'is-unread'}`}>
      <div className="notification-icon">
        <Icon name={isRead ? 'check' : 'bell'} size={21} />
      </div>

      <div className="notification-content">
        <div className="notification-meta">
          <span className="notification-tag tag-personal">
            {item.notification_type === 'request_status'
              ? 'Статус заявки'
              : 'Личное уведомление'}
          </span>

          {!isRead && <span className="unread-dot" aria-label="Не прочитано" />}
        </div>

        <h3>{item.title}</h3>
        <p className="notification-body">{item.body}</p>

        <div className="notification-footer">
          <time className="notification-date">
            {formatDate(item.created_at)}
          </time>

          {!isRead && (
            <button
              className="btn-link notification-read"
              type="button"
              disabled={loading}
              onClick={() => onRead(item.id)}
            >
              {loading ? 'Сохраняем...' : 'Отметить прочитанным'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export function AnnouncementForm({ onCreated }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('announcement')
  const [targetGroup, setTargetGroup] = useState('')
  const [eventAt, setEventAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!title.trim() || !body.trim()) {
      setError('Заполни заголовок и текст объявления')
      return
    }

    if (category === 'deadline' && !eventAt) {
      setError('Для дедлайна необходимо указать дату и время')
      return
    }

    setSubmitting(true)

    try {
      await api('/notifications/announcements', {
        method: 'POST',
        body: {
          title: title.trim(),
          body: body.trim(),
          category,
          target_group: targetGroup.trim() || null,
          event_at: category === 'deadline' ? eventAt : null,
        },
      })

      setTitle('')
      setBody('')
      setCategory('announcement')
      setTargetGroup('')
      setEventAt('')

      await onCreated()
    } catch (err) {
      if (err.status === 403) {
        setError('У тебя нет прав для публикации объявлений')
      } else if (err.status === 422 || err.status === 400) {
        setError('Проверь заголовок, текст и дату публикации')
      } else {
        setError('Не удалось опубликовать объявление. Попробуй ещё раз')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel announcement-editor">
      <div className="editor-heading">
        <div>
          <span className="editor-kicker">Для сотрудников</span>
          <h2 className="panel-title">Новое объявление</h2>
        </div>

        <div className="editor-icon">
          <Icon name="bell" size={21} />
        </div>
      </div>

      <form className="announcement-form" onSubmit={handleSubmit}>
        <label className="notification-field">
          <span>Тип публикации</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="announcement">Объявление</option>
            <option value="deadline">Дедлайн</option>
          </select>
        </label>

        <label className="notification-field">
          <span>Заголовок</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например, Изменение расписания"
            maxLength={160}
            required
          />
          <small>{title.length}/160 символов</small>
        </label>

        <label className="notification-field">
          <span>Текст</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Напиши текст объявления..."
            rows={4}
            maxLength={5000}
            required
          />
        </label>

        <label className="notification-field">
          <span>Группа получателей</span>
          <input
            value={targetGroup}
            onChange={(event) => setTargetGroup(event.target.value)}
            placeholder="Оставь пустым для всех"
            maxLength={64}
          />
          <small>
            Если поле пустое, объявление увидят все подходящие пользователи
          </small>
        </label>

        {category === 'deadline' && (
          <label className="notification-field">
            <span>Дата и время дедлайна</span>
            <input
              type="datetime-local"
              value={eventAt}
              onChange={(event) => setEventAt(event.target.value)}
              required
            />
          </label>
        )}

        {error && (
          <p className="notification-form-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Публикуем...' : 'Опубликовать'}
        </button>
      </form>
    </section>
  )
}

export default function Notifications({ user }) {
  const [announcements, setAnnouncements] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [readingId, setReadingId] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)

  const isStaff = user?.role !== 'student'

  const loadNotifications = useCallback(async () => {
    setError('')

    try {
      const data = await api('/notifications')

      setAnnouncements(data.announcements ?? [])
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unread_count ?? 0)
    } catch {
      setError('Не удалось загрузить уведомления')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  async function markAsRead(id) {
    setReadingId(id)

    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' })

      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, read_at: new Date().toISOString(), is_read: true }
            : item
        )
      )

      setUnreadCount((count) => Math.max(0, count - 1))
    } catch {
      setError('Не удалось отметить уведомление прочитанным')
    } finally {
      setReadingId(null)
    }
  }

  async function markAllAsRead() {
    setMarkingAll(true)

    try {
      await api('/notifications/read-all', { method: 'PATCH' })

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read_at: item.read_at || new Date().toISOString(),
          is_read: true,
        }))
      )

      setUnreadCount(0)
    } catch {
      setError('Не удалось отметить уведомления прочитанными')
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="notifications-page">
      <header className="page-head notifications-head">
        <div>
          <span className="notifications-kicker">Личный кабинет</span>
          <h1 className="page-title">Уведомления</h1>
          <p className="page-sub">
            Важные новости, объявления и изменения по твоим заявкам
          </p>
        </div>

        {unreadCount > 0 && (
          <div className="unread-counter">
            <strong>{unreadCount}</strong>
            <span>непрочитанных</span>
          </div>
        )}
      </header>

      {error && (
        <div className="notification-error" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
          <button type="button" onClick={loadNotifications}>
            Повторить
          </button>
        </div>
      )}

      {isStaff && (
        <AnnouncementForm onCreated={loadNotifications} />
      )}

      <section className="notification-section">
        <div className="notification-section-heading">
          <div>
            <span className="section-eyebrow">Новости деканата</span>
            <h2>Объявления</h2>
          </div>

          <span className="section-count">{announcements.length}</span>
        </div>

        {loading ? (
          <div className="notification-list">
            <div className="notification-skeleton" />
            <div className="notification-skeleton" />
          </div>
        ) : announcements.length > 0 ? (
          <div className="notification-list">
            {announcements.map((item) => (
              <AnnouncementCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="notification-empty">
            <div className="notification-empty-icon">
              <Icon name="bell" size={22} />
            </div>
            <h3>Пока нет объявлений</h3>
            <p>Когда появятся новости деканата, они будут здесь</p>
          </div>
        )}
      </section>

      <section className="notification-section personal-section">
        <div className="notification-section-heading">
          <div>
            <span className="section-eyebrow">Только для тебя</span>
            <h2>Личные уведомления</h2>
          </div>

          {unreadCount > 0 && (
            <button
              className="btn-link mark-all-button"
              type="button"
              onClick={markAllAsRead}
              disabled={markingAll}
            >
              {markingAll ? 'Сохраняем...' : 'Прочитать все'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="notification-list">
            <div className="notification-skeleton" />
            <div className="notification-skeleton" />
          </div>
        ) : notifications.length > 0 ? (
          <div className="notification-list">
            {notifications.map((item) => (
              <PersonalNotificationCard
                key={item.id}
                item={item}
                onRead={markAsRead}
                loading={readingId === item.id}
              />
            ))}
          </div>
        ) : (
          <div className="notification-empty">
            <div className="notification-empty-icon">
              <Icon name="check" size={22} />
            </div>
            <h3>Всё спокойно</h3>
            <p>
              Личные уведомления о заявках и изменениях появятся здесь
            </p>
          </div>
        )}
      </section>
    </div>
  )
}