import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL 

const http = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 12000,
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
  sendRegisterOtp: (data) => http.post('/send-register-otp/', data),
  // data: { email, name }
  // errors: 409 si email déjà utilisé

  // Register — étape 2 : vérifier OTP + créer le compte
  register: (data) => http.post('/register/', data),
  // data: { name, email, password, otp }

  // Login — étape 1 : vérifier credentials + envoyer l'OTP
  sendLoginOtp: (data) => http.post('/send-login-otp/', data),
  // data: { email, password }

  // Login — étape 2 : vérifier OTP + retourner le token
  login: (data) => http.post('/login/', data),
  // data: { email, password, otp }
  // returns: { token, refresh, user }

  profile: (data) => http.post('/profile/', data),
}

// ── Transactions ──────────────────────────────────────────────────────────────
export const transactionsAPI = {
  getAll:  (userId)     => http.post('/transactions/get-all/', { user_id: userId }),
  create:  (data)       => http.post('/transactions/create/', data),
  update:  (id, data)   => http.post('/transactions/update/', { id, ...data }),
  delete:  (id, userId) => http.post('/transactions/delete/', { id, user_id: userId }),
}

// ── Categories ────────────────────────────────────────────────────────────────
export const categoriesAPI = {
  getAll: ()     => http.get('/categories/get/'),
  create: (data) => http.post('/categories/create/', data),
  delete: (id)   => http.delete(`/categories/${id}/`),
}

// ── Budgets ───────────────────────────────────────────────────────────────────
export const budgetsAPI = {
  getAll: (userId)            => http.post('/budgets/list/', { user_id: userId }),
  create: (data)              => http.post('/budgets/create/', data),
  update: (data)              => http.post('/budgets/update/', data),
  delete: (budgetId, userId)  => http.post(`/budgets/delete/${budgetId}/`, { user_id: userId }),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  dashboard:        (userId) => http.post('/analytics/dashboard/', { user_id: userId }),
  categoryExpenses: (userId) => http.post('/analytics/category-expenses/', { user_id: userId }),
  monthlyExpenses:  (userId) => http.post('/analytics/monthly-expenses/', { user_id: userId }),
}

export default http