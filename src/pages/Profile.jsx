import { motion } from 'framer-motion'
import { BarChart3, CalendarClock, MessageCircle, Wallet, Briefcase, ShieldCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import Button from '../components/Button.jsx'
import NetWorthCard from '../components/profile/NetWorthCard.jsx'
import AllocationDonut from '../components/profile/AllocationDonut.jsx'
import AccountCard from '../components/profile/AccountCard.jsx'
import InsuranceCard from '../components/profile/InsuranceCard.jsx'
import ActivityTable from '../components/profile/ActivityTable.jsx'
import { mockUser } from '../data/user.js'
import { investmentAccounts, retirementAccounts } from '../data/accounts.js'
import { insurancePolicies } from '../data/insurance.js'
import { recentActivity } from '../data/activity.js'
import OptionsPositionsSummary from '../components/options/OptionsPositionsSummary.jsx'
import OptionsPositionCard from '../components/options/OptionsPositionCard.jsx'
import { userPositions } from '../data/options/positions.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Profile() {
  const { user: authUser } = useAuth()
  const first = authUser?.firstName || mockUser.firstName

  return (
    <div className="bg-slate-50/60 min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
        >
          <div>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-navy-800 tracking-tight mt-1">
              {greeting()}, {first}.
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md">
              <MessageCircle size={16} /> Message advisor
            </Button>
            <Button variant="dark" size="md">
              <CalendarClock size={16} /> Schedule review
            </Button>
          </div>
        </motion.div>

        {/* NET WORTH + ALLOCATION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="grid lg:grid-cols-5 gap-6"
        >
          <div className="lg:col-span-3">
            <NetWorthCard user={mockUser} />
          </div>
          <div className="lg:col-span-2">
            <AllocationDonut data={mockUser.allocation} />
          </div>
        </motion.div>

        {/* INVESTMENT ACCOUNTS */}
        <Section
          icon={Wallet}
          eyebrow="Investments"
          title="Investment accounts"
          description="Brokerage and education accounts funded from your checking."
          totalLabel="Total invested"
          total={investmentAccounts.reduce((s, a) => s + a.balance, 0)}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {investmentAccounts.map((a) => (
              <AccountCard key={a.id} account={a} accent="emerald" />
            ))}
          </div>
        </Section>

        {/* OPTIONS POSITIONS */}
        <Section
          icon={BarChart3}
          eyebrow="Options"
          title="Options positions"
          description="Your active options strategies and their current performance."
        >
          <div className="space-y-6">
            <OptionsPositionsSummary positions={userPositions} />
            <div className="grid md:grid-cols-2 gap-5">
              {userPositions.map((p) => (
                <OptionsPositionCard key={p.id} position={p} />
              ))}
            </div>
          </div>
        </Section>

        {/* RETIREMENT */}
        <Section
          icon={Briefcase}
          eyebrow="Retirement"
          title="Retirement accounts"
          description="401(k), IRA, and HSA balances working toward your 2045 retirement date."
          totalLabel="Total retirement"
          total={retirementAccounts.reduce((s, a) => s + a.balance, 0)}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {retirementAccounts.map((a) => (
              <AccountCard key={a.id} account={a} accent="navy" />
            ))}
          </div>
        </Section>

        {/* INSURANCE */}
        <Section
          icon={ShieldCheck}
          eyebrow="Protection"
          title="Insurance coverage"
          description="Your active policies and coverage amounts, all in one place."
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {insurancePolicies.map((p) => (
              <InsuranceCard key={p.id} policy={p} />
            ))}
          </div>
        </Section>

        {/* ACTIVITY */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <ActivityTable activity={recentActivity} />
        </motion.div>

        {/* ADVISOR CTA */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-700 to-navy-800 p-8 md:p-12 text-white">
          <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full bg-[#10b981]/20 blur-[140px]" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-xl">
              <div className="text-xs uppercase tracking-[0.14em] text-emerald-300">
                Your advisor
              </div>
              <h3 className="font-display text-3xl md:text-4xl font-semibold mt-2 tracking-tight">
                Ready for your spring check-in with {mockUser.advisor.name.split(',')[0]}?
              </h3>
              <p className="mt-3 text-navy-100/80">
                Next suggested review: {mockUser.advisor.nextReview}. We’ll walk through your
                retirement score and 2026 tax moves.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="lg">
                <CalendarClock size={18} /> Schedule
              </Button>
              <Button variant="outlineDark" size="lg">
                Message
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const currency = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function Section({ icon: Icon, eyebrow, title, description, totalLabel, total, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#047857] mb-2">
            <Icon size={14} /> {eyebrow}
          </div>
          <h2 className="font-display text-3xl font-semibold text-navy-800 tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-slate-600 mt-1.5 max-w-2xl">{description}</p>
          )}
        </div>
        {total != null && (
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              {totalLabel}
            </div>
            <div className="font-display text-3xl font-semibold text-navy-800 mt-1">
              {currency(total)}
            </div>
          </div>
        )}
      </div>
      {children}
    </motion.section>
  )
}
