import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import dictionaryRaw from '../data/extension-dictionary.json'
import { type ExtensionDictionary, prepareCefDisplay } from '../lib/cefDisplay'
import { type CefCharRange, type CefHeaderKey, parseCEF } from '../lib/cefParser'
import './CefViewer.css'

const DICTIONARY = dictionaryRaw as unknown as ExtensionDictionary

const TIMESTAMP_KEYS = new Set(['rt', 'start', 'end', 'art', 'deviceCustomDate1'])

function pretty(val: unknown, indent = 2): string {
  if (typeof val !== 'string') {
    return JSON.stringify(val, null, indent)
  }
  return val
}

function timestampNotice(key: string, value: unknown): string | null {
  if (!TIMESTAMP_KEYS.has(key) || typeof value !== 'string') return null
  if (!/^[0-9]+$/.test(value)) return null
  return new Date(Number(value)).toISOString()
}

function trimHighlightEnd(message: string, range: CefCharRange): CefCharRange {
  let end = range.end
  while (end > range.start && /[\s|]/.test(message.charAt(end - 1))) end--
  return { start: range.start, end }
}

export interface CefViewerProps {
  message: string
  showComments: boolean
  onShowCommentsChange: (show: boolean) => void
  onHighlightMessageRange?: (start: number, end: number) => void
}

type PickedRow =
  | { kind: 'header'; field: CefHeaderKey }
  | { kind: 'extension'; key: string }

export default function CefViewer({
  message,
  showComments,
  onShowCommentsChange,
  onHighlightMessageRange
}: CefViewerProps): React.JSX.Element {
  const tableId = useId().replace(/:/g, '')
  const tableDomId = `ceftable-${tableId}`
  const [pickedRow, setPickedRow] = useState<PickedRow | null>(null)
  const messageRef = useRef(message)
  messageRef.current = message

  const cef = useMemo(() => prepareCefDisplay(parseCEF(message), DICTIONARY), [message])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset picked row when the CEF text changes (deps must include message).
  useEffect(() => {
    setPickedRow(null)
  }, [message])

  const pickRangeInMessage = useCallback(
    (range: CefCharRange | undefined, pick: PickedRow) => {
      if (!onHighlightMessageRange || !range || range.end <= range.start) return
      const trimmed =
        pick.kind === 'extension'
          ? trimHighlightEnd(messageRef.current, range)
          : range
      if (trimmed.end <= trimmed.start) return
      setPickedRow(pick)
      onHighlightMessageRange(trimmed.start, trimmed.end)
    },
    [onHighlightMessageRange]
  )

  const copyToClipboard = useCallback(async () => {
    const el = document.getElementById(tableDomId)
    if (!el) return
    const text = el.innerText
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const range = document.createRange()
      range.selectNode(el)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      document.execCommand('copy')
      sel?.removeAllRanges()
    }
  }, [tableDomId])

  const showHeader = Boolean(cef.Version)

  const headerKeys = [
    'Version',
    'DeviceVendor',
    'DeviceProduct',
    'DeviceVersion',
    'SignatureID',
    'Name',
    'Severity'
  ] as const satisfies readonly CefHeaderKey[]

  const colgroup = (
    <colgroup>
      <col className="cef-col-field" />
      <col className="cef-col-value" />
      <col className="cef-col-comment" />
    </colgroup>
  )

  return (
    <section className="cef" aria-label="CEF parsed view">
      <header className="app-pane-head cef-output-head">
        <span className="app-pane-head-title">Parsed fields</span>
      </header>
      <div className="cef-shell">
        <div id={tableDomId} className="cef-export-root">
          {cef.errors.length > 0 ? (
            <section className="cef-raw-dock" aria-label="Parse errors">
              <ul className="cef-raw-dock-errors">
                {cef.errors.map((err, i) => (
                  <li key={`${i}-${err}`} className="status_error">
                    {err}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="cef-table-block" aria-label="Parsed CEF fields">
            <table className="cef-table">
              {colgroup}
              <thead>
                <tr className="cef-header-row">
                  <th scope="col">Field</th>
                  <th scope="col">Value</th>
                  <th scope="col" className="cef-comment">
                    <div className="cef-comment-inner">
                      <label className="cef-show-comments">
                        <input
                          checked={showComments}
                          onChange={(e) => onShowCommentsChange(e.target.checked)}
                          type="checkbox"
                        />
                        Show comments
                      </label>
                      <button
                        type="button"
                        className="cef-copy"
                        onClick={() => void copyToClipboard()}
                      >
                        Copy to clipboard
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {showHeader ? (
                  <>
                    <tr className="cef-section">
                      <th scope="colgroup" colSpan={3}>
                        CEF Header
                      </th>
                    </tr>
                    {headerKeys.map((field) => (
                      <tr
                        key={field}
                        className={
                          pickedRow?.kind === 'header' && pickedRow.field === field
                            ? 'cef-header-field cef-row-picked'
                            : 'cef-header-field cef-row-interactive'
                        }
                        aria-label={`${field}: highlight this field in the event message`}
                        tabIndex={0}
                        onClick={() => pickRangeInMessage(cef.headerRanges[field], { kind: 'header', field })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            pickRangeInMessage(cef.headerRanges[field], { kind: 'header', field })
                          }
                        }}
                      >
                        <th scope="row">{field}</th>
                        <td>
                          <pre>{cef[field] ?? ''}</pre>
                        </td>
                        <td />
                      </tr>
                    ))}
                  </>
                ) : null}
                {cef.extensionsSorted.length > 0 ? (
                  <tr className="cef-section">
                    <th scope="colgroup" colSpan={3}>
                      CEF Extensions
                    </th>
                  </tr>
                ) : null}
                {cef.extensionsSorted.map((ext) => (
                  <tr
                    key={ext.key}
                    className={
                      pickedRow?.kind === 'extension' && pickedRow.key === ext.key
                        ? 'cef-extension cef-row-picked'
                        : 'cef-extension cef-row-interactive'
                    }
                    aria-label={`${ext.key}: highlight this extension in the event message`}
                    tabIndex={0}
                    onClick={() =>
                      pickRangeInMessage(cef.extensionRanges[ext.key], {
                        kind: 'extension',
                        key: ext.key
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        pickRangeInMessage(cef.extensionRanges[ext.key], {
                          kind: 'extension',
                          key: ext.key
                        })
                      }
                    }}
                  >
                    <th
                      scope="row"
                      title={ext.meta.fullName}
                      className={ext.meta.invalidExtensionName ? 'status_warning' : undefined}
                    >
                      {ext.key}
                    </th>
                    <td className={ext.meta.invalidValue ? 'status_warning' : undefined}>
                      <pre>{pretty(ext.value)}</pre>
                    </td>
                    <td>
                      <ul>
                        {showComments
                          ? ext.comments.map((comment, i) => (
                              <li key={`c-${ext.key}-${i}`}>{comment}</li>
                            ))
                          : null}
                        {ext.errors.map((err, i) => (
                          <li key={`e-${ext.key}-${i}`} className="status_error">
                            {err}
                          </li>
                        ))}
                        {ext.warnings.map((w, i) => (
                          <li key={`w-${ext.key}-${i}`} className="status_warning">
                            {w}
                          </li>
                        ))}
                        {ext.notices.map((n, i) => (
                          <li key={`n-${ext.key}-${i}`} className="status_notice">
                            {n}
                          </li>
                        ))}
                        {(() => {
                          const iso = timestampNotice(ext.key, ext.value)
                          return iso ? (
                            <li key={`iso-${ext.key}`} className="status_notice">
                              {iso}
                            </li>
                          ) : null
                        })()}
                      </ul>
                    </td>
                  </tr>
                ))}
                {cef.extensionsByLabelSorted.length > 0 ? (
                  <tr className="cef-section">
                    <th scope="colgroup" colSpan={3}>
                      CEF Extensions by Label
                    </th>
                  </tr>
                ) : null}
                {cef.extensionsByLabelSorted.map((ext) => (
                  <tr
                    key={`${ext.label}-${ext.key}`}
                    className={
                      pickedRow?.kind === 'extension' && pickedRow.key === ext.key
                        ? 'cef-extension-by-label cef-row-picked'
                        : 'cef-extension-by-label cef-row-interactive'
                    }
                    aria-label={`${ext.label} (${ext.key}): highlight in the event message`}
                    tabIndex={0}
                    onClick={() =>
                      pickRangeInMessage(cef.extensionRanges[ext.key], {
                        kind: 'extension',
                        key: ext.key
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        pickRangeInMessage(cef.extensionRanges[ext.key], {
                          kind: 'extension',
                          key: ext.key
                        })
                      }
                    }}
                  >
                    <th scope="row">{ext.label}</th>
                    <td>
                      <pre>{pretty(ext.value)}</pre>
                    </td>
                    <td>{ext.key}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </section>
  )
}
