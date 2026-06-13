import type { AppData, BudgetProfile, ExpenseEntry, IncomeEntry, RecurringExpense } from '../types'
import { convertCloudToLocalPayload, hasCloudBudgetData, hasMeaningfulLocalData, type CloudBudgetPayload } from './cloudSync'
import { normalizeProfile } from './storage'

export type SyncState = 'both-empty' | 'local-only' | 'cloud-only' | 'both-have-data'

export function detectLocalCloudState(local: AppData, cloud: CloudBudgetPayload | null): SyncState {
  const localHasData = hasMeaningfulLocalData(local)
  const cloudHasData = hasCloudBudgetData(cloud)
  if (localHasData && cloudHasData) return 'both-have-data'
  if (localHasData) return 'local-only'
  if (cloudHasData) return 'cloud-only'
  return 'both-empty'
}

function timestamp(value: string | null | undefined) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function resolveUpdatedAtConflict<T>(
  localItem: T,
  cloudItem: T,
  localUpdatedAt?: string | null,
  cloudUpdatedAt?: string | null,
): T {
  const localTime = timestamp(localUpdatedAt)
  const cloudTime = timestamp(cloudUpdatedAt)
  if (cloudTime > localTime) return cloudItem
  return localItem
}

function mergeById<T extends { id: string }>(
  localItems: T[],
  cloudItems: T[],
  getLocalUpdatedAt: (item: T) => string | null | undefined = () => null,
  getCloudUpdatedAt: (item: T) => string | null | undefined = () => null,
) {
  const merged = new Map<string, T>()
  for (const item of localItems) merged.set(item.id, item)
  for (const item of cloudItems) {
    const existing = merged.get(item.id)
    if (!existing) {
      merged.set(item.id, item)
      continue
    }
    merged.set(item.id, resolveUpdatedAtConflict(existing, item, getLocalUpdatedAt(existing), getCloudUpdatedAt(item)))
  }
  return [...merged.values()]
}

export function mergeTransactions<T extends IncomeEntry | ExpenseEntry>(localItems: T[], cloudItems: T[]) {
  return mergeById(localItems, cloudItems)
}

export function mergeRecurringExpenses(localItems: RecurringExpense[], cloudItems: RecurringExpense[]) {
  return mergeById(localItems, cloudItems)
}

function mergeProfiles(localProfile: BudgetProfile, cloudProfile: BudgetProfile): BudgetProfile {
  return normalizeProfile({
    ...localProfile,
    name: localProfile.name || cloudProfile.name,
    month: localProfile.month || cloudProfile.month,
    currentBalance: localProfile.currentBalance ?? cloudProfile.currentBalance,
    budgetLimits: { ...cloudProfile.budgetLimits, ...localProfile.budgetLimits },
    income: mergeTransactions(localProfile.income, cloudProfile.income),
    expenses: mergeTransactions(localProfile.expenses, cloudProfile.expenses),
    recurring: mergeRecurringExpenses(localProfile.recurring, cloudProfile.recurring),
    roommates: localProfile.roommates.length ? localProfile.roommates : cloudProfile.roommates,
    bills: localProfile.bills.length ? localProfile.bills : cloudProfile.bills,
  })
}

export function mergeLocalAndCloudData(local: AppData, cloud: CloudBudgetPayload | null): AppData {
  const cloudData = convertCloudToLocalPayload(cloud)
  if (!cloudData) return local

  const profiles = new Map<string, BudgetProfile>()
  for (const profile of local.profiles) profiles.set(profile.id, profile)
  for (const profile of cloudData.profiles) {
    const existing = profiles.get(profile.id)
    profiles.set(profile.id, existing ? mergeProfiles(existing, profile) : profile)
  }

  const mergedProfiles = [...profiles.values()]
  const activeProfileId = mergedProfiles.some((profile) => profile.id === local.settings.activeProfileId)
    ? local.settings.activeProfileId
    : mergedProfiles[0].id

  return {
    ...local,
    settings: {
      ...local.settings,
      activeProfileId,
      onboardingCompleted: local.settings.onboardingCompleted || cloudData.settings.onboardingCompleted,
      onboardingSkipped: local.settings.onboardingSkipped && !cloudData.settings.onboardingCompleted,
    },
    profiles: mergedProfiles,
    license: local.license ?? cloudData.license,
  }
}
