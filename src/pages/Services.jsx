import { motion as Motion } from 'framer-motion'
import {
  TrendingUp,
  Target,
  ShieldCheck,
  Compass,
  Check,
  ArrowRight,
} from 'lucide-react'
import Button from '../components/Button.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { services } from '../data/services.js'

const iconMap = { TrendingUp, Target, ShieldCheck, Compass }

const comparisonRows = [
  {
    feature: 'Contribution limit (2026)',
    brokerage: 'Unlimited',
    tradIra: '$7,500',
    rothIra: '$7,500',
    k401: '$24,000',
  },
  {
    feature: 'Tax treatment',
    brokerage: 'Taxable',
    tradIra: 'Tax-deferred',
    rothIra: 'Tax-free growth',
    k401: 'Pre-tax or Roth',
  },
  {
    feature: 'Early withdrawal',
    brokerage: 'Any time',
    tradIra: '10% penalty < 59½',
    rothIra: 'Contributions any time',
    k401: '10% penalty < 59½',
  },
  {
    feature: 'Employer match',
    brokerage: '—',
    tradIra: '—',
    rothIra: '—',
    k401: 'Up to 6%',
  },
  {
    feature: 'Required distributions',
    brokerage: 'None',
    tradIra: 'Starting age 73',
    rothIra: 'None',
    k401: 'Starting age 73',
  },
]

export default function Services() {
  return (
    <>
      {/* HERO */}
      <section className="relative -mt-16 pt-16 bg-navy-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:32px_32px]" />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300 mb-5">
              Services
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-semibold leading-[1.02] tracking-tight">
              Everything you need, nothing you don’t.
            </h1>
            <p className="mt-6 text-lg text-navy-100/80 leading-relaxed">
              Four services, one plan. Built to work together so you aren’t stitching your
              financial life from six different apps.
            </p>
          </div>
        </div>
      </section>

      {/* SERVICE DEEP-DIVES */}
      <section className="py-24 bg-[var(--color-surface-primary)]">
        <div className="max-w-7xl mx-auto px-6 space-y-24">
          {services.map((svc, i) => {
            const Icon = iconMap[svc.icon] || TrendingUp
            const reverse = i % 2 === 1
            return (
              <Motion.div
                key={svc.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6 }}
                className={`grid md:grid-cols-12 gap-10 items-center ${
                  reverse ? 'md:[&>*:first-child]:order-last' : ''
                }`}
              >
                <div className="md:col-span-7">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-[var(--color-text-primary)] mb-5">
                    <Icon size={22} />
                  </div>
                  <h2 className="font-display text-4xl md:text-5xl font-semibold text-[var(--color-text-primary)] tracking-tight">
                    {svc.title}
                  </h2>
                  <p className="mt-5 text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                    {svc.description}
                  </p>
                  <ul className="mt-8 space-y-3">
                    {svc.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981]/15 text-[#047857]">
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <span className="text-slate-700">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Button to="/signup" variant="dark" size="md">
                      Get started <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-5">
                  <div className="relative aspect-[4/3] rounded-3xl bg-gradient-to-br from-navy-50 via-navy-100 to-white border border-[var(--color-border-primary)] p-8 overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-[#10b981]/15 blur-3xl" />
                    <div className="relative h-full flex flex-col justify-between">
                      <Icon size={56} className="text-[var(--color-text-primary)]/80" strokeWidth={1.4} />
                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] text-navy-500/70">
                          Included
                        </div>
                        <div className="font-display text-2xl font-semibold text-[var(--color-text-primary)] mt-2 leading-snug">
                          {svc.bullets[0]}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Motion.div>
            )
          })}
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="py-24 bg-navy-50/60 border-y border-[var(--color-border-primary)]/70">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            center
            eyebrow="Choose your account"
            title="Compare your options side by side."
            description="A quick look at how our most popular accounts stack up. An advisor can help you pick the right mix."
          />
          <div className="mt-14 overflow-x-auto rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-surface-primary)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-navy-800 text-white">
                  <th className="px-6 py-5 font-semibold text-xs uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-6 py-5 font-semibold text-xs uppercase tracking-wider">
                    Brokerage
                  </th>
                  <th className="px-6 py-5 font-semibold text-xs uppercase tracking-wider">
                    Traditional IRA
                  </th>
                  <th className="px-6 py-5 font-semibold text-xs uppercase tracking-wider bg-[#047857]">
                    Roth IRA
                  </th>
                  <th className="px-6 py-5 font-semibold text-xs uppercase tracking-wider">
                    401(k)
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-[var(--color-surface-primary)]' : 'bg-[var(--color-surface-secondary)]/70'}>
                    <td className="px-6 py-4 font-semibold text-[var(--color-text-primary)]">{row.feature}</td>
                    <td className="px-6 py-4 text-slate-700">{row.brokerage}</td>
                    <td className="px-6 py-4 text-slate-700">{row.tradIra}</td>
                    <td className="px-6 py-4 text-slate-700 bg-[#10b981]/5">{row.rothIra}</td>
                    <td className="px-6 py-4 text-slate-700">{row.k401}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[var(--color-surface-primary)]">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h3 className="font-display text-4xl md:text-5xl font-semibold text-[var(--color-text-primary)] tracking-tight">
            Not sure which is right for you?
          </h3>
          <p className="mt-5 text-lg text-[var(--color-text-secondary)]">
            Take the 4-minute retirement readiness quiz and we’ll recommend a mix in plain English.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button to="/signup" variant="primary" size="lg">
              Take the quiz <ArrowRight size={18} />
            </Button>
            <Button to="/about" variant="outline" size="lg">
              Talk to an advisor
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
