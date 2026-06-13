import { Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatMoney } from '../lib/money'
import { EmptyState } from './EmptyState'
import { Button } from './FormControls'
import { SectionCard as Panel } from './SectionCard'

export function EntryList<T>({
  items,
  emptyTitle,
  emptyText,
  render,
}: {
  items: T[]
  emptyTitle: string
  emptyText: string
  render: (item: T) => ReactNode
}) {
  return (
    <Panel className="mt-4">
      <div className="grid gap-2">
        {items.length ? items.map(render) : <EmptyState title={emptyTitle} text={emptyText} />}
      </div>
    </Panel>
  )
}

export function EntryRow({
  title,
  meta,
  amount,
  negative,
  onEdit,
  onDelete,
  testId,
}: {
  title: string
  meta: string
  amount: number
  negative?: boolean
  onEdit: () => void
  onDelete: () => void
  testId?: string
}) {
  return (
    <div data-testid={testId} className="flex flex-col gap-3 rounded-md border border-[var(--line)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-[var(--muted)]">{meta}</p>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className={`font-semibold ${negative ? 'text-red-700' : 'text-[var(--brand)]'}`}>
          {negative ? '-' : '+'}
          {formatMoney(amount)}
        </span>
        <Button type="button" variant="secondary" onClick={onEdit} aria-label="Uredi">
          <Pencil size={16} />
        </Button>
        <Button type="button" variant="danger" onClick={onDelete} aria-label="Izbriši">
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  )
}
