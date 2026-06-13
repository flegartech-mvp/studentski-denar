import type { AppData, BudgetProfile, ExpenseEntry, IncomeEntry, RecurringExpense } from '../types'
import { createDefaultData, normalizeAppData, normalizeProfile, uid } from './storage'

export type BudgetProfileCloudRow = {
  id?: string
  user_id: string
  monthly_income_estimate: number | string | null
  rent: number | string | null
  transport: number | string | null
  food_estimate: number | string | null
  roommates: boolean | null
  current_balance: number | string | null
  settings: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export type BudgetTransactionCloudRow = {
  id: string
  user_id: string
  type: 'income' | 'expense'
  amount: number | string
  category: string | null
  description: string | null
  date: string
  source: string | null
  metadata: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export type RecurringExpenseCloudRow = {
  id: string
  user_id: string
  name: string
  amount: number | string
  category: string | null
  due_day: number | null
  paid_months: string[] | null
  active: boolean | null
  metadata: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export type SyncMetadataCloudRow = {
  user_id: string
  last_sync_at: string | null
  last_pull_at: string | null
  last_push_at: string | null
  local_backup_recommended: boolean
  created_at?: string
  updated_at?: string
}

export type CloudBudgetPayload = {
  profile: BudgetProfileCloudRow | null
  transactions: BudgetTransactionCloudRow[]
  recurring: RecurringExpenseCloudRow[]
  metadata: SyncMetadataCloudRow | null
}

function numericOrNull(value: unknown) {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : null
  return typeof numberValue === 'number' && Number.isFinite(numberValue) ? numberValue : null
}

function positiveNumber(value: unknown) {
  const numberValue = numericOrNull(value)
  return numberValue !== null && numberValue > 0 ? numberValue : null
}

function textOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isoDateOrNull(value: unknown) {
  if (typeof value !== 'string') return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? value.slice(0, 10) : null
}

function getStoredAppData(settings: Record<string, unknown> | null) {
  const appData = settings?.app_data
  if (!appData || typeof appData !== 'object') return null
  return normalizeAppData(appData as Partial<AppData>, { defaultOnboardingCompleted: true })
}

function estimateRecurring(profile: BudgetProfile, category: string) {
  return profile.recurring
    .filter((entry) => entry.active && entry.category === category)
    .reduce((total, entry) => total + entry.amount, 0)
}

export function hasMeaningfulLocalData(data: AppData) {
  return data.profiles.some(
    (profile) =>
      profile.currentBalance !== null ||
      Object.keys(profile.budgetLimits).length > 0 ||
      profile.income.length > 0 ||
      profile.expenses.length > 0 ||
      profile.recurring.length > 0 ||
      profile.roommates.length > 0 ||
      profile.bills.length > 0,
  )
}

export function hasCloudBudgetData(payload: CloudBudgetPayload | null) {
  return Boolean(payload?.profile || payload?.transactions.length || payload?.recurring.length)
}

export function convertLocalToCloudPayload(
  data: AppData,
  userId: string,
  syncedAt = new Date().toISOString(),
): CloudBudgetPayload {
  const activeProfile =
    data.profiles.find((profile) => profile.id === data.settings.activeProfileId) ?? data.profiles[0]
  const incomeTotal = activeProfile.income.reduce((total, entry) => total + entry.amount, 0)

  return {
    profile: {
      user_id: userId,
      monthly_income_estimate: incomeTotal || null,
      rent: estimateRecurring(activeProfile, 'Dom / najemnina') || null,
      transport: estimateRecurring(activeProfile, 'Subvencioniran prevoz') || null,
      food_estimate: estimateRecurring(activeProfile, 'Hrana') || null,
      roommates: activeProfile.roommates.length > 0,
      current_balance: activeProfile.currentBalance,
      settings: {
        app_data: data,
        active_profile_id: data.settings.activeProfileId,
        uploaded_at: syncedAt,
        schema: 'studentski-denar:v1',
      },
    },
    transactions: data.profiles.flatMap((profile) => [
      ...profile.income.map((entry): BudgetTransactionCloudRow => ({
        id: entry.id,
        user_id: userId,
        type: 'income',
        amount: entry.amount,
        category: null,
        description: entry.note || null,
        date: entry.date,
        source: entry.source,
        metadata: {
          profile_id: profile.id,
          profile_name: profile.name,
          profile_month: profile.month,
          updated_at: syncedAt,
        },
      })),
      ...profile.expenses.map((entry): BudgetTransactionCloudRow => ({
        id: entry.id,
        user_id: userId,
        type: 'expense',
        amount: entry.amount,
        category: entry.category,
        description: entry.note || null,
        date: entry.date,
        source: null,
        metadata: {
          profile_id: profile.id,
          profile_name: profile.name,
          profile_month: profile.month,
          updated_at: syncedAt,
        },
      })),
    ]),
    recurring: data.profiles.flatMap((profile) =>
      profile.recurring.map((entry): RecurringExpenseCloudRow => ({
        id: entry.id,
        user_id: userId,
        name: entry.name,
        amount: entry.amount,
        category: entry.category,
        due_day: entry.dayOfMonth,
        paid_months: entry.paidMonths,
        active: entry.active,
        metadata: {
          profile_id: profile.id,
          profile_name: profile.name,
          profile_month: profile.month,
          updated_at: syncedAt,
        },
      })),
    ),
    metadata: {
      user_id: userId,
      last_sync_at: syncedAt,
      last_pull_at: null,
      last_push_at: syncedAt,
      local_backup_recommended: false,
    },
  }
}

function profileIdFromMetadata(row: { metadata: Record<string, unknown> | null }) {
  return textOrNull(row.metadata?.profile_id) ?? 'profile-cloud'
}

function ensureProfile(groups: Map<string, Partial<BudgetProfile>>, row: { metadata: Record<string, unknown> | null }) {
  const profileId = profileIdFromMetadata(row)
  const current = groups.get(profileId)
  if (current) return current
  const next: Partial<BudgetProfile> = {
    id: profileId,
    name: textOrNull(row.metadata?.profile_name) ?? 'Cloud budget',
    month: textOrNull(row.metadata?.profile_month) ?? new Date().toISOString().slice(0, 7),
    currentBalance: null,
    budgetLimits: {},
    income: [],
    expenses: [],
    recurring: [],
    roommates: [],
    bills: [],
  }
  groups.set(profileId, next)
  return next
}

export function convertCloudToLocalPayload(payload: CloudBudgetPayload | null): AppData | null {
  if (!payload || !hasCloudBudgetData(payload)) return null
  const stored = getStoredAppData(payload.profile?.settings ?? null)
  if (stored) return stored

  const profiles = new Map<string, Partial<BudgetProfile>>()

  for (const row of payload.transactions) {
    const amount = positiveNumber(row.amount)
    const date = isoDateOrNull(row.date)
    if (!row.id || !amount || !date || (row.type !== 'income' && row.type !== 'expense')) continue
    const profile = ensureProfile(profiles, row)
    if (row.type === 'income') {
      const income = (profile.income ?? []) as IncomeEntry[]
      income.push({
        id: row.id,
        amount,
        date,
        source: textOrNull(row.source) ?? 'Cloud income',
        note: textOrNull(row.description) ?? '',
      })
      profile.income = income
    } else {
      const expenses = (profile.expenses ?? []) as ExpenseEntry[]
      expenses.push({
        id: row.id,
        amount,
        date,
        category: textOrNull(row.category) ?? 'Drugo',
        note: textOrNull(row.description) ?? '',
      })
      profile.expenses = expenses
    }
  }

  for (const row of payload.recurring) {
    const amount = positiveNumber(row.amount)
    if (!row.id || !amount || !textOrNull(row.name)) continue
    const profile = ensureProfile(profiles, row)
    const recurring = (profile.recurring ?? []) as RecurringExpense[]
    recurring.push({
      id: row.id,
      name: row.name,
      amount,
      category: textOrNull(row.category) ?? 'Drugo',
      dayOfMonth: Math.min(31, Math.max(1, row.due_day ?? 1)),
      active: row.active ?? true,
      paidMonths: Array.isArray(row.paid_months) ? row.paid_months.filter((month) => typeof month === 'string') : [],
    })
    profile.recurring = recurring
  }

  if (profiles.size === 0 && payload.profile) {
    const fallback = createDefaultData()
    fallback.profiles[0].currentBalance = numericOrNull(payload.profile.current_balance)
    fallback.settings.onboardingCompleted = true
    return fallback
  }

  const normalizedProfiles = [...profiles.values()].map((profile) => normalizeProfile(profile))
  if (!normalizedProfiles.length) return null
  return {
    version: 1,
    settings: {
      ...createDefaultData().settings,
      activeProfileId: normalizedProfiles[0].id,
      onboardingCompleted: true,
      onboardingSkipped: false,
    },
    profiles: normalizedProfiles,
    license: null,
  }
}

export function validateCloudPayload(payload: CloudBudgetPayload | null) {
  if (!payload) return false
  return Array.isArray(payload.transactions) && Array.isArray(payload.recurring)
}

export function normalizeSyncedData(data: AppData | null) {
  if (!data) return null
  return normalizeAppData(data, { defaultOnboardingCompleted: true })
}

export function createEmptyCloudPayload(userId: string): CloudBudgetPayload {
  return {
    profile: null,
    transactions: [],
    recurring: [],
    metadata: {
      user_id: userId,
      last_sync_at: null,
      last_pull_at: null,
      last_push_at: null,
      local_backup_recommended: false,
    },
  }
}

export function makeLocalBackupFilename(profile: BudgetProfile) {
  return `studentski-denar-before-sync-${profile.month}-${uid('backup')}.json`
}
