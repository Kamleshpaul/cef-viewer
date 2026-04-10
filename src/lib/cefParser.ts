const cefHeaders = [
  'Version',
  'DeviceVendor',
  'DeviceProduct',
  'DeviceVersion',
  'SignatureID',
  'Name',
  'Severity'
] as const

export type CefHeaderKey = (typeof cefHeaders)[number]

export type CefCharRange = { start: number; end: number }

export type ParsedCef = {
  extensions: Record<string, string>
  errors: string[]
  headerRanges: Partial<Record<CefHeaderKey, CefCharRange>>
  extensionRanges: Record<string, CefCharRange>
} & Partial<Record<CefHeaderKey, string>>

const cefValueEscapeRegex = /\\(.)/g
const cefValueEscapeSequences: Record<string, string> = {
  n: '\n',
  r: '\r',
  t: '\t'
}

export function unescapeCefValue(value: string): string {
  return value.replace(cefValueEscapeRegex, (_, p1: string) =>
    p1 in cefValueEscapeSequences ? cefValueEscapeSequences[p1]! : p1
  )
}

function skipExtensionPairSeparators(input: string, pos: number): number {
  let j = pos
  while (j < input.length) {
    const c = input.charAt(j)
    if (c === ' ' || c === '\t') {
      j++
      continue
    }
    if (c === '|') {
      j++
      while (j < input.length && (input[j] === ' ' || input[j] === '\t')) j++
      continue
    }
    break
  }
  return j
}

function trimExtensionValueTrailingSeparators(raw: string): string {
  return raw.replace(/(?:[\s\t]|\|)+$/u, '')
}

export function parseCEF(input: string): ParsedCef {
  const obj: ParsedCef = {
    extensions: {},
    errors: [],
    headerRanges: {},
    extensionRanges: {}
  }

  let i = input.search(/CEF:[0-9]\|/)
  if (i === -1) {
    return obj
  }
  i += 4

  let field = 0
  let startHeader = i
  let quoted = false

  Header: while (i < input.length) {
    switch (input[i]) {
      case '|':
        if (quoted) {
          obj[cefHeaders[field]] = unescapeCefValue(input.substring(startHeader, i))
          quoted = false
        } else {
          obj[cefHeaders[field]] = input.substring(startHeader, i)
        }
        obj.headerRanges[cefHeaders[field]] = { start: startHeader, end: i }
        i++
        startHeader = i
        field++
        if (field === cefHeaders.length) break Header
        break
      case '\\':
        quoted = true
        i += 2
        break
      default:
        i++
    }
  }

  if (field !== cefHeaders.length) {
    if (quoted) {
      obj[cefHeaders[field]] = unescapeCefValue(input.substring(startHeader, i))
    } else {
      obj[cefHeaders[field]] = input.substring(startHeader, i)
    }
    obj.headerRanges[cefHeaders[field]] = { start: startHeader, end: i }
    return obj
  }

  let key = ''
  let startKeyValuePair = i
  let startValue = 0
  let foundfirstKeyValueSeparator = false
  let extKeyStart = 0

  while (i < input.length) {
    switch (input[i]) {
      case ' ':
      case '\t':
      case '|':
        startKeyValuePair = skipExtensionPairSeparators(input, i + 1)
        i = startKeyValuePair
        break
      case '=':
        if (!foundfirstKeyValueSeparator) {
          foundfirstKeyValueSeparator = true
        } else {
          if (key in obj.extensions) {
            obj.errors.push(`Duplicate '${key}' extension. Ignoring subsequent instances.`)
          } else {
            const pairEnd = startKeyValuePair - 1
            obj.extensionRanges[key] = { start: extKeyStart, end: pairEnd }
            if (quoted) {
              obj.extensions[key] = trimExtensionValueTrailingSeparators(
                unescapeCefValue(input.substring(startValue, pairEnd))
              )
              quoted = false
            } else {
              obj.extensions[key] = trimExtensionValueTrailingSeparators(
                input.substring(startValue, pairEnd)
              )
            }
          }
        }
        key = input.substring(startKeyValuePair, i)
        extKeyStart = startKeyValuePair
        i++
        startValue = i
        break
      case '\\':
        quoted = true
        i += 2
        break
      default:
        i++
    }
  }

  if (foundfirstKeyValueSeparator) {
    if (key in obj.extensions) {
      obj.errors.push(`Duplicate '${key}' extension. Ignoring subsequent instances.`)
    } else {
      obj.extensionRanges[key] = { start: extKeyStart, end: i }
      if (quoted) {
        obj.extensions[key] = trimExtensionValueTrailingSeparators(
          unescapeCefValue(input.substring(startValue, i))
        )
      } else {
        obj.extensions[key] = trimExtensionValueTrailingSeparators(input.substring(startValue, i))
      }
    }
  }

  return obj
}
