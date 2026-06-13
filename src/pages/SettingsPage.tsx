import { Cloud, Download, FileText, Lock, Plus, Trash2, Upload } from 'lucide-react'
import type { FormEvent } from 'react'
import { Button, Field, inputClass } from '../components/FormControls'
import { PageHeader } from '../components/PageHeader'
import { SectionCard as Panel } from '../components/SectionCard'
import type { CloudSyncStatus } from '../hooks/useCloudSync'
import type { AppData, BudgetProfile, Theme } from '../types'

export function SettingsPage({
  data,
  supporter,
  activeProfile,
  profileForm,
  setProfileForm,
  createProfile,
  setActiveProfile,
  setTheme,
  exportJson,
  exportCsv,
  importJson,
  resetData,
  restartOnboarding,
  setBackupReminderDays,
  now,
  openSupporter,
  cloudSync,
}: {
  data: AppData
  supporter: boolean
  activeProfile: BudgetProfile
  profileForm: { name: string; month: string }
  setProfileForm: (value: { name: string; month: string }) => void
  createProfile: (event: FormEvent) => void
  setActiveProfile: (id: string) => void
  setTheme: (theme: Theme) => void
  exportJson: () => void
  exportCsv: () => void
  importJson: (file: File | null) => void
  resetData: () => void
  restartOnboarding: () => void
  setBackupReminderDays: (days: number) => void
  now: number
  openSupporter: () => void
  cloudSync: CloudSyncStatus
}) {
  const lastBackup = data.settings.lastBackupAt
    ? new Date(data.settings.lastBackupAt).toLocaleDateString('sl-SI')
    : 'še nikoli'
  const reminderDue =
    !data.settings.lastBackupAt ||
    now - new Date(data.settings.lastBackupAt).getTime() >
      data.settings.backupReminderDays * 24 * 60 * 60 * 1000

  return (
    <div data-testid="settings-page">
      <PageHeader title="Nastavitve in backup" eyebrow="Lokalni podatki, izvoz in profili" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <h2 className="text-xl font-semibold">Profili</h2>
          <Field label="Aktivni profil">
            <select className={`${inputClass} mt-3`} value={data.settings.activeProfileId} onChange={(e) => setActiveProfile(e.target.value)}>
              {data.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name} · {profile.month}</option>
              ))}
            </select>
          </Field>
          <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]" onSubmit={createProfile}>
            <Field label="Nov profil">
              <input className={inputClass} disabled={!supporter} value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="npr. Oktober v Ljubljani" />
            </Field>
            <Field label="Mesec">
              <input className={inputClass} disabled={!supporter} type="month" value={profileForm.month} onChange={(e) => setProfileForm({ ...profileForm, month: e.target.value })} />
            </Field>
            <div className="flex items-end">
              <Button className="w-full" type="submit" disabled={!supporter}>
                <Plus size={16} /> Ustvari
              </Button>
            </div>
          </form>
          {!supporter && (
            <Button className="mt-3" type="button" variant="secondary" onClick={openSupporter}>
              <Lock size={16} /> Več profilov je supporter funkcija
            </Button>
          )}
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold">Tema</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['default', 'sava', 'lipica', 'triglav'] as Theme[]).map((theme) => (
              <button
                key={theme}
                type="button"
                disabled={!supporter && theme !== 'default'}
                onClick={() => setTheme(theme)}
                className={`min-h-11 rounded-md border px-3 py-2 text-sm font-semibold ${
                  data.settings.theme === theme
                    ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                    : 'border-[var(--line)] bg-white text-[var(--ink)] disabled:opacity-50'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold">Backup</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Tvoji podatki so samo v tem brskalniku. Zadnji backup: {lastBackup}.
          </p>
          {reminderDue && (
            <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              Priporočilo: naredi svež JSON backup, preden menjaš napravo ali čistiš brskalnik.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={exportJson}>
              <Download size={16} /> JSON izvoz
            </Button>
            <Button type="button" variant="secondary" onClick={exportCsv}>
              <FileText size={16} /> CSV izvoz
            </Button>
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--panel-muted)] px-4 py-2 text-sm font-semibold">
              <Upload size={16} /> JSON uvoz
              <input className="sr-only" type="file" accept="application/json" onChange={(e) => importJson(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <Field label="Opomnik za backup">
            <select
              className={`${inputClass} mt-3`}
              value={data.settings.backupReminderDays}
              onChange={(event) => setBackupReminderDays(Number(event.target.value))}
            >
              <option value={7}>Vsakih 7 dni</option>
              <option value={14}>Vsakih 14 dni</option>
              <option value={30}>Vsakih 30 dni</option>
            </select>
          </Field>
          {!supporter && <p className="mt-3 text-sm text-[var(--muted)]">CSV izvoz je supporter funkcija. JSON backup je brezplačen.</p>}
        </Panel>

        <Panel>
          <div className="flex items-start gap-3" data-testid="cloud-sync-card">
            <Cloud className="mt-1 text-[var(--brand)]" size={22} aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold">Cloud Sync</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Sync is optional. Logged-out users stay local-only.
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-md bg-[var(--panel-muted)] p-3 text-sm">
            {cloudSync.userEmail ? (
              <>
                <p><strong>Account:</strong> {cloudSync.userEmail}</p>
                <p><strong>Status:</strong> {cloudSync.state}</p>
                <p>
                  <strong>Last cloud sync:</strong>{' '}
                  {cloudSync.lastCloudSyncAt
                    ? new Date(cloudSync.lastCloudSyncAt).toLocaleString('sl-SI')
                    : 'Never synced'}
                </p>
                <p><strong>Last local backup:</strong> {lastBackup}</p>
              </>
            ) : (
              <p>Not logged in. Your budget stays local in this browser and JSON export/import still works.</p>
            )}
          </div>
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Export backup before replacing data. Upload replaces cloud rows. Download replaces local rows on this device.
          </p>
          {cloudSync.error && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{cloudSync.error}</p>}
          {cloudSync.message && <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{cloudSync.message}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={exportJson}>
              <Download size={16} /> Export backup first
            </Button>
            <Button
              type="button"
              disabled={!cloudSync.userEmail || cloudSync.loading}
              onClick={() => {
                if (
                  cloudSync.state !== 'both-empty' &&
                  !confirm('Upload local data to cloud? This replaces existing cloud budget rows.')
                ) {
                  return
                }
                void cloudSync.uploadLocalToCloud()
              }}
            >
              <Upload size={16} /> Upload local data to cloud
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!cloudSync.userEmail || cloudSync.loading}
              onClick={() => {
                if (!confirm('Download cloud data to this device? Export a local backup first.')) return
                void cloudSync.downloadCloudToLocal()
              }}
            >
              <Download size={16} /> Download cloud data to this device
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!cloudSync.userEmail || cloudSync.loading}
              onClick={() => {
                if (!confirm('Merge local and cloud data? Items with different IDs are kept.')) return
                void cloudSync.mergeLocalAndCloud()
              }}
            >
              Merge local + cloud data
            </Button>
          </div>
          {cloudSync.loading && <p className="mt-3 text-sm text-[var(--muted)]">Syncing...</p>}
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold">Zasebnost in odgovornost</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Tvoji budget podatki ostanejo v brskalniku. Aplikacija ni davčno, pravno ali računovodsko svetovanje. Za prijavo prihodkov, PayPal prilive in obveznosti si odgovoren sam.
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Aktivni profil: {activeProfile.name}. Trenutno stanje za Survival Mode lahko popraviš z ponovnim onboardingom.
          </p>
          <Button className="mt-4 mr-2" type="button" variant="secondary" onClick={restartOnboarding}>
            Ponovno zaženi onboarding
          </Button>
          <Button className="mt-4" type="button" variant="danger" onClick={resetData}>
            <Trash2 size={16} /> Izbriši lokalne podatke
          </Button>
        </Panel>
      </div>
    </div>
  )
}
