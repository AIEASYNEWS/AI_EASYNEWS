import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseArticleHtml } from '../src/articles.js'

test('MK article extraction excludes login and unrelated recommendation text', () => {
  const body = '수능 부정행위를 예방하기 위한 통신 차단 방안을 검토하고 있습니다. 현장에서는 감독 방식과 기술적 한계를 함께 고려해야 한다는 의견이 나옵니다. 교육 당국은 구체적인 대응 방안을 논의하고 있으며 수험생의 혼란을 줄이기 위한 안내도 준비하고 있습니다.'
  const html = '<html><head><title>수능 통신 차단 대책</title></head><body><main><div class="news_cnt_detail_wrap"><p>' + body + '</p></div><div><p>무료 회원가입을 통해 서비스를 이용해주세요</p><p>' + '관계없는 투자 기사 추천입니다. '.repeat(30) + '</p></div></main></body></html>'
  const article = parseArticleHtml(html, 'https://www.mk.co.kr/news/economy/12210217')
  const text = article.originalParagraphs.join(' ')
  assert.match(text, /수능 부정행위/)
  assert.doesNotMatch(text, /회원가입|투자 기사/)
})

const chosunUrl = 'https://www.chosun.com/national/2026/11/19/TEST/?utm_source=naver'
const chosunParagraphs = [
  '지역 도서관이 다음 달부터 주말 운영 시간을 늘립니다. 주민들이 평일 퇴근 후와 주말에도 편리하게 책을 빌릴 수 있도록 운영 계획을 조정했습니다.',
  '도서관은 이용자 의견을 모아 열람실과 자료실의 운영 시간을 정했다고 설명했습니다. 변경된 시간표와 프로그램 신청 방법은 홈페이지에 안내할 예정입니다.',
]
function chosunHtml(overrides = {}) {
  const data = {
    type: 'story', canonical_url: '/national/2026/11/19/TEST/',
    content_restrictions: { content_code: '0' }, display_date: '2026-11-19T04:00:00Z',
    content_elements: [
      { type: 'image', caption: '사진 설명' },
      ...chosunParagraphs.map(content => ({ type: 'text', content: `<b>${content}</b>` })),
    ],
    related_content: { basic: [{ content: '관계없는 추천 기사' }] },
    ...overrides,
  }
  return `<html lang="ko"><head><title>도서관 운영 시간 확대</title><meta property="og:site_name" content="조선일보"></head><body><div id="fusion-app"></div><script>Fusion.globalContent=${JSON.stringify(data)};Fusion.globalContentConfig={};throw new Error('must never execute');</script></body></html>`
}

test('Chosun client-rendered public articles extract only matching story paragraphs', () => {
  const article = parseArticleHtml(chosunHtml(), chosunUrl)
  assert.deepEqual(article.originalParagraphs, chosunParagraphs)
  assert.equal(article.publisher, '조선일보')
  assert.equal(article.publishedAt, '2026-11-19T04:00:00.000Z')
  assert.equal(article.sourceUrl, chosunUrl)
})

test('Chosun fallback rejects mismatched, restricted, and malformed story data', () => {
  for (const html of [
    chosunHtml({ canonical_url: '/another-story/' }),
    chosunHtml({ content_restrictions: { content_code: '1' } }),
    chosunHtml({ content_elements: [] }),
    chosunHtml().replace('Fusion.globalContent={', 'Fusion.globalContent={broken:'),
  ]) assert.throws(() => parseArticleHtml(html, chosunUrl), { code: 'ARTICLE_UNREADABLE' })
  assert.throws(() => parseArticleHtml(chosunHtml(), 'https://example.com/national/2026/11/19/TEST/'), { code: 'ARTICLE_UNREADABLE' })
})
