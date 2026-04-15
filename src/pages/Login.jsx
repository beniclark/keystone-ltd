import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import Button from '../components/Button.jsx'
import { login } from '../lib/auth.js'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('alex.morgan@example.com')
  const [password, setPassword] = useState('demo1234')

  const onSubmit = (e) => {
    e.preventDefault()
    login(email)
    const dest = location.state?.from || '/profile'
    navigate(dest)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] -mt-16 grid lg:grid-cols-2">
      {/* BRAND SIDE */}
      <div className="relative hidden lg:flex flex-col bg-navy-900 text-white p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:28px_28px]" />
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-[#10b981]/20 blur-[140px]" />
        <div className="relative flex-1 flex flex-col">
          <Logo dark />
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h2 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight">
              Welcome back.
            </h2>
            <p className="mt-6 text-lg text-navy-100/80 leading-relaxed">
              Your advisor, your accounts, and your coverage — all in one place.
            </p>
            <blockquote className="mt-12 p-6 rounded-2xl bg-white/[0.04] border border-white/10">
              <p className="text-navy-100/90 leading-relaxed">
                “I finally feel like I know what’s actually going on with my money.”
              </p>
              <footer className="mt-4 text-sm text-navy-100/60">
                — Priya S., member since 2021
              </footer>
            </blockquote>
          </div>
          <p className="text-xs text-navy-100/50">
            © 2026 Keystone Financial Group, Inc.
          </p>
        </div>
      </div>

      {/* FORM SIDE */}
      <div className="flex flex-col justify-center px-6 py-16 lg:p-12 bg-white">
        <div className="max-w-md w-full mx-auto">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>
          <h1 className="font-display text-4xl font-semibold text-navy-800 tracking-tight">
            Log in to Keystone
          </h1>
          <p className="mt-3 text-slate-600">
            Don’t have an account?{' '}
            <Link to="/signup" className="text-[#047857] font-semibold hover:underline">
              Open one in 4 minutes
            </Link>
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <InputField
              label="Email"
              icon={Mail}
              type="email"
              value={email}
              onChange={setEmail}
              autoFocus
            />
            <InputField
              label="Password"
              icon={Lock}
              type="password"
              value={password}
              onChange={setPassword}
            />
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-[#10b981] focus:ring-[#10b981]"
                  defaultChecked
                />
                Remember me
              </label>
              <a href="#" className="text-[#047857] font-medium hover:underline">
                Forgot password?
              </a>
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full">
              Log in <ArrowRight size={18} />
            </Button>
          </form>

          <p className="mt-8 text-xs text-slate-500 text-center">
            Demo notice: any credentials will log you in.
          </p>
        </div>
      </div>
    </div>
  )
}

function InputField({ label, icon: Icon, type = 'text', value, onChange, autoFocus }) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-800 mb-1.5">{label}</label>
      <div className="relative">
        <Icon
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type={type}
          required
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition"
        />
      </div>
    </div>
  )
}
