import {
  HeartPulse,
  ShieldCheck,
  Smile,
  Eye,
  BadgePlus,
  Stethoscope,
} from 'lucide-react'

const iconMap = {
  HeartPulse,
  ShieldCheck,
  Smile,
  Eye,
  BadgePlus,
  Stethoscope,
}

export default function InsuranceCard({ policy }) {
  const Icon = iconMap[policy.icon] || ShieldCheck
  const active = policy.status === 'Active'
  return (
    <div className="p-6 rounded-2xl border border-slate-200 bg-white hover:shadow-[0_20px_50px_-20px_rgba(10,37,64,0.25)] hover:border-navy-300 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="h-11 w-11 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center">
          <Icon size={20} />
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            active
              ? 'bg-[#10b981]/12 text-[#047857]'
              : 'bg-[#f5b700]/15 text-[#8a5a00]'
          }`}
        >
          {policy.status}
        </span>
      </div>
      <div className="mt-5 font-semibold text-navy-800">{policy.name}</div>
      <div className="mt-0.5 text-xs text-slate-500">{policy.policyNumber}</div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-500">{policy.detailLabel}</div>
          <div className="font-display text-xl font-semibold text-navy-800 mt-1 leading-tight">
            {policy.detailValue}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">{policy.subLabel}</div>
          <div className="font-semibold text-navy-800 mt-1">{policy.subValue}</div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
        <span className="text-slate-500">Premium</span>
        <span className="font-semibold text-navy-800">{policy.premium}</span>
      </div>
    </div>
  )
}
