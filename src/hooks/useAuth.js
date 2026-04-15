import { useEffect, useState } from 'react'
import { getCurrentUser, validateSession } from '../lib/auth.js'

export function useAuth() {
  const [user, setUser] = useState(() => getCurrentUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    validateSession().then((nextUser) => {
      if (!mounted) return
      setUser(nextUser)
      setLoading(false)
    })

    const handler = () => setUser(getCurrentUser())
    window.addEventListener('keystone-auth', handler)
    window.addEventListener('storage', handler)

    return () => {
      mounted = false
      window.removeEventListener('keystone-auth', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  return { user, loading, isAuthenticated: !!user }
}
