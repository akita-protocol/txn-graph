import React, { createContext, useContext, useEffect } from 'react'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'

/**
 * Broadcasts the currently-active edge id as a Reanimated shared value so
 * `<TxEdge>` instances can react via `useAnimatedProps` on the UI thread
 * without re-rendering the whole edge set. On step change only one shared
 * value mutates; React does not re-run.
 */
export type ActiveEdgeContextValue = {
  activeEdgeId: SharedValue<string | null>
  /** Optional JS-thread mirror for consumers that need to read during render. */
  activeEdgeIdJs: string | null
}

const NoopContext: ActiveEdgeContextValue = {
  // Populated by ActiveEdgeProvider; the default is only used if a consumer
  // forgets to wrap — primitives handle a null activeEdgeId gracefully.
  activeEdgeId: { value: null } as unknown as SharedValue<string | null>,
  activeEdgeIdJs: null,
}

const ActiveEdgeContext = createContext<ActiveEdgeContextValue>(NoopContext)

export type ActiveEdgeProviderProps = {
  activeEdgeId: string | null
  children: React.ReactNode
}

export function ActiveEdgeProvider({ activeEdgeId, children }: ActiveEdgeProviderProps) {
  const shared = useSharedValue<string | null>(activeEdgeId)

  useEffect(() => {
    shared.value = activeEdgeId
  }, [activeEdgeId, shared])

  const value: ActiveEdgeContextValue = { activeEdgeId: shared, activeEdgeIdJs: activeEdgeId }
  return <ActiveEdgeContext.Provider value={value}>{children}</ActiveEdgeContext.Provider>
}

export function useActiveEdgeContext(): ActiveEdgeContextValue {
  return useContext(ActiveEdgeContext)
}
