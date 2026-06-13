import { supabase } from './auth'
import type { ProfileRow, SupporterAccessRow } from '../types'

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function upsertOwnProfile(profile: Pick<ProfileRow, 'id' | 'email'> & Partial<ProfileRow>) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name ?? null,
      marketing_consent: profile.marketing_consent ?? false,
    })
    .select('*')
    .single()
  if (error?.code === '23505') {
    const existing = await fetchProfile(profile.id)
    if (existing) return existing
  }
  if (error) throw error
  return data as ProfileRow
}

export async function updateOwnProfile(values: Pick<ProfileRow, 'display_name' | 'marketing_consent'>) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('An active session is required.')
  const { data, error } = await supabase
    .from('profiles')
    .update(values)
    .eq('id', user.id)
    .select('*')
    .single()
  if (error) throw error
  return data as ProfileRow
}

export async function fetchSupporterAccess(userId: string): Promise<SupporterAccessRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('supporter_access')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function submitSupporterRequest(paymentReference: string, planName = 'supporter unlock') {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.rpc('submit_supporter_request', {
    p_payment_reference: paymentReference.trim(),
    p_plan_name: planName,
  })
  if (error) throw error
}
