const TOKEN_KEY = 'keystoneToken'

function buildHeaders(headers = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  }
}

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('keystoneToken')
      localStorage.removeItem('keystoneUser')
      window.dispatchEvent(new Event('keystone-auth'))
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    const message = payload?.message || 'Request failed'
    throw new Error(message)
  }

  return payload
}

export const api = {
  get(path) {
    return request(path)
  },
  post(path, body) {
    return request(path, {
      method: 'POST',
      body: JSON.stringify(body || {}),
    })
  },
}
