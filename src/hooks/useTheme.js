import { useEffect, useState } from 'react'

const KEY = 'keystoneTheme'

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialTheme() {
  const stored = localStorage.getItem(KEY)
  if (stored === 'dark' || stored === 'light') {
    return stored
  }
  return getSystemTheme()
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(KEY, theme)
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event) => {
      const saved = localStorage.getItem(KEY)
      if (!saved) {
        setTheme(event.matches ? 'dark' : 'light')
      }
    }

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
