import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth }           from './context/AuthContext'
import { useOffline }        from './context/OfflineContext'
import { useOfflineAuth }    from './hooks/useOfflineAuth'
import { useServiceWorker }  from './hooks/useServiceWorker'
import DashboardLayout from './layouts/DashboardLayout'
import Login          from './pages/Login'
import Register       from './pages/Register'
import Dashboard      from './pages/Dashboard'
import Transactions   from './pages/Transactions'
import Budgets        from './pages/Budgets'
import Analytics      from './pages/Analytics'
import Categories     from './pages/Categories'
import Insights       from './pages/Insights'
import Reports        from './pages/Reports'
import Settings       from './pages/Settings'
import InstallButton  from './components/InstallButton'
import UpdateBanner   from './components/UpdateBanner'
import OfflineBanner  from './components/offline/OfflineBanner'
import PinScreen      from './components/offline/PinScreen'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div className="spinner" style={{ width:32, height:32, borderWidth:3, margin:'0 auto 16px' }} />
        <p style={{ color:'var(--text2)', fontSize:14 }}>Chargement…</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

// ── Gate PIN hors ligne ───────────────────────────────────────────────────────
function OfflineGate({ children }) {
  const { user }  = useAuth()
  const { locked, checking, pinError, pinVerifying, submitPin } = useOfflineAuth(user)

  if (checking) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div className="spinner" style={{ width:28, height:28, borderWidth:3 }} />
    </div>
  )

  if (locked) return (
    <PinScreen
      onSubmit={pin => submitPin(pin, user?.id)}
      error={pinError}
      verifying={pinVerifying}
      userName={user?.name}
    />
  )

  return children
}

export default function App() {
  const { needRefresh, applyUpdate, dismissUpdate } = useServiceWorker()

  return (
    <>
      <InstallButton />

      {needRefresh && (
        <UpdateBanner onUpdate={applyUpdate} onDismiss={dismissUpdate} />
      )}

      <OfflineGate>
        <Routes>
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          <Route element={
            <PrivateRoute>
              {/* OfflineBanner injecté dans le layout via wrapper */}
              <LayoutWithBanner />
            </PrivateRoute>
          }>
            <Route path="/"             element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets"      element={<Budgets />} />
            <Route path="/analytics"    element={<Analytics />} />
            <Route path="/insights"     element={<Insights />} />
            <Route path="/reports"      element={<Reports />} />
            <Route path="/categories"   element={<Categories />} />
            <Route path="/settings"     element={<Settings />} />
            <Route path="/more"         element={<Navigate to="/insights" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </OfflineGate>
    </>
  )
}

// DashboardLayout wrappé avec la bannière offline au-dessus du contenu
import { Outlet } from 'react-router-dom'
import DashboardLayoutComp from './layouts/DashboardLayout'

function LayoutWithBanner() {
  // On réutilise DashboardLayout qui contient déjà <Outlet />
  // et on injecte OfflineBanner dans le flux de rendu via le contexte
  return <DashboardLayoutComp />
}
