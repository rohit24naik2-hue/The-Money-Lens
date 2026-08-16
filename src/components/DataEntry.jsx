import { useState } from 'react'
import { parseCSV, SAMPLE_CSV, notify, totalSpend } from '../lib/finance.js'
import TxnTable from './TxnTable.jsx'

export default function DataEntry({ state, update }) {
  const [text, setText] = useState('')

  const loadSample = () => {
    setText(SAMPLE_CSV)
    notify('Sample data loaded — parse it below.')
  }
  const doParse = () => {
    const parsed = parseCSV(text, state.rules)
    if (!parsed.length) {
      notify('No rows found. Paste CSV with date, description, amount.')
      return
    }
    update({ txns: parsed })
    notify(`Imported ${parsed.length} transactions.`)
  }

  const hasData = state.txns.length > 0
  const cats = hasData ? new Set(state.txns.map((t) => t.category)).size : 0

  return (
    <section>
      <h2>Step A · Your data</h2>
      <p className="muted">
        Paste your bank export. One row per charge, in this exact format (header optional):
      </p>
      <pre className="fmt">date, description, amount
2026-01-04, Netflix, 15.99</pre>

      <div className="row">
        <button className="btn" onClick={loadSample}>Load sample data</button>
        <button className="btn primary" onClick={doParse}>Parse &amp; import</button>
      </div>
      <textarea
        className="csv"
        placeholder="date,description,amount&#10;2026-01-04,NETFLIX,15.99"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {hasData && (
        <div className="report">
          <div className="stat"><span className="stat-label">Transactions</span><span className="stat-num">{state.txns.length}</span></div>
          <div className="stat"><span className="stat-label">Total spend</span><span className="stat-num">${totalSpend(state.txns).toFixed(0)}</span></div>
          <div className="stat"><span className="stat-label">Categories</span><span className="stat-num">{cats}</span></div>
        </div>
      )}

      {hasData ? (
        <TxnTable state={state} update={update} lensMode={false} />
      ) : (
        <div className="empty">
          <h3>No transactions yet</h3>
          <p className="muted">Load the sample data to see your report, or paste your own bank CSV above.</p>
          <div className="row">
            <button className="btn primary" onClick={loadSample}>Load sample data</button>
          </div>
        </div>
      )}
    </section>
  )
}
