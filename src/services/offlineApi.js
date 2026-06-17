/**
 * offlineApi.js
 *
 * Approche simplifiée : on essaie TOUJOURS le réseau en premier.
 * Si ça échoue (réseau coupé, timeout, erreur) → fallback IDB.
 * On ne maintient plus de singleton _online qui pouvait rester bloqué.
 *
 * Avantage : au retour en ligne, le prochain appel API réussit automatiquement
 * sans dépendre d'un état qui aurait raté sa mise à jour.
 */
import { transactionsAPI, budgetsAPI, categoriesAPI, analyticsAPI } from './api.js'
import {
  getTransactions, createTransaction, updateTransaction,
  deleteTransaction, cacheTransactions,
} from '../indexeddb/transactionsDB.js'
import {
  getBudgets, createBudget, updateBudget,
  deleteBudget, cacheBudgets,
} from '../indexeddb/budgetsDB.js'
import {
  getCategories, createCategory,
  deleteCategory, cacheCategories,
} from '../indexeddb/categoriesDB.js'
import {
  saveDashboard, getDashboard,
  saveMonthly,   getMonthly,
  saveCategoryExp, getCategoryExp,
} from '../indexeddb/userDB.js'

// Helper : tente le réseau, retourne null si hors ligne / erreur
async function tryNetwork(fn) {
  if (!navigator.onLine) return null
  try { return await fn() }
  catch { return null }
}

// ── Transactions ──────────────────────────────────────────────────────────────
export const offlineTransactionsAPI = {
  getAll: async (userId) => {
    const res = await tryNetwork(() => transactionsAPI.getAll(userId))
    if (res !== null) {
      const items = Array.isArray(res) ? res : (res?.data ?? res?.transactions ?? [])
      cacheTransactions(userId, items).catch(() => {})
      return items
    }
    return getTransactions(userId)
  },

  create: async (userId, data) => {
    const res = await tryNetwork(() => transactionsAPI.create({ user_id: userId, ...data }))
    if (res !== null) {
      const item = res?.data ?? res
      if (item?.id) cacheTransactions(userId, [item]).catch(() => {})
      return item
    }
    return createTransaction(userId, data)
  },

  update: async (id, data, userId) => {
    const res = await tryNetwork(() => transactionsAPI.update(id, { user_id: userId, ...data }))
    if (res !== null) return res?.data ?? res
    return updateTransaction(id, data)
  },

  delete: async (id, userId) => {
    const res = await tryNetwork(() => transactionsAPI.delete(id, userId))
    if (res !== null) return
    return deleteTransaction(id, userId)
  },
}

// ── Budgets ───────────────────────────────────────────────────────────────────
export const offlineBudgetsAPI = {
  getAll: async (userId) => {
    const res = await tryNetwork(() => budgetsAPI.getAll(userId))
    if (res !== null) {
      const items = Array.isArray(res) ? res : (res?.data ?? res?.budgets ?? [])
      cacheBudgets(userId, items).catch(() => {})
      return items
    }
    return getBudgets(userId)
  },

  create: async (data) => {
    const res = await tryNetwork(() => budgetsAPI.create(data))
    if (res !== null) return res
    return createBudget(data.user_id, data)
  },

  update: async (id, data) => {
    const res = await tryNetwork(() => budgetsAPI.update(id, data))
    if (res !== null) return res
    return updateBudget(id, data)
  },

  delete: async (id, userId) => {
    const res = await tryNetwork(() => budgetsAPI.delete(id, userId))
    if (res !== null) return
    return deleteBudget(id, userId)
  },
}

// ── Categories ────────────────────────────────────────────────────────────────
export const offlineCategoriesAPI = {
  getAll: async (userId) => {
    const res = await tryNetwork(() => categoriesAPI.getAll(userId))
    if (res !== null) {
      const items = Array.isArray(res) ? res : (res?.data ?? res?.categories ?? [])
      cacheCategories(userId, items).catch(() => {})
      return items
    }
    return getCategories(userId)
  },

  create: async (data) => {
    const res = await tryNetwork(() => categoriesAPI.create(data))
    if (res !== null) return res
    return createCategory(data.user_id, data)
  },

  delete: async (id) => {
    const res = await tryNetwork(() => categoriesAPI.delete(id))
    if (res !== null) return
    return deleteCategory(id)
  },
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const offlineAnalyticsAPI = {
  dashboard: async (userId) => {
    const res = await tryNetwork(() => analyticsAPI.dashboard(userId))
    if (res !== null) {
      // Normalise : Django peut renvoyer { data: {...} } ou l'objet directement
      const data = res?.data && typeof res.data === 'object' && 'total_income' in res.data
        ? res.data
        : res?.total_income !== undefined ? res : res?.data ?? res
      saveDashboard(data).catch(() => {})
      return data
    }
    const snap = await getDashboard()
    return snap?.data ?? null
  },

  monthlyExpenses: async (userId, months) => {
    const res = await tryNetwork(() => analyticsAPI.monthlyExpenses(userId, months))
    if (res !== null) {
      // Normalise : garde l'objet complet { data: [], metrics: {} }
      const payload = Array.isArray(res) ? { data: res, metrics: null } : res
      saveMonthly(payload).catch(() => {})
      return payload
    }
    const snap = await getMonthly()
    return snap?.data ?? null
  },

  categoryExpenses: async (userId) => {
    const res = await tryNetwork(() => analyticsAPI.categoryExpenses(userId))
    if (res !== null) {
      const payload = Array.isArray(res) ? { data: res } : res
      saveCategoryExp(payload).catch(() => {})
      return payload
    }
    const snap = await getCategoryExp()
    return snap?.data ?? null
  },

  insights: async (userId) => {
    const res = await tryNetwork(() => analyticsAPI.insights(userId))
    if (res !== null) return res
    return { insights: [] }
  },
}

// Compatibilité : setNetworkStatus gardé pour ne pas casser les imports existants
export function setNetworkStatus() {}
