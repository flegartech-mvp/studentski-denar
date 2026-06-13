import { getRecurringStatus } from '../lib/finance'

export function RecurringStatusLabel({ status }: { status: ReturnType<typeof getRecurringStatus> }) {
  if (status === 'paid') return <span className="font-semibold text-[var(--brand)]">že plačano</span>
  if (status === 'overdue') return <span className="font-semibold text-red-700">zapadlo/neplačano</span>
  return <span className="font-semibold text-amber-700">pričakovano kasneje</span>
}
