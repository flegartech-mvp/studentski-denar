import { generateKeyPairSync } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'

const outputPath = process.argv[2] ?? './private-key.local.pem'

if (existsSync(outputPath)) {
  console.error(`${outputPath} already exists. Move it or choose another path.`)
  process.exit(1)
}

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const publicPem = publicKey.export({ type: 'spki', format: 'pem' })
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' })

writeFileSync(outputPath, privatePem, { mode: 0o600 })

console.log(`Private key written to ${outputPath}`)
console.log('\nAdd this to .env.local before building/deploying:')
console.log(`VITE_SUPPORTER_PUBLIC_KEY_PEM=${JSON.stringify(publicPem.replace(/\n/g, '\\n'))}`)
