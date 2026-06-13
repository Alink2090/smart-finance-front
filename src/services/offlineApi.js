/**
 * offlineApi.js — Couche API aware offline
 *
 * Corrections v2 :
 *  - N'utilise PLUS navigator.onLine directement
 *  - Exporte getOnlineStatus() qui lit le dernier état connu via un
 *    module-level singleton mis à jour par useNetwork
 *  - Fallback IDB systématique si fetch échoue (réseau mort mais
 *    navigator.onLine=true, ex: réseau captif)
 */
import { transactionsAPI, budgetsAPI, categoriesAPI } from './api.js'
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

// ── État réseau partagé ───────────────────────────────────────────────────────
// Mis à jour par setNetworkStatus() appelé depuis OfflineContext
let _online = navigator.onLine

export function setNetworkStatus(isOnline) {
  _online = isOnline
}

const isOnline = () => _online

// ── Transactions ──────────────────────────────────────────────────────────────
export const offlineTransactionsAPI = {
  getAll: async (userId) => {
    if (isOnline()) {
      try {
        const res   = await transactionsAPI.getAll(userId)
        const items = Array.isArray(res) ? res : (res?.data ?? res?.transactions ?? [])
        cacheTransactions(userId, items).catch(() => {}) // fire & forget
        return items
      } catch {
        // réseau mort malgré isOnline=true → fallback IDB
      }
    }
    return getTransactions(userId)
  },

  create: async (userId, data) => {
    if (isOnline()) {
      try {
        const res  = await transactionsAPI.create({ user_id: userId, ...data })
        const item = res?.data ?? res
        if (item?.id) cacheTransactions(userId, [item]).catch(() => {})
        return item
      } catch {}
    }
    return createTransaction(userId, data)
  },

  update: async (id, data, userId) => {
    if (isOnline()) {
      try {
        const res = await transactionsAPI.update(id, { user_id: userId, ...data })
        return res?.data ?? res
      } catch {}
    }
    return updateTransaction(id, data)
  },

  delete: async (id, userId) => {
    if (isOnline()) {
      try { await transactionsAPI.delete(id, userId); return } catch {}
    }
    return deleteTransaction(id, userId)
  },
}

// ── Budgets ───────────────────────────────────────────────────────────────────
export const offlineBudgetsAPI = {
  getAll: async (userId) => {
    if (isOnline()) {
      try {
        const res   = await budgetsAPI.getAll(userId)
        const items = Array.isArray(res) ? res : (res?.data ?? res?.budgets ?? [])
        cacheBudgets(userId, items).catch(() => {})
        return items
      } catch {}
    }
    return getBudgets(userId)
  },

  create: async (data) => {
    if (isOnline()) {
      try { return await budgetsAPI.create(data) } catch {}
    }
    return createBudget(data.user_id, data)
  },

  update: async (id, data) => {
    if (isOnline()) {
      try { return await budgetsAPI.update(id, data) } catch {}
    }
    return updateBudget(id, data)
  },

  delete: async (id, userId) => {
    if (isOnline()) {
      try { await budgetsAPI.delete(id, userId); return } catch {}
    }
    return deleteBudget(id, userId)
  },
}

// ── Categories ────────────────────────────────────────────────────────────────
export const offlineCategoriesAPI = {
  getAll: async (userId) => {
    if (isOnline()) {
      try {
        const res   = await categoriesAPI.getAll(userId)
        const items = Array.isArray(res) ? res : (res?.data ?? res?.categories ?? [])
        cacheCategories(userId, items).catch(() => {})
        return items
      } catch {}
    }
    return getCategories(userId)
  },

  create: async (data) => {
    if (isOnline()) {
      try { return await categoriesAPI.create(data) } catch {}
    }
    return createCategory(data.user_id, data)
  },

  delete: async (id) => {
    if (isOnline()) {
      try { await categoriesAPI.delete(id); return } catch {}
    }
    return deleteCategory(id)
  },
}
