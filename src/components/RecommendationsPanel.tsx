import { Sparkles } from 'lucide-react'
import type { Recommendation, View } from '../types'
import { EmptyState } from './EmptyState'
import { Button } from './FormControls'
import { SectionCard as Panel } from './SectionCard'

export function RecommendationsPanel({
  recommendations,
  setView,
}: {
  recommendations: Recommendation[]
  setView: (view: View) => void
}) {
  const toneClasses = {
    safe: 'border-emerald-100 bg-emerald-50 text-emerald-900',
    careful: 'border-amber-100 bg-amber-50 text-amber-900',
    danger: 'border-red-100 bg-red-50 text-red-900',
  }

  return (
    <Panel className="mb-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-1 text-[var(--brand)]" size={22} aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold">Priporočila za ta mesec</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Lokalna pravila iz tvojih vnosov. Brez AI API-jev, brez pošiljanja podatkov.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {recommendations.length ? (
          recommendations.map((item) => (
            <div key={item.id} className={`rounded-md border p-3 ${toneClasses[item.tone]}`}>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm">{item.text}</p>
              <Button className="mt-3 bg-white/80 text-[var(--ink)] hover:bg-white" type="button" variant="secondary" onClick={() => setView(item.target)}>
                {item.actionLabel}
              </Button>
            </div>
          ))
        ) : (
          <EmptyState
            title="Za zdaj ni posebnih priporočil"
            text="Dodaj nekaj prihodkov, stroškov in rednih obveznosti, pa se bodo pojavili konkretni naslednji koraki."
          />
        )}
      </div>
    </Panel>
  )
}
