import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider }    from './context/AuthContext.jsx'
import { ToastProvider }   from './context/ToastContext.jsx'
import { ThemeProvider }   from './context/ThemeContext.jsx'
import { OfflineProvider } from './context/OfflineContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            {/* OfflineProvider doit être APRÈS AuthProvider (a besoin de user) */}
            <OfflineProvider>
              <App />
            </OfflineProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
