import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import ipaddr from 'ipaddr.js'
import { Agent, ProxyAgent, fetch } from 'undici'
import { AppError } from './errors.js'

// A local development proxy resolves CONNECT destinations itself, so arbitrary
// user-controlled origins must continue to use the DNS-pinned direct transport.
// Only these exact, trusted HTTPS publisher origins can use the configured proxy.
const publisherProxyOrigins = new Set([
  'https://www.hani.co.kr', 'https://hani.co.kr',
  'https://www.yna.co.kr', 'https://yna.co.kr',
  'https://news.sbs.co.kr', 'https://imnews.imbc.com', 'https://news.imbc.com',
  'https://news.kbs.co.kr', 'https://www.chosun.com', 'https://www.donga.com',
  'https://www.hankyung.com', 'https://www.mk.co.kr', 'https://www.khan.co.kr',
])

export function canProxyPublisher(url, environment = process.env) {
  return Boolean(
    !(environment.K_SERVICE || environment.FUNCTION_TARGET || environment.FUNCTION_NAME || environment.VERCEL === '1') &&
    (environment.HTTPS_PROXY || environment.https_proxy || environment.HTTP_PROXY || environment.http_proxy) &&
    publisherProxyOrigins.has(url.origin),
  )
}

export function isPublicAddress(value) {
  try {
    let address = ipaddr.parse(value)
    if (address.kind() === 'ipv6' && address.isIPv4MappedAddress()) address = address.toIPv4Address()
    return address.range() === 'unicast'
  } catch { return false }
}

export function parsePublicUrl(value) {
  let url
  try { url = new URL(value) } catch { throw new AppError('INVALID_URL', '올바른 기사 주소를 입력해 주세요.') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) {
    throw new AppError('INVALID_URL', '공개된 http 또는 https 기사 주소만 사용할 수 있어요.')
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (!hostname.includes('.') && !isIP(hostname)) throw new AppError('PRIVATE_URL', '공개된 기사 주소만 사용할 수 있어요.')
  if (hostname === 'localhost' || /\.(localhost|local|internal)$/i.test(hostname) || (isIP(hostname) && !isPublicAddress(hostname))) {
    throw new AppError('PRIVATE_URL', '공개된 기사 주소만 사용할 수 있어요.')
  }
  url.hash = ''
  return url
}

export async function resolvePublicUrl(value, resolver = lookup) {
  const url = parsePublicUrl(value)
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await resolver(hostname, { all: true, verbatim: true })
  if (!addresses.length || addresses.some(record => !isPublicAddress(record.address))) {
    throw new AppError('PRIVATE_URL', '공개된 기사 주소만 사용할 수 있어요.')
  }
  return { url, addresses }
}

/** Every redirect is revalidated. Untrusted origins always retain DNS pinning. */
export async function safeFetchText(value, { signal, maxBytes = 2_000_000, accept = 'text/html,application/xhtml+xml', redirects = 4 } = {}) {
  let current = value
  const timeout = AbortSignal.timeout(15_000)
  const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout
  for (let hop = 0; hop <= redirects; hop++) {
    const { url, addresses } = await resolvePublicUrl(current)
    const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy
    const dispatcher = canProxyPublisher(url) ? new ProxyAgent(proxyUrl) : new Agent({ connect: { lookup: (_hostname, options, callback) => {
      if (options.all) callback(null, addresses)
      else callback(null, addresses[0].address, addresses[0].family)
    } } })
    try {
      const response = await fetch(url, { dispatcher, redirect: 'manual', signal: combinedSignal, headers: { Accept: accept, 'User-Agent': 'EasyNews/1.0 (+public article reading)' } })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        await response.body?.cancel()
        if (!location || hop === redirects) throw new AppError('TOO_MANY_REDIRECTS', '기사 주소를 확인하지 못했어요.')
        current = new URL(location, url).href
        continue
      }
      if (!response.ok) {
        await response.body?.cancel()
        throw new AppError('ARTICLE_UNAVAILABLE', '기사를 불러오지 못했어요. 공개된 원문 기사 주소인지 확인해 주세요.', 422)
      }
      const contentType = response.headers.get('content-type') || ''
      if (!/(html|xml|json|text\/plain)/i.test(contentType)) {
        await response.body?.cancel()
        throw new AppError('UNSUPPORTED_CONTENT', '텍스트 기사 주소만 사용할 수 있어요.', 422)
      }
      if (Number(response.headers.get('content-length')) > maxBytes) {
        await response.body?.cancel()
        throw new AppError('ARTICLE_TOO_LARGE', '기사 용량이 너무 커요. 다른 기사 주소로 시도해 주세요.', 422)
      }
      const reader = response.body.getReader()
      const chunks = []
      let length = 0
      try {
        while (true) {
          const { done, value: chunk } = await reader.read()
          if (done) break
          length += chunk.byteLength
          if (length > maxBytes) throw new AppError('ARTICLE_TOO_LARGE', '기사 용량이 너무 커요. 다른 기사 주소로 시도해 주세요.', 422)
          chunks.push(Buffer.from(chunk))
        }
      } finally { await reader.cancel().catch(() => {}) }
      const bytes = Buffer.concat(chunks)
      const charset = contentType.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1] || bytes.subarray(0, 4096).toString('latin1').match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i)?.[1] || 'utf-8'
      let text
      try { text = new TextDecoder(charset).decode(bytes) } catch { text = bytes.toString('utf8') }
      return { text, url: url.href, contentType }
    } catch (error) {
      if (error instanceof AppError || combinedSignal.aborted) throw error
      throw new AppError('ARTICLE_FETCH_FAILED', '기사 사이트에 연결하지 못했어요. 공개된 원문 주소로 다시 시도해 주세요.', 502)
    } finally { await dispatcher.destroy() }
  }
  throw new AppError('ARTICLE_UNAVAILABLE', '기사 주소를 확인하지 못했어요.', 422)
}
