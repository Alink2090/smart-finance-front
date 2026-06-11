/**
 * MobilePageWrapper — shared wrapper for all mobile pages.
 * Provides consistent padding, section headers, and FAB support.
 */
export function MobilePageWrapper({ children }) {
  return (
    <div className="mobile-page fade-up">
      {children}
      <div style={{ height: 16 }} />
    </div>
  )
}

export function MobileSectionHeader({ title, action, onAction }) {
  return (
    <div className="mobile-section-header">
      <span className="mobile-section-title">{title}</span>
      {action && (
        <button className="mobile-section-link" onClick={onAction}>{action}</button>
      )}
    </div>
  )
}

export function MobileCard({ children, style = {} }) {
  return (
    <div style={{ margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

export function MobileFab({ onClick, icon = '+', label }) {
  return (
    <button className="mobile-fab" onClick={onClick} aria-label={label}>
      <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
    </button>
  )
}
