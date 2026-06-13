import type { SupporterLicense, LicensePayload } from '../types'

export const defaultPublicKeyPem = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEUueu2Hx7rrgh9v+icWM4gCWN/dwQ
SVA4RQfkPX/9x9c/9FP/w1AhatgFLpcO+n7Y0I5V1n18wxwrZXdi4Sd/Uw==
-----END PUBLIC KEY-----`

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function pemToArrayBuffer(pem: string) {
  const body = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '')
  return base64UrlToBytes(body.replace(/\+/g, '-').replace(/\//g, '_')).buffer
}

export async function verifyLicenseKey(
  rawLicense: string,
  publicKeyPem: string,
): Promise<{ license: SupporterLicense | null; message: string }> {
  const parts = rawLicense.trim().split('.')
  if (parts.length !== 3 || parts[0] !== 'sd1') {
    return { license: null, message: 'Licenca mora imeti obliko sd1.payload.signature.' }
  }

  try {
    const payloadText = new TextDecoder().decode(base64UrlToBytes(parts[1]))
    const payload = JSON.parse(payloadText) as LicensePayload
    const signature = base64UrlToBytes(parts[2])
    const key = await crypto.subtle.importKey(
      'spki',
      pemToArrayBuffer(publicKeyPem),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    )
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signature,
      new TextEncoder().encode(parts[1]),
    )
    if (!valid) return { license: null, message: 'Podpis licence ni veljaven.' }
    if (!payload.lifetime && payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
      return { license: null, message: 'Licenca je potekla.' }
    }
    return {
      license: {
        raw: rawLicense.trim(),
        emailHash: payload.emailHash,
        tier: payload.tier,
        expiresAt: payload.expiresAt ?? null,
        lifetime: Boolean(payload.lifetime),
        issuedAt: payload.issuedAt,
        signature: parts[2],
        activatedAt: new Date().toISOString(),
      },
      message: 'Supporter dostop je odklenjen.',
    }
  } catch {
    return { license: null, message: 'Licence ni bilo mogoče prebrati.' }
  }
}

export function isSupporter(license: SupporterLicense | null) {
  if (!license) return false
  if (license.lifetime) return true
  if (!license.expiresAt) return false
  return new Date(license.expiresAt) >= new Date()
}
