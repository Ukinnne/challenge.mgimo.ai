import { Component } from 'react'
import Icon from './Icon.jsx'

export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('Ошибка интерфейса:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="splash">
        <div className="panel empty" role="alert">
          <span className="empty-ico"><Icon name="alert" size={30} /></span>
          <h2>Что-то пошло не так</h2>
          <p>Страница не смогла открыться. Обновите её, а если не поможет, выйдите и войдите снова.</p>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>
            Обновить страницу
          </button>
        </div>
      </div>
    )
  }
}