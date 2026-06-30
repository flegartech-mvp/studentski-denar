import type { SupporterAccessRow, SupporterStatus } from '../types'

export function normalizeSupporterStatus(access: SupporterAccessRow | null, now = new Date()): SupporterStatus {
  if (!access) return 'free'
  if (access.status === 'active' || access.status === 'expiring_soon') {
    if (!access.expires_at) return access.status
    const expiresAt = new Date(access.expires_at)
    if (expiresAt < now) return 'expired'
    const fourteenDays = 14 * 24 * 60 * 60 * 1000
    if (expiresAt.getTime() - now.getTime() <= fourteenDays) return 'expiring_soon'
    return 'active'
  }
  return access.status
}

export function hasActiveSupporterAccess(access: SupporterAccessRow | null, now = new Date()) {
  const status = normalizeSupporterStatus(access, now)
  return status === 'active' || status === 'expiring_soon'
}

export function supporterStatusLabel(status: SupporterStatus) {
  switch (status) {
    case 'active':
      return 'Aktiven supporter'
    case 'expiring_soon':
      return 'Kmalu poteče'
    case 'expired':
      return 'Poteklo'
    case 'pending':
      return 'V preverjanju'
    default:
      return 'Free uporabnik'
  }
}
