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

export type ParsedCef = {
  extensions: Record<string, string>
  errors: string[]
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

export function parseCEF(input: string): ParsedCef {
  const obj: ParsedCef = {
    extensions: {},
    errors: []
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
    return obj
  }

  let key = ''
  let startKeyValuePair = i
  let startValue = 0
  let foundfirstKeyValueSeparator = false

  while (i < input.length) {
    switch (input[i]) {
      case ' ':
        i++
        startKeyValuePair = i
        break
      case '=':
        if (!foundfirstKeyValueSeparator) {
          foundfirstKeyValueSeparator = true
        } else {
          if (key in obj.extensions) {
            obj.errors.push(`Duplicate '${key}' extension. Ignoring subsequent instances.`)
          } else if (quoted) {
            obj.extensions[key] = unescapeCefValue(
              input.substring(startValue, startKeyValuePair - 1)
            )
            quoted = false
          } else {
            obj.extensions[key] = input.substring(startValue, startKeyValuePair - 1)
          }
        }
        key = input.substring(startKeyValuePair, i)
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
    } else if (quoted) {
      obj.extensions[key] = unescapeCefValue(input.substring(startValue, i))
    } else {
      obj.extensions[key] = input.substring(startValue, i)
    }
  }

  return obj
}
