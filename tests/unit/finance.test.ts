import { describe, expect, it } from 'vitest'
import type { BudgetProfile } from '../../src/types'
import {
  getCategoryBudgetProgress,
  getProfileTotals,
  getRecurringStatus,
  getSurvivalMode,
} from '../../src/lib/finance'
import { parseMoney, parseOptionalMoney } from '../../src/lib/money'
import { normalizeAppData, normalizeProfile } from '../../src/lib/storage'

function profile(overrides: Partial<BudgetProfile> = {}): BudgetProfile {
  return {
    id: 'p1',
    name: 'Test',
    month: '2026-05',
    currentBalance: null,
    budgetLimits: {},
    income: [],
    expenses: [],
    recurring: [],
    roommates: [],
    bills: [],
    ...overrides,
  }
}

describe('money parsing', () => {
  it('accepts decimal commas', () => {
    expect(parseMoney('12,50')).toBe(12.5)
  })

  it('rejects invalid, zero, infinity, and huge values', () => {
    expect(parseMoney('0')).toBeNull()
    expect(parseMoney('NaN')).toBeNull()
    expect(parseMoney('Infinity')).toBeNull()
    expect(parseMoney('100000000')).toBeNull()
  })

  it('allows empty optional money but rejects invalid optional values', () => {
    expect(parseOptionalMoney('')).toBeNull()
    expect(parseOptionalMoney('0')).toBe(0)
    expect(parseOptionalMoney('nope')).toBeNull()
  })
})

describe('finance calculations', () => {
  it('calculates totals and survival mode with unpaid recurring expenses', () => {
    const testProfile = profile({
      currentBalance: 86,
      income: [{ id: 'i1', amount: 500, date: '2026-05-01', source: 'Štipendija', note: '' }],
      expenses: [{ id: 'e1', amount: 100, date: '2026-05-02', category: 'Hrana', note: '' }],
      recurring: [
        {
          id: 'r1',
          name: 'Najemnina',
          amount: 120,
          category: 'Dom / najemnina',
          dayOfMonth: 5,
          active: true,
          paidMonths: [],
        },
      ],
    })
    const now = new Date('2026-05-20T12:00:00')
    const totals = getProfileTotals(testProfile, now)
    const survival = getSurvivalMode(testProfile, now)

    expect(totals.recurring).toBe(120)
    expect(survival.realBalance).toBe(-34)
    expect(survival.daysLeft).toBe(12)
    expect(survival.safeDaily).toBeCloseTo(-2.83, 2)
  })

  it('does not count paid recurring expenses in projection', () => {
    const recurring = {
      id: 'r1',
      name: 'Prevoz',
      amount: 25,
      category: 'Subvencioniran prevoz',
      dayOfMonth: 1,
      active: true,
      paidMonths: ['2026-05'],
    }
    const testProfile = profile({ recurring: [recurring] })

    expect(getRecurringStatus(recurring, '2026-05')).toBe('paid')
    expect(getProfileTotals(testProfile).recurring).toBe(0)
  })

  it('handles end of month without divide-by-zero', () => {
    const testProfile = profile({
      currentBalance: 31,
      income: [{ id: 'i1', amount: 31, date: '2026-02-01', source: 'Test', note: '' }],
      month: '2026-02',
    })
    const survival = getSurvivalMode(testProfile, new Date('2026-02-28T12:00:00'))

    expect(survival.daysLeft).toBe(1)
    expect(survival.safeDaily).toBe(31)
    expect(Number.isFinite(survival.safeDaily)).toBe(true)
  })

  it('tracks category budget progress and warnings', () => {
    const progress = getCategoryBudgetProgress(
      profile({
        budgetLimits: { Hrana: 100, Zabava: 50 },
        expenses: [
          { id: 'e1', amount: 90, date: '2026-05-02', category: 'Hrana', note: '' },
          { id: 'e2', amount: 60, date: '2026-05-03', category: 'Zabava', note: '' },
        ],
      }),
      new Date('2026-05-04T12:00:00'),
    )

    expect(progress.find((item) => item.category === 'Zabava')?.status).toBe('over')
    expect(progress.find((item) => item.category === 'Hrana')?.status).toBe('near')
  })
})

describe('backup normalization', () => {
  it('normalizes missing fields from old backups', () => {
    const normalized = normalizeProfile({ id: 'old', name: 'Old' })

    expect(normalized.id).toBe('old')
    expect(normalized.currentBalance).toBeNull()
    expect(normalized.recurring).toEqual([])
    expect(normalized.expenses).toEqual([])
  })

  it('normalizes imported app data with a fallback active profile and paid months', () => {
    const normalized = normalizeAppData(
      {
        settings: { activeProfileId: 'missing' } as never,
        profiles: [
          {
            id: 'p1',
            name: 'Imported',
            recurring: [
              {
                id: 'r1',
                name: 'Najemnina',
                amount: 120,
                category: 'Dom / najemnina',
                dayOfMonth: 5,
                active: true,
              } as never,
            ],
          },
        ],
      },
      { defaultOnboardingCompleted: true },
    )

    expect(normalized?.settings.activeProfileId).toBe('p1')
    expect(normalized?.settings.onboardingCompleted).toBe(true)
    expect(normalized?.profiles[0].recurring[0].paidMonths).toEqual([])
  })

  it('rejects app data without profiles', () => {
    expect(normalizeAppData({ profiles: [] }, { defaultOnboardingCompleted: false })).toBeNull()
  })
})
