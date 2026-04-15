import { motion as Motion } from 'framer-motion'
import {
  TrendingUp,
  Target,
  ShieldCheck,
  Compass,
  ArrowRight,
  Sparkles,
  Star,
} from 'lucide-react'
import Button from '../components/Button.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { services, stats, steps, testimonials } from '../data/services.js'

const iconMap = { TrendingUp, Target, ShieldCheck, Compass }

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
}

export default function Landing() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden -mt-16 pt-16 bg-navy-900 text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[560px] h-[560px] rounded-full bg-[#10b981]/20 blur-[140px] animate-float-slow" />
          <div className="absolute top-40 right-0 w-[520px] h-[520px] rounded-full bg-[#1f4476]/60 blur-[160px]" />
          <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:32px_32px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-32 md:pt-28 md:pb-40">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <Motion.div
              className="lg:col-span-7"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-primary)]/10 border border-white/15 text-xs font-medium text-emerald-300 mb-6">
                <Sparkles size={14} />
                <span>Now with AI-powered retirement forecasting</span>
              </div>
              <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[0.98] tracking-tight">
                Your money,
                <br />
                <span className="text-emerald-400">working as hard</span>
                <br />
                as you do.
              </h1>
              <p className="mt-8 text-lg md:text-xl text-navy-100/80 max-w-xl leading-relaxed">
                Keystone brings investments, retirement, and insurance into a single plan —
                backed by real advisors and built for the long game.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Button to="/signup" variant="primary" size="lg">
                  Open an account
                  <ArrowRight size={18} />
                </Button>
                <Button to="/services" variant="outlineDark" size="lg">
                  Talk to an advisor
                </Button>
              </div>
              <div className="mt-10 flex items-center gap-4 text-sm text-navy-100/70">
                <div className="flex -space-x-2">
                  {['#10b981', '#f5b700', '#7a95c4', '#34d399'].map((c, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-navy-900"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={14} className="fill-[#f5b700] text-[#f5b700]" />
                  ))}
                  <span className="ml-1.5">Trusted by 2.3M members</span>
                </div>
              </div>
            </Motion.div>

            <Motion.div
              className="lg:col-span-5 relative"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <HeroCard />
            </Motion.div>
          </div>
        </div>

        <div className="relative border-t border-white/10 bg-navy-900/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl md:text-4xl font-semibold text-white">
                  {s.value}
                </div>
                <div className="text-xs uppercase tracking-[0.14em] text-navy-100/60 mt-1.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-24 md:py-32 bg-[var(--color-surface-primary)]">
        <div className="max-w-7xl mx-auto px-6">
          <Motion.div {...fadeUp}>
            <SectionHeading
              eyebrow="What we do"
              title="One membership. Every part of your financial life."
              description="Invest, retire, and protect your family with a single plan and a real advisor — no spreadsheet gymnastics required."
            />
          </Motion.div>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((svc, i) => {
              const Icon = iconMap[svc.icon] || TrendingUp
              return (
                <Motion.div
                  key={svc.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative p-7 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-surface-primary)] hover:border-navy-300 hover:shadow-[0_20px_60px_-20px_rgba(10,37,64,0.25)] transition-all duration-300"
                >
                  <div className="h-12 w-12 rounded-xl bg-navy-50 text-[var(--color-text-primary)] flex items-center justify-center mb-6 group-hover:bg-[#10b981] group-hover:text-white transition-colors">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
                    {svc.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {svc.description}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#047857] group-hover:gap-2.5 transition-all">
                    Learn more <ArrowRight size={14} />
                  </div>
                </Motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 md:py-32 bg-navy-50/50 border-y border-[var(--color-border-primary)]/70">
        <div className="max-w-7xl mx-auto px-6">
          <Motion.div {...fadeUp} className="text-center mx-auto">
            <SectionHeading
              center
              eyebrow="How it works"
              title="From signup to plan in under 10 minutes."
              description="A real advisor, a real plan — without the four-hour office visit."
            />
          </Motion.div>
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <Motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                className="relative p-8 rounded-2xl bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)]"
              >
                <div className="font-display text-6xl font-semibold text-[#10b981]/20 leading-none">
                  {step.number}
                </div>
                <h3 className="mt-4 font-display text-2xl font-semibold text-[var(--color-text-primary)]">
                  {step.title}
                </h3>
                <p className="mt-3 text-[var(--color-text-secondary)] leading-relaxed">{step.description}</p>
              </Motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 md:py-32 bg-[var(--color-surface-primary)]">
        <div className="max-w-7xl mx-auto px-6">
          <Motion.div {...fadeUp}>
            <SectionHeading
              eyebrow="Members"
              title="The advice people wish they’d had sooner."
            />
          </Motion.div>
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Motion.blockquote
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className="p-8 rounded-2xl bg-navy-50/60 border border-[var(--color-border-primary)]"
              >
                <div className="flex items-center gap-1 text-[#f5b700] mb-5">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} size={15} className="fill-[#f5b700]" />
                  ))}
                </div>
                <p className="font-display text-lg text-[var(--color-text-primary)] leading-snug">
                  “{t.quote}”
                </p>
                <footer className="mt-6 flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{
                      background: `linear-gradient(135deg, #10b981, #0a2540)`,
                    }}
                  >
                    {t.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--color-text-primary)] text-sm">{t.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{t.role}</div>
                  </div>
                </footer>
              </Motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="pb-24 md:pb-32 bg-[var(--color-surface-primary)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#047857] via-[#10b981] to-[#34d399] p-12 md:p-20">
            <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:24px_24px]" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="max-w-xl">
                <h3 className="font-display text-4xl md:text-5xl font-semibold text-white leading-tight">
                  Ready to build your keystone?
                </h3>
                <p className="mt-4 text-white/90 text-lg">
                  Open your account in under four minutes. No paperwork, no hidden fees.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button to="/signup" variant="light" size="lg">
                  Open an account
                  <ArrowRight size={18} />
                </Button>
                <Button to="/services" variant="outlineDark" size="lg">
                  Explore services
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function HeroCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-gradient-to-br from-[#10b981]/30 to-transparent rounded-[32px] blur-2xl" />
      <div className="relative bg-[var(--color-surface-primary)]/[0.04] backdrop-blur-xl border border-white/15 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-navy-100/60">
              Net worth
            </div>
            <div className="font-display text-3xl font-semibold text-white mt-1">
              $1,284,560
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-medium">
            <TrendingUp size={12} />
            +2.4%
          </div>
        </div>

        <div className="h-28 mb-6 flex items-end gap-1.5">
          {[38, 52, 44, 68, 60, 78, 72, 88, 82, 96, 90, 100].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-500/50 to-emerald-400"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        <div className="space-y-3">
          {[
            { label: 'Brokerage', amount: '$184,220', tone: 'emerald' },
            { label: '401(k)', amount: '$612,305', tone: 'navy' },
            { label: 'Term Life', amount: '$750K cover', tone: 'gold' },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--color-surface-primary)]/[0.04] border border-white/10"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    background:
                      row.tone === 'emerald'
                        ? '#10b981'
                        : row.tone === 'gold'
                        ? '#f5b700'
                        : '#7a95c4',
                  }}
                />
                <span className="text-sm text-navy-100/80">{row.label}</span>
              </div>
              <span className="text-sm font-semibold text-white">{row.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
