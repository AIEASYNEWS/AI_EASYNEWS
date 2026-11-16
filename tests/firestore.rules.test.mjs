import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

let environment
before(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-ai-easynews', firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync('firestore.rules', 'utf8') } })
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, 'users/rules-owner'), { topicIds: ['economy'], completed: true })
    await setDoc(doc(db, 'users/rules-owner/articles/article1'), { title: '비공개 이력' })
    await setDoc(doc(db, 'users/rules-owner/usage/today'), { count: 3 })
  })
})
after(async () => { await environment?.cleanup() })

test('owners can read their profile and article history', async () => {
  const db = environment.authenticatedContext('rules-owner').firestore()
  const profile = await assertSucceeds(getDoc(doc(db, 'users/rules-owner')))
  assert.equal(profile.data().completed, true)
  await assertSucceeds(getDocs(collection(db, 'users/rules-owner/articles')))
})
test('unauthenticated and other users cannot enumerate profiles or read private history', async () => {
  for (const db of [environment.unauthenticatedContext().firestore(), environment.authenticatedContext('rules-attacker').firestore()]) {
    await assertFails(getDocs(collection(db, 'users')))
    await assertFails(getDoc(doc(db, 'users/rules-owner')))
    await assertFails(getDocs(collection(db, 'users/rules-owner/articles')))
  }
})
test('even owners cannot modify usage, privilege fields, schema or server-authored articles', async () => {
  const db = environment.authenticatedContext('rules-owner').firestore()
  await assertFails(getDoc(doc(db, 'users/rules-owner/usage/today')))
  await assertFails(updateDoc(doc(db, 'users/rules-owner'), { role: 'admin' }))
  await assertFails(updateDoc(doc(db, 'users/rules-owner'), { topicIds: 'invalid', completed: 'bad' }))
  await assertFails(updateDoc(doc(db, 'users/rules-owner'), { extraData: 'x'.repeat(200_000) }))
  await assertFails(setDoc(doc(db, 'users/rules-owner/usage/today'), { count: 0 }))
  await assertFails(deleteDoc(doc(db, 'users/rules-owner/articles/article1')))
  await assertFails(setDoc(doc(db, 'users/rules-attacker'), { ownerId: 'rules-owner', role: 'admin' }))
})
