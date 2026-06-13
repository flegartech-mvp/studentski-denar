import { Lock } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { ChartLoading } from '../components/ChartLoading'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/FormControls'
import { PageHeader } from '../components/PageHeader'
import { RecommendationsPanel } from '../components/RecommendationsPanel'
import { SectionCard as Panel } from '../components/SectionCard'
import { StatCard } from '../components/StatCard'
import { budgetPresets, expenseCategories } from '../lib/categories'
import { getCategoryBudgetProgress, getProfileTotals } from '../lib/finance'
import { formatMoney } from '../lib/money'
import type { BudgetProfile, Recommendation, View } from '../types'

const IncomeExpenseBarChart = lazy(() =>
  import('../components/Charts').then((module) => ({ default: module.IncomeExpenseBarChart })),
)

export function InsightsPage({
  profile,
  supporter,
  categoryData,
  incomeExpenseData,
  totals,
  recommendations,
  setView,
  setBudgetLimit,
  applyBudgetPreset,
  openSupporter,
}: {
  profile: BudgetProfile
  supporter: boolean
  categoryData: { name: string; value: number }[]
  incomeExpenseData: { day: string; prihodki: number; stroski: number }[]
  totals: ReturnType<typeof getProfileTotals>
  recommendations: Recommendation[]
  setView: (view: View) => void
  setBudgetLimit: (category: string, limit: number | null) => void
  applyBudgetPreset: (limits: Record<string, number>) => void
  openSupporter: () => void
}) {
  const biggest = [...categoryData].sort((a, b) => b.value - a.value)[0]
  const budgetProgress = getCategoryBudgetProgress(profile)
  const alertBudgets = budgetProgress.filter((item) => item.status !== 'ok').slice(0, 3)

  function parseLimit(value: string) {
    const normalized = value.trim().replace(',', '.')
    if (!normalized) return null
    const amount = Number(normalized)
    return Number.isFinite(amount) && amount > 0 ? amount : null
  }

  return (
    <div data-testid="insights-page">
      <PageHeader title="Vpogledi" eyebrow="Preprosti grafi brez AI API-jev" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <h2 className="text-xl font-semibold">Prihodki proti stroškom</h2>
          {incomeExpenseData.length ? (
            <div className="mt-4 h-72">
              <Suspense fallback={<ChartLoading />}>
                <IncomeExpenseBarChart data={incomeExpenseData} />
              </Suspense>
            </div>
          ) : (
            <EmptyState title="Ni podatkov za graf" text="Dodaj nekaj prihodkov ali stroškov." />
          )}
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold">Študentski namigi</h2>
          <div className="mt-3 grid gap-3 text-sm text-[var(--muted)]">
            <p>
              {biggest
                ? `Največji blok stroškov je ${biggest.name}: ${formatMoney(biggest.value)}. Če želiš hitro izboljšati mesec, začni tam.`
                : 'Ko dodaš stroške, bo tukaj kratek signal, kje imaš največ prostora.'}
            </p>
            <p>
              {totals.safeDaily < 0
                ? 'Dnevni varen znesek je negativen, zato ta mesec potrebuje rez stroškov ali dodaten prihodek.'
                : `Za ta mesec imaš približno ${formatMoney(totals.safeDaily)} na dan, če se projekcija ne spremeni.`}
            </p>
            <p>
              Redni stroški trenutno predstavljajo {totals.projectedExpenses ? Math.round((totals.recurring / totals.projectedExpenses) * 100) : 0} % projektiranih stroškov.
            </p>
          </div>
        </Panel>
      </div>

      <RecommendationsPanel recommendations={recommendations} setView={setView} />

      <Panel className="mt-4" data-testid="budget-limits-panel">
        <h2 className="text-xl font-semibold">Mesečni limiti po kategorijah</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Nastavi preprost plan za hrano, kavo, prevoz ali zabavo. App te opozori, ko si blizu limita.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {budgetPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="rounded-md border border-[var(--line)] bg-white p-3 text-left transition hover:bg-[var(--panel-muted)]"
              onClick={() => applyBudgetPreset(preset.limits)}
            >
              <p className="font-semibold">{preset.label}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{preset.description}</p>
              <p className="mt-2 text-xs font-semibold text-[var(--brand)]">Uporabi predlog</p>
            </button>
          ))}
        </div>

        {alertBudgets.length > 0 && (
          <div className="mt-3 grid gap-2">
            {alertBudgets.map((item) => (
              <p
                key={item.category}
                className={`rounded-md p-3 text-sm ${
                  item.status === 'over' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                }`}
              >
                <strong>{item.category}</strong>: {formatMoney(item.actual)} od {formatMoney(item.limit)}
                {item.status === 'over'
                  ? `, čez plan za ${formatMoney(Math.abs(item.remaining))}.`
                  : `, ostane ${formatMoney(item.remaining)}.`}
              </p>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {expenseCategories.map((category) => {
            const progress = budgetProgress.find((item) => item.category === category)
            const percent = Math.min(100, Math.round((progress?.percent ?? 0) * 100))
            return (
              <div key={category} className="rounded-md border border-[var(--line)] bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="min-w-0 flex-1 text-sm font-semibold" htmlFor={`budget-${category}`}>
                    {category}
                  </label>
                  <input
                    id={`budget-${category}`}
                    className="min-h-10 w-28 rounded-md border border-[var(--line)] px-2 text-right text-sm"
                    inputMode="decimal"
                    placeholder="limit"
                    value={profile.budgetLimits[category] ?? ''}
                    onChange={(event) => setBudgetLimit(category, parseLimit(event.target.value))}
                  />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--panel-muted)]">
                  <div
                    className={`h-full ${
                      progress?.status === 'over'
                        ? 'bg-red-600'
                        : progress?.status === 'near'
                          ? 'bg-amber-500'
                          : 'bg-[var(--brand)]'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {progress
                    ? `${formatMoney(progress.actual)} porabljeno, ${formatMoney(Math.max(0, progress.remaining))} še na voljo`
                    : 'Brez limita. Vnesi znesek, npr. 120.'}
                </p>
              </div>
            )
          })}
        </div>
      </Panel>

      <Panel className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Napredni vpogledi</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Supporter dostop doda CSV izvoz, več profilov, teme in arhiv mesecev.
            </p>
          </div>
          {!supporter && (
            <Button type="button" onClick={openSupporter}>
              <Lock size={16} /> Odkleni
            </Button>
          )}
        </div>
        {supporter && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StatCard label="Aktivni profil" value={profile.name} />
            <StatCard label="Redni stroški" value={formatMoney(totals.recurring)} />
            <StatCard label="Projektirani stroški" value={formatMoney(totals.projectedExpenses)} />
          </div>
        )}
      </Panel>
    </div>
  )
}
