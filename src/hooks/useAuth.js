import { useEffect, useState } from 'react'
import { getCurrentUser } from '../lib/auth.js'

export function useAuth() {
  const [user, setUser] = useState(() => getCurrentUser())

  useEffect(() => {
    const handler = () => setUser(getCurrentUser())
    window.addEventListener('keystone-auth', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('keystone-auth', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  return { user, isAuthenticated: !!user }
}
