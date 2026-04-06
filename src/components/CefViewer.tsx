import { useMemo, useCallback, useId } from 'react'
import dictionaryRaw from '../data/extension-dictionary.json'
import { parseCEF } from '../lib/cefParser'
import { prepareCefDisplay, type ExtensionDictionary } from '../lib/cefDisplay'
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

export interface CefViewerProps {
  message: string
  showComments: boolean
  onShowCommentsChange: (show: boolean) => void
}

export default function CefViewer({
  message,
  showComments,
  onShowCommentsChange
}: CefViewerProps): React.JSX.Element {
  const tableId = useId().replace(/:/g, '')
  const tableDomId = `ceftable-${tableId}`

  const cef = useMemo(() => prepareCefDisplay(parseCEF(message), DICTIONARY), [message])

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
          <section className="cef-raw-dock" aria-label="Raw event message">
            <div className="cef-raw-dock-grid">
              <div className="cef-raw-dock-label">Raw</div>
              <textarea
                className="app-cef-input cef-raw-dock-textarea"
                value={message}
                readOnly
                spellCheck={false}
                autoComplete="off"
                rows={3}
                aria-label="Raw CEF line (read-only)"
              />
              {cef.errors.length > 0 ? (
                <ul className="cef-raw-dock-errors">
                  {cef.errors.map((err, i) => (
                    <li key={`${i}-${err}`} className="status_error">
                      {err}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="cef-raw-dock-errors cef-raw-dock-errors--empty" />
              )}
            </div>
          </section>
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
                    {(
                      [
                        'Version',
                        'DeviceVendor',
                        'DeviceProduct',
                        'DeviceVersion',
                        'SignatureID',
                        'Name',
                        'Severity'
                      ] as const
                    ).map((field) => (
                      <tr key={field} className="cef-header-field">
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
                  <tr key={ext.key} className="cef-extension">
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
                  <tr key={`${ext.label}-${ext.key}`} className="cef-extension-by-label">
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
