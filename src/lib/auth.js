const KEY = 'keystoneUser'

export const defaultMockUser = {
  firstName: 'Alex',
  lastName: 'Morgan',
  email: 'alex.morgan@example.com',
  memberSince: '2019',
}

export function login(email) {
  const user = { ...defaultMockUser, email: email || defaultMockUser.email }
  localStorage.setItem(KEY, JSON.stringify(user))
  window.dispatchEvent(new Event('keystone-auth'))
  return user
}

export function signup(firstName, lastName, email) {
  const user = {
    ...defaultMockUser,
    firstName: firstName || defaultMockUser.firstName,
    lastName: lastName || defaultMockUser.lastName,
    email: email || defaultMockUser.email,
  }
  localStorage.setItem(KEY, JSON.stringify(user))
  window.dispatchEvent(new Event('keystone-auth'))
  return user
}

export function logout() {
  localStorage.removeItem(KEY)
  window.dispatchEvent(new Event('keystone-auth'))
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return !!getCurrentUser()
}
