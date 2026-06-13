import { AlertTriangle, CalendarDays, CheckCircle2, Plus, Repeat2 } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { ChartLoading } from '../components/ChartLoading'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/FormControls'
import { PageHeader } from '../components/PageHeader'
import { RecommendationsPanel } from '../components/RecommendationsPanel'
import { SectionCard as Panel } from '../components/SectionCard'
import { StatCard } from '../components/StatCard'
import { SurvivalSummaryCard } from '../components/SurvivalSummaryCard'
import { getCategoryBudgetProgress, getProfileTotals, getSurvivalMode } from '../lib/finance'
import { formatMoney } from '../lib/money'
import type { BudgetProfile, Recommendation, View } from '../types'

const CategoryPieChart = lazy(() =>
  import('../components/Charts').then((module) => ({ default: module.CategoryPieChart })),
)

export function Dashboard({
  profile,
  totals,
  survival,
  recommendations,
  categoryData,
  budgetProgress,
  setView,
  repeatLastExpense,
}: {
  profile: BudgetProfile
  totals: ReturnType<typeof getProfileTotals>
  survival: ReturnType<typeof getSurvivalMode>
  recommendations: Recommendation[]
  categoryData: { name: string; value: number }[]
  budgetProgress: ReturnType<typeof getCategoryBudgetProgress>
  setView: (view: View) => void
  repeatLastExpense: () => void
}) {
  const warning = survival.realBalance < 0
  const currentBalance = profile.currentBalance ?? totals.income - totals.expenses
  const biggestCategory = [...categoryData].sort((a, b) => b.value - a.value)[0] ?? null
  const budgetWarning = budgetProgress.find((item) => item.status === 'over') ?? budgetProgress.find((item) => item.status === 'near')
  const upcomingRecurring = [...survival.unpaidRecurring]
    .sort((a, b) => a.dayOfMonth - b.dayOfMonth)
    .slice(0, 4)

  return (
    <div data-testid="dashboard-page">
      <PageHeader title="Pregled meseca" eyebrow={`${profile.name} - ${profile.month}`}>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setView('income')}>
            <Plus size={16} /> Prihodek
          </Button>
          <Button variant="secondary" onClick={repeatLastExpense}>
            <Repeat2 size={16} /> Ponovi zadnji strošek
          </Button>
          <Button onClick={() => setView('expenses')}>
            <Plus size={16} /> Strošek
          </Button>
        </div>
      </PageHeader>

      <SurvivalSummaryCard survival={survival} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Trenutno stanje"
          value={formatMoney(currentBalance)}
          tone={currentBalance < 0 ? 'warn' : 'good'}
        />
        <StatCard
          label="Denar po neplačanih računih"
          value={formatMoney(survival.realBalance)}
          tone={survival.realBalance < 0 ? 'warn' : 'good'}
        />
        <StatCard
          label="Max dnevna poraba"
          value={`${formatMoney(survival.safeDaily)}/dan`}
          tone={survival.safeDaily < 0 ? 'warn' : 'good'}
        />
        <StatCard label="Prihodki ta mesec" value={formatMoney(totals.income)} tone="good" />
        <StatCard label="Stroški ta mesec" value={formatMoney(totals.expenses)} />
        <StatCard
          label="Največja kategorija"
          value={biggestCategory ? `${biggestCategory.name}: ${formatMoney(biggestCategory.value)}` : 'Še ni podatkov'}
          tone={biggestCategory && biggestCategory.value > Math.max(50, totals.projectedExpenses * 0.28) ? 'warn' : undefined}
        />
        <StatCard
          label="Budget limit"
          value={
            budgetWarning
              ? `${budgetWarning.category}: ${Math.round(budgetWarning.percent * 100)}%`
              : budgetProgress.length
                ? 'Vse znotraj plana'
                : 'Nastavi v vpogledih'
          }
          tone={budgetWarning ? 'warn' : budgetProgress.length ? 'good' : undefined}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="flex items-start gap-3">
            {warning ? (
              <AlertTriangle className="mt-1 text-red-700" size={22} aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-1 text-[var(--brand)]" size={22} aria-hidden="true" />
            )}
            <div>
              <h2 className="text-xl font-semibold">Kaj to pomeni danes?</h2>
              <p className="mt-2 text-4xl font-semibold">{formatMoney(survival.safeDaily)}/dan</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Imaš še {survival.daysLeft} dni. Po neplačanih rednih stroških je projektirano stanje{' '}
                <strong>{formatMoney(survival.realBalance)}</strong>.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md bg-[var(--panel-muted)] p-3">
              <p className="text-sm text-[var(--muted)]">Neplačani redni stroški</p>
              <p className="mt-1 text-2xl font-semibold">{formatMoney(survival.unpaidExpected)}</p>
            </div>
            <div className="rounded-md bg-[var(--panel-muted)] p-3">
              <p className="text-sm text-[var(--muted)]">Denar zdaj</p>
              <p className="mt-1 text-2xl font-semibold">{formatMoney(survival.actualBalance)}</p>
            </div>
            <div className="rounded-md bg-[var(--panel-muted)] p-3">
              <p className="text-sm text-[var(--muted)]">Najprej omeji</p>
              <p className="mt-1 font-semibold">{survival.suggestions.join(', ')}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {survival.tone === 'danger'
              ? 'Rdeč signal: najprej označi, kateri računi so že plačani, nato za nekaj dni ustavi kavo, dostavo, zabavo in nenujne nakupe.'
              : survival.tone === 'careful'
                ? 'Previdno: mesec je izvedljiv, ampak majhni dnevni stroški lahko hitro pojedo razliko. Vnašaj bone, kavo in prevoz sproti.'
                : 'Dobro kaže. Še vedno sproti vpisuj stroške, posebej malico, kavo in prevoz, ker so najlažje pozabljeni.'}
          </p>
        </Panel>

        <Panel>
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-1 text-[var(--brand)]" size={22} aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold">Prihaja še ta mesec</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Neplačani redni stroški so že odšteti v Survival Mode.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {upcomingRecurring.length ? (
              upcomingRecurring.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-[var(--panel-muted)] p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{entry.name}</p>
                    <p className="text-[var(--muted)]">
                      {entry.category} - {entry.dayOfMonth}. dan
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">{formatMoney(entry.amount)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-md bg-[var(--panel-muted)] p-3 text-sm">
                <p className="font-semibold">Ni neplačanih rednih stroškov</p>
                <p className="mt-1 text-[var(--muted)]">
                  Če imaš najemnino, telefon ali prevoz, jih dodaj kot redni strošek.
                </p>
                <Button className="mt-3" type="button" variant="secondary" onClick={() => setView('rent')}>
                  Dodaj redni strošek
                </Button>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <RecommendationsPanel recommendations={recommendations} setView={setView} />

      <Panel className="mt-4">
        <h2 className="text-xl font-semibold">Stroški po kategorijah</h2>
        {categoryData.length ? (
          <div className="mt-4 h-72">
            <Suspense fallback={<ChartLoading />}>
              <CategoryPieChart data={categoryData} />
            </Suspense>
          </div>
        ) : (
          <EmptyState title="Še ni stroškov" text="Dodaj prvi strošek in graf se bo prikazal tukaj." />
        )}
      </Panel>
    </div>
  )
}
