export const TOPIC_IDS = ['economy', 'politics', 'society', 'technology', 'health', 'culture', 'lifestyle']

export function getConfig() {
  const naverHubClientId = process.env.NAVER_API_HUB_CLIENT_ID?.trim()
  const naverHubClientSecret = process.env.NAVER_API_HUB_CLIENT_SECRET?.trim()
  const deploymentOrigins = [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter(host => host && /^[a-z0-9.-]+\.vercel\.app$/i.test(host)).map(host => `https://${host}`)
  return {
    projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'demo-ai-easynews',
    aiKey: process.env.MONOROUTER_API_KEY?.trim() || '',
    aiModel: process.env.MONOROUTER_MODEL?.trim() || '',
    aiBaseUrl: (process.env.MONOROUTER_BASE_URL || 'https://monogpt.kr/api/monorouter/v1').replace(/\/$/, ''),
    freeDailyLimit: Math.max(1, Number(process.env.FREE_DAILY_LIMIT) || 3),
    allowedOrigins: [...new Set([...(process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,https://ai-easynews.vercel.app').split(',').map(value => value.trim()), ...deploymentOrigins])],
    rssFeeds: (process.env.NEWS_RSS_FEEDS || '').split(',').map(value => value.trim()).filter(Boolean),
    naverHub: naverHubClientId && naverHubClientSecret ? { clientId: naverHubClientId, clientSecret: naverHubClientSecret } : null,
  }
}
