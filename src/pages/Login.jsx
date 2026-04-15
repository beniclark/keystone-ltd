import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import Button from '../components/Button.jsx'
import { login } from '../lib/auth.js'
import { useToast } from '../hooks/useToast.js'

const DEMO_EMAIL = 'demo@keystone.com'
const DEMO_PASSWORD = 'demo123'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      const dest = location.state?.from || '/profile'
      navigate(dest)
    } catch (err) {
      setError(err.message || 'Login failed')
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] -mt-16 grid lg:grid-cols-2 bg-[var(--color-surface-primary)]">
      <div className="relative hidden lg:flex flex-col bg-navy-900 text-white p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:28px_28px]" />
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-brand-emerald/20 blur-[140px]" />
        <div className="relative flex-1 flex flex-col">
          <Logo dark />
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h2 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight">Welcome back.</h2>
            <p className="mt-6 text-lg text-navy-100/80 leading-relaxed">
              Your advisor, your accounts, and your coverage — all in one place.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-16 lg:p-12 bg-[var(--color-surface-primary)]">
        <div className="max-w-md w-full mx-auto">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>
          <h1 className="font-display text-4xl font-semibold text-[var(--color-text-primary)] tracking-tight">
            Log in to Keystone
          </h1>
          <p className="mt-3 text-[var(--color-text-secondary)]">
            Don’t have an account?{' '}
            <Link to="/signup" className="text-brand-emerald-deep font-semibold hover:underline">
              Open one in 4 minutes
            </Link>
          </p>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">Demo credentials: demo@keystone.com / demo123</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
            <InputField
              id="login-email"
              label="Email"
              icon={<Mail size={16} className="text-[var(--color-text-muted)]" />}
              type="email"
              value={email}
              onChange={setEmail}
              autoFocus
            />
            <InputField
              id="login-password"
              label="Password"
              icon={<Lock size={16} className="text-[var(--color-text-muted)]" />}
              type="password"
              value={password}
              onChange={setPassword}
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'} <ArrowRight size={18} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

function InputField({ id, label, icon, type = 'text', value, onChange, autoFocus }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</span>
        <input
          id={id}
          type={type}
          required
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-surface-card)] pl-11 pr-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/20 transition"
        />
      </div>
    </div>
  )
}
