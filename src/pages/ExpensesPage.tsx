import { Plus, Repeat2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { EmptyState } from '../components/EmptyState'
import { EntryList, EntryRow } from '../components/EntryList'
import { Button, Field, inputClass } from '../components/FormControls'
import { PageHeader } from '../components/PageHeader'
import { SectionCard as Panel } from '../components/SectionCard'
import { expenseCategories } from '../lib/categories'
import { formatMoney } from '../lib/money'
import type { BudgetProfile, ExpenseEntry } from '../types'

export function ExpensesPage({
  profile,
  form,
  setForm,
  editingId,
  onSubmit,
  quickOpen,
  setQuickOpen,
  repeatLastExpense,
  onEdit,
  onDelete,
}: {
  profile: BudgetProfile
  form: { amount: string; date: string; category: string; note: string }
  setForm: (value: { amount: string; date: string; category: string; note: string }) => void
  editingId: string | null
  onSubmit: (event: FormEvent) => void
  quickOpen: boolean
  setQuickOpen: (open: boolean) => void
  repeatLastExpense: (entry?: ExpenseEntry) => void
  onEdit: (entry: ExpenseEntry) => void
  onDelete: (id: string) => void
}) {
  const recentTemplates = profile.expenses
    .filter((entry, index, array) => array.findIndex((item) => item.category === entry.category && item.note === entry.note && item.amount === entry.amount) === index)
    .slice(0, 4)

  return (
    <div data-testid="expenses-page">
      <PageHeader title="Stroški" eyebrow="Boni, prevoz, kava, najem, faks">
        <Button type="button" variant="secondary" onClick={() => repeatLastExpense()}>
          <Repeat2 size={16} /> Ponovi zadnji
        </Button>
      </PageHeader>
      <Panel className={quickOpen ? 'ring-2 ring-[var(--brand)]' : ''}>
        <div className="mb-4 grid gap-2">
          <p className="text-sm font-semibold">Hitre kategorije</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {expenseCategories.slice(0, 8).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setForm({ ...form, category })
                  setQuickOpen(false)
                }}
                className={`shrink-0 rounded-full border px-3 py-2 text-sm font-medium ${
                  form.category === category
                    ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                    : 'border-[var(--line)] bg-white text-[var(--ink)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <form className="grid gap-3 md:grid-cols-5" onSubmit={onSubmit}>
          <Field label="Znesek">
            <input className={inputClass} autoFocus={quickOpen} type="text" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
          </Field>
          <Field label="Datum">
            <input className={inputClass} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Kategorija">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {expenseCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
          <Field label="Opis">
            <input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="npr. Lidl, bus, kava" />
          </Field>
          <div className="flex items-end">
            <Button className="w-full" type="submit">
              <Plus size={16} /> {editingId ? 'Shrani' : 'Dodaj'}
            </Button>
          </div>
        </form>
      </Panel>
      <Panel className="mt-4">
        <h2 className="text-xl font-semibold">Nedavne predloge</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {recentTemplates.length ? (
            recentTemplates.map((entry) => (
              <button
                key={`${entry.category}-${entry.note}-${entry.amount}`}
                type="button"
                onClick={() => repeatLastExpense(entry)}
                className="rounded-md border border-[var(--line)] bg-white p-3 text-left transition hover:bg-[var(--panel-muted)]"
              >
                <p className="font-semibold">{formatMoney(entry.amount)} · {entry.category}</p>
                <p className="text-sm text-[var(--muted)]">{entry.note || 'Brez opisa'} · ponovi z današnjim datumom</p>
              </button>
            ))
          ) : (
            <EmptyState title="Predloge se ustvarijo same" text="Ko dodaš nekaj stroškov, jih boš lahko ponovil z enim tapom." />
          )}
        </div>
      </Panel>
      <EntryList
        items={profile.expenses}
        emptyTitle="Ni stroškov"
        emptyText="Dodaj prvi strošek in pregled bo uporaben."
        render={(entry) => (
          <EntryRow
            key={entry.id}
            title={entry.category}
            meta={`${entry.date}${entry.note ? ` · ${entry.note}` : ''}`}
            amount={entry.amount}
            negative
            onEdit={() => onEdit(entry)}
            onDelete={() => onDelete(entry.id)}
            testId="expense-row"
          />
        )}
      />
    </div>
  )
}
