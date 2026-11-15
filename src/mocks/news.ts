import type { NewsArticle } from '../types/news'

/** 피그마 화면 검토용 예시 기사. 실제 보도나 AI 생성 결과가 아니다. */
export const PREVIEW_ARTICLES: readonly NewsArticle[] = [
  {
    id: 'interest-rate',
    topicId: 'economy',
    title: '기준금리 동결… 내 대출 이자는 어떻게 될까?',
    easyTitle: '기준금리 동결 결정… 대출 이자 당분간 그대로',
    publisher: '한빛일보',
    publishedAt: '2026.11.13 08:40',
    relativeTime: '1시간 전',
    sourceUrl: 'https://news.example.com/article/2026111301',
    excerpt: '기준금리가 현 수준에서 동결되면서 대출자들의 관심은 향후 금리 경로에 쏠리고 있다. 전문가들은 물가와 가계부채 흐름을 고려할 때 연내 인하 가능성은 크지 않다고 내다봤다.',
    easyParagraphs: [
      '중앙은행이 기준금리를 지금과 같은 수준으로 그대로 두기로 했어요. 기준금리는 은행이 돈을 빌려줄 때 받는 이자를 정하는 기준이 되는 숫자예요.',
      '그래서 당분간 대출 이자도 크게 바뀌지 않을 것으로 보여요. 이미 대출을 받은 사람의 이자 부담도 지금과 비슷하게 이어질 거예요.',
      '다만 중앙은행은 물가가 다시 크게 오르면 기준금리를 올릴 수도 있다고 밝혔어요.',
    ],
    originalParagraphs: [
      '중앙은행 금융통화위원회는 13일 통화정책방향 회의를 열고 기준금리를 현 수준에서 동결했다. 이번 결정은 물가 상승률의 둔화 흐름과 가계부채 증가세, 대외 불확실성을 종합적으로 고려한 것으로 풀이된다.',
      '위원회는 통화정책방향 결정문에서 “물가 상승 압력이 점차 완화되고 있으나 가계부채와 부동산 시장의 움직임을 면밀히 점검할 필요가 있다”고 밝혔다.',
      '시장에서는 이번 동결로 시중은행 대출금리가 당분간 현 수준을 유지할 것으로 보고 있다.',
    ],
    summary: ['기준금리를 지금 수준 그대로 두기로 했어요.', '대출 이자는 당분간 크게 바뀌지 않을 전망이에요.', '물가가 다시 오르면 금리를 올릴 수도 있다고 했어요.'],
    comparison: '새날경제는 대출자 부담, 푸른신문은 물가 흐름에 무게를 뒀어요. 다른 관점 기사는 주거비와 수출 기업 입장에서 봤어요.',
    reports: [
      { id: 'rate-loan', publisher: '새날경제', title: '기준금리 동결에도 대출자 부담은 계속… 변동금리 이용자 한숨', focus: '이미 높은 이자를 내는 대출자의 부담이 이어진다는 점', kind: 'same-event' },
      { id: 'rate-prices', publisher: '푸른신문', title: '물가 둔화에도 금리 동결… 인하 논의는 아직 이르다', focus: '물가가 충분히 안정됐는지를 살펴야 한다는 점', kind: 'same-event' },
      { id: 'rate-housing', publisher: '온누리뉴스', title: '금리 동결, 전세 대출과 주거비에는 어떤 영향?', focus: '전세 대출을 이용하는 가구의 주거비 부담', kind: 'different-perspective' },
      { id: 'rate-export', publisher: '미래일보', title: '기준금리 유지에 수출 기업도 촉각', focus: '기업이 돈을 빌리는 비용과 수출 환경', kind: 'different-perspective' },
    ],
  },
  {
    id: 'ai-copyright',
    topicId: 'technology',
    title: '생성형 AI 저작권 기준 마련, 무엇이 달라지나?',
    easyTitle: 'AI가 만든 글과 그림, 누가 쓸 수 있을까요?',
    publisher: '새날경제',
    publishedAt: '2026.11.13 06:40',
    relativeTime: '3시간 전',
    sourceUrl: 'https://news.example.com/article/2026111302',
    excerpt: '생성형 AI 결과물의 활용을 둘러싼 논의가 이어지고 있다. 결과물을 만든 과정과 사람의 참여 정도를 구분하는 것이 주요 쟁점이다.',
    easyParagraphs: ['AI가 만든 글이나 그림을 어떻게 사용할지 정하는 기준이 논의되고 있어요.', '사람이 아이디어를 내고 직접 고친 부분이 있는지, 다른 사람의 작품을 이용했는지 등을 살펴봐야 해요.', '이 글은 화면을 확인하기 위한 예시예요. 실제 사용 조건은 각 서비스와 작품에 따라 확인해야 해요.'],
    originalParagraphs: ['생성형 AI 결과물의 활용 범위와 창작 과정에서 인간의 기여를 둘러싼 논의가 이어지고 있다.', '학습 데이터와 결과물의 유사성, 이용 약관 등도 함께 검토할 사항으로 제시됐다.'],
    summary: ['AI 결과물을 사용하는 기준이 논의되고 있어요.', '사람이 창작에 얼마나 참여했는지 살펴봐요.', '다른 작품의 권리와 서비스 조건도 확인해요.'],
    comparison: '같은 주제를 창작자와 서비스 이용자의 관점에서 비교해 볼 수 있어요.',
    reports: [],
  },
]

export function findPreviewArticle(id?: string) {
  const article = PREVIEW_ARTICLES.find((item) => item.id === id)
  if (article) return article
  for (const parent of PREVIEW_ARTICLES) {
    const report = parent.reports.find((item) => item.id === id)
    if (report) return { ...parent, id: report.id, title: report.title, publisher: report.publisher, sourceUrl: `https://news.example.com/related/${report.id}` }
  }
  return undefined
}

export function findPreviewArticleByUrl(sourceUrl: string) {
  const direct = PREVIEW_ARTICLES.find((article) => article.sourceUrl === sourceUrl)
  if (direct) return direct
  for (const article of PREVIEW_ARTICLES) {
    for (const report of article.reports) {
      const related = findPreviewArticle(report.id)
      if (related?.sourceUrl === sourceUrl) return related
    }
  }
  return undefined
}
