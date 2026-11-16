const segmenter = new Intl.Segmenter('ko', { granularity: 'sentence' })

/** Add reading breaks without rewriting sentences, figures, or quotations. */
export function readableArticleParagraphs(paragraphs: readonly string[], maxCharacters = Infinity) {
  const result: string[] = []
  let usedCharacters = 0
  let truncated = false

  for (const source of paragraphs) {
    for (const block of source.split(/\r?\n+/)) {
      const sentences = [...segmenter.segment(block.replace(/\s+/g, ' ').trim())]
        .map(({ segment }) => segment.trim()).filter(Boolean)
      let current: string[] = []

      for (const sentence of sentences) {
        const separator = usedCharacters ? 1 : 0
        if (usedCharacters + separator + sentence.length > maxCharacters) {
          if (!usedCharacters) {
            const snippet = sentence.slice(0, maxCharacters)
            const lastSpace = snippet.lastIndexOf(' ')
            current.push((lastSpace > 0 ? snippet.slice(0, lastSpace) : snippet).trimEnd())
          }
          truncated = true
          break
        }
        if (current.length && (current.length === 2 || [...current, sentence].join(' ').length > 180)) {
          result.push(current.join(' '))
          current = []
        }
        current.push(sentence)
        usedCharacters += separator + sentence.length
      }

      if (current.length) result.push(current.join(' '))
      if (truncated) break
    }
    if (truncated) break
  }
  if (truncated && result.length) result[result.length - 1] += '…'
  return result
}
