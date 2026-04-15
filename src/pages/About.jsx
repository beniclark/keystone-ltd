import { motion as Motion } from 'framer-motion'
import { Mail, Phone, MapPin, Heart, Scale, Users, Sparkles } from 'lucide-react'
import { useState } from 'react'
import Button from '../components/Button.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { useToast } from '../hooks/useToast.js'

const timeline = [
  {
    year: '1975',
    title: 'Keystone opens its doors',
    description:
      'Founded in Des Moines by three advisors who believed retirement planning should be available to everyone, not just the wealthy.',
  },
  {
    year: '1998',
    title: 'Goes digital',
    description:
      'One of the first major financial firms to offer online brokerage accounts and 401(k) rollovers.',
  },
  {
    year: '2012',
    title: 'Adds insurance',
    description:
      'Launches Keystone Life & Annuity to bring term life, disability, and LTC under one roof.',
  },
  {
    year: '2026',
    title: '2.3 million members strong',
    description:
      'Advising families across all 50 states with $482B in assets under management.',
  },
]

const leaders = [
  { name: 'Dana Whitlock', title: 'Chief Executive Officer', initials: 'DW' },
  { name: 'Samir Patel', title: 'Chief Investment Officer', initials: 'SP' },
  { name: 'Mei Lin Chen', title: 'President, Insurance', initials: 'MC' },
  { name: 'Jordan Baptiste', title: 'Chief Technology Officer', initials: 'JB' },
]

const values = [
  {
    icon: Heart,
    title: 'People over portfolios',
    description:
      'Money is the tool, not the point. We start with what you actually want out of life.',
  },
  {
    icon: Scale,
    title: 'Fiduciary, always',
    description:
      'Fee-only advice. No kickbacks, no sales contests, no products we wouldn’t put our own family in.',
  },
  {
    icon: Users,
    title: 'Real humans, no walls',
    description:
      'Your advisor’s direct line is in your account. No call center roulette.',
  },
  {
    icon: Sparkles,
    title: 'Built to outlast trends',
    description:
      '50 years of boring, durable advice. Meme stocks optional.',
  },
]

export default function About() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const toast = useToast()

  const onSubmit = (e) => {
    e.preventDefault()
    setSent(true)
    toast.success('Message sent successfully')
    setForm({ name: '', email: '', message: '' })
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <>
      {/* HERO */}
      <section className="relative -mt-16 pt-16 bg-navy-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:32px_32px]" />
        <div className="absolute -top-24 right-0 w-[560px] h-[560px] rounded-full bg-[#10b981]/15 blur-[140px]" />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300 mb-5">
              Who we are
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-semibold leading-[1.02] tracking-tight">
              Boring advice. Life-changing outcomes.
            </h1>
            <p className="mt-6 text-lg text-navy-100/80 leading-relaxed">
              For 50 years, Keystone has helped families invest patiently, retire on time, and
              sleep through the news cycle. We’re not flashy — and our members wouldn’t have it
              any other way.
            </p>
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-24 bg-[var(--color-surface-primary)]">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="Our story"
            title="Half a century, one steady hand."
          />
          <div className="mt-16 grid md:grid-cols-4 gap-6">
            {timeline.map((t, i) => (
              <Motion.div
                key={t.year}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className="p-7 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-surface-primary)] relative"
              >
                <div className="font-display text-4xl font-semibold text-[#10b981]">
                  {t.year}
                </div>
                <div className="mt-3 font-semibold text-[var(--color-text-primary)]">{t.title}</div>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">{t.description}</p>
              </Motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-24 bg-navy-50/60 border-y border-[var(--color-border-primary)]/70">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            center
            eyebrow="What we believe"
            title="Four principles, no asterisks."
          />
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, i) => (
              <Motion.div
                key={v.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className="p-7 rounded-2xl bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)]"
              >
                <v.icon className="text-[#10b981]" size={28} strokeWidth={1.8} />
                <h3 className="mt-5 font-display text-xl font-semibold text-[var(--color-text-primary)]">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">{v.description}</p>
              </Motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="py-24 bg-[var(--color-surface-primary)]">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="Leadership" title="The people steering the ship." />
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {leaders.map((p, i) => (
              <Motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="text-center p-8 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-surface-primary)] hover:shadow-md transition-shadow"
              >
                <div
                  className="h-24 w-24 rounded-full mx-auto flex items-center justify-center text-white font-display text-2xl font-semibold"
                  style={{
                    background: `linear-gradient(135deg, #10b981, #0a2540)`,
                  }}
                >
                  {p.initials}
                </div>
                <div className="mt-5 font-semibold text-[var(--color-text-primary)]">{p.name}</div>
                <div className="text-sm text-[var(--color-text-muted)] mt-1">{p.title}</div>
              </Motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="py-24 bg-navy-50/60 border-t border-[var(--color-border-primary)]/70">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <SectionHeading
                eyebrow="Contact"
                title="Questions? We answer them."
                description="Reach out any way you like — a real person will get back to you within one business day."
              />
              <div className="mt-10 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] flex items-center justify-center text-[var(--color-text-primary)]">
                    <Phone size={18} />
                  </div>
                  <div>
                    <div className="text-sm text-[var(--color-text-muted)]">Call us</div>
                    <div className="font-semibold text-[var(--color-text-primary)]">1-800-KEYSTONE</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] flex items-center justify-center text-[var(--color-text-primary)]">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="text-sm text-[var(--color-text-muted)]">Email</div>
                    <div className="font-semibold text-[var(--color-text-primary)]">
                      hello@keystonefinancial.com
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] flex items-center justify-center text-[var(--color-text-primary)]">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="text-sm text-[var(--color-text-muted)]">Headquarters</div>
                    <div className="font-semibold text-[var(--color-text-primary)]">
                      801 Grand Avenue, Des Moines, IA 50309
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <form
              onSubmit={onSubmit}
              className="p-8 rounded-2xl bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] shadow-sm"
            >
              <div className="space-y-5">
                <Field
                  id="contact-name"
                  label="Full name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                />
                <Field
                  id="contact-email"
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                />
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-surface-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/20 transition"
                    placeholder="How can we help?"
                  />
                </div>
                <Button type="submit" variant="primary" size="md" className="w-full">
                  {sent ? 'Thanks — we’ll be in touch' : 'Send message'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

function Field({ id, label, type = 'text', value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-surface-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/20 transition"
      />
    </div>
  )
}
