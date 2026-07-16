import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Logo from './Logo.jsx'
import Button from './Button.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { logout } from '../lib/auth.js'

const navItems = [
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/options', label: 'Options' },
]

export default function Navbar() {
  const { isAuthenticated, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/70'
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
                    ? 'text-navy-800 bg-navy-50'
                    : 'text-slate-600 hover:text-navy-800 hover:bg-navy-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-slate-500 mr-2">
                Hi, {user?.firstName}
              </span>
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
          className="md:hidden p-2 text-navy-800"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-base font-medium text-slate-700 rounded-lg hover:bg-navy-50"
              >
                {item.label}
              </NavLink>
            ))}
            <div className="h-px bg-slate-200 my-2" />
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
