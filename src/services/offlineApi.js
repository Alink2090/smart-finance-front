/**
 * offlineApi.js — Couche API aware offline
 *
 * Intercepte chaque appel API :
 *   - Si ONLINE  → appel réseau normal + mise en cache IDB en arrière-plan
 *   - Si OFFLINE → lecture depuis IndexedDB + écriture dans sync_queue
 *
 * Usage : remplace les appels directs à api.js dans les pages.
 * Les pages existantes n'ont pas besoin d'être modifiées si elles
 * appellent ces wrappers à la place des APIs directes.
 */
import { transactionsAPI, budgetsAPI, categoriesAPI } from './api.js'
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction, cacheTransactions,
} from '../indexeddb/transactionsDB.js'
import {
  getBudgets, createBudget, updateBudget, deleteBudget, cacheBudgets,
} from '../indexeddb/budgetsDB.js'
import {
  getCategories, createCategory, deleteCategory, cacheCategories,
} from '../indexeddb/categoriesDB.js'

const isOnline = () => navigator.onLine

// ── Transactions ──────────────────────────────────────────────────────────────
export const offlineTransactionsAPI = {
  getAll: async (userId) => {
    if (isOnline()) {
      try {
        const res = await transactionsAPI.getAll(userId)
        const items = Array.isArray(res) ? res : (res?.data ?? res?.transactions ?? [])
        await cacheTransactions(userId, items)  // cache en arrière-plan
        return items
      } catch {
        return getTransactions(userId)  // fallback IDB si le réseau échoue
      }
    }
    return getTransactions(userId)
  },

  create: async (userId, data) => {
    if (isOnline()) {
      try {
        const res = await transactionsAPI.create({ user_id: userId, ...data })
        // Cache immédiatement la réponse serveur
        const item = res?.data ?? res
        if (item?.id) await cacheTransactions(userId, [item])
        return item
      } catch {
        return createTransaction(userId, data)
      }
    }
    return createTransaction(userId, data)
  },

  update: async (id, data, userId) => {
    if (isOnline()) {
      try {
        const res = await transactionsAPI.update(id, { user_id: userId, ...data })
        return res?.data ?? res
      } catch {
        return updateTransaction(id, data)
      }
    }
    return updateTransaction(id, data)
  },

  delete: async (id, userId) => {
    if (isOnline()) {
      try {
        await transactionsAPI.delete(id, userId)
        return
      } catch {
        return deleteTransaction(id, userId)
      }
    }
    return deleteTransaction(id, userId)
  },
}

// ── Budgets ───────────────────────────────────────────────────────────────────
export const offlineBudgetsAPI = {
  getAll: async (userId) => {
    if (isOnline()) {
      try {
        const res = await budgetsAPI.getAll(userId)
        const items = Array.isArray(res) ? res : (res?.data ?? res?.budgets ?? [])
        await cacheBudgets(userId, items)
        return items
      } catch { return getBudgets(userId) }
    }
    return getBudgets(userId)
  },

  create: async (data) => {
    if (isOnline()) {
      try { return await budgetsAPI.create(data) }
      catch { return createBudget(data.user_id, data) }
    }
    return createBudget(data.user_id, data)
  },

  update: async (id, data) => {
    if (isOnline()) {
      try { return await budgetsAPI.update(id, data) }
      catch { return updateBudget(id, data) }
    }
    return updateBudget(id, data)
  },

  delete: async (id, userId) => {
    if (isOnline()) {
      try { await budgetsAPI.delete(id, userId); return }
      catch { return deleteBudget(id, userId) }
    }
    return deleteBudget(id, userId)
  },
}

// ── Categories ────────────────────────────────────────────────────────────────
export const offlineCategoriesAPI = {
  getAll: async (userId) => {
    if (isOnline()) {
      try {
        const res = await categoriesAPI.getAll(userId)
        const items = Array.isArray(res) ? res : (res?.data ?? res?.categories ?? [])
        await cacheCategories(userId, items)
        return items
      } catch { return getCategories(userId) }
    }
    return getCategories(userId)
  },

  create: async (data) => {
    if (isOnline()) {
      try { return await categoriesAPI.create(data) }
      catch { return createCategory(data.user_id, data) }
    }
    return createCategory(data.user_id, data)
  },

  delete: async (id) => {
    if (isOnline()) {
      try { await categoriesAPI.delete(id); return }
      catch { return deleteCategory(id) }
    }
    return deleteCategory(id)
  },
}
