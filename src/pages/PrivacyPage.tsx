import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { SectionCard as Panel } from '../components/SectionCard'

export function PrivacyPage() {
  return (
    <div data-testid="privacy-page">
      <PageHeader title="Zasebnost in zaupanje" eyebrow="To je prednost lokalnega MVP-ja" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          ['Brez računa', 'Za uporabo ne potrebuješ registracije, e-pošte ali gesla.'],
          ['Brez strežnika za budget', 'Prihodki, stroški in cimri ostanejo v tvojem brskalniku.'],
          ['Brez sledenja', 'Aplikacija ne dodaja analitike ali oglaševalskih sledilnikov.'],
          ['Backup je pomemben', 'Če izbrišeš podatke brskalnika, lahko izgubiš budget. Redno izvozi JSON kopijo.'],
          ['Plačila so ročna', 'PayPal supporter preverjanje je MVP ročno. Občutljivih plačilnih podatkov ne shranjujemo v app.'],
          ['Ni davčni nasvet', 'App je praktičen pripomoček, ne pravno, davčno ali računovodsko svetovanje.'],
        ].map(([title, text]) => (
          <Panel key={title}>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 text-[var(--brand)]" size={20} aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{text}</p>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}
