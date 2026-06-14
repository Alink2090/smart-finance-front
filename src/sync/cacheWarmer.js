/**
 * cacheWarmer.js — Pré-remplit IndexedDB à la connexion
 *
 * Appelé une seule fois après un login réussi (online).
 * Garantit que les données sont disponibles AVANT de passer offline.
 *
 * Stratégie :
 *  - Fetch parallèle de toutes les ressources
 *  - Cache silencieux en IDB (fire & forget sur les erreurs)
 *  - Sauvegarde du profil utilisateur
 */
import { transactionsAPI, budgetsAPI, categoriesAPI, analyticsAPI } from '../services/api.js'
import { cacheTransactions }  from '../indexeddb/transactionsDB.js'
import { cacheBudgets }        from '../indexeddb/budgetsDB.js'
import { cacheCategories }     from '../indexeddb/categoriesDB.js'
import {
  saveProfile, saveDashboard,
  saveMonthly, saveCategoryExp,
} from '../indexeddb/userDB.js'

/**
 * Lance le remplissage complet du cache IDB pour un utilisateur.
 * @param {object} user — { id, name, email, ... }
 * @param {function} onProgress — callback optionnel ({ step, total, label })
 */
export async function warmCache(user, onProgress) {
  if (!user?.id) return
  const uid = user.id

  const steps = [
    {
      label: 'Transactions',
      fn: async () => {
        const res   = await transactionsAPI.getAll(uid)
        const items = Array.isArray(res) ? res : (res?.data ?? res?.transactions ?? [])
        await cacheTransactions(uid, items)
        return items.length
      },
    },
    {
      label: 'Budgets',
      fn: async () => {
        const res   = await budgetsAPI.getAll(uid)
        const items = Array.isArray(res) ? res : (res?.data ?? res?.budgets ?? [])
        await cacheBudgets(uid, items)
        return items.length
      },
    },
    {
      label: 'Catégories',
      fn: async () => {
        const res   = await categoriesAPI.getAll(uid)
        const items = Array.isArray(res) ? res : (res?.data ?? res?.categories ?? [])
        await cacheCategories(uid, items)
        return items.length
      },
    },
    {
      label: 'Dashboard',
      fn: async () => {
        const res  = await analyticsAPI.dashboard(uid)
        const data = res?.data ?? res
        if (data) await saveDashboard(data)
        return 1
      },
    },
    {
      label: 'Analytics mensuels',
      fn: async () => {
        const res  = await analyticsAPI.monthlyExpenses(uid, 12)
        const data = Array.isArray(res) ? res : (res?.data ?? [])
        if (data.length) await saveMonthly(data)
        return data.length
      },
    },
    {
      label: 'Analytics catégories',
      fn: async () => {
        const res  = await analyticsAPI.categoryExpenses(uid)
        const data = Array.isArray(res) ? res : (res?.data ?? [])
        if (data.length) await saveCategoryExp(data)
        return data.length
      },
    },
    {
      label: 'Profil utilisateur',
      fn: async () => {
        await saveProfile({ id: uid, name: user.name, email: user.email })
        return 1
      },
    },
  ]

  const results = []
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    onProgress?.({ step: i + 1, total: steps.length, label: step.label })
    try {
      const count = await step.fn()
      results.push({ label: step.label, count, ok: true })
    } catch (e) {
      // Ne pas bloquer si une étape échoue
      results.push({ label: step.label, ok: false, error: e.message })
      console.warn(`[CacheWarmer] ${step.label} failed:`, e.message)
    }
  }

  const cached = results.filter(r => r.ok).reduce((s, r) => s + (r.count ?? 0), 0)
  console.info(`[CacheWarmer] ✓ ${cached} éléments mis en cache IDB`)
  return results
}
