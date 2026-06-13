import { SectionCard as Panel } from './SectionCard'

export function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <Panel>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === 'warn' ? 'text-red-700' : tone === 'good' ? 'text-[var(--brand)]' : ''}`}>
        {value}
      </p>
    </Panel>
  )
}
