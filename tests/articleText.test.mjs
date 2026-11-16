import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readableArticleParagraphs } from '../src/utils/articleText.ts'

test('reading breaks preserve financial figures, quotations and all sentences', () => {
  const text = '센섹스(SENSEX) 지수는 9.58% 올랐다. 같은 기간 코스피는 7.68% 하락했다. 코스닥은 3.41% 떨어졌다. 지난 4일 미국 증시에서 나타난 흐름이다. 인공지능(AI) 산업과 국제유가를 함께 살펴야 한다.'
  const paragraphs = readableArticleParagraphs([text])
  assert.ok(paragraphs.length >= 3)
  assert.equal(paragraphs.join(' '), text)
  assert.ok(paragraphs.some(paragraph => paragraph.includes('9.58%')))
})

test('preview stops at complete sentences and marks omitted content', () => {
  const paragraphs = readableArticleParagraphs(['첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.'], 30)
  assert.deepEqual(paragraphs, ['첫 번째 문장입니다. 두 번째 문장입니다.…'])
  assert.deepEqual(readableArticleParagraphs(['첫 번째 문단입니다.\n\n두 번째 문단입니다.']), ['첫 번째 문단입니다.', '두 번째 문단입니다.'])
})
