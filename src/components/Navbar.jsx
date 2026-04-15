import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Menu, X, Sun, Moon } from 'lucide-react'
import Logo from './Logo.jsx'
import Button from './Button.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { logout } from '../lib/auth.js'
import { useThemeContext } from '../hooks/useThemeContext.js'
import { useToast } from '../hooks/useToast.js'

const navItems = [
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const { isAuthenticated, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isDark, toggleTheme } = useThemeContext()
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    toast.info('Logged out successfully')
    setOpen(false)
    navigate('/')
  }

  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[color-mix(in_oklab,var(--color-surface-primary)_90%,transparent)] backdrop-blur-md border-b border-[var(--color-border-primary)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  isActive
                    ? 'text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {themeButton}
          {isAuthenticated ? (
            <>
              <span className="text-sm text-[var(--color-text-muted)] mr-2">Hi, {user?.firstName}</span>
              <Button to="/profile" variant="ghost" size="sm">
                Profile
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm">
                Log in
              </Button>
              <Button to="/signup" variant="primary" size="sm">
                Open an account
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden p-2 text-[var(--color-text-primary)]"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle navigation menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[var(--color-surface-primary)] border-t border-[var(--color-border-primary)]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
            <div className="pb-2">{themeButton}</div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-base font-medium text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-surface-secondary)]"
              >
                {item.label}
              </NavLink>
            ))}
            <div className="h-px bg-[var(--color-border-primary)] my-2" />
            {isAuthenticated ? (
              <>
                <Button to="/profile" variant="outline" size="md" onClick={() => setOpen(false)}>
                  Profile
                </Button>
                <Button onClick={handleLogout} variant="primary" size="md">
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button to="/login" variant="outline" size="md" onClick={() => setOpen(false)}>
                  Log in
                </Button>
                <Button to="/signup" variant="primary" size="md" onClick={() => setOpen(false)}>
                  Open an account
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
