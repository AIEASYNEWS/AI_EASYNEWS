import { AppError } from './errors.js'
import { getConfig } from './config.js'
import { adminServices } from './firebase.js'

const demoSubscription = uid => adminServices().db.collection('users').doc(uid).collection('entitlements').doc('demoSubscription')

export async function activateDemoSubscription(uid) {
  await demoSubscription(uid).set({ active: true })
}

/** App User IDs in the hosted checkout and the receipt API are the verified Firebase UID. */
export async function getSubscription(user, demo = false) {
  const key = process.env.REVENUECAT_API_KEY
  const entitlementId = process.env.REVENUECAT_ENTITLEMENT_ID
  const base = process.env.REVENUECAT_PURCHASE_URL
  const price = Number(process.env.SUBSCRIPTION_MONTHLY_KRW)
  const plan = {
    active: false, checkoutUrl: null, managementUrl: null,
    monthlyKrw: Number.isSafeInteger(price) && price > 0 ? price : null,
    dailyLimit: getConfig().freeDailyLimit,
  }
  if (user.anonymous) return plan
  if (demo) return { ...plan, active: (await demoSubscription(user.uid).get()).data()?.active === true, monthlyKrw: 0, demo: true }
  if (!key || !entitlementId) return plan
  const id = encodeURIComponent(user.uid)
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${id}`, {
    headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new AppError('SUBSCRIPTION_UNAVAILABLE', '구독 정보를 확인하지 못했어요. 다시 시도해 주세요.', 503)
  const { subscriber } = await response.json()
  const receipt = subscriber.entitlements?.[entitlementId]
  const active = Boolean(receipt && (receipt.expires_date === null ||
    Date.parse(receipt.expires_date) > Date.now() || Date.parse(receipt.grace_period_expires_date) > Date.now()))
  const checkoutUrl = !active && plan.monthlyKrw && base?.startsWith('https://') ? `${base.replace(/\/$/, '')}/${id}` : null
  return { ...plan, active, checkoutUrl, managementUrl: active && subscriber.management_url?.startsWith('https://') ? subscriber.management_url : null }
}
