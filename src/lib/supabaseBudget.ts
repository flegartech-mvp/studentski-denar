import { supabase } from './auth'
import {
  createEmptyCloudPayload,
  type BudgetProfileCloudRow,
  type BudgetTransactionCloudRow,
  type CloudBudgetPayload,
  type RecurringExpenseCloudRow,
  type SyncMetadataCloudRow,
} from './cloudSync'

const TEST_CLOUD_KEY = 'studentski-denar:test-cloud:v1'

function isAutomatedBrowser() {
  return typeof navigator !== 'undefined' && navigator.webdriver
}

function readMockCloud(userId: string): CloudBudgetPayload {
  const forcedError = localStorage.getItem('studentski-denar:test-cloud-error')
  if (forcedError) throw new Error(forcedError)
  try {
    const raw = localStorage.getItem(TEST_CLOUD_KEY)
    if (!raw) return createEmptyCloudPayload(userId)
    const parsed = JSON.parse(raw) as CloudBudgetPayload
    return {
      profile: parsed.profile ?? null,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
      metadata: parsed.metadata ?? createEmptyCloudPayload(userId).metadata,
    }
  } catch {
    return createEmptyCloudPayload(userId)
  }
}

function writeMockCloud(payload: CloudBudgetPayload) {
  localStorage.setItem(TEST_CLOUD_KEY, JSON.stringify(payload))
}

export async function fetchCloudBudgetData(userId: string): Promise<CloudBudgetPayload> {
  if (!supabase) {
    if (isAutomatedBrowser()) return readMockCloud(userId)
    throw new Error('Supabase is not configured.')
  }

  const [profileResult, transactionResult, recurringResult, metadataResult] = await Promise.all([
    supabase.from('budget_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('budget_transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('recurring_expenses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('sync_metadata').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (profileResult.error) throw profileResult.error
  if (transactionResult.error) throw transactionResult.error
  if (recurringResult.error) throw recurringResult.error
  if (metadataResult.error) throw metadataResult.error

  return {
    profile: (profileResult.data as BudgetProfileCloudRow | null) ?? null,
    transactions: (transactionResult.data as BudgetTransactionCloudRow[] | null) ?? [],
    recurring: (recurringResult.data as RecurringExpenseCloudRow[] | null) ?? [],
    metadata: (metadataResult.data as SyncMetadataCloudRow | null) ?? null,
  }
}

export async function upsertBudgetProfile(profile: BudgetProfileCloudRow) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('budget_profiles').upsert(profile, { onConflict: 'user_id' })
  if (error) throw error
}

export async function upsertTransactions(transactions: BudgetTransactionCloudRow[]) {
  if (!supabase || transactions.length === 0) return
  const { error } = await supabase.from('budget_transactions').upsert(transactions, { onConflict: 'id' })
  if (error) throw error
}

export async function upsertRecurringExpenses(recurring: RecurringExpenseCloudRow[]) {
  if (!supabase || recurring.length === 0) return
  const { error } = await supabase.from('recurring_expenses').upsert(recurring, { onConflict: 'id' })
  if (error) throw error
}

async function upsertSyncMetadata(metadata: SyncMetadataCloudRow) {
  if (!supabase) return
  const { error } = await supabase.from('sync_metadata').upsert(metadata, { onConflict: 'user_id' })
  if (error) throw error
}

export async function deleteCloudBudgetData(userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const [transactions, recurring] = await Promise.all([
    supabase.from('budget_transactions').delete().eq('user_id', userId),
    supabase.from('recurring_expenses').delete().eq('user_id', userId),
  ])
  if (transactions.error) throw transactions.error
  if (recurring.error) throw recurring.error
}

export async function uploadCloudBudgetData(userId: string, payload: CloudBudgetPayload) {
  if (!payload.profile || !payload.metadata) throw new Error('Cloud payload is missing required data.')
  if (!supabase) {
    if (isAutomatedBrowser()) {
      writeMockCloud(payload)
      return payload
    }
    throw new Error('Supabase is not configured.')
  }

  await deleteCloudBudgetData(userId)
  await upsertBudgetProfile(payload.profile)
  await upsertTransactions(payload.transactions)
  await upsertRecurringExpenses(payload.recurring)
  await upsertSyncMetadata(payload.metadata)
  return fetchCloudBudgetData(userId)
}
