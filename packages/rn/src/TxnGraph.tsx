import { useEffect, useMemo } from 'react'
import { BackHandler, View, useColorScheme, type StyleProp, type ViewStyle } from 'react-native'
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
  type LayoutOptions,
  type ThemeInput,
} from '@akta/txn-graph-core'
import { Canvas } from './Canvas'
import { Header } from './Header'
import { Panel } from './Panel'
import { StylesProvider, useStyles } from './parts'

export type TxnGraphProps = {
  transactions: readonly GraphTransaction[]
  /** Root title. Default: `Transaction group`. */
  title?: string
  /** Default: `'auto'` (follows the system appearance). */
  colorScheme?: 'dark' | 'light' | 'auto'
  theme?: ThemeInput
  /** Height of the graph canvas. When omitted the canvas flexes to fill the root (give `style={{ flex: 1 }}`). */
  height?: number
  /** Show the details panel under the graph. Default: true. */
  showPanel?: boolean
  /** Max height of the details panel. Default: 260. */
  panelMaxHeight?: number
  /** Android back button climbs scopes / clears selection. Default: true. */
  handleBackButton?: boolean
  /** Convenience: wraps the graph in a `DataProvider`. */
  dataProvider?: DataProviderApi
  initialScopePath?: EntityId[]
  onScopeChange?: (path: EntityId[]) => void
  onSelectionChange?: (selection: Focus | null) => void
  style?: StyleProp<ViewStyle>
}

/**
 * Interactive overview of an Algorand transaction group for React Native.
 * Must render inside a `GestureHandlerRootView`.
 */
export function TxnGraph(props: TxnGraphProps) {
  const graph = <TxnGraphThemed {...props} />
  return props.dataProvider ? <DataProvider api={props.dataProvider}>{graph}</DataProvider> : graph
}

function TxnGraphThemed(props: TxnGraphProps) {
  const system = useColorScheme()
  const pref = props.colorScheme ?? 'auto'
  const scheme = pref === 'auto' ? (system === 'light' ? 'light' : 'dark') : pref
  const themeKey = JSON.stringify(props.theme ?? {})
  const theme = useMemo(
    () => defineTheme(scheme === 'light' ? lightTheme : darkTheme, props.theme),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheme, themeKey],
  )
  return (
    <ThemeContext.Provider value={theme}>
      <StylesProvider>
        <TxnGraphInner {...props} layout={theme.layout} />
      </StylesProvider>
    </ThemeContext.Provider>
  )
}

function TxnGraphInner({
  transactions,
  title = 'Transaction group',
  height,
  showPanel = true,
  panelMaxHeight = 260,
  handleBackButton = true,
  initialScopePath,
  onScopeChange,
  onSelectionChange,
  style,
  layout,
}: TxnGraphProps & { layout: LayoutOptions }) {
  const s = useStyles()
  const c = useTxnGraph({ transactions, layout, initialScopePath, onScopeChange, onSelectionChange })

  useEffect(() => {
    if (!handleBackButton) return undefined
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (c.selection) c.select(null)
      else if (c.view.scope.path.length) c.up()
      else return false
      return true
    })
    return () => sub.remove()
  }, [c, handleBackButton])

  return (
    <View style={[s.root, style]}>
      <Header c={c} rootTitle={title} />
      <View style={height === undefined ? { flex: 1, minHeight: 260 } : { height }}>
        <Canvas c={c} />
      </View>
      {showPanel && <Panel c={c} rootTitle={title} maxHeight={panelMaxHeight} />}
    </View>
  )
}
