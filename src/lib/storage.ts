import type { AppData, BudgetProfile } from '../types'
import { currentMonth } from './date'

export const STORAGE_KEY = 'studentski-denar:v1'

export const storage = {
  memory: new Map<string, string>(),
  getItem(key: string) {
    try {
      return localStorage.getItem(key) ?? this.memory.get(key) ?? null
    } catch {
      return this.memory.get(key) ?? null
    }
  },
  setItem(key: string, value: string) {
    this.memory.set(key, value)
    try {
      localStorage.setItem(key, value)
    } catch {
      // Private browsing or quota errors fall back to memory for this session.
    }
  },
  removeItem(key: string) {
    this.memory.delete(key)
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore storage removal failures; memory fallback is already cleared.
    }
  },
}

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export function createDefaultProfile(): BudgetProfile {
  return {
    id: uid('profile'),
    name: 'Moj mesec',
    month: currentMonth(),
    currentBalance: null,
    budgetLimits: {},
    income: [],
    expenses: [],
    recurring: [],
    roommates: [],
    bills: [],
  }
}

export function createDefaultData(): AppData {
  const profile = createDefaultProfile()
  return {
    version: 1,
    settings: {
      currency: 'EUR',
      language: 'sl',
      theme: 'default',
      activeProfileId: profile.id,
      onboardingCompleted: false,
      onboardingSkipped: false,
      lastBackupAt: null,
      backupReminderDays: 14,
      pendingSupporterAt: null,
    },
    profiles: [profile],
    license: null,
  }
}

export function normalizeProfile(profile: Partial<BudgetProfile>, fallbackMonth = currentMonth()): BudgetProfile {
  return {
    id: typeof profile.id === 'string' ? profile.id : uid('profile'),
    name: typeof profile.name === 'string' ? profile.name : 'Moj mesec',
    month: typeof profile.month === 'string' ? profile.month : fallbackMonth,
    currentBalance:
      typeof profile.currentBalance === 'number' && Number.isFinite(profile.currentBalance)
        ? profile.currentBalance
        : null,
    budgetLimits:
      profile.budgetLimits && typeof profile.budgetLimits === 'object'
        ? Object.fromEntries(
            Object.entries(profile.budgetLimits).filter(([, value]) => Number.isFinite(value) && value > 0),
          )
        : {},
    income: Array.isArray(profile.income) ? profile.income.filter((entry) => Number.isFinite(entry.amount)) : [],
    expenses: Array.isArray(profile.expenses)
      ? profile.expenses.filter((entry) => Number.isFinite(entry.amount))
      : [],
    recurring: Array.isArray(profile.recurring)
      ? profile.recurring
          .filter((entry) => Number.isFinite(entry.amount))
          .map((entry) => ({
            ...entry,
            paidMonths: Array.isArray(entry.paidMonths) ? entry.paidMonths : [],
          }))
      : [],
    roommates: Array.isArray(profile.roommates) ? profile.roommates : [],
    bills: Array.isArray(profile.bills) ? profile.bills.filter((bill) => Number.isFinite(bill.amount)) : [],
  }
}

export function normalizeAppData(
  parsed: Partial<AppData>,
  options: { defaultOnboardingCompleted: boolean },
): AppData | null {
  if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) return null
  const settings = parsed.settings
  const profiles = parsed.profiles.map((profile) => normalizeProfile(profile))
  const activeProfileId = profiles.some((profile) => profile.id === settings?.activeProfileId)
    ? settings!.activeProfileId
    : profiles[0].id

  return {
    version: 1,
    settings: {
      currency: 'EUR',
      language: 'sl',
      theme: settings?.theme ?? 'default',
      activeProfileId,
      onboardingCompleted: settings?.onboardingCompleted ?? options.defaultOnboardingCompleted,
      onboardingSkipped: settings?.onboardingSkipped ?? false,
      lastBackupAt: settings?.lastBackupAt ?? null,
      backupReminderDays: settings?.backupReminderDays ?? 14,
      pendingSupporterAt: settings?.pendingSupporterAt ?? null,
    },
    profiles,
    license: parsed.license ?? null,
  }
}

export function loadData(): AppData {
  const fallback = createDefaultData()
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<AppData>
    return normalizeAppData(parsed, { defaultOnboardingCompleted: false }) ?? fallback
  } catch {
    return fallback
  }
}

export function saveData(data: AppData) {
  storage.setItem(STORAGE_KEY, JSON.stringify(data))
}
