import fs from 'node:fs'
import path from 'node:path'
import { createPrivateKey } from 'node:crypto'
import { fileURLToPath } from 'node:url'

// Keeps service credentials out of source code, console output and Git.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destination = path.join(root, '.firebase-admin.local')
const source = process.argv.slice(2).find(value => !value.startsWith('--'))
if (!source) {
  console.error('다운로드한 Firebase JSON 파일 경로를 입력해 주세요.')
  process.exit(1)
}
try {
  const input = fs.readFileSync(path.resolve(source), 'utf8')
  const credential = JSON.parse(input)
  if (credential.type !== 'service_account' || credential.project_id !== 'ai-easynews' ||
      typeof credential.client_email !== 'string' || !credential.client_email.endsWith('@ai-easynews.iam.gserviceaccount.com') ||
      typeof credential.private_key !== 'string') throw new Error('invalid credential')
  createPrivateKey(credential.private_key)
  if (fs.existsSync(destination)) {
    const existing = JSON.parse(fs.readFileSync(destination, 'utf8'))
    if (existing.private_key_id !== credential.private_key_id) throw new Error('destination exists')
  } else {
    const pending = path.join(root, '.firebase-admin.pending.local')
    fs.writeFileSync(pending, input, { mode: 0o600 })
    fs.renameSync(pending, destination)
  }
  const envPath = path.join(root, '.env.local')
  let env = fs.readFileSync(envPath, 'utf8')
  const values = { GOOGLE_APPLICATION_CREDENTIALS: JSON.stringify(destination.split(path.sep).join('/')) }
  if (process.argv.includes('--activate')) values.VITE_USE_FIREBASE_EMULATORS = 'false'
  for (const [name, value] of Object.entries(values)) {
    const pattern = new RegExp(`^${name}=.*$`, 'm')
    env = pattern.test(env) ? env.replace(pattern, `${name}=${value}`) : `${env.trimEnd()}\n${name}=${value}\n`
  }
  fs.writeFileSync(envPath, env)
  console.log('Firebase 서버 인증 파일을 저장하고 환경변수에 연결했습니다.')
} catch {
  console.error('Firebase 키를 연결하지 못했습니다. ai-easynews 프로젝트에서 내려받은 원본 JSON인지, 기존 인증 파일이 있는지 확인해 주세요.')
  process.exitCode = 1
}
