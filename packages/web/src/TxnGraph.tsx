import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MotionConfig } from 'motion/react'
import {
  DataProvider,
  ThemeContext,
  darkTheme,
  defineTheme,
  lightTheme,
  useTxnGraph,
  type DataProviderApi,
  type EntityId,
  type Focus,
  type GraphTransaction,
  type ThemeInput,
} from '@akta/txn-graph-core'
import { Canvas } from './Canvas'
import { Header } from './Header'
import { Panel } from './Panel'
import { css, themeVars } from './styles'
import { RenderContext, type RenderSlots } from './render-context'

export type TxnGraphProps = RenderSlots & {
  transactions: readonly GraphTransaction[]
  /** Root title. Default: `Transaction group`. */
  title?: string
  /** Default: `'auto'` (follows `prefers-color-scheme`). */
  colorScheme?: 'dark' | 'light' | 'auto'
  /** Partial override merged onto the light or dark theme. */
  theme?: ThemeInput
  /** Height of the graph area. Default: 680. */
  height?: number
  /** Show the details panel. Default: true. */
  showPanel?: boolean
  /** Below this container width the panel moves under the graph. Default: 820. */
  narrowBreakpoint?: number
  /** Convenience: wraps the graph in a `DataProvider`. */
  dataProvider?: DataProviderApi
  initialScopePath?: EntityId[]
  onScopeChange?: (path: EntityId[]) => void
  onSelectionChange?: (selection: Focus | null) => void
  /**
   * Animate scope changes. Default: true, except under
   * `process.env.NODE_ENV === 'test'` so DOM snapshots stay deterministic.
   */
  animate?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * Interactive overview of an Algorand transaction group: accounts and apps as
 * blocks, transactions as typed connections, assets in their own row.
 * Clicking an app with inner transactions opens it; Esc goes back up.
 */
export function TxnGraph(props: TxnGraphProps) {
  const graph = <TxnGraphInner {...props} />
  return props.dataProvider ? <DataProvider api={props.dataProvider}>{graph}</DataProvider> : graph
}

function TxnGraphInner({
  transactions,
  title = 'Transaction group',
  colorScheme = 'auto',
  theme: themeInput,
  height = 680,
  showPanel = true,
  narrowBreakpoint = 820,
  initialScopePath,
  onScopeChange,
  onSelectionChange,
  className,
  style,
  renderTransactionDetails,
  renderLink,
  animate = !isTestEnv(),
}: TxnGraphProps) {
  const slots = useMemo(
    () => ({ renderTransactionDetails, renderLink, animate }),
    [renderTransactionDetails, renderLink, animate],
  )
  const scheme = useScheme(colorScheme)
  const themeKey = JSON.stringify(themeInput ?? {})
  const theme = useMemo(
    () => defineTheme(scheme === 'light' ? lightTheme : darkTheme, themeInput),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheme, themeKey],
  )
  const c = useTxnGraph({ transactions, layout: theme.layout, initialScopePath, onScopeChange, onSelectionChange })

  const root = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    const node = root.current
    if (!node) return undefined
    const ro = new ResizeObserver(() => setNarrow(node.clientWidth < narrowBreakpoint))
    ro.observe(node)
    return () => ro.disconnect()
  }, [narrowBreakpoint])

  // Esc clears the selection, then climbs scopes — only while the pointer or
  // focus is inside, so several graphs on a page don't fight over the key.
  const engaged = useRef(false)
  const keyState = useRef(c)
  keyState.current = c
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const node = root.current
      if (!node || !(engaged.current || node.contains(document.activeElement))) return
      const ctl = keyState.current
      if (ctl.selection) ctl.select(null)
      else if (ctl.view.scope.path.length) ctl.up()
      else return
      e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <ThemeContext.Provider value={theme}>
      <RenderContext.Provider value={slots}>
      <MotionConfig reducedMotion="user">
        <div
          ref={root}
          className={['tg-root', className].filter(Boolean).join(' ')}
          data-narrow={narrow || undefined}
          data-panel={showPanel ? undefined : 'off'}
          style={{ ...themeVars(theme), height: narrow ? undefined : height, ['--tg-height' as string]: `${height}px`, ...style }}
          onPointerEnter={() => (engaged.current = true)}
          onPointerLeave={() => (engaged.current = false)}
        >
          <style>{css}</style>
          <div className="tg-main">
            <Header c={c} rootTitle={title} />
            <Canvas c={c} />
          </div>
          {showPanel && <Panel c={c} rootTitle={title} />}
        </div>
      </MotionConfig>
      </RenderContext.Provider>
    </ThemeContext.Provider>
  )
}

// Declared locally so the package doesn't need @types/node.
declare const process: { env?: Record<string, string | undefined> } | undefined

function isTestEnv(): boolean {
  return typeof process !== 'undefined' && process?.env?.NODE_ENV === 'test'
}

function useScheme(pref: 'dark' | 'light' | 'auto'): 'dark' | 'light' {
  const query = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  const [system, setSystem] = useState<'dark' | 'light'>(query)
  useEffect(() => {
    if (pref !== 'auto' || typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const on = () => setSystem(mq.matches ? 'light' : 'dark')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [pref])
  return pref === 'auto' ? system : pref
}
