import type { RunSnapshot } from '../types/rag'
import type { EmbeddingIndex } from './index'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('raglens', 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('indexes', { keyPath: 'id' })
      request.result.createObjectStore('snapshots', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadSnapshots(): Promise<RunSnapshot[]> {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('snapshots').objectStore('snapshots').getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function storeSnapshot(snapshot: RunSnapshot, index: EmbeddingIndex) {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['indexes', 'snapshots'], 'readwrite')
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error ?? new Error('Snapshot save was cancelled.'))
      const indexes = transaction.objectStore('indexes')
      const existing = indexes.getKey(index.id)
      existing.onsuccess = () => {
        if (existing.result === undefined) indexes.add(index)
      }
      transaction.objectStore('snapshots').add({ ...snapshot, embeddingIndexId: index.id })
    })
  } finally {
    db.close()
  }
}
