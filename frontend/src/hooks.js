import { useEffect, useState } from 'react'
import { api } from './api.js'

// Запрашивает данные у сервера. Если path пустой, ничего не делает.
export function useFetch(path) {
  const [tick, setTick] = useState(0)
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) })

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false })
      return undefined
    }
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    api(path)
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }))
    return () => {
      cancelled = true
    }
  }, [path, tick])

  return { ...state, reload: () => setTick((n) => n + 1) }
}