import { Plus } from 'lucide-react'
import type { FormEvent } from 'react'
import { EntryList, EntryRow } from '../components/EntryList'
import { Button, Field, inputClass } from '../components/FormControls'
import { PageHeader } from '../components/PageHeader'
import { SectionCard as Panel } from '../components/SectionCard'
import { incomeCategories } from '../lib/categories'
import type { BudgetProfile, IncomeEntry } from '../types'

export function IncomePage({
  profile,
  form,
  setForm,
  editingId,
  onSubmit,
  onEdit,
  onDelete,
}: {
  profile: BudgetProfile
  form: { amount: string; date: string; source: string; note: string }
  setForm: (value: { amount: string; date: string; source: string; note: string }) => void
  editingId: string | null
  onSubmit: (event: FormEvent) => void
  onEdit: (entry: IncomeEntry) => void
  onDelete: (id: string) => void
}) {
  return (
    <div data-testid="income-page">
      <PageHeader title="Prihodki" eyebrow="Študentsko delo, štipendija, pomoč doma" />
      <Panel>
        <form className="grid gap-3 md:grid-cols-5" onSubmit={onSubmit}>
          <Field label="Znesek">
            <input className={inputClass} type="text" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Datum">
            <input className={inputClass} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Vir">
            <select className={inputClass} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="">Izberi vir</option>
              {incomeCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
          <Field label="Opomba">
            <input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="neobvezno" />
          </Field>
          <div className="flex items-end">
            <Button className="w-full" type="submit">
              <Plus size={16} /> {editingId ? 'Shrani' : 'Dodaj'}
            </Button>
          </div>
        </form>
      </Panel>
      <EntryList
        items={profile.income}
        emptyTitle="Ni prihodkov"
        emptyText="Dodaj plačilo, štipendijo ali drug prihodek."
        render={(entry) => (
          <EntryRow
            key={entry.id}
            title={entry.source}
            meta={`${entry.date}${entry.note ? ` · ${entry.note}` : ''}`}
            amount={entry.amount}
            onEdit={() => onEdit(entry)}
            onDelete={() => onDelete(entry.id)}
            testId="income-row"
          />
        )}
      />
    </div>
  )
}
