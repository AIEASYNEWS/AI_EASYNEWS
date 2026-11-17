import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { getSubscription } from '../src/subscription.js'

const names = ['REVENUECAT_API_KEY', 'REVENUECAT_ENTITLEMENT_ID', 'REVENUECAT_PURCHASE_URL', 'SUBSCRIPTION_MONTHLY_KRW']
const original = Object.fromEntries(names.map(name => [name, process.env[name]]))
afterEach(() => {
  for (const [name, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})
const member = { uid: 'firebase-member', anonymous: false }
function configure() {
  Object.assign(process.env, {
    REVENUECAT_API_KEY: 'test-key', REVENUECAT_ENTITLEMENT_ID: 'unlimited',
    REVENUECAT_PURCHASE_URL: 'https://billing.example/checkout', SUBSCRIPTION_MONTHLY_KRW: '3000',
  })
}
test('unconfigured product and guest sessions cannot start checkout', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('unexpected provider call'))
  for (const name of names) delete process.env[name]
  const pending = await getSubscription(member)
  assert.equal(pending.active, false)
  assert.equal(pending.monthlyKrw, null)
  assert.equal(pending.checkoutUrl, null)
  configure()
  assert.equal((await getSubscription({ ...member, anonymous: true })).checkoutUrl, null)
})
test('verified entitlement expiry and grace period determine unlimited access', async t => {
  configure()
  let receipt
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.revenuecat.com/v1/subscribers/firebase-member')
    assert.equal(options.headers.Authorization, 'Bearer test-key')
    return Response.json({ subscriber: { entitlements: { unlimited: receipt }, management_url: 'https://billing.example/manage' } })
  })
  for (const value of [undefined, { expires_date: '2000-01-01' }, {}]) {
    receipt = value
    const plan = await getSubscription(member)
    assert.equal(plan.active, false)
    assert.equal(plan.checkoutUrl, 'https://billing.example/checkout/firebase-member')
    assert.equal(plan.managementUrl, null)
  }
  for (const value of [{ expires_date: null }, { expires_date: '2099-01-01' }, { expires_date: '2000-01-01', grace_period_expires_date: '2099-01-01' }]) {
    receipt = value
    const plan = await getSubscription(member)
    assert.equal(plan.active, true)
    assert.equal(plan.checkoutUrl, null)
    assert.equal(plan.managementUrl, 'https://billing.example/manage')
  }
})
test('provider failures never grant paid access', async t => {
  configure()
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 500 }))
  await assert.rejects(getSubscription(member), { code: 'SUBSCRIPTION_UNAVAILABLE' })
})
