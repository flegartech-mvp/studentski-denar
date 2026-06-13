import { CalendarDays, Pencil, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Button, Field, inputClass } from '../components/FormControls'
import { PageHeader } from '../components/PageHeader'
import { RecurringStatusLabel } from '../components/RecurringStatusLabel'
import { SectionCard as Panel } from '../components/SectionCard'
import { expenseCategories } from '../lib/categories'
import { getRecurringStatus } from '../lib/finance'
import { formatMoney } from '../lib/money'
import type { BudgetProfile, RecurringExpense } from '../types'

export function RentPage({
  profile,
  form,
  setForm,
  onSubmit,
  onToggle,
  onPaidToggle,
  onEdit,
  editingId,
  onDelete,
}: {
  profile: BudgetProfile
  form: { name: string; amount: string; category: string; dayOfMonth: string }
  setForm: (value: { name: string; amount: string; category: string; dayOfMonth: string }) => void
  onSubmit: (event: FormEvent) => void
  onToggle: (id: string) => void
  onPaidToggle: (id: string) => void
  onEdit: (entry: RecurringExpense) => void
  editingId: string | null
  onDelete: (id: string) => void
}) {
  return (
    <div data-testid="rent-page">
      <PageHeader title="Najem in redni stroški" eyebrow="Najemnina, položnice, internet, naročnine" />
      <Panel>
        <form className="grid gap-3 md:grid-cols-5" onSubmit={onSubmit}>
          <Field label="Ime">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="npr. najemnina" />
          </Field>
          <Field label="Znesek">
            <input className={inputClass} type="text" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Kategorija">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {expenseCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </Field>
          <Field label="Dan v mesecu">
            <input className={inputClass} type="number" min="1" max="28" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <Button className="w-full" type="submit">
              <CalendarDays size={16} /> {editingId ? 'Shrani' : 'Dodaj'}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel className="mt-4">
        <h2 className="text-xl font-semibold">Aktivni redni stroški</h2>
        <div className="mt-3 grid gap-2">
          {profile.recurring.length ? (
            profile.recurring.map((entry) => (
              <div key={entry.id} data-testid="recurring-row" className="scroll-mb-40 flex w-full max-w-full flex-col gap-3 overflow-hidden rounded-md border border-[var(--line)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{entry.name}</p>
                  <p className="break-words text-sm text-[var(--muted)]">
                    {entry.category} · vsak mesec {entry.dayOfMonth}. dan ·{' '}
                    <RecurringStatusLabel status={getRecurringStatus(entry, profile.month)} />
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="font-semibold">{formatMoney(entry.amount)}</span>
                  <Button type="button" variant="secondary" onClick={() => onPaidToggle(entry.id)}>
                    {entry.paidMonths.includes(profile.month) ? 'Označi neplačano' : 'Označi plačano'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => onEdit(entry)}>
                    <Pencil size={16} /> Uredi
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => onToggle(entry.id)}>
                    {entry.active ? 'Aktivno' : 'Pavzirano'}
                  </Button>
                  <Button type="button" variant="danger" onClick={() => onDelete(entry.id)} aria-label="Izbriši">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Ni rednih stroškov" text="Supporter dostop omogoča mesečne predloge za najem, položnice in naročnine." />
          )}
        </div>
      </Panel>
    </div>
  )
}
