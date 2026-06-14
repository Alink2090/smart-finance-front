import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL

const http = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 6000,
})

// ── Attach token to every request ────────────────────────────────────────────
http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Global response / error handling ─────────────────────────────────────────
http.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.dispatchEvent(new Event('auth:logout'))
    }
    const msg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      (typeof err.response?.data === 'string' ? err.response.data : null) ||
      err.message ||
      'Request failed'
    return Promise.reject(new Error(msg))
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {

  // Register — étape 1 : envoyer l'OTP (vérifie aussi que l'email n'existe pas)
  sendRegisterOtp: (data) => http.post('/Api_Gestion/send-register-otp/', data),
  // data: { email, name }
  // errors: 409 si email déjà utilisé

  // Register — étape 2 : vérifier OTP + créer le compte
  register: (data) => http.post('/Api_Gestion/register/', data),
  // data: { name, email, password, otp }

  // Login — étape 1 : vérifier credentials + envoyer l'OTP
  sendLoginOtp: (data) => http.post('/Api_Gestion/send-login-otp/', data),
  // data: { email, password }

  // Login — étape 2 : vérifier OTP + retourner le token
  login: (data) => http.post('/Api_Gestion/login/', data),
  // data: { email, password, otp }
  // returns: { token, refresh, user }

  profile: (data) => http.post('/Api_Gestion/profile/', data),
}

// ── Transactions ──────────────────────────────────────────────────────────────
export const transactionsAPI = {
  getAll:  (userId)     => http.post('/Api_Gestion/transactions/get-all/', { user_id: userId }),
  create:  (data)       => http.post('/Api_Gestion/transactions/create/', data),
  update:  (id, data)   => http.post('/Api_Gestion/transactions/update/', { id, ...data }),
  delete:  (id, userId) => http.post('/Api_Gestion/transactions/delete/', { id, user_id: userId }),
  exportXLSX: (payload) => 
    http.post('/Api_Gestion/export/', payload, {
      responseType: 'blob' // ⚠️ important pour fichier
    }),
}

// ── Categories ────────────────────────────────────────────────────────────────
export const categoriesAPI = {
  getAll: (userId)     => http.post('/Api_Gestion/categories/get/', { user_id: userId }),
  create: (data) => http.post('/Api_Gestion/categories/create/', data),
  delete: (id)   => http.delete(`/Api_Gestion/categories/${id}/`),
}

// ── Budgets ───────────────────────────────────────────────────────────────────
export const budgetsAPI = {
  getAll: (userId)            => http.post('/Api_Gestion/budgets/list/', { user_id: userId }),
  create: (data)              => http.post('/Api_Gestion/budgets/create/', data),
  update: (data)              => http.post('/Api_Gestion/budgets/update/', data),
  delete: (budgetId, userId)  => http.post(`/Api_Gestion/budgets/delete/${budgetId}/`, { user_id: userId }),
}

// ── Analytics — tous les calculs sont maintenant faits côté Django ─────────────
export const analyticsAPI = {
  /**
   * GET /analytics/dashboard/
   * Retourne : { total_income, total_expenses, balance,
   *              budget_usage_percent, savings_rate, expense_ratio }
   */
  dashboard: userId =>
    http.post('/Api_analytics/dashboard/', { user_id: userId }),
 
  /**
   * GET /analytics/monthly-expenses/
   * Retourne : { data: [...], metrics: { avg_monthly_expense, avg_monthly_income,
   *              exp_growth, inc_growth, worst_month, projection_next_expense,
   *              anomaly, monthly_with_projection, curr, prev } }
   */
  monthlyExpenses: (userId, period = 6) =>
    http.post('/Api_analytics/monthly-expenses/', { user_id: userId, period }),
 
  /**
   * GET /analytics/category-expenses/
   * Retourne : { data: [...], top_category: { name, amount, share_pct, color } }
   */
  categoryExpenses: userId =>
    http.post('/Api_analytics/category-expenses/', { user_id: userId }),
 
  /**
   * NOUVEAU — /analytics/insights/
   * Retourne : { insights: [...], summary: { total, alerts, opportunities, trends } }
   * Remplace generateInsights() + useInsights() côté React
   */
  insights: userId =>
    http.post('/Api_analytics/insights/', { user_id: userId }),
}


export default http