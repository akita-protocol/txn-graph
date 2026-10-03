/**
 * @akta/txn-graph-core — platform-neutral logic for the Akita txn-graph
 * visualizer: graph building, drill-down scopes, layout, theme tokens, and
 * the `useTxnGraph` controller shared by `@akta/txn-graph-web` and
 * `@akta/txn-graph-rn`. No DOM or React Native code.
 */

// ── Input model
export * from './models'

// ── Graph
export { buildTxnGraph, subtreeIds, accountEntityId, appEntityId, assetEntityId } from './graph/build'
export { CONNECTION_KINDS } from './graph/types'
export type {
  Entity,
  EntityId,
  EntityKind,
  AccountEntity,
  AppEntity,
  AssetEntity,
  ConnectionKind,
  Flow,
  TxnGraph,
  TxnRecord,
} from './graph/types'
export { resolveScope, getScopeView, pairKey, ROOT_SCOPE_KEY } from './graph/scope'
export type {
  Scope,
  ScopeView,
  ScopeStats,
  Block,
  BlockRole,
  BlockStats,
  Connection,
  AssetLink,
} from './graph/scope'
export {
  computeHighlight,
  defaultFilters,
  focusEquals,
  isFlowVisible,
  isInnerFlow,
  visibleFlows,
} from './graph/focus'
export type { Focus, GraphFilters, Highlight } from './graph/focus'
export {
  blockFooter,
  connectionKindLabel,
  describeScope,
  formatFlowAmount,
  methodsCalled,
  txnTitle,
} from './graph/describe'

// ── Layout
export { layoutScene, defaultLayoutOptions } from './layout/scene'
export type { LayoutOptions, SceneLayout, ConnectionGeometry, Point, Rect } from './layout/scene'

// ── Theme
export { ThemeContext, useTheme, darkTheme, lightTheme, defineTheme } from './theme'
export type { ThemeTokens, ThemeInput, KindStyle } from './theme'

// ── Hooks
export { useTxnGraph } from './hooks/useTxnGraph'
export type { UseTxnGraphOptions, TxnGraphController } from './hooks/useTxnGraph'
export { useEntityTitle } from './hooks/useEntityTitle'
export type { EntityTitle } from './hooks/useEntityTitle'

// ── Data provider
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

// ── Utils
export { isDefined, truncateAddress, bigIntToDecimal, formatAlgo, formatAssetAmount, toBigInt } from './utils'

// ── Lora adapter (pure TS, no jotai coupling)
export { createLoraDataProvider } from './lora-adapter'
export type {
  LoraResolvers,
  LoraHrefs,
  CreateLoraDataProviderOptions,
  LoraAssetSummaryInput,
  LoraApplicationSummaryInput,
  LoraNfdResultInput,
} from './lora-adapter'
