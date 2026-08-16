// Simple SVG stick-figure "host" with a neck-strap magnifying Lens — the brand mark.
export default function Logo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="The Money Lens">
      <circle cx="50" cy="28" r="12" fill="none" stroke="#1A1A1A" strokeWidth="4" />
      <line x1="50" y1="40" x2="50" y2="68" stroke="#1A1A1A" strokeWidth="4" />
      <line x1="50" y1="68" x2="38" y2="84" stroke="#1A1A1A" strokeWidth="4" />
      <line x1="50" y1="68" x2="62" y2="84" stroke="#1A1A1A" strokeWidth="4" />
      <line x1="50" y1="48" x2="30" y2="62" stroke="#1A1A1A" strokeWidth="4" />
      <line x1="50" y1="48" x2="70" y2="58" stroke="#1A1A1A" strokeWidth="4" />
      {/* Lens on a neck strap */}
      <line x1="62" y1="40" x2="74" y2="52" stroke="#0FA8B0" strokeWidth="3" />
      <circle cx="78" cy="58" r="11" fill="none" stroke="#0FA8B0" strokeWidth="4" />
      <text x="78" y="63" fontSize="12" textAnchor="middle" fill="#0FA8B0">$</text>
    </svg>
  )
}
