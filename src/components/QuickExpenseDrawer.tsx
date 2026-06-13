import { Plus, Repeat2, X } from 'lucide-react'
import { type FormEvent, useEffect, useRef } from 'react'
import { expenseCategories } from '../lib/categories'
import { formatMoney } from '../lib/money'
import type { ExpenseEntry } from '../types'
import { Button, inputClass } from './FormControls'

type ExpenseForm = { amount: string; date: string; category: string; note: string }

export function QuickExpenseDrawer({
  open,
  form,
  recentExpenses,
  setForm,
  setOpen,
  onSubmit,
  repeatLastExpense,
}: {
  open: boolean
  form: ExpenseForm
  recentExpenses: ExpenseEntry[]
  setForm: (value: ExpenseForm) => void
  setOpen: (open: boolean) => void
  onSubmit: (event: FormEvent) => void
  repeatLastExpense: (entry?: ExpenseEntry) => void
}) {
  const amountRef = useRef<HTMLInputElement | null>(null)
  const recentTemplates = recentExpenses
    .filter(
      (entry, index, array) =>
        array.findIndex(
          (item) => item.category === entry.category && item.note === entry.note && item.amount === entry.amount,
        ) === index,
    )
    .slice(0, 3)

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => amountRef.current?.focus(), 40)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/30 px-3 pb-3 md:items-center md:justify-center">
      <div
        className="max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-expense-title"
        data-testid="quick-expense-drawer"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="quick-expense-title" className="text-lg font-semibold">
              Hiter strošek
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Najprej znesek, potem kategorija. Shrani v par tapih.</p>
          </div>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-md bg-[var(--panel-muted)]"
            onClick={() => setOpen(false)}
            aria-label="Zapri hiter strošek"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm font-medium">
            <span>Znesek</span>
            <input
              ref={amountRef}
              className={`${inputClass} min-h-14 text-2xl font-semibold`}
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              placeholder="0,00"
            />
          </label>

          <div>
            <p className="text-sm font-medium">Kategorija</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {expenseCategories.slice(0, 8).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setForm({ ...form, category })}
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

          <label className="grid gap-1 text-sm font-medium">
            <span>Opis</span>
            <input
              className={inputClass}
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              placeholder="Opis, npr. kava, boni, bus"
            />
          </label>

          {recentTemplates.length > 0 && (
            <div>
              <p className="text-sm font-medium">Nedavne predloge</p>
              <div className="mt-2 grid gap-2">
                {recentTemplates.map((entry) => (
                  <button
                    key={`${entry.category}-${entry.note}-${entry.amount}`}
                    type="button"
                    className="rounded-md border border-[var(--line)] bg-white p-3 text-left text-sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        amount: String(entry.amount).replace('.', ','),
                        category: entry.category,
                        note: entry.note,
                      })
                    }
                  >
                    <strong>{formatMoney(entry.amount)}</strong> - {entry.category}
                    <span className="block text-[var(--muted)]">{entry.note || 'Brez opisa'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button className="min-h-12" type="submit">
              <Plus size={16} /> Shrani strošek
            </Button>
            <Button className="min-h-12" type="button" variant="secondary" onClick={() => repeatLastExpense()}>
              <Repeat2 size={16} /> Ponovi
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
