
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import Icon from '../components/Icon.jsx'
import './Notifications.css'
import './NotificationsEnhancements.css'

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

function getApiError(err, fallback) {
  const detail = err?.data?.detail

  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).filter(Boolean).join('. ')
  }

  return fallback
}

function notifyCountChanged() {
  window.dispatchEvent(new Event('notifications:updated'))
}

function isPersonalRead(item) {
  return Boolean(item.read_at || item.is_read)
}

function matchesFilter(item, filter, personal = false) {
  const isRead = personal ? isPersonalRead(item) : Boolean(item.is_read)

  if (filter === 'unread') return !isRead
  if (filter === 'archive') return isRead

  return true
}

export function AnnouncementCard({
  item,
  isStaff = false,
  onRead,
  onDelete,
  reading = false,
  deleting = false,
}) {
  const isDeadline = item.category === 'deadline'
  const isRead = Boolean(item.is_read)

  return (
    <article
      className={[
        'notification-card',
        'announcement-card',
        isDeadline ? 'deadline-card' : '',
        !isStaff && isRead ? 'is-read' : '',
        !isStaff && !isRead ? 'is-unread' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="notification-icon">
        <Icon name={isDeadline ? 'clock' : 'bell'} size={21} />
      </div>

      <div className="notification-content">
        <div className="notification-meta">
          <span className={`notification-tag ${isDeadline ? 'tag-deadline' : 'tag-announcement'}`}>
            {isDeadline ? 'Дедлайн' : 'Объявление'}
          </span>

          {item.target_group ? (
            <span className="notification-audience">
              Группа: {item.target_group}
            </span>
          ) : (
            <span className="notification-audience">Все студенты</span>
          )}

          {!isStaff && !isRead && (
            <span className="unread-dot" aria-label="Не прочитано" />
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

        <div className="notification-footer">
          <time className="notification-date">
            {formatDate(item.created_at)}
          </time>

          <div className="notification-actions">
            {!isStaff && !isRead && (
              <button
                className="btn-link notification-read"
                type="button"
                disabled={reading}
                onClick={() => onRead?.(item.id)}
              >
                {reading ? 'Сохраняем...' : 'Отметить прочитанным'}
              </button>
            )}

            {!isStaff && isRead && (
              <span className="notification-read-status">
                <Icon name="check" size={14} />
                Прочитано
              </span>
            )}

            {isStaff && (
              <button
                className="btn-link notification-delete"
                type="button"
                disabled={deleting}
                onClick={() => onDelete?.(item)}
              >
                {deleting ? 'Удаляем...' : 'Удалить'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function PersonalNotificationCard({ item, onRead, loading }) {
  const isRead = isPersonalRead(item)

  return (
    <article
      className={[
        'notification-card',
        'personal-card',
        isRead ? 'is-read' : 'is-unread',
      ].join(' ')}
    >
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

          {!isRead && (
            <span className="unread-dot" aria-label="Не прочитано" />
          )}
        </div>

        <h3>{item.title}</h3>
        <p className="notification-body">{item.body}</p>

        <div className="notification-footer">
          <time className="notification-date">
            {formatDate(item.created_at)}
          </time>

          {!isRead ? (
            <button
              className="btn-link notification-read"
              type="button"
              disabled={loading}
              onClick={() => onRead(item.id)}
            >
              {loading ? 'Сохраняем...' : 'Прочитано'}
            </button>
          ) : (
            <span className="notification-read-status">
              <Icon name="check" size={14} />
              Прочитано
            </span>
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
  const [groups, setGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [groupsError, setGroupsError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadGroups() {
      try {
        const data = await api('/notifications/groups')

        if (active) {
          setGroups(data.groups ?? [])
          setGroupsError('')
        }
      } catch {
        if (active) {
          setGroupsError('Не удалось загрузить список групп')
        }
      } finally {
        if (active) setGroupsLoading(false)
      }
    }

    loadGroups()

    return () => {
      active = false
    }
  }, [])

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
          target_group: targetGroup || null,
          event_at: category === 'deadline' ? eventAt : null,
        },
      })

      setTitle('')
      setBody('')
      setCategory('announcement')
      setTargetGroup('')
      setEventAt('')

      await onCreated?.()
      notifyCountChanged()
    } catch (err) {
      setError(
        getApiError(
          err,
          'Не удалось опубликовать объявление. Попробуй ещё раз',
        ),
      )
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
            placeholder="Например, Важно"
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
          <small>{body.length}/5000 символов</small>
        </label>

        <label className="notification-field">
          <span>Кому показывать</span>
          <select
            value={targetGroup}
            onChange={(event) => setTargetGroup(event.target.value)}
            disabled={groupsLoading || Boolean(groupsError)}
          >
            <option value="">Всем студентам</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>

          <small>
            {groupsLoading
              ? 'Загружаем группы...'
              : groupsError
                ? groupsError
                : 'Можно выбрать одну группу или отправить объявление всем'}
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
  const [deletingId, setDeletingId] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [filter, setFilter] = useState('all')

  const isStaff = user?.role === 'staff'

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

  const visibleAnnouncements = useMemo(
    () => isStaff
      ? announcements
      : announcements.filter((item) => matchesFilter(item, filter)),
    [announcements, filter, isStaff],
  )

  const visibleNotifications = useMemo(
    () => notifications.filter(
      (item) => matchesFilter(item, filter, true),
    ),
    [notifications, filter],
  )

  const unreadAnnouncements = announcements.filter(
    (item) => !item.is_read,
  ).length

  const unreadPersonal = notifications.filter(
    (item) => !isPersonalRead(item),
  ).length

  async function markAnnouncementRead(id) {
    setReadingId(id)

    try {
      await api(`/notifications/announcements/${id}/read`, {
        method: 'PATCH',
      })

      setAnnouncements((current) =>
        current.map((item) =>
          item.id === id ? { ...item, is_read: true } : item,
        ),
      )

      setUnreadCount((count) => Math.max(0, count - 1))
      notifyCountChanged()
    } catch (err) {
      setError(getApiError(err, 'Не удалось отметить объявление прочитанным'))
    } finally {
      setReadingId(null)
    }
  }

  async function markNotificationRead(id) {
    setReadingId(id)

    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' })

      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, read_at: new Date().toISOString(), is_read: true }
            : item,
        ),
      )

      setUnreadCount((count) => Math.max(0, count - 1))
      notifyCountChanged()
    } catch (err) {
      setError(getApiError(err, 'Не удалось отметить уведомление прочитанным'))
    } finally {
      setReadingId(null)
    }
  }

  async function deleteAnnouncement(item) {
    const confirmed = window.confirm(
      `Удалить объявление «${item.title}»? Оно исчезнет у всех получателей.`,
    )

    if (!confirmed) return

    setDeletingId(item.id)
    setError('')

    try {
      await api(`/notifications/announcements/${item.id}`, {
        method: 'DELETE',
      })

      setAnnouncements((current) =>
        current.filter((announcement) => announcement.id !== item.id),
      )

      await loadNotifications()
      notifyCountChanged()
    } catch (err) {
      setError(getApiError(err, 'Не удалось удалить объявление'))
    } finally {
      setDeletingId(null)
    }
  }

  async function markAllAsRead() {
    setMarkingAll(true)
    setError('')

    try {
      await api('/notifications/read-all', { method: 'PATCH' })

      setAnnouncements((current) =>
        current.map((item) => ({ ...item, is_read: true })),
      )

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read_at: item.read_at || new Date().toISOString(),
          is_read: true,
        })),
      )

      setUnreadCount(0)
      setFilter('archive')
      notifyCountChanged()
    } catch (err) {
      setError(getApiError(err, 'Не удалось отметить уведомления прочитанными'))
    } finally {
      setMarkingAll(false)
    }
  }

  const filterOptions = [
    { value: 'unread', label: 'Непрочитанные', count: unreadCount },
    { value: 'all', label: 'Все', count: announcements.length + notifications.length },
    { value: 'archive', label: 'Архив', count: announcements.length - unreadAnnouncements + notifications.length - unreadPersonal },
  ]

  const hasVisibleItems = visibleAnnouncements.length + visibleNotifications.length > 0

  return (
    <div className="notifications-page">
      <header className="page-head notifications-head">
        <div>
          <span className="notifications-kicker">
            {isStaff ? 'Рабочее пространство' : 'Личный кабинет'}
          </span>
          <h1 className="page-title">
            {isStaff ? 'Объявления' : 'Уведомления'}
          </h1>
          <p className="page-sub">
            {isStaff
              ? 'Публикуйте новости и управляйте объявлениями для студентов'
              : 'Новости деканата, дедлайны и изменения по твоим заявкам'}
          </p>
        </div>

        {unreadCount > 0 && (
          <div className="unread-counter">
            <strong>{unreadCount > 99 ? '99+' : unreadCount}</strong>
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

      {!isStaff && (
        <div className="notification-toolbar">
          <div className="notification-filters" role="group" aria-label="Фильтр уведомлений">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`notification-filter ${filter === option.value ? 'is-active' : ''}`}
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
                <span>{option.count}</span>
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              className="btn btn-primary notification-mark-all"
              type="button"
              onClick={markAllAsRead}
              disabled={markingAll}
            >
              <Icon name="check" size={16} />
              {markingAll ? 'Сохраняем...' : 'Прочитать все'}
            </button>
          )}
        </div>
      )}

      <section className="notification-section">
        <div className="notification-section-heading">
          <div>
            <span className="section-eyebrow">
              {isStaff ? 'Опубликовано' : 'Новости деканата'}
            </span>
            <h2>{isStaff ? 'Управление объявлениями' : 'Объявления'}</h2>
          </div>

          <span className="section-count">
            {isStaff ? announcements.length : visibleAnnouncements.length}
          </span>
        </div>

        {loading ? (
          <div className="notification-list">
            <div className="notification-skeleton" />
            <div className="notification-skeleton" />
          </div>
        ) : visibleAnnouncements.length > 0 ? (
          <div className="notification-list">
            {visibleAnnouncements.map((item) => (
              <AnnouncementCard
                key={item.id}
                item={item}
                isStaff={isStaff}
                onRead={markAnnouncementRead}
                onDelete={deleteAnnouncement}
                reading={readingId === item.id}
                deleting={deletingId === item.id}
              />
            ))}
          </div>
        ) : (
          <div className="notification-empty">
            <div className="notification-empty-icon">
              <Icon name={filter === 'archive' ? 'archive' : 'bell'} size={22} />
            </div>
            <h3>
              {filter === 'archive'
                ? 'Архив объявлений пуст'
                : filter === 'unread'
                  ? 'Непрочитанных объявлений нет'
                  : 'Пока нет объявлений'}
            </h3>
            <p>
              {filter === 'archive'
                ? 'Прочитанные новости деканата будут храниться здесь'
                : 'Когда появятся новости деканата, они будут здесь'}
            </p>
          </div>
        )}
      </section>

      {!isStaff && (
        <section className="notification-section personal-section">
          <div className="notification-section-heading">
            <div>
              <span className="section-eyebrow">Только для тебя</span>
              <h2>Личные уведомления</h2>
            </div>

            <span className="section-count">
              {visibleNotifications.length}
            </span>
          </div>

          {loading ? (
            <div className="notification-list">
              <div className="notification-skeleton" />
              <div className="notification-skeleton" />
            </div>
          ) : visibleNotifications.length > 0 ? (
            <div className="notification-list">
              {visibleNotifications.map((item) => (
                <PersonalNotificationCard
                  key={item.id}
                  item={item}
                  onRead={markNotificationRead}
                  loading={readingId === item.id}
                />
              ))}
            </div>
          ) : (
            <div className="notification-empty">
              <div className="notification-empty-icon">
                <Icon name={filter === 'archive' ? 'archive' : 'check'} size={22} />
              </div>
              <h3>
                {filter === 'archive'
                  ? 'Архив личных уведомлений пуст'
                  : filter === 'unread'
                    ? 'Непрочитанных личных уведомлений нет'
                    : 'Личных уведомлений пока нет'}
              </h3>
              <p>
                Личные уведомления о заявках и изменениях появятся здесь
              </p>
            </div>
          )}
        </section>
      )}

      {!isStaff && !loading && !hasVisibleItems && (
        <p className="notification-hint">
          Переключи фильтр, чтобы посмотреть другие уведомления
        </p>
      )}
    </div>
  )
}
