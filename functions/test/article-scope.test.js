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
