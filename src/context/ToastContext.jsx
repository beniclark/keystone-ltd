import { useCallback, useMemo, useRef, useState } from 'react'
import Toast from '../components/Toast.jsx'
import { ToastContext } from './toastContext.js'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismissToast = useCallback((id) => {
    const timeoutId = timers.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (message, type = 'info', timeout = 3500) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, message, type }])
      const timeoutId = setTimeout(() => dismissToast(id), timeout)
      timers.current.set(id, timeoutId)
    },
    [dismissToast],
  )

  const value = useMemo(
    () => ({
      success: (message, timeout) => addToast(message, 'success', timeout),
      error: (message, timeout) => addToast(message, 'error', timeout),
      info: (message, timeout) => addToast(message, 'info', timeout),
    }),
    [addToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}
