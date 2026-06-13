import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { getSurvivalMode } from '../lib/finance'
import { formatMoney } from '../lib/money'

export function SurvivalSummaryCard({ survival }: { survival: ReturnType<typeof getSurvivalMode> }) {
  const toneClasses = {
    safe: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    careful: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
  }
  const label =
    survival.tone === 'safe' ? 'Varno' : survival.tone === 'careful' ? 'Previdno' : 'Treba je prilagoditi'
  const Icon = survival.tone === 'danger' ? AlertTriangle : ShieldCheck

  return (
    <section data-testid="survival-card" className={`mb-4 rounded-lg border p-4 ${toneClasses[survival.tone]}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Icon size={20} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Survival Mode</h2>
            <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold">{label}</span>
          </div>
          <p className="mt-3 text-2xl font-semibold">
            Imaš {formatMoney(survival.actualBalance)} in še {survival.daysLeft} dni.
          </p>
          <p data-testid="survival-daily-spend" className="mt-1 text-sm">
            Max dnevna poraba: <strong>{formatMoney(survival.safeDaily)}/dan</strong>
          </p>
          <p data-testid="survival-real-balance" className="mt-1 text-sm">
            Po neplačanih rednih stroških: <strong>{formatMoney(survival.realBalance)}</strong>.
          </p>
        </div>
        <div className="min-w-0 rounded-md bg-white/70 p-3 lg:w-80">
          <p className="text-sm font-semibold">Cut these first</p>
          <ol className="mt-2 grid gap-1 text-sm">
            {survival.suggestions.map((suggestion, index) => (
              <li key={suggestion}>
                {index + 1}. {suggestion}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs">
            Študentski trik: najprej poreži ponavljajoče majhne stroške, ker jih je najlažje zgrešiti.
          </p>
        </div>
      </div>
      {survival.unpaidRecurring.length > 0 && (
        <div className="mt-3 rounded-md bg-white/70 p-3 text-sm">
          <p className="font-semibold">Neplačani redni stroški: {formatMoney(survival.unpaidExpected)}</p>
          <div className="mt-2 grid gap-1">
            {survival.unpaidRecurring.slice(0, 4).map((entry) => (
              <div key={entry.id} className="flex justify-between gap-3">
                <span>
                  {entry.name} - {entry.dayOfMonth}. dan
                </span>
                <strong>{formatMoney(entry.amount)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
