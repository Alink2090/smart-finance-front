/**
 * transactionsDB.js — CRUD IndexedDB pour les transactions
 * Toutes les opérations estampillent sync_status et enfilent dans sync_queue.
 */
import { put, remove, get, getAllByIndex, localId } from './db.js'
import { enqueue } from '../sync/syncQueue.js'

const STORE = 'transactions'
const now   = () => new Date().toISOString()

/** Retourne toutes les transactions d'un utilisateur (non supprimées) */
export async function getTransactions(userId) {
  const all = await getAllByIndex(STORE, 'user_id', userId)
  return all.filter(t => t.sync_status !== 'pending_delete')
}

/** Crée une transaction offline */
export async function createTransaction(userId, data) {
  const record = {
    local_id:    localId(),
    server_id:   null,
    user_id:     userId,
    sync_status: 'pending_create',
    created_at:  now(),
    updated_at:  now(),
    ...data,
  }
  await put(STORE, record)
  await enqueue({ store: STORE, operation: 'create', local_id: record.local_id, payload: record })
  return record
}

/** Met à jour une transaction (online: server_id connu / offline: local_id) */
export async function updateTransaction(localIdOrServerId, data) {
  // Retrouver l'enregistrement existant
  let record = await get(STORE, localIdOrServerId)
  if (!record) {
    // Chercher par server_id
    const all = await getAllByIndex(STORE, 'server_id', String(localIdOrServerId))
    record = all[0]
  }
  if (!record) throw new Error(`Transaction ${localIdOrServerId} introuvable en local`)

  const updated = {
    ...record,
    ...data,
    sync_status: record.sync_status === 'pending_create' ? 'pending_create' : 'pending_update',
    updated_at:  now(),
  }
  await put(STORE, updated)
  await enqueue({ store: STORE, operation: 'update', local_id: updated.local_id, payload: updated })
  return updated
}

/** Marque une transaction comme à supprimer */
export async function deleteTransaction(localIdOrServerId, userId) {
  let record = await get(STORE, localIdOrServerId)
  if (!record) {
    const all = await getAllByIndex(STORE, 'server_id', String(localIdOrServerId))
    record = all[0]
  }
  if (!record) return

  // Si jamais synchronisée → on supprime directement localement
  if (record.sync_status === 'pending_create') {
    await remove(STORE, record.local_id)
    return
  }

  const updated = { ...record, sync_status: 'pending_delete', updated_at: now() }
  await put(STORE, updated)
  await enqueue({ store: STORE, operation: 'delete', local_id: updated.local_id, payload: { server_id: record.server_id, user_id: userId } })
}

/** Sauvegarde un tableau venant du serveur (après fetch réseau) */
export async function cacheTransactions(userId, serverItems) {
  for (const item of serverItems) {
    const existing = (await getAllByIndex(STORE, 'server_id', String(item.id)))[0]
    if (existing && existing.sync_status !== 'synced') continue // en attente de sync → ne pas écraser
    await put(STORE, {
      local_id:    existing?.local_id ?? localId(),
      server_id:   String(item.id),
      user_id:     userId,
      sync_status: 'synced',
      updated_at:  item.updated_at ?? now(),
      ...item,
    })
  }
}
