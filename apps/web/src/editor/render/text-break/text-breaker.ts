import { iife, memorize } from '@gitborlando/utils'
import { findNextGraphemeBreak, findPreviousGraphemeBreak } from './grapheme-break'
import { LineBreaker, UnicodeTrie } from './line-break'
import lineBreakClassesTrieUrl from './line-break/classes.trie?url'

const SPACE = '\u0020'
const ELLIPSIS = '\u2026'
const LINE_BREAK_REGEX = /^(\r|\n|\r\n)$/
const MULTIPLE_SPACE_REGEX = new RegExp(`${SPACE}(${SPACE})+`, 'g')

export type ISplitText = {
  width: number
  text: string
  start: number
  ellipsisDelta?: number
}

export class TextBreaker {
  private lineBreakTrie: UnicodeTrie

  private createMeasureText = memorize((fontStyle: string) => {
    const canvas = new OffscreenCanvas(100, 100)
    const ctx = canvas.getContext('2d', { alpha: false })!

    ctx.font = fontStyle
    return memorize((string: string) => ctx.measureText(string))
  })

  constructor(lineBreakClassesBuffer: Uint8Array) {
    this.lineBreakTrie = new UnicodeTrie(lineBreakClassesBuffer)
  }

  measureText(text: string, fontStyle: string) {
    const measureText = this.createMeasureText(fontStyle)
    return measureText(text)
  }

  measureWidth(text: string, fontStyle: string) {
    const measureText = this.createMeasureText(fontStyle)
    return measureText(text).width
  }

  breakText(
    text: string,
    maxWidth: number,
    style: {
      fontFamily: string | string[]
      fontWeight: string | number
      fontSize: number
      letterSpacing: number
      align: 'left' | 'center' | 'right'
    },
    maxLines?: number,
  ) {
    // Trim and replace multiple spaces with single one
    text = (text || '').trim().replace(MULTIPLE_SPACE_REGEX, SPACE)

    if (!text) return []

    const { fontWeight, fontSize, fontFamily, letterSpacing, align } = style
    const font = `${fontWeight} ${fontSize}px ${fontFamily}`

    const measureText = this.createMeasureText(font)
    const measureWidth = (text: string) => {
      return measureText(text).width + letterSpacing
    }

    const spaceLength = measureWidth(SPACE)

    const lineBreaker = new LineBreaker(this.lineBreakTrie, text)
    const splitText: ISplitText[] = []

    let currentLineWidth = 0
    let lineStartIndex = 0
    let lineEndIndex = 0

    const getWidthWithoutLastSpace = (charIndex: number, width: number) =>
      text.charAt(charIndex) === SPACE ? width - spaceLength : width

    const addCurrentLine = () => {
      if (lineEndIndex > lineStartIndex) {
        const start = iife(() => {
          if (align === 'left') return 0
          if (align === 'center') return (maxWidth - currentLineWidth) / 2
          if (align === 'right') return maxWidth - currentLineWidth
        })!
        splitText.push({
          start,
          width: getWidthWithoutLastSpace(lineEndIndex - 1, currentLineWidth),
          text: text.slice(lineStartIndex, lineEndIndex).trim(),
        })
      }
      if (maxLines && splitText.length === maxLines) {
        if (lineEndIndex < text.length) {
          const ellipsisLength = measureWidth(ELLIPSIS)
          const lastLine = splitText[splitText.length - 1]
          if (lastLine.width + ellipsisLength <= maxWidth) {
            lastLine.ellipsisDelta = ellipsisLength
            lastLine.text += ELLIPSIS
          } else {
            // Remove grapheme(s) from the end to give space to ellipsis
            let index = lastLine.text.length
            let widthAvailable = 0
            while (index > 0 && widthAvailable < ellipsisLength) {
              const previousIndex = findPreviousGraphemeBreak(lastLine.text, index)
              const grapheme = text.slice(previousIndex, index)
              widthAvailable += measureWidth(grapheme)
              index = previousIndex
            }
            lastLine.ellipsisDelta = widthAvailable - ellipsisLength
            lastLine.text = lastLine.text.slice(0, index) + ELLIPSIS
          }
        }
        return true
      } else {
        return false
      }
    }

    let nextBreak: ReturnType<typeof lineBreaker.nextBreak>

    let breakStart = lineStartIndex
    while ((nextBreak = lineBreaker.nextBreak())) {
      let breakWidth = 0
      const breakEnd = nextBreak.position
      let index = breakStart
      while (index < breakEnd) {
        const nextIndex = Math.min(findNextGraphemeBreak(text, index), breakEnd)
        const grapheme = text.slice(index, nextIndex)
        const graphemeWidth = LINE_BREAK_REGEX.test(grapheme)
          ? 0
          : measureWidth(grapheme)

        if (breakWidth + (grapheme === SPACE ? 0 : graphemeWidth) > maxWidth) {
          // Word is too long, we have to break it

          // We add current line if any and reset its values
          if (addCurrentLine()) {
            return splitText
          }

          // Then add a new line with current partial word
          lineStartIndex = breakStart
          lineEndIndex = index
          currentLineWidth = breakWidth
          if (addCurrentLine()) {
            return splitText
          }

          // Reset values
          lineStartIndex = index
          lineEndIndex = index
          currentLineWidth = 0
          breakStart = index
          breakWidth = 0
        }

        breakWidth += graphemeWidth
        index = nextIndex
      }

      if (
        currentLineWidth + getWidthWithoutLastSpace(breakEnd - 1, breakWidth) >
        maxWidth
      ) {
        if (addCurrentLine()) {
          return splitText
        }
        lineStartIndex = breakStart
        lineEndIndex = breakEnd
        currentLineWidth = breakWidth
      } else {
        currentLineWidth += breakWidth
        lineEndIndex = breakEnd
      }

      if (nextBreak.required) {
        if (addCurrentLine()) {
          return splitText
        }
        lineStartIndex = breakEnd
        lineEndIndex = breakEnd
        currentLineWidth = 0
      }

      breakStart = breakEnd
    }

    addCurrentLine()

    return splitText
  }
}

export async function createTextBreaker() {
  const trieBuffer = new Uint8Array(
    await (await fetch(lineBreakClassesTrieUrl)).arrayBuffer(),
  )
  return new TextBreaker(trieBuffer)
}
