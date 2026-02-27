// ─────────────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────────────

/** Dark card container */
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface border border-border rounded-xl p-6 ${className}`}>
      {children}
    </div>
  )
}

/** Progress bar — pass value 0–100 */
export function ProgressBar({ value, color = 'bg-accent' }) {
  return (
    <div className="h-0.5 w-full bg-border rounded-full overflow-hidden">
      <div
        className={`h-full ${color} prog-fill rounded-full`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

/** Chapter dot indicators */
export function ChapterDots({ total, current }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-[3px] transition-colors ${
            i < current    ? 'bg-accent opacity-70'
            : i === current ? 'bg-accent'
            : 'bg-border'
          }`}
        />
      ))}
    </div>
  )
}

/** Mono label */
export function Label({ children, className = '' }) {
  return (
    <span className={`font-mono text-[10px] tracking-widest uppercase text-muted ${className}`}>
      {children}
    </span>
  )
}

/** Primary button */
export function Btn({ children, onClick, disabled, variant = 'primary', className = '' }) {
  const variants = {
    primary:   'bg-accent text-bg hover:opacity-90',
    secondary: 'border border-border text-muted hover:border-muted',
    danger:    'bg-warn text-white hover:opacity-90',
    success:   'bg-success text-bg hover:opacity-90',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-md text-[13px] font-semibold tracking-wide
        transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${className}
      `}
    >
      {children}
    </button>
  )
}

/** Star rating input (1–5) */
export function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`text-2xl transition-colors ${
            n <= value ? 'text-accent' : 'text-border hover:text-muted'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

/** Centered page wrapper */
export function PageCenter({ children }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}

/** Full-page loading state */
export function Loading({ text = 'Loading…' }) {
  return (
    <PageCenter>
      <div className="text-muted font-mono text-sm text-center">{text}</div>
    </PageCenter>
  )
}

/** Full-page error state */
export function ErrorState({ message }) {
  return (
    <PageCenter>
      <div className="text-warn font-mono text-sm text-center">{message}</div>
    </PageCenter>
  )
}

/** Animated recording dot */
export function RecDot() {
  return <span className="rec-dot inline-block" />
}

/** Tipalti brand bar — used on participant pages */
export function BrandBar() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-[22px] h-[22px] rounded-[4px] flex-shrink-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0A1628 0%, #00C8C8 100%)' }}
      >
        <span className="text-white font-bold text-[13px]">T</span>
      </div>
      <div className="flex flex-col leading-none gap-0.5">
        <span className="text-[11px] font-semibold text-text">Tipalti UX Research</span>
        <span className="text-[9px] text-muted font-mono">Product Design Team</span>
      </div>
    </div>
  )
}

/** Closed / full session gate screen */
export function SessionClosed({ message }) {
  return (
    <PageCenter>
      <div className="text-center flex flex-col items-center gap-4">
        <BrandBar />
        <p className="text-muted text-sm">{message}</p>
      </div>
    </PageCenter>
  )
}

/** Thin horizontal result bar for analytics */
export function ResultBar({ label, count, total, color = 'bg-accent' }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted w-24 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-text w-16 text-right flex-shrink-0">
        {count} <span className="text-muted">({pct}%)</span>
      </span>
    </div>
  )
}
