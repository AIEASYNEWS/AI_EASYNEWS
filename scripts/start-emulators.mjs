import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const env = { ...process.env, NO_UPDATE_NOTIFIER: '1', FIREBASE_EMULATORS_PATH: path.join(os.tmpdir(), 'easynews-firebase-emulators'), XDG_CONFIG_HOME: path.join(os.tmpdir(), 'easynews-firebase-config') }
const executable = process.platform === 'win32' ? 'java.exe' : 'java'
const candidates = [process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', executable) : null, 'java']
// IntelliJ bundles a compatible JBR. Detect installations next to this project
// without requiring a machine-specific path in the repository.
if (process.platform === 'win32') {
  const parent = path.dirname(process.cwd())
  for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
    if (entry.isDirectory() && /IntelliJ IDEA|Android Studio/.test(entry.name)) candidates.push(path.join(parent, entry.name, 'jbr', 'bin', executable))
  }
}
let java
for (const candidate of candidates.filter(Boolean)) {
  const result = spawnSync(candidate, ['-version'], { encoding: 'utf8', windowsHide: true })
  const version = `${result.stdout || ''}${result.stderr || ''}`.match(/version "(\d+)/)?.[1]
  if (Number(version) >= 21) { java = candidate; break }
}
if (!java) {
  console.error('Firebase Emulator에는 Java 21 이상이 필요합니다. JDK 21 경로를 JAVA_HOME에 설정한 뒤 다시 실행해 주세요.')
  process.exit(1)
}
if (java !== 'java') { env.JAVA_HOME = path.dirname(path.dirname(java)); env.PATH = `${path.dirname(java)}${path.delimiter}${env.PATH}` }
const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['-y', 'firebase-tools@latest', 'emulators:start', '--only', 'auth,firestore', '--project', 'demo-ai-easynews'], { env, stdio: 'inherit', windowsHide: true, shell: process.platform === 'win32' })
child.on('exit', code => process.exit(code ?? 1))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
