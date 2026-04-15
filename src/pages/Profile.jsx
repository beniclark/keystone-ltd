import { motion as Motion } from 'framer-motion'
import { CalendarClock, MessageCircle, Wallet, Briefcase, ShieldCheck } from 'lucide-react'
import { createElement } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useProfile } from '../hooks/useProfile.js'
import { useAccounts } from '../hooks/useAccounts.js'
import { useInsurance } from '../hooks/useInsurance.js'
import { useActivity } from '../hooks/useActivity.js'
import Button from '../components/Button.jsx'
import NetWorthCard from '../components/profile/NetWorthCard.jsx'
import AllocationDonut from '../components/profile/AllocationDonut.jsx'
import AccountCard from '../components/profile/AccountCard.jsx'
import InsuranceCard from '../components/profile/InsuranceCard.jsx'
import ActivityTable from '../components/profile/ActivityTable.jsx'
import { SkeletonCard, SkeletonTable } from '../components/Skeleton.jsx'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function ErrorPanel({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5">
      <p className="text-sm text-red-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 text-sm text-red-200 underline underline-offset-4"
      >
        Retry
      </button>
    </div>
  )
}

export default function Profile() {
  const { user: authUser } = useAuth()
  const profileState = useProfile()
  const accountsState = useAccounts()
  const insuranceState = useInsurance()
  const activityState = useActivity()

  const first = authUser?.firstName || 'Member'
  const accounts = accountsState.data
  const investmentAccounts = accounts.filter((account) => account.category === 'investment')
  const retirementAccounts = accounts.filter((account) => account.category === 'retirement')

  return (
    <div className="bg-[var(--color-surface-secondary)] min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
        >
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-[var(--color-text-primary)] tracking-tight mt-1">
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
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="grid lg:grid-cols-5 gap-6"
        >
          <div className="lg:col-span-3">
            {profileState.loading ? (
              <SkeletonCard />
            ) : profileState.error ? (
              <ErrorPanel message={profileState.error.message} onRetry={profileState.refetch} />
            ) : (
              <NetWorthCard user={profileState.data} />
            )}
          </div>
          <div className="lg:col-span-2">
            {profileState.loading ? (
              <SkeletonCard />
            ) : profileState.error ? (
              <ErrorPanel message={profileState.error.message} onRetry={profileState.refetch} />
            ) : (
              <AllocationDonut data={profileState.data.allocation} />
            )}
          </div>
        </Motion.div>

        <Section
          icon={Wallet}
          eyebrow="Investments"
          title="Investment accounts"
          description="Brokerage and education accounts funded from your checking."
          totalLabel="Total invested"
          total={investmentAccounts.reduce((s, a) => s + a.balance, 0)}
        >
          {accountsState.loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : accountsState.error ? (
            <ErrorPanel message={accountsState.error.message} onRetry={accountsState.refetch} />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {investmentAccounts.map((a) => (
                <AccountCard key={a.id} account={a} accent="emerald" />
              ))}
            </div>
          )}
        </Section>

        <Section
          icon={Briefcase}
          eyebrow="Retirement"
          title="Retirement accounts"
          description="401(k), IRA, and HSA balances working toward your 2045 retirement date."
          totalLabel="Total retirement"
          total={retirementAccounts.reduce((s, a) => s + a.balance, 0)}
        >
          {accountsState.loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : accountsState.error ? (
            <ErrorPanel message={accountsState.error.message} onRetry={accountsState.refetch} />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {retirementAccounts.map((a) => (
                <AccountCard key={a.id} account={a} accent="navy" />
              ))}
            </div>
          )}
        </Section>

        <Section
          icon={ShieldCheck}
          eyebrow="Protection"
          title="Insurance coverage"
          description="Your active policies and coverage amounts, all in one place."
        >
          {insuranceState.loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : insuranceState.error ? (
            <ErrorPanel message={insuranceState.error.message} onRetry={insuranceState.refetch} />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {insuranceState.data.map((p) => (
                <InsuranceCard key={p.id} policy={p} />
              ))}
            </div>
          )}
        </Section>

        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          {activityState.loading ? (
            <SkeletonTable />
          ) : activityState.error ? (
            <ErrorPanel message={activityState.error.message} onRetry={activityState.refetch} />
          ) : (
            <ActivityTable activity={activityState.data} />
          )}
        </Motion.div>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-700 to-navy-800 p-8 md:p-12 text-white">
          <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full bg-brand-emerald/20 blur-[140px]" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-xl">
              <div className="text-xs uppercase tracking-[0.14em] text-emerald-300">Your advisor</div>
              <h3 className="font-display text-3xl md:text-4xl font-semibold mt-2 tracking-tight">
                Ready for your spring check-in with{' '}
                {profileState.data?.advisor?.name?.split(',')[0] || 'your advisor'}?
              </h3>
              <p className="mt-3 text-navy-100/80">
                Next suggested review: {profileState.data?.advisor?.nextReview || 'Soon'}.
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

function Section({ icon, eyebrow, title, description, totalLabel, total, children }) {
  return (
    <Motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-emerald-deep mb-2">
            {icon && createElement(icon, { size: 14 })} {eyebrow}
          </div>
          <h2 className="font-display text-3xl font-semibold text-[var(--color-text-primary)] tracking-tight">
            {title}
          </h2>
          {description && <p className="text-[var(--color-text-secondary)] mt-1.5 max-w-2xl">{description}</p>}
        </div>
        {total != null && (
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">{totalLabel}</div>
            <div className="font-display text-3xl font-semibold text-[var(--color-text-primary)] mt-1">
              {currency(total)}
            </div>
          </div>
        )}
      </div>
      {children}
    </Motion.section>
  )
}
