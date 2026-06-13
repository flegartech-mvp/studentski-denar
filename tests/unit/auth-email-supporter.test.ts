import { describe, expect, it } from 'vitest'
import { filterMarketingRecipients, canSendPromotionalEmail, buildUnsubscribeText } from '../../src/lib/email'
import { getAuthViewFromUrlHash, validateEmail, validatePassword } from '../../src/lib/auth'
import { hasActiveSupporterAccess, normalizeSupporterStatus } from '../../src/lib/supporterAccess'
import type { SupporterAccessRow } from '../../src/types'

function access(overrides: Partial<SupporterAccessRow>): SupporterAccessRow {
  return {
    id: 'a1',
    user_id: 'u1',
    status: 'free',
    plan_name: 'free',
    starts_at: null,
    expires_at: null,
    payment_provider: null,
    payment_reference: null,
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    ...overrides,
  }
}

describe('auth validation', () => {
  it('rejects invalid emails and weak passwords', () => {
    expect(validateEmail('ana@example.com')).toBe(true)
    expect(validateEmail('bad')).toBe(false)
    expect(validatePassword('weak').valid).toBe(false)
    expect(validatePassword('Strong-pass-123').valid).toBe(true)
  })

  it('detects recovery hashes from Supabase redirect URLs', () => {
    expect(getAuthViewFromUrlHash('#access_token=abc&type=recovery')).toBe('reset-password')
    expect(getAuthViewFromUrlHash('#reset-password')).toBe('reset-password')
  })
})

describe('email consent logic', () => {
  it('only returns opted-in marketing recipients', () => {
    expect(
      filterMarketingRecipients([
        { email: 'yes@example.com', marketing_consent: true },
        { email: 'no@example.com', marketing_consent: false },
      ] as never),
    ).toEqual(['yes@example.com'])
  })

  it('separates promotional consent from transactional email', () => {
    expect(canSendPromotionalEmail({ marketing_consent: false })).toBe(false)
    expect(canSendPromotionalEmail({ marketing_consent: true })).toBe(true)
    expect(buildUnsubscribeText('https://app.example')).toContain('#profile')
  })
})

describe('database supporter access', () => {
  it('recognizes active, expiring, expired, pending, and free states', () => {
    const now = new Date('2026-05-05T00:00:00.000Z')
    expect(normalizeSupporterStatus(access({ status: 'active' }), now)).toBe('active')
    expect(normalizeSupporterStatus(access({ status: 'active', expires_at: '2026-05-10T00:00:00.000Z' }), now)).toBe('expiring_soon')
    expect(normalizeSupporterStatus(access({ status: 'active', expires_at: '2026-05-01T00:00:00.000Z' }), now)).toBe('expired')
    expect(normalizeSupporterStatus(access({ status: 'pending' }), now)).toBe('pending')
    expect(hasActiveSupporterAccess(access({ status: 'pending' }), now)).toBe(false)
  })
})
