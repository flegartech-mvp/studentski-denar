import { describe, expect, it } from 'vitest'
import {
  convertCloudToLocalPayload,
  convertLocalToCloudPayload,
  hasCloudBudgetData,
  hasMeaningfulLocalData,
  type CloudBudgetPayload,
} from '../../src/lib/cloudSync'
import {
  detectLocalCloudState,
  mergeLocalAndCloudData,
  mergeRecurringExpenses,
  mergeTransactions,
  resolveUpdatedAtConflict,
} from '../../src/lib/syncMerge'
import type { AppData, BudgetProfile } from '../../src/types'

function profile(overrides: Partial<BudgetProfile> = {}): BudgetProfile {
  return {
    id: 'profile-1',
    name: 'May',
    month: '2026-05',
    currentBalance: 86,
    budgetLimits: {},
    income: [{ id: 'income-local-1', amount: 100, date: '2026-05-01', source: 'Stipendija', note: 'ok' }],
    expenses: [{ id: 'expense-local-1', amount: 12.5, date: '2026-05-02', category: 'Hrana', note: 'kava' }],
    recurring: [
      {
        id: 'recurring-local-1',
        name: 'Najemnina',
        amount: 120,
        category: 'Dom / najemnina',
        dayOfMonth: 5,
        active: true,
        paidMonths: ['2026-05'],
      },
    ],
    roommates: [],
    bills: [],
    ...overrides,
  }
}

function appData(overrides: Partial<AppData> = {}): AppData {
  return {
    version: 1,
    settings: {
      currency: 'EUR',
      language: 'sl',
      theme: 'default',
      activeProfileId: 'profile-1',
      onboardingCompleted: true,
      onboardingSkipped: false,
      lastBackupAt: null,
      backupReminderDays: 14,
      pendingSupporterAt: null,
    },
    profiles: [profile()],
    license: null,
    ...overrides,
  }
}

describe('cloud sync conversion', () => {
  it('converts local data to cloud rows while preserving string ids', () => {
    const payload = convertLocalToCloudPayload(appData(), 'user-1', '2026-05-05T00:00:00.000Z')

    expect(payload.profile?.user_id).toBe('user-1')
    expect(payload.transactions.map((row) => row.id)).toEqual(['income-local-1', 'expense-local-1'])
    expect(payload.recurring[0].id).toBe('recurring-local-1')
    expect(payload.profile?.settings?.app_data).toBeTruthy()
  })

  it('restores cloud snapshot back to local app data', () => {
    const local = appData()
    const payload = convertLocalToCloudPayload(local, 'user-1')
    const restored = convertCloudToLocalPayload(payload)

    expect(restored?.profiles[0].income[0].id).toBe('income-local-1')
    expect(restored?.profiles[0].recurring[0].paidMonths).toEqual(['2026-05'])
  })

  it('normalizes malformed cloud rows instead of crashing', () => {
    const payload: CloudBudgetPayload = {
      profile: null,
      transactions: [
        {
          id: 'bad',
          user_id: 'user-1',
          type: 'expense',
          amount: 'not-a-number',
          category: null,
          description: null,
          date: 'bad-date',
          source: null,
          metadata: {},
        },
        {
          id: 'good',
          user_id: 'user-1',
          type: 'expense',
          amount: '5.5',
          category: 'Hrana',
          description: 'snack',
          date: '2026-05-03',
          source: null,
          metadata: { profile_id: 'profile-cloud' },
        },
      ],
      recurring: [],
      metadata: null,
    }

    const restored = convertCloudToLocalPayload(payload)
    expect(restored?.profiles[0].expenses).toHaveLength(1)
    expect(restored?.profiles[0].expenses[0].id).toBe('good')
  })
})

describe('cloud sync merge and state detection', () => {
  it('detects empty, local-only, cloud-only, and both data states', () => {
    const emptyLocal = appData({ profiles: [profile({ currentBalance: null, income: [], expenses: [], recurring: [] })] })
    const cloud = convertLocalToCloudPayload(appData(), 'user-1')

    expect(detectLocalCloudState(emptyLocal, null)).toBe('both-empty')
    expect(detectLocalCloudState(appData(), null)).toBe('local-only')
    expect(detectLocalCloudState(emptyLocal, cloud)).toBe('cloud-only')
    expect(detectLocalCloudState(appData(), cloud)).toBe('both-have-data')
    expect(hasMeaningfulLocalData(appData())).toBe(true)
    expect(hasCloudBudgetData(cloud)).toBe(true)
  })

  it('keeps different transaction and recurring ids during merge', () => {
    expect(
      mergeTransactions(
        [{ id: 'a', amount: 1, date: '2026-05-01', source: 'A', note: '' }],
        [{ id: 'b', amount: 2, date: '2026-05-02', source: 'B', note: '' }],
      ).map((entry) => entry.id),
    ).toEqual(['a', 'b'])

    expect(
      mergeRecurringExpenses(
        [{ id: 'r1', name: 'A', amount: 1, category: 'Dom', dayOfMonth: 1, active: true, paidMonths: [] }],
        [{ id: 'r2', name: 'B', amount: 2, category: 'Dom', dayOfMonth: 2, active: true, paidMonths: [] }],
      ).map((entry) => entry.id),
    ).toEqual(['r1', 'r2'])
  })

  it('uses newer updated_at only for explicit conflict resolution', () => {
    expect(resolveUpdatedAtConflict('local', 'cloud', '2026-05-01', '2026-05-02')).toBe('cloud')
    expect(resolveUpdatedAtConflict('local', 'cloud', '2026-05-03', '2026-05-02')).toBe('local')
  })

  it('merges cloud data into local app data without deleting local-only entries', () => {
    const local = appData()
    const cloudData = appData({
      profiles: [
        profile({
          income: [{ id: 'income-cloud-1', amount: 50, date: '2026-05-03', source: 'Cloud', note: '' }],
          expenses: [],
          recurring: [],
        }),
      ],
    })
    const merged = mergeLocalAndCloudData(local, convertLocalToCloudPayload(cloudData, 'user-1'))

    expect(merged.profiles[0].income.map((entry) => entry.id)).toEqual(['income-local-1', 'income-cloud-1'])
    expect(merged.profiles[0].expenses[0].id).toBe('expense-local-1')
  })
})
