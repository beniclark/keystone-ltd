import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  login,
  signup,
  logout,
  getCurrentUser,
  isAuthenticated,
  defaultMockUser,
} from '../auth.js'

describe('Auth Library', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('stores user in localStorage', () => {
      const email = 'test@example.com'
      login(email)
      const stored = localStorage.getItem('keystoneUser')
      expect(stored).toBeTruthy()
      const user = JSON.parse(stored)
      expect(user.email).toBe(email)
    })

    it('uses default email if none provided', () => {
      login()
      const user = getCurrentUser()
      expect(user.email).toBe(defaultMockUser.email)
    })

    it('dispatches keystone-auth event', () => {
      const eventSpy = vi.spyOn(window, 'dispatchEvent')
      login('test@example.com')
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'keystone-auth',
        })
      )
    })

    it('returns the user object', () => {
      const result = login('user@test.com')
      expect(result).toHaveProperty('email', 'user@test.com')
      expect(result).toHaveProperty('firstName')
      expect(result).toHaveProperty('lastName')
    })
  })

  describe('signup', () => {
    it('stores user with custom details', () => {
      const user = signup('Jane', 'Doe', 'jane@example.com')
      expect(user.firstName).toBe('Jane')
      expect(user.lastName).toBe('Doe')
      expect(user.email).toBe('jane@example.com')
    })

    it('uses defaults for missing fields', () => {
      const user = signup()
      expect(user.firstName).toBe(defaultMockUser.firstName)
      expect(user.email).toBe(defaultMockUser.email)
    })

    it('dispatches keystone-auth event', () => {
      const eventSpy = vi.spyOn(window, 'dispatchEvent')
      signup('Test', 'User', 'test@example.com')
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'keystone-auth',
        })
      )
    })
  })

  describe('logout', () => {
    it('removes user from localStorage', () => {
      login('test@example.com')
      expect(localStorage.getItem('keystoneUser')).toBeTruthy()
      logout()
      expect(localStorage.getItem('keystoneUser')).toBeNull()
    })

    it('dispatches keystone-auth event', () => {
      login('test@example.com')
      const eventSpy = vi.spyOn(window, 'dispatchEvent')
      logout()
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'keystone-auth',
        })
      )
    })
  })

  describe('getCurrentUser', () => {
    it('returns null when no user stored', () => {
      expect(getCurrentUser()).toBeNull()
    })

    it('returns parsed user when stored', () => {
      login('stored@example.com')
      const user = getCurrentUser()
      expect(user).toBeTruthy()
      expect(user.email).toBe('stored@example.com')
    })

    it('returns null on JSON parse error', () => {
      localStorage.setItem('keystoneUser', 'invalid-json')
      expect(getCurrentUser()).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('returns false when no user', () => {
      expect(isAuthenticated()).toBe(false)
    })

    it('returns true when user is logged in', () => {
      login('auth@example.com')
      expect(isAuthenticated()).toBe(true)
    })
  })

  describe('custom event integration', () => {
    it('allows external listeners to detect auth changes', () => {
      const listener = vi.fn()
      window.addEventListener('keystone-auth', listener)

      login('event@example.com')
      expect(listener).toHaveBeenCalledTimes(1)

      logout()
      expect(listener).toHaveBeenCalledTimes(2)

      window.removeEventListener('keystone-auth', listener)
    })
  })
})
