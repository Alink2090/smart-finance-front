import { put, remove, get, getAllByIndex, localId } from './db.js'
import { enqueue } from '../sync/syncQueue.js'

const STORE = 'categories'
const now   = () => new Date().toISOString()

export async function getCategories(userId) {
  const all = await getAllByIndex(STORE, 'user_id', userId)
  return all.filter(c => c.sync_status !== 'pending_delete')
}

export async function createCategory(userId, data) {
  const record = {
    local_id: localId(), server_id: null, user_id: userId,
    sync_status: 'pending_create', created_at: now(), updated_at: now(), ...data,
  }
  await put(STORE, record)
  await enqueue({ store: STORE, operation: 'create', local_id: record.local_id, payload: record })
  return record
}

export async function deleteCategory(localIdOrServerId) {
  let record = await get(STORE, localIdOrServerId)
  if (!record) {
    const all = await getAllByIndex(STORE, 'server_id', String(localIdOrServerId))
    record = all[0]
  }
  if (!record) return
  if (record.sync_status === 'pending_create') { await remove(STORE, record.local_id); return }
  const updated = { ...record, sync_status: 'pending_delete', updated_at: now() }
  await put(STORE, updated)
  await enqueue({ store: STORE, operation: 'delete', local_id: updated.local_id, payload: { server_id: record.server_id } })
}

export async function cacheCategories(userId, serverItems) {
  for (const item of serverItems) {
    const existing = (await getAllByIndex(STORE, 'server_id', String(item.id)))[0]
    if (existing && existing.sync_status !== 'synced') continue
    await put(STORE, {
      local_id: existing?.local_id ?? localId(), server_id: String(item.id),
      user_id: userId, sync_status: 'synced', updated_at: item.updated_at ?? now(), ...item,
    })
  }
}
