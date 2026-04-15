import { AnimatePresence, motion as Motion } from 'framer-motion'

const toneStyles = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  error: 'border-red-400/35 bg-red-500/10 text-red-200',
  info: 'border-navy-300/30 bg-navy-500/20 text-navy-100',
}

export default function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[70] flex w-[min(92vw,24rem)] flex-col gap-2" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${toneStyles[toast.type] || toneStyles.info}`}
          >
            <div className="flex items-start gap-3">
              <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="text-xs opacity-75 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                Dismiss
              </button>
            </div>
          </Motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
