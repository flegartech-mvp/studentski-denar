import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, signOut as signOutWithSupabase, supabase } from '../lib/auth'
import { fetchProfile, fetchSupporterAccess, upsertOwnProfile } from '../lib/userData'
import type { ProfileRow, SupporterAccessRow } from '../types'

export type UseAuthResult = {
  user: User | null
  session: Session | null
  profile: ProfileRow | null
  supporterAccess: SupporterAccessRow | null
  loading: boolean
  error: string
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

function getProfileSeed(user: User) {
  return {
    id: user.id,
    email: user.email ?? '',
    display_name: (user.user_metadata.display_name as string | undefined) ?? null,
    marketing_consent: Boolean(user.user_metadata.marketing_consent),
  }
}

function getMockUserForAutomatedTests(): User | null {
  if (typeof navigator === 'undefined' || !navigator.webdriver) return null
  try {
    const email = localStorage.getItem('studentski-denar:test-auth-email')
    if (!email) return null
    return {
      id: '00000000-0000-4000-8000-000000000001',
      email,
      user_metadata: { display_name: 'Test User', marketing_consent: true },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date(0).toISOString(),
    } as User
  } catch {
    return null
  }
}

export function useAuth(): UseAuthResult {
  const mockUser = getMockUserForAutomatedTests()
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(mockUser)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [supporterAccess, setSupporterAccess] = useState<SupporterAccessRow | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')

  const loadProfileForUser = useCallback(async (activeUser: User | null) => {
    if (!supabase || !activeUser) {
      setProfile(null)
      setSupporterAccess(null)
      return
    }

    const nextProfile =
      (await fetchProfile(activeUser.id)) ?? (await upsertOwnProfile(getProfileSeed(activeUser)))
    const nextAccess = await fetchSupporterAccess(activeUser.id)
    setProfile(nextProfile)
    setSupporterAccess(nextAccess)
  }, [])

  const refreshProfile = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      await loadProfileForUser(user)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Account data could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [loadProfileForUser, user])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let mounted = true

    async function loadInitialSession() {
      setLoading(true)
      try {
        const { data } = await supabase!.auth.getSession()
        if (!mounted) return
        const nextSession = data.session ?? null
        setSession(nextSession)
        setUser(nextSession?.user ?? null)
        await loadProfileForUser(nextSession?.user ?? null)
      } catch (initialError) {
        if (mounted) {
          setError(initialError instanceof Error ? initialError.message : 'Session could not be loaded.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadInitialSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setError('')
      if (!nextSession?.user) {
        setProfile(null)
        setSupporterAccess(null)
        setLoading(false)
        return
      }
      setLoading(true)
      void loadProfileForUser(nextSession.user)
        .catch((profileError) => {
          if (mounted) {
            setError(profileError instanceof Error ? profileError.message : 'Account data could not be loaded.')
          }
        })
        .finally(() => {
          if (mounted) setLoading(false)
        })
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfileForUser])

  const signOut = useCallback(async () => {
    setError('')
    const { error: signOutError } = await signOutWithSupabase()
    if (signOutError) throw signOutError
    setSession(null)
    setUser(null)
    setProfile(null)
    setSupporterAccess(null)
  }, [])

  return {
    user,
    session,
    profile,
    supporterAccess,
    loading,
    error,
    signOut,
    refreshProfile,
  }
}
