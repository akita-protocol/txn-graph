/**
 * @akita/visual-explorer — cross-platform React / React Native visualizer for
 * Algorand transaction groups.
 *
 * Consumers should reach for:
 *   - `<TransactionsGraph>` for the turnkey experience
 *   - `<DataProvider>` to wire async account / asset resolution
 *   - `<ThemeProvider>` + `akitaDarkTheme` / `defineTheme` for branding
 *   - `asTransactionsGraphData` to convert a flat list of transactions into
 *     the `TransactionsGraphData` shape the graph renders.
 */

// ── Top-level component
export { TransactionsGraph } from './components/TransactionsGraph'
export type {
  GraphProps,
  LayoutMode,
  DagLayoutOptions,
  RenderTooltipContext,
  RenderVerticalTitleContext,
  RenderHorizontalTitleContext,
} from './types'

// ── Orchestration building blocks (consumer can build custom chrome)
export {
  GraphViewport,
  FlowStepper,
  ZoomToolbar,
  DownloadButton,
} from './components'
export type {
  GraphViewportProps,
  GraphViewportHandle,
  FlowStepperProps,
  ZoomToolbarProps,
  DownloadButtonProps,
} from './components'

// ── Data
export { asTransactionsGraphData, flattenInnerTransactions } from './mappers'
export * from './models'

// ── Layout
export {
  sequenceLayout,
  makeSequenceLayout,
  sequenceLayoutDefaults,
  dagLayout,
  makeDagLayout,
  dagLayoutDefaults,
  nodeIdForVertical,
} from './layouts'
export type {
  Layout,
  LayoutResult,
  PositionedNode,
  PositionedEdge,
  Point2D,
  SequenceLayoutOptions,
  DagLayoutFactoryOptions,
} from './layouts'

// ── Primitives
export {
  AnimatedPath,
  ActiveEdgeProvider,
  useActiveEdgeContext,
  AccountNode,
  AssetBadge,
  Marker,
  SequenceBackdrop,
  StepPill,
  TxEdge,
  VerticalBox,
  VerticalNode,
  catmullRomToBezier,
  clamp,
  distance,
  lerp,
  linePath,
  polylinePath,
  roundedStepPath,
} from './primitives'
export type {
  ActiveEdgeContextValue,
  ActiveEdgeProviderProps,
  AccountNodeProps,
  AssetBadgeProps,
  MarkerProps,
  SequenceBackdropProps,
  StepPillProps,
  TxEdgeProps,
  VerticalBoxProps,
  VerticalNodeProps,
} from './primitives'

// ── Hooks
export {
  useStepController,
  useMarchingDots,
  useKeyboardNavigation,
  useZoomPan,
} from './hooks'
export type {
  Step,
  StepController,
  StepControllerOptions,
  MarchingDotsOptions,
  KeyboardNavigationHandlers,
  ZoomPanController,
  ZoomPanOptions,
} from './hooks'

// ── Theme
export {
  ThemeProvider,
  ThemeContext,
  useTheme,
  akitaDarkTheme,
  defaultTheme,
  defineTheme,
} from './theme'
export type { ThemeTokens, LabelColor, LabelColorMap, SpringConfig } from './theme'

// ── Providers
export {
  DataProvider,
  useDataProvider,
  useAssetSummary,
  useAccountSummary,
  useApplicationSummary,
  useEntityHref,
} from './providers'
export type {
  DataProviderApi,
  DataProviderProps,
  AccountSummary,
  AssetSummary,
  ApplicationSummary,
  EntityRef,
} from './providers'

// ── Utils (public surface for consumers building custom primitives)
export { cn } from './utils/cn'
export { isWeb } from './utils/is-web'
export { truncateAddress } from './utils/truncate-address'
export {
  bigIntToDecimal,
  formatAlgo,
  formatAssetAmount,
  toBigInt,
} from './utils/format-amount'
