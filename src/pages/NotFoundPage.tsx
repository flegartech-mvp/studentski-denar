import { Settings, Wallet } from 'lucide-react'
import { Button } from '../components/FormControls'
import { PageHeader } from '../components/PageHeader'
import { SectionCard as Panel } from '../components/SectionCard'
import type { View } from '../types'

export function NotFoundPage({ setView }: { setView: (view: View) => void }) {
  return (
    <div data-testid="not-found-page" className="mx-auto max-w-2xl">
      <PageHeader title="Stran ne obstaja" eyebrow="404" />
      <Panel>
        <p className="text-sm text-[var(--muted)]">
          Ta povezava v aplikaciji ni veljavna. Tvoji lokalni podatki so ostali nespremenjeni.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => setView('dashboard')}>
            <Wallet size={16} /> Na pregled
          </Button>
          <Button type="button" variant="secondary" onClick={() => setView('settings')}>
            <Settings size={16} /> Nastavitve
          </Button>
        </div>
      </Panel>
    </div>
  )
}
