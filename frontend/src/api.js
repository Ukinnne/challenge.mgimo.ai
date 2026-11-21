export async function api(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw Object.assign(new Error('network'), { status: 0 })
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    throw Object.assign(new Error(data?.error || 'error'), { status: response.status, data })
  }
  return data
}