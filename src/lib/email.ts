import type { ProfileRow } from '../types'

export type EmailKind =
  | 'welcome'
  | 'supporter_pending'
  | 'supporter_approved'
  | 'license_expiring_soon'
  | 'license_expired'
  | 'promotional'

export function filterMarketingRecipients(profiles: Pick<ProfileRow, 'email' | 'marketing_consent'>[]) {
  return profiles.filter((profile) => profile.marketing_consent).map((profile) => profile.email)
}

export function canSendPromotionalEmail(profile: Pick<ProfileRow, 'marketing_consent'> | null) {
  return Boolean(profile?.marketing_consent)
}

export function buildUnsubscribeText(appUrl: string) {
  return `You are receiving this because you opted in. To unsubscribe, open ${appUrl}/#profile and turn off marketing emails.`
}
