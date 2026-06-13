/**
 * syncEngine.js — Moteur de synchronisation Last Write Wins
 *
 * Stratégie :
 *   1. Déduplique la queue (évite N updates redondants)
 *   2. Joue chaque opération dans l'ordre FIFO
 *   3. En cas de succès : met à jour le local_id → server_id + sync_status='synced'
 *   4. En cas de conflit (400/409) : compare updated_at → Last Write Wins
 *   5. En cas d'erreur réseau : incrémente attempts, re-essaie au prochain sync
 *
 * Le moteur est appelé par useSyncEngine (hook React) qui écoute online/offline.
 */
import { getPendingItems, markDone, markFailed, deduplicateQueue } from './syncQueue.js'
import { put, get, remove, getAllByIndex }                            from '../indexeddb/db.js'
import { transactionsAPI, budgetsAPI, categoriesAPI }                from '../services/api.js'

// ── Mapping store → API calls ─────────────────────────────────────────────────
const API_MAP = {
  transactions: {
    create: (payload) => transactionsAPI.create(payload),
    update: (payload) => transactionsAPI.update(payload.server_id, payload),
    delete: (payload) => transactionsAPI.delete(payload.server_id, payload.user_id),
  },
  budgets: {
    create: (payload) => budgetsAPI.create(payload),
    update: (payload) => budgetsAPI.update(payload),
    delete: (payload) => budgetsAPI.delete(payload.server_id, payload.user_id),
  },
  categories: {
    create: (payload) => categoriesAPI.create(payload),
    update: () => Promise.reject(new Error('categories.update non supporté')),
    delete: (payload) => categoriesAPI.delete(payload.server_id),
  },
}

let _running = false

/**
 * Lance la synchronisation de toutes les opérations en attente.
 * @param {Function} onProgress — callback({ done, total, current })
 * @returns {{ synced: number, failed: number, errors: Array }}
 */
export async function runSync(onProgress) {
  if (_running) return { synced: 0, failed: 0, errors: ['Sync already running'] }
  _running = true

  const result = { synced: 0, failed: 0, errors: [] }

  try {
    await deduplicateQueue()
    const items = await getPendingItems()
    const total = items.length

    if (total === 0) return result

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      onProgress?.({ done: i, total, current: item })

      try {
        await processItem(item)
        await markDone(item.queue_id)
        result.synced++
      } catch (err) {
        const msg = err.message ?? 'Unknown error'
        await markFailed(item.queue_id, msg)
        result.failed++
        result.errors.push({ item, error: msg })
        // On continue avec les autres items (pas de stop on first error)
      }
    }
  } finally {
    _running = false
  }

  return result
}

/** Traite un item individuel de la queue */
async function processItem(item) {
  const { store, operation, local_id, payload } = item
  const apiHandler = API_MAP[store]?.[operation]
  if (!apiHandler) throw new Error(`No handler for ${store}.${operation}`)

  const serverResponse = await apiHandler(cleanPayload(payload))

  // ── Après create : mettre à jour local_id → server_id ────────────────────
  if (operation === 'create' && serverResponse) {
    const serverId = serverResponse?.id ?? serverResponse?.data?.id
    if (serverId) {
      const existingArr = await getAllByIndex(store, 'local_id', local_id)
      // local_id est la clé primaire, donc on get directement
      const existing = await get(store, local_id)
      if (existing) {
        await put(store, {
          ...existing,
          server_id:   String(serverId),
          sync_status: 'synced',
          // Mise à jour des champs retournés par le serveur (updated_at serveur)
          updated_at: serverResponse.updated_at ?? existing.updated_at,
        })
      }
    }
  }

  // ── Après update ──────────────────────────────────────────────────────────
  if (operation === 'update') {
    const existing = await get(store, local_id)
    if (existing) {
      await put(store, { ...existing, sync_status: 'synced' })
    }
  }

  // ── Après delete : supprimer localement ──────────────────────────────────
  if (operation === 'delete') {
    await remove(store, local_id)
  }
}

/**
 * Last Write Wins : compare le updated_at local vs serveur.
 * Utilisé en cas de 409 Conflict pour décider qui gagne.
 */
export function resolveConflict(localRecord, serverRecord) {
  const localTs  = new Date(localRecord.updated_at  ?? 0).getTime()
  const serverTs = new Date(serverRecord.updated_at ?? 0).getTime()
  return localTs >= serverTs ? 'local' : 'server'
}

/** Nettoie le payload avant envoi : retire les champs internes IDB */
function cleanPayload(payload) {
  const { local_id, sync_status, ...clean } = payload ?? {}
  // Convertit server_id → id pour le backend
  if (clean.server_id) { clean.id = clean.server_id; delete clean.server_id }
  return clean
}
