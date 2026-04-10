function measureCaretRect(
  textarea: HTMLTextAreaElement,
  position: number
): { top: number; left: number; height: number } {
  const cs = getComputedStyle(textarea)
  const mirror = document.createElement('div')
  mirror.setAttribute('aria-hidden', 'true')
  const m = mirror.style
  m.position = 'absolute'
  m.left = '-9999px'
  m.top = '0'
  m.visibility = 'hidden'
  m.whiteSpace = 'pre-wrap'
  m.wordWrap = 'break-word'
  m.overflow = 'hidden'
  m.width = cs.width
  m.padding = cs.padding
  m.border = cs.border
  m.boxSizing = cs.boxSizing
  m.font = cs.font
  m.lineHeight = cs.lineHeight
  m.letterSpacing = cs.letterSpacing
  m.textAlign = cs.textAlign
  m.tabSize = cs.tabSize
  m.wordBreak = cs.wordBreak
  m.overflowWrap = cs.overflowWrap

  document.body.appendChild(mirror)
  mirror.textContent = textarea.value.slice(0, position)
  const marker = document.createElement('span')
  marker.textContent = '\u200b'
  mirror.appendChild(marker)
  const height =
    marker.offsetHeight ||
    parseFloat(cs.lineHeight) ||
    parseFloat(cs.fontSize) * 1.25 ||
    16
  const rect = { top: marker.offsetTop, left: marker.offsetLeft, height }
  mirror.remove()
  return rect
}

export function scrollTextareaRangeIntoView(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number
): void {
  textarea.scrollIntoView({ block: 'nearest', inline: 'nearest' })

  const s = measureCaretRect(textarea, start)
  const e = measureCaretRect(textarea, end)

  const clientH = textarea.clientHeight
  const clientW = textarea.clientWidth

  const topMin = Math.min(s.top, e.top)
  const topMax = Math.max(s.top + s.height, e.top + e.height)
  const pad = 8

  let st = textarea.scrollTop
  if (topMin < st + pad) {
    st = Math.max(0, topMin - pad)
  } else if (topMax > st + clientH - pad) {
    st = topMax - clientH + pad
  }

  const maxScrollTop = Math.max(0, textarea.scrollHeight - clientH)
  textarea.scrollTop = Math.max(0, Math.min(st, maxScrollTop))

  const leftMin = Math.min(s.left, e.left)
  const leftMax = Math.max(s.left, e.left)
  let sl = textarea.scrollLeft
  if (leftMin < sl + pad) {
    sl = Math.max(0, leftMin - pad)
  } else if (leftMax > sl + clientW - pad) {
    sl = leftMax - clientW + pad
  }
  textarea.scrollLeft = Math.max(0, sl)
}
