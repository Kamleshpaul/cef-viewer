import type { ParsedCef } from './cefParser'

export interface DictionaryEntry {
  fullName: string
  dictionaryName: string
  version: string
  dataType: string
  length?: number
  description: string
}

export type ExtensionDictionary = Record<string, DictionaryEntry>

export interface ExtensionMeta {
  fullName?: string
  dictionaryName?: string
  version?: string
  dataType?: string
  length?: number
  description?: string
  invalidExtensionName?: boolean
  invalidValue?: boolean
  userDefinedExtension?: boolean
  contentType?: 'json' | 'embedded-json'
}

export interface ExtensionDisplay {
  key: string
  meta: ExtensionMeta
  comments: string[]
  errors: string[]
  warnings: string[]
  notices: string[]
  value: unknown
  label?: string
}

export interface CefDisplay extends ParsedCef {
  extensionsSorted: ExtensionDisplay[]
  extensionsByLabelSorted: ExtensionDisplay[]
}

const hostSuffix = /host$/i
const fqdnPattern = /^(?!:\/\/)(?=.{1,255}$)((.{1,63}\.){1,127}(?![0-9]*$)[a-z0-9-]+\.?)$/im

function validateExtensionValue(
  name: string,
  dataType: string,
  length: number | undefined,
  value: string
): true | string {
  switch (dataType) {
    case 'String':
      if (length !== undefined && value.length > length) {
        return `Length of ${value.length} exceeds limit of ${length}`
      }
      break
    case 'Time Stamp':
    case 'DateTime':
      break
    case 'MAC Address':
    case 'MacAddress':
      if (!/^[0-9a-fA-F]{2}([:-][0-9a-fA-F]{2}){5}$/.test(value)) {
        return 'Invalid format'
      }
      break
    case 'IPv4 Address':
    case 'IPv6 Address':
    case 'IP Address':
    case 'IpAddress':
      if (
        /^(([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$/.test(
          value
        ) ||
        /^((([0-9a-fA-F]){1,4}):){7}([0-9a-fA-F]){1,4}$/.test(value)
      ) {
        break
      }
      return 'Invalid format'
    case 'Integer': {
      const n = parseInt(value, 10)
      if (Number.isNaN(n) || n > 2147483647 || n < -2147483648) {
        return 'Invalid Integer'
      }
      break
    }
    case 'Long': {
      try {
        const n = BigInt(value)
        const max = BigInt('9223372036854775807')
        const min = BigInt('-9223372036854775808')
        if (n > max || n < min) {
          return 'Invalid Long'
        }
      } catch {
        return 'Invalid Long'
      }
      break
    }
    default:
      return `Unknown dataType: ${dataType}`
  }

  if (hostSuffix.test(name) && !fqdnPattern.test(value)) {
    return 'Invalid FQDN'
  }
  return true
}

function capitalizeFirstLetter(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const customKeyRe = /^(c6a|cfp|cn|cs|(deviceCustom|flex)(Number|Date|String))\d+$/

export function prepareCefDisplay(cef: ParsedCef, dictionary: ExtensionDictionary): CefDisplay {
  const extensionsSorted: ExtensionDisplay[] = Object.entries(cef.extensions)
    .map(([k, v]) => {
      const item: ExtensionDisplay = {
        key: k,
        meta: {},
        comments: [],
        errors: [],
        warnings: [],
        notices: [],
        value: v
      }

      if (k in dictionary) {
        const d = dictionary[k]!
        Object.assign(item.meta, d)
        item.comments.push(d.fullName)
        if (d.dictionaryName === 'consumer') {
          item.notices.push(
            `${capitalizeFirstLetter(d.dictionaryName)} extension from CEF specification ${d.version}`
          )
        } else {
          item.comments.push(
            `${capitalizeFirstLetter(d.dictionaryName)} extension from CEF specification ${d.version}`
          )
        }
        item.comments.push(d.dataType + (d.length !== undefined ? `[${d.length}]` : ''))
        const validity = validateExtensionValue(k, d.dataType, d.length, v)
        if (validity !== true) {
          item.meta.invalidValue = true
          item.warnings.push(validity)
        }
        item.comments.push(d.description)
      } else {
        item.meta.userDefinedExtension = true
        item.notices.push('User-Defined Extension')
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(k)) {
          item.meta.invalidExtensionName = true
          item.warnings.push(
            'Extension name does not adhere to VendornameProductnameExplanatoryKeyName format'
          )
        }
      }

      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('"'))) {
        try {
          let value: unknown = JSON.parse(v) as unknown
          item.meta.contentType = 'json'
          if (typeof value === 'string' && value.startsWith('{')) {
            try {
              value = JSON.parse(value) as unknown
              item.notices.push('Pretty print embedded JSON')
              item.meta.contentType = 'embedded-json'
            } catch {
              /* keep string */
            }
          } else {
            item.notices.push('Pretty print JSON')
          }
          item.value = value
        } catch {
          /* keep original string */
        }
      }

      if (customKeyRe.test(k)) {
        const labelKey = `${k}Label`
        if (cef.extensions[labelKey]) {
          item.label = cef.extensions[labelKey]
        } else {
          item.warnings.push(`Label extension '${labelKey}' is missing.`)
        }
      }

      if (k.endsWith('Label')) {
        const base = k.substring(0, k.length - 5)
        if (!(base in cef.extensions)) {
          item.warnings.push(`Value extension '${base}' is missing.`)
        }
      }

      return item
    })

  const extensionsByLabelSorted = extensionsSorted.filter((elem) => elem.label)

  return {
    ...cef,
    extensionsSorted,
    extensionsByLabelSorted
  }
}
