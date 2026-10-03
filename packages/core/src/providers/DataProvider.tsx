import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Address, ApplicationId, AssetId } from '../models'
import type {
  AccountSummary,
  ApplicationSummary,
  AssetSummary,
  DataProviderApi,
  EntityRef,
} from './types'

export type DataProviderProps = {
  api: DataProviderApi
  children: React.ReactNode
}

const noopApi: DataProviderApi = {
  getAccountSummary: () => undefined,
  getAssetSummary: () => undefined,
  getApplicationSummary: () => undefined,
}

const DataProviderContext = createContext<DataProviderApi>(noopApi)

export function DataProvider({ api, children }: DataProviderProps) {
  return <DataProviderContext.Provider value={api}>{children}</DataProviderContext.Provider>
}

/** Raw access to the injected api — prefer the typed hooks below. */
export function useDataProvider(): DataProviderApi {
  return useContext(DataProviderContext)
}

function isPromise<T>(value: unknown): value is Promise<T> {
  return Boolean(value) && typeof (value as { then?: unknown }).then === 'function'
}

/**
 * Generic resolver. Accepts a getter that may return a value, a Promise, or
 * undefined. Handles both the sync (react-query primed cache, Jotai store
 * snapshot) and async (cold network) cases without suspending.
 */
function useResolved<Key, Value>(
  key: Key | null | undefined,
  fetch: (key: Key) => Value | Promise<Value> | undefined,
): Value | undefined {
  const [value, setValue] = useState<Value | undefined>(() => {
    if (key === null || key === undefined) return undefined
    const raw = fetch(key)
    if (raw === undefined || isPromise<Value>(raw)) return undefined
    return raw
  })
  const activeKey = useRef(key)

  useEffect(() => {
    activeKey.current = key
    if (key === null || key === undefined) {
      setValue(undefined)
      return undefined
    }
    const raw = fetch(key)
    if (raw === undefined) {
      setValue(undefined)
      return undefined
    }
    if (isPromise<Value>(raw)) {
      let cancelled = false
      raw
        .then((resolved) => {
          if (!cancelled && activeKey.current === key) setValue(resolved)
        })
        .catch(() => {
          if (!cancelled && activeKey.current === key) setValue(undefined)
        })
      return () => {
        cancelled = true
      }
    }
    setValue(raw)
    return undefined
    // Intentionally omit `fetch` — consumers would rebuild the api object on
    // every render otherwise. Callers must ensure api identity is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return value
}

export function useAssetSummary(id: AssetId | null | undefined): AssetSummary | undefined {
  const api = useDataProvider()
  const fetch = useCallback((key: AssetId) => api.getAssetSummary(key), [api])
  return useResolved(id ?? null, fetch)
}

export function useAccountSummary(address: Address | null | undefined): AccountSummary | undefined {
  const api = useDataProvider()
  const fetch = useCallback((key: Address) => api.getAccountSummary(key), [api])
  return useResolved(address ?? null, fetch)
}

export function useApplicationSummary(
  id: ApplicationId | null | undefined,
): ApplicationSummary | undefined {
  const api = useDataProvider()
  const fetch = useCallback((key: ApplicationId) => api.getApplicationSummary(key), [api])
  return useResolved(id ?? null, fetch)
}

/** Resolves an `<a href>` value for web deep-links. Returns null on native. */
export function useEntityHref(ref: EntityRef | null | undefined): string | null {
  const api = useDataProvider()
  return useMemo(() => {
    if (!ref || !api.resolveHref) return null
    return api.resolveHref(ref)
  }, [api, ref])
}
