import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">
        Verifying your account...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}
