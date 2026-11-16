import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canProxyPublisher, isPublicAddress, parsePublicUrl, resolvePublicUrl } from '../src/safeFetch.js'
import { parseArticleHtml } from '../src/articles.js'
import { publicError } from '../src/errors.js'

test('private, metadata, encoded loopback, multicast and reserved addresses are rejected', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2001:db8::1']) assert.equal(isPublicAddress(address), false, address)
  for (const url of ['http://2130706433', 'http://0x7f000001', 'http://127.1', 'http://localhost', 'http://a.internal', 'http://[::1]', 'file:///etc/passwd', 'https://user:pass@example.com', 'https://example.com:3000']) assert.throws(() => parsePublicUrl(url), undefined, url)
  assert.equal(parsePublicUrl('https://example.com/article#part').href, 'https://example.com/article')
})

test('DNS answers containing any private destination are rejected', async () => {
  await assert.rejects(resolvePublicUrl('https://example.com', async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }]), { code: 'PRIVATE_URL' })
  const result = await resolvePublicUrl('https://example.com', async () => [{ address: '8.8.8.8', family: 4 }])
  assert.equal(result.addresses[0].address, '8.8.8.8')
})

test('local article proxy is limited to exact trusted HTTPS publisher origins', () => {
  const environment = { HTTPS_PROXY: 'http://configured-proxy.example:8080' }
  assert.equal(canProxyPublisher(new URL('https://www.hani.co.kr/arti/society/1.html'), environment), true)
  for (const url of ['https://example.com/article', 'https://www.hani.co.kr.attacker.example/article', 'https://other.hani.co.kr/article', 'http://www.hani.co.kr/article', 'https://www.hani.co.kr:80/article']) {
    assert.equal(canProxyPublisher(new URL(url), environment), false)
  }
  assert.equal(canProxyPublisher(new URL('https://www.hani.co.kr/article'), {}), false)
  assert.equal(canProxyPublisher(new URL('https://www.hani.co.kr/article'), { ...environment, K_SERVICE: 'api' }), false)
  assert.equal(canProxyPublisher(new URL('https://www.hani.co.kr/article'), { ...environment, VERCEL: '1' }), false)
})

const paragraph = '중앙은행은 오늘 기준금리를 유지한다고 발표했습니다. 이번 결정은 물가와 가계대출 상황을 함께 고려한 결과입니다. 위원회는 앞으로 발표되는 경제 지표를 확인한 뒤 다음 회의에서 통화정책 방향을 결정할 예정이라고 밝혔습니다. '
test('extracts actual article paragraphs and safely ignores malformed image metadata', () => {
  const article = parseArticleHtml(`<html><head><title>기준금리 결정 소식</title><meta property="og:image" content="http://[broken"></head><body><nav>메뉴</nav><article><h1>기준금리 결정 소식</h1><p>${paragraph.repeat(3)}</p><p>${paragraph.repeat(2)}</p></article></body></html>`, 'https://example.com/news/1')
  assert.ok(article.originalParagraphs.join(' ').includes('중앙은행'))
  assert.equal(article.imageUrl, undefined)
  assert.deepEqual(article.easyParagraphs, [])
  const separated = parseArticleHtml(`<html><head><title>금리 소식</title></head><body><article><div><audio controls>Your browser does not support the audio element.</audio>${paragraph}<br><br>${paragraph}</div></article></body></html>`, 'https://example.com/news/2')
  assert.ok(separated.originalParagraphs.length >= 2)
  assert.equal(separated.originalParagraphs.join(' '), `${paragraph.trim()} ${paragraph.trim()}`)
  assert.throws(() => parseArticleHtml('<html><title>로그인</title><p>로그인이 필요합니다</p></html>', 'https://example.com'), { code: 'ARTICLE_UNREADABLE' })
})

test('unexpected upstream errors never expose credentials', () => {
  const error = publicError(new Error('Authorization: Bearer secret-token'))
  assert.equal(error.status, 500)
  assert.ok(!error.message.includes('secret-token'))
})
