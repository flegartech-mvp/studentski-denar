import { createHash, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const args = new Map()
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1])
}

const email = args.get('--email')
const tier = args.get('--tier') ?? 'supporter'
const expires = args.get('--expires') ?? null
const lifetime = args.has('--lifetime')
const privateKeyPath = args.get('--key')
const privateKey =
  process.env.STUDENTSKI_DENAR_PRIVATE_KEY_PEM ??
  (privateKeyPath ? readFileSync(privateKeyPath, 'utf8') : null)

if (!email || !privateKey || (!expires && !lifetime)) {
  console.error(`Usage:
node scripts/generate-license.mjs --email ana@example.com --tier supporter --expires 2027-05-04 --key ./private-key.local.pem
node scripts/generate-license.mjs --email ana@example.com --tier lifetime --lifetime --key ./private-key.local.pem

Private key can also be provided with STUDENTSKI_DENAR_PRIVATE_KEY_PEM.
Do not commit the private key. Keep it outside src/ and use a .local.pem filename.`)
  process.exit(1)
}

const payload = {
  emailHash: createHash('sha256').update(email.trim().toLowerCase()).digest('hex'),
  tier,
  expiresAt: lifetime ? null : expires,
  lifetime,
  issuedAt: new Date().toISOString(),
}

const payloadBase64 = base64Url(Buffer.from(JSON.stringify(payload)))
const signature = sign('sha256', Buffer.from(payloadBase64), {
  key: privateKey,
  dsaEncoding: 'ieee-p1363',
})
const license = `sd1.${payloadBase64}.${base64Url(signature)}`

console.log(license)

function base64Url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
