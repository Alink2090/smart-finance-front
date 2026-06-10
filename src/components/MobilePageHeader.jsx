// Composant header de page pour mobile — titre + action optionnelle
export default function MobilePageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 16, gap: 12,
    }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.03em', margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: '3px 0 0' }}>{subtitle}</p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}
