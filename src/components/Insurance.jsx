import { INSURANCE } from '../lib/finance.js'

export default function Insurance() {
  return (
    <div className="card ins">
      <h3>Insurance verdicts (lens on expected value)</h3>
      <p className="muted">Rule: insure catastrophic, rare, ruinous events; self-insure small, frequent, affordable ones.</p>
      <table className="tbl">
        <thead><tr><th>Policy</th><th>Cost</th><th>Verdict</th><th>Note</th></tr></thead>
        <tbody>
          {INSURANCE.map((r) => (
            <tr key={r.policy}>
              <td><strong>{r.policy}</strong></td>
              <td>{r.cost}</td>
              <td>
                <span className={r.verdict.startsWith('Y') ? 'flag ok' : 'flag no'}>{r.verdict}</span>
              </td>
              <td className="muted">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
