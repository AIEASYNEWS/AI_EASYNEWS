import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adminServices, environmentCredential } from '../src/firebase.js'

test('local production mode fails before credential discovery when no credential file is configured', () => {
  for (const name of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST', 'GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'K_SERVICE', 'FUNCTION_TARGET', 'FUNCTION_NAME']) delete process.env[name]
  process.env.GCLOUD_PROJECT = 'ai-easynews'
  assert.throws(adminServices, { code: 'FIREBASE_NOT_CONFIGURED', status: 503 })
  process.env.GOOGLE_APPLICATION_CREDENTIALS = 'a-file-that-does-not-exist.local'
  assert.throws(adminServices, { code: 'FIREBASE_NOT_CONFIGURED', status: 503 })
})

test('hosted credentials reject malformed or mismatched accounts without exposing key material', () => {
  assert.equal(environmentCredential('ai-easynews', ''), undefined)
  assert.throws(() => environmentCredential('ai-easynews', 'private-invalid-json'), { code: 'FIREBASE_NOT_CONFIGURED' })
  assert.throws(() => environmentCredential('ai-easynews', JSON.stringify({ type: 'service_account', project_id: 'wrong-project', client_email: 'other@wrong-project.iam.gserviceaccount.com', private_key: 'private-invalid-key' })), error => error.code === 'FIREBASE_NOT_CONFIGURED' && !error.message.includes('private-invalid-key'))
})
