export const TOPIC_IDS = ['jobs', 'economy', 'politics', 'society', 'technology', 'youth', 'health', 'culture', 'lifestyle']
export const TOPIC_LABELS = { jobs: '취업', economy: '경제', politics: '정치', society: '사회', technology: 'IT·과학', youth: '청년정책', health: '건강', culture: '문화', lifestyle: '생활' }

export function getConfig() {
  const naverHubClientId = process.env.NAVER_API_HUB_CLIENT_ID?.trim()
  const naverHubClientSecret = process.env.NAVER_API_HUB_CLIENT_SECRET?.trim()
  const deploymentOrigins = [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter(host => host && /^[a-z0-9.-]+\.vercel\.app$/i.test(host)).map(host => `https://${host}`)
  return {
    projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'demo-ai-easynews',
    aiKey: process.env.MONOROUTER_API_KEY?.trim() || '',
    cronSecret: process.env.CRON_SECRET?.trim() || '',
    aiModel: process.env.MONOROUTER_MODEL?.trim() || '',
    aiBaseUrl: (process.env.MONOROUTER_BASE_URL || 'https://monogpt.kr/api/monorouter/v1').replace(/\/$/, ''),
    // Temporarily offer unlimited conversions to every account, including guests.
    freeDailyLimit: null,
    allowedOrigins: [...new Set([...(process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,https://ai-easynews.vercel.app').split(',').map(value => value.trim()), ...deploymentOrigins])],
    rssFeeds: (process.env.NEWS_RSS_FEEDS || '').split(',').map(value => value.trim()).filter(Boolean),
    naverHub: naverHubClientId && naverHubClientSecret ? { clientId: naverHubClientId, clientSecret: naverHubClientSecret } : null,
  }
}
