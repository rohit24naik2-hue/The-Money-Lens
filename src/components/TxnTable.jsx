import { normalizeDate, categorizeWith, CATEGORIES } from '../lib/finance.js'

export default function TxnTable({ state, update, lensMode = false, onLens, canAdd = true }) {
  const edit = (i, patch) => {
    const txns = state.txns.map((t, idx) => (idx === i ? { ...t, ...patch } : t))
    update({ txns })
  }
  const remove = (i) => update({ txns: state.txns.filter((_, idx) => idx !== i) })
  const addRow = () => update({ txns: [{ date: '', desc: '', amount: 0, category: 'Other' }, ...state.txns] })

  return (
    <div className="tbl-wrap">
      {canAdd && (
        <div className="row" style={{ marginBottom: 10 }}>
          <button className="btn" onClick={addRow}>Add manual row</button>
        </div>
      )}
      <table className="tbl">
        <thead>
          <tr>
            <th>Date</th><th>Description</th><th>Amount</th><th>Category</th>
            {lensMode && <th>Lens</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {state.txns.map((t, i) => (
            <tr key={i}>
              <td data-label="Date"><input type="date" value={normalizeDate(t.date)} onChange={(e) => edit(i, { date: e.target.value })} /></td>
              <td data-label="Description"><input value={t.desc} onChange={(e) => edit(i, { desc: e.target.value, category: categorizeWith(e.target.value, state.rules) })} /></td>
              <td data-label="Amount"><input type="number" value={t.amount} onChange={(e) => edit(i, { amount: parseFloat(e.target.value) || 0 })} /></td>
              <td data-label="Category">
                <select value={t.category} onChange={(e) => edit(i, { category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </td>
              {lensMode && (
                <td data-label="Lens">
                  {t.lens ? (
                    <>
                      <span className={t.lens.verdict ? 'flag ok' : 'flag no'}>{t.lens.verdict ? 'PASS' : 'LEAK'}</span>
                      <button className="btn lens-re" onClick={() => onLens(i)}>re-Lens</button>
                    </>
                  ) : (
                    <button className="btn" onClick={() => onLens(i)}>Lens</button>
                  )}
                </td>
              )}
              <td data-label=""><button className="x" onClick={() => remove(i)} title="Remove row">×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
