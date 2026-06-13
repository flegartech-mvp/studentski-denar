import { CheckCircle2, Sparkles } from 'lucide-react'
import type { FormEvent } from 'react'
import { Button, Field, inputClass } from '../components/FormControls'
import { PageHeader } from '../components/PageHeader'
import { SectionCard as Panel } from '../components/SectionCard'
import type { OnboardingForm } from '../types'

export function OnboardingPage({
  form,
  setForm,
  onSubmit,
  onSkip,
}: {
  form: OnboardingForm
  setForm: (form: OnboardingForm) => void
  onSubmit: (event: FormEvent) => void
  onSkip: () => void
}) {
  const numberField = (
    key: keyof OnboardingForm,
    label: string,
    placeholder: string,
    optional = false,
  ) => (
    <Field label={`${label}${optional ? ' (neobvezno)' : ''}`}>
      <input
        className={inputClass}
        type="text"
        inputMode="decimal"
        value={String(form[key])}
        onChange={(event) => setForm({ ...form, [key]: event.target.value })}
        placeholder={placeholder}
      />
    </Field>
  )

  return (
    <div data-testid="onboarding-page" className="mx-auto max-w-3xl">
      <PageHeader title="Nastavi prvi mesec v 60 sekundah" eyebrow="Hiter začetek">
        <Button type="button" variant="secondary" onClick={onSkip}>
          Preskoči
        </Button>
      </PageHeader>
      <Panel>
        <div className="mb-5 flex items-start gap-3 rounded-lg bg-[var(--panel-muted)] p-4">
          <Sparkles className="mt-1 text-[var(--brand)]" size={22} aria-hidden="true" />
          <div>
            <p className="font-semibold">Naj app ne začne prazen.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Vpiši približne številke. Kasneje lahko vse popraviš ali ponovno zaženeš onboarding v nastavitvah.
            </p>
          </div>
        </div>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            {numberField('monthlyIncome', 'Mesečni prihodki skupaj', 'npr. 650')}
            {numberField('currentBalance', 'Trenutno na voljo', 'npr. 86', true)}
            {numberField('rent', 'Dom / najemnina', 'npr. 280')}
            {numberField('transport', 'Prevoz', 'npr. 25')}
            {numberField('food', 'Hrana, boni, malica', 'npr. 220')}
            {numberField('scholarship', 'Štipendija', 'npr. 120', true)}
            {numberField('studentWork', 'Študentsko delo', 'npr. 350', true)}
          </div>
          <label className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-white p-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.hasRoommates}
              onChange={(event) => setForm({ ...form, hasRoommates: event.target.checked })}
            />
            Imam cimre in želim začetno delitev 50/50
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" data-testid="complete-onboarding">
              <CheckCircle2 size={16} /> Ustvari moj prvi budget
            </Button>
            <Button type="button" variant="secondary" data-testid="skip-onboarding" onClick={onSkip}>
              Začni prazno
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
