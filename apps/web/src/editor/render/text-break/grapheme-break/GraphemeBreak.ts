import {
  CR,
  LF,
  Control,
  Extend,
  RegionalIndicator,
  SpacingMark,
  L,
  V,
  T,
  LV,
  LVT,
  Prepend,
  EBase,
  EModifier,
  ZWJ,
  GlueAfterZwj,
  EBaseGAZ,
  NotBreak,
  BreakStart,
  Break,
  BreakLastRegional,
  BreakPenultimateRegional,
} from './classes'
import getGraphemeBreakProperty from './unicodeData'

function isSurrogate(str: string, pos: number) {
  let middle: number, middle1: number
  return (
    (middle = str.charCodeAt(pos)) >= 0xd800 &&
    middle <= 0xdbff &&
    (middle1 = str.charCodeAt(pos + 1)) >= 0xdc00 &&
    middle1 <= 0xdfff
  )
}

// Private function, gets a Unicode code point from a JavaScript UTF-16 string
// handling surrogate pairs appropriately
function codePointAt(str: string, idx: number) {
  const code = str.charCodeAt(idx)

  // if a high surrogate
  if (code >= 0xd800 && code <= 0xdbff && idx < str.length - 1) {
    const hi = code
    const low = str.charCodeAt(idx + 1)
    if (0xdc00 <= low && low <= 0xdfff) {
      return (hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000
    }
    return hi
  }

  // if a low surrogate
  if (code >= 0xdc00 && code <= 0xdfff && idx >= 1) {
    const hi = str.charCodeAt(idx - 1)
    const low = code
    if (0xd800 <= hi && hi <= 0xdbff) {
      return (hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000
    }
    return low
  }

  // just return the char if an unmatched surrogate half or a
  // single-char codepoint
  return code
}

// Private function, returns whether a break is allowed between the
// two given grapheme breaking classes
function shouldBreak(start: number, mid: number[], end: number) {
  const all = [start].concat(mid).concat([end])
  const previous = all[all.length - 2]
  const next = end

  // Lookahead termintor for:
  // GB10. (E_Base | EBG) Extend* ?	E_Modifier
  const eModifierIndex = all.lastIndexOf(EModifier)
  if (
    eModifierIndex > 1 &&
    all.slice(1, eModifierIndex).every(function (c) {
      return c === Extend
    }) &&
    [Extend, EBase, EBaseGAZ].indexOf(start) === -1
  ) {
    return Break
  }

  // Lookahead termintor for:
  // GB12. ^ (RI RI)* RI	?	RI
  // GB13. [^RI] (RI RI)* RI	?	RI
  const rIIndex = all.lastIndexOf(RegionalIndicator)
  if (
    rIIndex > 0 &&
    all.slice(1, rIIndex).every(function (c) {
      return c === RegionalIndicator
    }) &&
    [Prepend, RegionalIndicator].indexOf(previous) === -1
  ) {
    if (
      all.filter(function (c) {
        return c === RegionalIndicator
      }).length %
        2 ===
      1
    ) {
      return BreakLastRegional
    } else {
      return BreakPenultimateRegional
    }
  }

  // GB3. CR X LF
  if (previous === CR && next === LF) {
    return NotBreak
  }
  // GB4. (Control|CR|LF) ÷
  else if (previous === Control || previous === CR || previous === LF) {
    if (
      next === EModifier &&
      mid.every(function (c) {
        return c === Extend
      })
    ) {
      return Break
    } else {
      return BreakStart
    }
  }
  // GB5. ÷ (Control|CR|LF)
  else if (next === Control || next === CR || next === LF) {
    return BreakStart
  }
  // GB6. L X (L|V|LV|LVT)
  else if (
    previous === L &&
    (next === L || next === V || next === LV || next === LVT)
  ) {
    return NotBreak
  }
  // GB7. (LV|V) X (V|T)
  else if ((previous === LV || previous === V) && (next === V || next === T)) {
    return NotBreak
  }
  // GB8. (LVT|T) X (T)
  else if ((previous === LVT || previous === T) && next === T) {
    return NotBreak
  }
  // GB9. X (Extend|ZWJ)
  else if (next === Extend || next === ZWJ) {
    return NotBreak
  }
  // GB9a. X SpacingMark
  else if (next === SpacingMark) {
    return NotBreak
  }
  // GB9b. Prepend X
  else if (previous === Prepend) {
    return NotBreak
  }

  // GB10. (E_Base | EBG) Extend* ?	E_Modifier
  const previousNonExtendIndex =
    all.indexOf(Extend) !== -1 ? all.lastIndexOf(Extend) - 1 : all.length - 2
  if (
    [EBase, EBaseGAZ].indexOf(all[previousNonExtendIndex]) !== -1 &&
    all.slice(previousNonExtendIndex + 1, -1).every(function (c) {
      return c === Extend
    }) &&
    next === EModifier
  ) {
    return NotBreak
  }

  // GB11. ZWJ ? (Glue_After_Zwj | EBG)
  if (previous === ZWJ && [GlueAfterZwj, EBaseGAZ].indexOf(next) !== -1) {
    return NotBreak
  }

  // GB12. ^ (RI RI)* RI ? RI
  // GB13. [^RI] (RI RI)* RI ? RI
  if (mid.indexOf(RegionalIndicator) !== -1) {
    return Break
  }
  if (previous === RegionalIndicator && next === RegionalIndicator) {
    return NotBreak
  }

  // GB999. Any ? Any
  return BreakStart
}

export function findNextGraphemeBreak(string: string, index: number): number {
  if (index < 0) {
    return 0
  }
  if (index >= string.length - 1) {
    return string.length
  }
  const prev = getGraphemeBreakProperty(codePointAt(string, index))
  const mid = []
  for (let i = index + 1; i < string.length; i++) {
    // check for already processed low surrogates
    if (isSurrogate(string, i - 1)) {
      // eslint-disable-next-line no-continue
      continue
    }

    const next = getGraphemeBreakProperty(codePointAt(string, i))
    if (shouldBreak(prev, mid, next)) {
      return i
    }

    mid.push(next)
  }
  return string.length
}

export function findPreviousGraphemeBreak(string: string, index: number): number {
  if (index > string.length) {
    return string.length
  }

  if (index <= 1) {
    return 0
  }

  // Would be nice to invert the findNextGraphemeBreak but algo from https://github.com/foliojs/grapheme-breaker/blob/master/src/GraphemeBreaker.js#L121
  // is not working. shouldBreak works differently between them.
  let prevResult = 0
  let result = 0
  while (result < index) {
    prevResult = result
    result = findNextGraphemeBreak(string, prevResult)
  }

  return prevResult
}
