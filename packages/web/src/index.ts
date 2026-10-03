/**
 * @akta/txn-graph-web — web renderer for the Akita txn-graph visualizer.
 * DOM + SVG + Motion; no React Native dependencies. Re-exports the whole
 * core surface so consumers install one package.
 */
export * from '@akta/txn-graph-core'
export { TxnGraph } from './TxnGraph'
export type { TxnGraphProps } from './TxnGraph'
export type { RenderSlots, RenderLinkProps } from './render-context'
