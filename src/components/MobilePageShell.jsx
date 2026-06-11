/**
 * MobilePageShell — wraps desktop pages with mobile-friendly container.
 * Used by Analytics, Insights, Reports, Categories, Budgets.
 *
 * On mobile it:
 *  - Removes padding and adds mobile-first padding
 *  - Injects a compact page title bar
 *  - Ensures no horizontal overflow
 */
import { useBreakpoint } from '../hooks/useBreakpoint'

export default function MobilePageShell({ title, subtitle, action, children }) {
  const { isMobile } = useBreakpoint()

  if (!isMobile) return <>{children}</>

  return (
    <div className="mobile-page fade-up" style={{ overflowX: 'hidden' }}>
      {/* Page header */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.03em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{subtitle}</div>}
        {action && <div style={{ marginTop: 12 }}>{action}</div>}
      </div>
      {children}
      <div style={{ height: 24 }} />
    </div>
  )
}
