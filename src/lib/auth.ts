import { createClient, type Session, type User } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
const isAutomatedBrowser = typeof navigator !== 'undefined' && navigator.webdriver

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey && !isAutomatedBrowser)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null

export type AuthSnapshot = {
  session: Session | null
  user: User | null
  loading: boolean
}

export type PasswordValidation = {
  valid: boolean
  errors: string[]
}

export function getAppUrl() {
  return (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '') ?? window.location.origin
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []
  if (password.length < 10) errors.push('Use at least 10 characters.')
  if (!/[a-z]/.test(password)) errors.push('Add a lowercase letter.')
  if (!/[A-Z]/.test(password)) errors.push('Add an uppercase letter.')
  if (!/[0-9]/.test(password)) errors.push('Add a number.')
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Add a symbol.')
  return { valid: errors.length === 0, errors }
}

export function getAuthViewFromUrlHash(hash = window.location.hash) {
  const normalized = hash.replace(/^#/, '')
  if (normalized.includes('type=recovery') || normalized === 'reset-password') return 'reset-password'
  if (normalized.includes('type=signup') || normalized.includes('type=email_change')) return 'profile'
  return null
}

export async function signUpWithEmail({
  email,
  password,
  displayName,
  marketingConsent,
}: {
  email: string
  password: string
  displayName: string
  marketingConsent: boolean
}) {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        display_name: displayName.trim() || null,
        marketing_consent: marketingConsent,
      },
      emailRedirectTo: `${getAppUrl()}/#profile`,
    },
  })
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase.auth.signInWithPassword({ email: email.trim(), password })
}

export async function sendPasswordReset(email: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${getAppUrl()}/#reset-password`,
  })
}

export async function updatePassword(password: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase.auth.updateUser({ password })
}

export async function signOut() {
  if (!supabase) return { error: null }
  return supabase.auth.signOut()
}
