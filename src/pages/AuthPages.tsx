import { Eye, EyeOff, LogOut, Mail, Save, ShieldCheck } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import {
  isSupabaseConfigured,
  sendPasswordReset,
  signInWithEmail,
  signUpWithEmail,
  updatePassword,
  validateEmail,
  validatePassword,
} from '../lib/auth'
import { normalizeSupporterStatus, supporterStatusLabel } from '../lib/supporterAccess'
import { Button, Field, inputClass } from '../components/FormControls'
import { PageHeader } from '../components/PageHeader'
import { SectionCard as Panel } from '../components/SectionCard'
import type { ProfileRow, SupporterAccessRow } from '../types'

type Navigate = (view: string) => void

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <Field label={label}>
      <div className="flex overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-sm">
        <input
          className="min-h-11 min-w-0 flex-1 px-3 py-2 text-sm outline-none"
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="grid min-h-11 w-12 place-items-center text-[var(--muted)]"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </Field>
  )
}

function AuthShell({ children, title, eyebrow }: { children: ReactNode; title: string; eyebrow: string }) {
  return (
    <div className="mx-auto max-w-xl" data-testid="auth-page">
      <PageHeader title={title} eyebrow={eyebrow} />
      <Panel>{children}</Panel>
      {!isSupabaseConfigured && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Supabase is not configured. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to enable real auth.
        </p>
      )}
    </div>
  )
}

function StatusMessage({ type, text }: { type: 'error' | 'success' | 'info'; text: string }) {
  const tone =
    type === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : type === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-[var(--line)] bg-[var(--panel-muted)] text-[var(--ink)]'
  return <p className={`rounded-md border p-3 text-sm ${tone}`}>{text}</p>
}

export function RegisterPage({ navigate }: { navigate: Navigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [termsConsent, setTermsConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    const passwordResult = validatePassword(password)
    if (!validateEmail(email)) return setMessage({ type: 'error', text: 'Enter a valid email address.' })
    if (!passwordResult.valid) return setMessage({ type: 'error', text: passwordResult.errors.join(' ') })
    if (password !== confirmPassword) return setMessage({ type: 'error', text: 'Passwords do not match.' })
    if (!termsConsent) return setMessage({ type: 'error', text: 'Accept the privacy and terms notice to continue.' })
    if (!isSupabaseConfigured) return setMessage({ type: 'error', text: 'Real registration needs Supabase env vars.' })

    setLoading(true)
    try {
      const { error } = await signUpWithEmail({ email, password, displayName, marketingConsent })
      if (error) throw error
      setMessage({ type: 'success', text: 'Check your email to verify your account.' })
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Registration failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Create account" eyebrow="Email verification is handled by Supabase Auth">
      <form className="grid gap-4" onSubmit={onSubmit} data-testid="register-page">
        <Field label="Email">
          <input className={inputClass} value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Display name">
          <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        <label className="flex items-start gap-2 text-sm">
          <input className="mt-1" type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} />
          Send me occasional product updates and student budgeting tips.
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input className="mt-1" type="checkbox" checked={termsConsent} onChange={(e) => setTermsConsent(e.target.checked)} />
          I understand the privacy notice and account terms.
        </label>
        {message && <StatusMessage {...message} />}
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </Button>
        <button type="button" className="text-sm font-semibold text-[var(--brand)]" onClick={() => navigate('login')}>
          Already have an account? Log in
        </button>
      </form>
    </AuthShell>
  )
}

export function LoginPage({ navigate }: { navigate: Navigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    if (!validateEmail(email)) return setMessage({ type: 'error', text: 'Enter a valid email address.' })
    if (!password) return setMessage({ type: 'error', text: 'Enter your password.' })
    if (!isSupabaseConfigured) return setMessage({ type: 'error', text: 'Real login needs Supabase env vars.' })

    setLoading(true)
    try {
      const { error } = await signInWithEmail(email, password)
      if (error) throw error
      setMessage({ type: 'success', text: 'Logged in.' })
      navigate('dashboard')
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Login failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Log in" eyebrow="Your session is stored by Supabase Auth">
      <form className="grid gap-4" onSubmit={onSubmit} data-testid="login-page">
        <Field label="Email">
          <input className={inputClass} value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        {message && <StatusMessage {...message} />}
        <Button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </Button>
        <div className="flex flex-wrap justify-between gap-3 text-sm font-semibold text-[var(--brand)]">
          <button type="button" onClick={() => navigate('register')}>
            Create account
          </button>
          <button type="button" onClick={() => navigate('forgot-password')}>
            Forgot password?
          </button>
        </div>
      </form>
    </AuthShell>
  )
}

export function ForgotPasswordPage({ navigate }: { navigate: Navigate }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    if (!validateEmail(email)) return setMessage({ type: 'error', text: 'Enter a valid email address.' })
    if (!isSupabaseConfigured) {
      return setMessage({
        type: 'success',
        text: 'If an account exists for that email, password reset instructions will arrive shortly.',
      })
    }

    setLoading(true)
    try {
      const { error } = await sendPasswordReset(email)
      if (error) throw error
      setMessage({
        type: 'success',
        text: 'If an account exists for that email, password reset instructions will arrive shortly.',
      })
    } catch {
      setMessage({
        type: 'success',
        text: 'If an account exists for that email, password reset instructions will arrive shortly.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Reset password" eyebrow="The response does not reveal whether an email exists">
      <form className="grid gap-4" onSubmit={onSubmit} data-testid="forgot-password-page">
        <Field label="Email">
          <input className={inputClass} value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {message && <StatusMessage {...message} />}
        <Button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset email'}
        </Button>
        <button type="button" className="text-sm font-semibold text-[var(--brand)]" onClick={() => navigate('login')}>
          Back to login
        </button>
      </form>
    </AuthShell>
  )
}

export function ResetPasswordPage({ navigate }: { navigate: Navigate }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const result = validatePassword(password)
    if (!result.valid) return setMessage({ type: 'error', text: result.errors.join(' ') })
    if (password !== confirmPassword) return setMessage({ type: 'error', text: 'Passwords do not match.' })
    if (!isSupabaseConfigured) return setMessage({ type: 'error', text: 'Password reset needs Supabase env vars.' })
    setLoading(true)
    try {
      const { error } = await updatePassword(password)
      if (error) throw error
      setMessage({ type: 'success', text: 'Password updated. You can log in with the new password.' })
      setPassword('')
      setConfirmPassword('')
      window.setTimeout(() => navigate('login'), 700)
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Password update failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Choose new password" eyebrow="Use the reset link from your email">
      <form className="grid gap-4" onSubmit={onSubmit} data-testid="reset-password-page">
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        {message && <StatusMessage {...message} />}
        <Button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  )
}

export function ChangePasswordPage({ navigate, email }: { navigate: Navigate; email: string | null }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const result = validatePassword(password)
    if (!currentPassword) return setMessage({ type: 'error', text: 'Enter your current password.' })
    if (!result.valid) return setMessage({ type: 'error', text: result.errors.join(' ') })
    if (password !== confirmPassword) return setMessage({ type: 'error', text: 'Passwords do not match.' })
    if (!isSupabaseConfigured) return setMessage({ type: 'error', text: 'Password change needs Supabase env vars.' })
    if (!email) return setMessage({ type: 'error', text: 'An active email/password session is required.' })
    setLoading(true)
    try {
      const reauth = await signInWithEmail(email, currentPassword)
      if (reauth.error) throw reauth.error
      const { error } = await updatePassword(password)
      if (error) throw error
      setMessage({ type: 'success', text: 'Password updated.' })
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Password update failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Change password" eyebrow="Logged-in account security">
      <form className="grid gap-4" onSubmit={onSubmit} data-testid="change-password-page">
        <PasswordField
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        {message && <StatusMessage {...message} />}
        <Button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Change password'}
        </Button>
        <button type="button" className="text-sm font-semibold text-[var(--brand)]" onClick={() => navigate('profile')}>
          Back to profile
        </button>
      </form>
    </AuthShell>
  )
}

export function ProfilePage({
  profile,
  access,
  email,
  onSave,
  onLogout,
  navigate,
}: {
  profile: ProfileRow | null
  access: SupporterAccessRow | null
  email: string | null
  onSave: (values: Pick<ProfileRow, 'display_name' | 'marketing_consent'>) => Promise<void>
  onLogout: () => Promise<void>
  navigate: Navigate
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [marketingConsent, setMarketingConsent] = useState(Boolean(profile?.marketing_consent))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null)
  const status = normalizeSupporterStatus(access)

  async function save(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      await onSave({ display_name: displayName.trim() || null, marketing_consent: marketingConsent })
      setMessage({ type: 'success', text: 'Profile updated.' })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Profile update failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid="profile-page">
      <PageHeader title="Account" eyebrow="Profile, email consent, and supporter access" />
      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Panel>
          <form className="grid gap-4" onSubmit={save}>
            <div className="flex items-start gap-3 rounded-md bg-[var(--panel-muted)] p-3">
              <Mail className="mt-1 text-[var(--brand)]" size={18} aria-hidden="true" />
              <div>
                <p className="text-sm text-[var(--muted)]">Email</p>
                <p className="font-semibold">{profile?.email ?? email ?? 'Unknown'}</p>
              </div>
            </div>
            <Field label="Display name">
              <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} />
              Receive promotional emails. Transactional account and payment emails may still be sent.
            </label>
            <p className="text-sm text-[var(--muted)]">
              Created: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('sl-SI') : 'Not available'}
            </p>
            {message && <StatusMessage {...message} />}
            <Button type="submit" disabled={loading}>
              <Save size={16} /> {loading ? 'Saving...' : 'Save profile'}
            </Button>
          </form>
        </Panel>
        <Panel>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 text-[var(--brand)]" size={20} aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold">Supporter status</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{supporterStatusLabel(status)}</p>
              {access?.expires_at && <p className="mt-1 text-sm text-[var(--muted)]">Expires {access.expires_at}</p>}
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('change-password')}>
              Change password
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('supporter')}>
              Supporter access
            </Button>
            <Button type="button" variant="danger" onClick={onLogout}>
              <LogOut size={16} /> Logout
            </Button>
          </div>
          <div className="mt-4 rounded-md border border-[var(--line)] bg-white p-3">
            <p className="font-semibold">Delete account request</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Contact support from the account email to request deletion. This avoids accidental destructive actions.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  )
}
