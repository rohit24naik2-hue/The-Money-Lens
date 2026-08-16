import { useState } from 'react'
import { CATEGORIES, notify } from '../lib/finance.js'

export default function Rules({ state, update }) {
  const [kw, setKw] = useState('')
  const [cat, setCat] = useState(CATEGORIES[0])

  const add = () => {
    if (!kw.trim()) return
    update({ rules: [...state.rules, { kw: kw.trim(), cat }] })
    setKw('')
    notify(`Rule added: “${kw.trim()}” → ${cat}`)
  }
  const remove = (i) => update({ rules: state.rules.filter((_, idx) => idx !== i) })

  return (
    <section>
      <h2>Merchant rules — the lens learns</h2>
      <p className="muted">
        Add a keyword → category so future imports auto-tag merchants. The video’s tip: use the same category
        list every month and merge variants like SQ FOODTRUCK / SQUARE FOOD TRUCK so your totals stay real.
      </p>
      <div className="row">
        <label className="field">Keyword
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="e.g. starbucks" />
        </label>
        <label className="field">Category
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <button className="btn primary" onClick={add}>Add rule</button>
      </div>
      {state.rules.length === 0 ? (
        <p className="muted">No custom rules yet — built-in categorization is active.</p>
      ) : (
        <table className="tbl">
          <thead><tr><th>Keyword</th><th>Category</th><th></th></tr></thead>
          <tbody>
            {state.rules.map((r, i) => (
              <tr key={i}>
                <td><strong>{r.kw}</strong></td>
                <td>{r.cat}</td>
                <td><button className="x" onClick={() => remove(i)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
