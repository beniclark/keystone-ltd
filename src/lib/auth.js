import { api } from './api.js'

const USER_KEY = 'keystoneUser'
const TOKEN_KEY = 'keystoneToken'

function persistAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  window.dispatchEvent(new Event('keystone-auth'))
  return user
}

export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password })
  return persistAuth(response.token, response.user)
}

export async function signup(firstName, lastName, email, password) {
  const response = await api.post('/auth/signup', { firstName, lastName, email, password })
  return persistAuth(response.token, response.user)
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.dispatchEvent(new Event('keystone-auth'))
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function validateSession() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    return null
  }

  try {
    const response = await api.get('/auth/me')
    localStorage.setItem(USER_KEY, JSON.stringify(response.user))
    return response.user
  } catch {
    logout()
    return null
  }
}
