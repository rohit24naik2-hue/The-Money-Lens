import { parseCSV, SAMPLE_CSV, notify } from '../lib/finance.js'

export default function Welcome({ open, onClose, onStart }) {
  if (!open) return null
  const start = () => onStart(parseCSV(SAMPLE_CSV))
  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true" aria-label="Welcome to The Money Lens">
      <div className="welcome card">
        <h2 className="welcome-title">The Money Lens</h2>
        <p className="welcome-lead">
          One question decides every money choice:{' '}
          <strong>does this save or earn me more than it costs?</strong> This app puts your real
          numbers next to that question, so the leaks stop hiding.
        </p>
        <h3>How to use it — 30 seconds</h3>
        <ol className="welcome-steps">
          <li><strong>Import</strong> your bank CSV (or load the sample).</li>
          <li><strong>See the leaks</strong> on your Dashboard — categories, savings rate, recurring charges.</li>
          <li><strong>Run the Lens</strong> on each charge: keep what pays off, cut what doesn’t.</li>
        </ol>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={start}>Load sample &amp; start</button>
          <button className="btn" onClick={onClose}>Just show me the app</button>
        </div>
        <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
          Your data stays in your browser. Nothing is uploaded.
        </p>
      </div>
    </div>
  )
}
