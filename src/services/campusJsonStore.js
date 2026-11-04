import {
    canUseOpsApi,
    listOpsCollectionApi,
    OPS_ITEM_UPSERT_COLLECTIONS,
    replaceOpsCollectionApi,
    stripOpsMeta,
    upsertOpsItemApi,
} from './opsApi'
import {
    canUseCampusAuditApi,
    listCampusAuditCollectionApi,
    replaceCampusAuditCollectionApi,
    stripCampusAuditMeta,
} from './campusAuditApi'
import { resolveCampusCollection } from './campusCollectionRegistry'

/** In-memory campus SoT keyed by storageKey when API mode is on. */
const memoryByKey = new Map()
const hydratePromises = new Map()

const recordIdForUpsert = (row) =>
    String(row?.id || row?.itemId || row?.requestId || row?.dutyId || row?.ticketId || '').trim()

const clean = (kind, rows) => {
    const strip = kind === 'audit' ? stripCampusAuditMeta : stripOpsMeta
    return Array.isArray(rows) ? rows.map(strip) : []
}

const canUse = (kind) => (kind === 'audit' ? canUseCampusAuditApi() : canUseOpsApi())

const listApi = (kind, collection) =>
    kind === 'audit' ? listCampusAuditCollectionApi(collection) : listOpsCollectionApi(collection)

const replaceApi = (kind, collection, items) =>
    kind === 'audit'
        ? replaceCampusAuditCollectionApi(collection, items)
        : replaceOpsCollectionApi(collection, items)

export const usesCampusApiForKey = (storageKey) => {
    const meta = resolveCampusCollection(storageKey)
    return Boolean(meta && canUse(meta.kind))
}

export const getCampusMemory = (storageKey) => {
    if (!memoryByKey.has(storageKey)) return null
    return structuredClone(memoryByKey.get(storageKey))
}

export const setCampusMemory = (storageKey, rows, { push = true } = {}) => {
    const list = Array.isArray(rows) ? rows : []
    memoryByKey.set(storageKey, list)
    if (!push) return Promise.resolve(true)
    const meta = resolveCampusCollection(storageKey)
    if (!meta || !canUse(meta.kind)) return Promise.resolve(true)
    if (meta.kind === 'ops' && OPS_ITEM_UPSERT_COLLECTIONS.has(meta.collection)) {
        return Promise.all(
            clean(meta.kind, list).map((row) => {
                const id = recordIdForUpsert(row)
                if (!id) return Promise.resolve()
                return upsertOpsItemApi(meta.collection, id, row)
            }),
        )
            .then(() => true)
            .catch(() => false)
    }
    return replaceApi(meta.kind, meta.collection, clean(meta.kind, list)).then(() => true).catch(() => false)
}

export const clearCampusJsonMemory = () => {
    memoryByKey.clear()
    hydratePromises.clear()
}

export const hydrateCampusKey = async (storageKey, seed = []) => {
    void seed
    const meta = resolveCampusCollection(storageKey)
    if (!meta || !canUse(meta.kind)) return false
    if (hydratePromises.has(storageKey)) return hydratePromises.get(storageKey)

    const work = (async () => {
        try {
            const rows = await listApi(meta.kind, meta.collection)
            memoryByKey.set(storageKey, clean(meta.kind, rows))
            try {
                localStorage.removeItem(storageKey)
            } catch {
                /* ignore */
            }
            return true
        } catch {
            if (!memoryByKey.has(storageKey)) memoryByKey.set(storageKey, [])
            return false
        } finally {
            hydratePromises.delete(storageKey)
        }
    })()

    hydratePromises.set(storageKey, work)
    return work
}

/**
 * Drop-in helpers for modules that used localStorage.getItem/setItem(STORAGE_KEY).
 */
export const loadCampusJson = (storageKey, fallback) => {
    if (usesCampusApiForKey(storageKey)) {
        const mem = getCampusMemory(storageKey)
        if (mem != null) return mem
        return Array.isArray(fallback) ? [] : fallback
    }
    try {
        const raw = localStorage.getItem(storageKey)
        if (!raw) return fallback
        return JSON.parse(raw) ?? fallback
    } catch {
        return fallback
    }
}

export const saveCampusJson = (storageKey, value) => {
    if (usesCampusApiForKey(storageKey)) {
        const pending = setCampusMemory(storageKey, value, { push: true })
        try {
            localStorage.removeItem(storageKey)
        } catch {
            /* ignore */
        }
        return pending
    }
    try {
        localStorage.setItem(storageKey, JSON.stringify(value))
        return true
    } catch {
        return false
    }
}

/** Awaitable save — waits for ops/audit replace when API mode is on. */
export const persistCampusJson = async (storageKey, value) => {
    const list = Array.isArray(value) ? value : []
    if (usesCampusApiForKey(storageKey)) {
        memoryByKey.set(storageKey, list)
        try {
            localStorage.removeItem(storageKey)
        } catch {
            /* ignore */
        }
        const meta = resolveCampusCollection(storageKey)
        if (!meta || !canUse(meta.kind)) return { success: true, api: false }
        try {
            if (meta.kind === 'ops' && OPS_ITEM_UPSERT_COLLECTIONS.has(meta.collection)) {
                // Concurrent-safe path: upsert each row; does not delete omitted rows.
                for (const row of clean(meta.kind, list)) {
                    const id = recordIdForUpsert(row)
                    if (!id) throw new Error('Each record needs an id for item upsert.')
                    await upsertOpsItemApi(meta.collection, id, row)
                }
                return { success: true, api: true, mode: 'upsert' }
            }
            await replaceApi(meta.kind, meta.collection, clean(meta.kind, list))
            return { success: true, api: true }
        } catch (err) {
            return { success: false, api: true, message: err?.message || 'API save failed' }
        }
    }
    const ok = saveCampusJson(storageKey, list)
    return { success: Boolean(ok), api: false }
}

/** Save one record without replacing the rest of the collection (ops item-upsert collections). */
export const persistCampusJsonItem = async (storageKey, record) => {
    const row = record && typeof record === 'object' ? record : null
    if (!row) return { success: false, message: 'Record is required.' }
    const id = recordIdForUpsert(row)
    if (!id) return { success: false, message: 'Record id is required.' }

    if (usesCampusApiForKey(storageKey)) {
        const meta = resolveCampusCollection(storageKey)
        if (!meta || meta.kind !== 'ops' || !canUse('ops')) {
            return { success: false, message: 'Ops API is not available for this collection.' }
        }
        if (!OPS_ITEM_UPSERT_COLLECTIONS.has(meta.collection)) {
            // Fall back to merging into the hydrated list then whole-list replace.
            const current = getCampusMemory(storageKey) || []
            const next = [row, ...current.filter((item) => recordIdForUpsert(item) !== id)]
            return persistCampusJson(storageKey, next)
        }
        try {
            const saved = stripOpsMeta(await upsertOpsItemApi(meta.collection, id, stripOpsMeta(row)))
            const current = getCampusMemory(storageKey) || []
            const next = [saved, ...current.filter((item) => recordIdForUpsert(item) !== id)]
            memoryByKey.set(storageKey, next)
            try {
                localStorage.removeItem(storageKey)
            } catch {
                /* ignore */
            }
            return { success: true, api: true, record: saved }
        } catch (err) {
            return { success: false, api: true, message: err?.message || 'API save failed', record: row }
        }
    }

    const current = loadCampusJson(storageKey, [])
    const list = Array.isArray(current) ? current : []
    const next = [row, ...list.filter((item) => recordIdForUpsert(item) !== id)]
    const ok = saveCampusJson(storageKey, next)
    return { success: Boolean(ok), api: false, record: row }
}

export const ensureCampusSeed = (storageKey, seed) => {
    if (usesCampusApiForKey(storageKey)) {
        const mem = getCampusMemory(storageKey)
        if (mem != null) return mem
        memoryByKey.set(storageKey, [])
        hydrateCampusKey(storageKey)
        return []
    }
    try {
        const raw = localStorage.getItem(storageKey)
        if (raw == null) {
            localStorage.setItem(storageKey, JSON.stringify(seed))
            return structuredClone(seed)
        }
        return JSON.parse(raw)
    } catch {
        return structuredClone(seed)
    }
}
