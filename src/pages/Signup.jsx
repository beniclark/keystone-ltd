import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, User, Mail, Lock, Check } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import Button from '../components/Button.jsx'
import { signup } from '../lib/auth.js'
import { useToast } from '../hooks/useToast.js'

const perks = [
  '$0 account fees, ever',
  'Real advisor included with every account',
  'Investments, retirement, and insurance in one place',
  'Bank-level encryption and SIPC insurance',
]

export default function Signup() {
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agree: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('All fields are required.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!form.agree) {
      setError('Please agree to the terms to continue.')
      return
    }

    setLoading(true)
    try {
      await signup(form.firstName, form.lastName, form.email, form.password)
      toast.success('Account created successfully!')
      navigate('/profile')
    } catch (err) {
      setError(err.message || 'Signup failed')
      toast.error(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] -mt-16 grid lg:grid-cols-2 bg-[var(--color-surface-primary)]">
      <div className="relative hidden lg:flex flex-col bg-navy-900 text-white p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:28px_28px]" />
        <div className="absolute -bottom-20 -right-20 w-[520px] h-[520px] rounded-full bg-brand-emerald/20 blur-[140px]" />
        <div className="relative flex-1 flex flex-col">
          <Logo dark />
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h2 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight">
              Build your<br />
              <span className="text-emerald-400">keystone.</span>
            </h2>
            <ul className="mt-10 space-y-3.5">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-emerald/20 text-emerald-300">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-navy-100/85">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-16 lg:p-12 bg-[var(--color-surface-primary)]">
        <div className="max-w-md w-full mx-auto">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>
          <h1 className="font-display text-4xl font-semibold text-[var(--color-text-primary)] tracking-tight">
            Open your account
          </h1>
          <p className="mt-3 text-[var(--color-text-secondary)]">
            Already a member?{' '}
            <Link to="/login" className="text-brand-emerald-deep font-semibold hover:underline">
              Log in
            </Link>
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <InputField id="first-name" label="First name" icon={<User size={16} className="text-[var(--color-text-muted)]" />} value={form.firstName} onChange={update('firstName')} />
              <InputField id="last-name" label="Last name" icon={<User size={16} className="text-[var(--color-text-muted)]" />} value={form.lastName} onChange={update('lastName')} />
            </div>
            <InputField id="signup-email" label="Email" icon={<Mail size={16} className="text-[var(--color-text-muted)]" />} type="email" value={form.email} onChange={update('email')} />
            <InputField id="signup-password" label="Password" icon={<Lock size={16} className="text-[var(--color-text-muted)]" />} type="password" value={form.password} onChange={update('password')} />
            <InputField id="confirm-password" label="Confirm password" icon={<Lock size={16} className="text-[var(--color-text-muted)]" />} type="password" value={form.confirmPassword} onChange={update('confirmPassword')} />

            <label htmlFor="agree-terms" className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)]">
              <input
                id="agree-terms"
                type="checkbox"
                checked={form.agree}
                onChange={(e) => update('agree')(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--color-border-primary)] text-brand-emerald focus:ring-brand-emerald"
              />
              <span>I agree to Keystone’s Terms of Service and Privacy Policy.</span>
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading || !form.agree}>
              {loading ? 'Creating account...' : 'Create account'} <ArrowRight size={18} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

function InputField({ id, label, icon, type = 'text', value, onChange }) {
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-surface-card)] pl-11 pr-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/20 transition"
        />
      </div>
    </div>
  )
}
