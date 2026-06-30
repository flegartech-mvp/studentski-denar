import { CheckCircle2, HeartHandshake, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { Button, inputClass } from '../components/FormControls'
import { PageHeader } from '../components/PageHeader'
import { SectionCard as Panel } from '../components/SectionCard'
import { normalizeSupporterStatus, supporterStatusLabel } from '../lib/supporterAccess'
import type { SupporterAccessRow, SupporterLicense } from '../types'

export function SupporterPage({
  supporter,
  license,
  access,
  authEmail,
  licenseInput,
  setLicenseInput,
  message,
  remoteMessage,
  onSubmit,
  onRemove,
  pendingAt,
  now,
  paymentReference,
  setPaymentReference,
  markPending,
}: {
  supporter: boolean
  license: SupporterLicense | null
  access: SupporterAccessRow | null
  authEmail: string | null
  licenseInput: string
  setLicenseInput: (value: string) => void
  message: string
  remoteMessage: string
  onSubmit: (event: FormEvent) => void
  onRemove: () => void
  pendingAt: string | null
  now: number
  paymentReference: string
  setPaymentReference: (value: string) => void
  markPending: () => void | Promise<void>
}) {
  const expiringSoon =
    license?.expiresAt && new Date(license.expiresAt).getTime() - now < 1000 * 60 * 60 * 24 * 14
  const expired = license?.expiresAt && new Date(license.expiresAt).getTime() < now
  const localStatus = supporter
    ? expiringSoon
      ? 'Kmalu poteče'
      : 'Aktiven supporter'
    : pendingAt
      ? 'V preverjanju'
      : expired
        ? 'Poteklo'
        : 'Free uporabnik'
  const status = access ? supporterStatusLabel(normalizeSupporterStatus(access, new Date(now))) : localStatus
  const template = `Živjo, podpiram Študentski Denar.\nPayPal transaction ID: \nEmail za licenco: ${authEmail ?? ''}\nIzbran dostop: supporter unlock`

  return (
    <div data-testid="supporter-page">
      <PageHeader title="Supporter dostop" eyebrow="Pošteno plačilo, brez lažnih donacij" />
      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Panel>
          <div className="flex items-start gap-3">
            <HeartHandshake className="mt-1 text-[var(--brand)]" size={24} aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold">Enkratni supporter unlock</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Plačilo naj bo označeno kot supporter dostop ali premium unlock. Ne uporabljaj besede donacija, če dostop odklene funkcije.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {['Več budget profilov', 'CSV izvoz', 'Napredni vpogledi', 'Dodatne teme', 'Arhiv mesecev', 'Supporter oznaka'].map((feature) => (
              <div key={feature} className="flex items-center gap-2 rounded-md bg-[var(--panel-muted)] p-3 text-sm font-medium">
                {supporter ? (
                  <CheckCircle2 size={16} className="text-[var(--brand)]" aria-hidden="true" />
                ) : (
                  <Lock size={16} className="text-[var(--muted)]" aria-hidden="true" />
                )}
                {feature}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="rounded-md bg-[var(--panel-muted)] p-3">
            <p className="text-sm text-[var(--muted)]">Status licence</p>
            <p className="mt-1 text-lg font-semibold">{status}</p>
            {authEmail && <p className="text-sm text-[var(--muted)]">Račun: {authEmail}</p>}
            {access?.plan_name && <p className="text-sm text-[var(--muted)]">Plan: {access.plan_name}</p>}
            {access?.expires_at && <p className="text-sm text-[var(--muted)]">Velja do {access.expires_at}</p>}
            {license?.expiresAt && <p className="text-sm text-[var(--muted)]">Velja do {license.expiresAt}</p>}
          </div>
          <h2 className="text-xl font-semibold">Lokalna licenca</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Prijavljenim uporabnikom dostop preverja baza. Podpisani license-token ostane samo fallback za lokalni/dev način.
          </p>
          <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
            <textarea
              className={`${inputClass} min-h-32 resize-y`}
              value={licenseInput}
              onChange={(e) => setLicenseInput(e.target.value)}
              placeholder="sd1...."
            />
            <Button type="submit">
              <KeyRound size={16} /> Preveri licenco
            </Button>
          </form>
          {message && <p className="mt-3 rounded-md bg-[var(--panel-muted)] p-3 text-sm">{message}</p>}
          {remoteMessage && <p className="mt-3 rounded-md bg-[var(--panel-muted)] p-3 text-sm">{remoteMessage}</p>}
          {supporter && license && (
            <div className="mt-4 rounded-md border border-[var(--line)] bg-white p-3">
              <p className="font-semibold">Supporter odklenjen</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Tier: {license.tier} - {license.lifetime ? 'lifetime' : `velja do ${license.expiresAt}`}
              </p>
              <Button className="mt-3" type="button" variant="secondary" onClick={onRemove}>
                Odstrani licenco
              </Button>
            </div>
          )}
        </Panel>
      </div>

      <Panel className="mt-4">
        <h2 className="text-xl font-semibold">PayPal ročna verifikacija</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Po supporter plačilu prek PayPala shrani samo varen transaction ID. Dostop se aktivira ročno, zato app ne hrani občutljivih plačilnih podatkov.
        </p>
        {authEmail && (
          <input
            className={`${inputClass} mt-3 w-full`}
            value={paymentReference}
            onChange={(event) => setPaymentReference(event.target.value)}
            placeholder="PayPal transaction ID ali druga varna referenca"
          />
        )}
        <textarea className={`${inputClass} mt-3 min-h-32 w-full`} readOnly value={template} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => navigator.clipboard?.writeText(template)}>
            Kopiraj sporocilo
          </Button>
          <Button type="button" onClick={markPending}>
            Označi kot poslano v preverjanje
          </Button>
        </div>
      </Panel>

      <Panel className="mt-4">
        <h2 className="text-xl font-semibold">Free vs Supporter</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div className="rounded-md border border-[var(--line)] bg-white p-3">
            <p className="font-semibold">Free</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Osnovni budget, stroški, prihodki, cimri, osnovni grafi in JSON backup.</p>
          </div>
          <div className="rounded-md border border-[var(--brand)] bg-white p-3">
            <p className="font-semibold">Supporter feature</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Pomaga ohraniti app brezplačen za študente in odklene naprednejša orodja.</p>
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 text-[var(--brand)]" size={22} aria-hidden="true" />
          <div>
            <h2 className="text-xl font-semibold">Zasebnost in realnost MVP-ja</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Budget podatki so še vedno lokalni. Pri prijavljenih uporabnikih supporter status prihaja iz baze in ga uporabnik ne more aktivirati sam.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  )
}
