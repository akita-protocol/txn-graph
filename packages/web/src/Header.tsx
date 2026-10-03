import React from 'react'
import {
  CONNECTION_KINDS,
  connectionKindLabel,
  describeScope,
  useEntityTitle,
  visibleFlows,
  type TxnGraphController,
} from '@akta/txn-graph-core'
import { EntityName, LineSwatch } from './parts'

export function Header({ c, rootTitle }: { c: TxnGraphController; rootTitle: string }) {
  const { view, filters } = c
  const scopeTitle = useEntityTitle(view.entity)
  const kinds = CONNECTION_KINDS.filter((k) => view.kindCounts[k])
  const lines = view.connections.filter((x) => visibleFlows(x.flows, view.scope, filters).length > 0).length
  const blockCount = view.blocks.length + view.assets.length

  return (
    <div className="tg-header">
      {view.scope.path.length > 0 && (
        <nav className="tg-crumbs" aria-label="Scope">
          <button type="button" className="tg-crumb" onClick={() => c.goTo(0)}>
            {rootTitle}
          </button>
          {view.scope.path.map((id, i) => {
            const last = i === view.scope.path.length - 1
            return (
              <React.Fragment key={id}>
                <span className="tg-crumb-sep">›</span>
                <button
                  type="button"
                  className="tg-crumb"
                  aria-current={last ? 'location' : undefined}
                  onClick={() => !last && c.goTo(i + 1)}
                >
                  <EntityName entity={c.graph.entities.get(id)} />
                </button>
              </React.Fragment>
            )
          })}
        </nav>
      )}
      <div className="tg-title-row">
        <h2 className="tg-title">{view.entity ? scopeTitle.title : rootTitle}</h2>
        <span className="tg-pill">
          {view.stats.txns} {view.stats.txns === 1 ? 'txn' : 'txns'}
        </span>
      </div>
      <p className="tg-desc">{describeScope(view)}</p>
      <div className="tg-summary">
        {blockCount} blocks · {lines} connections
        {view.assetLinks.length > 0 && ` · ${view.assetLinks.length} asset links show on hover`}
      </div>
      {kinds.length > 0 && (
        <div className="tg-legend" role="group" aria-label="Connection kinds">
          <span className="tg-legend-label">Connections</span>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              className="tg-chip"
              aria-pressed={!filters.hiddenKinds.has(k)}
              title={filters.hiddenKinds.has(k) ? `Show ${connectionKindLabel[k]}` : `Hide ${connectionKindLabel[k]}`}
              onClick={() => c.toggleKind(k)}
            >
              <LineSwatch kind={k} />
              <span className="tg-chip-text">{connectionKindLabel[k]}</span>
              <span className="tg-chip-count">{view.kindCounts[k]}</span>
            </button>
          ))}
        </div>
      )}
      <div className="tg-legend">
        <span className="tg-legend-label">Blocks</span>
        {view.stats.accounts > 0 && <BlockChip kind="account" label="account" count={view.stats.accounts} />}
        {view.stats.apps > 0 && <BlockChip kind="app" label="app" count={view.stats.apps} />}
        {view.stats.assets > 0 && <BlockChip kind="asset" label="asset" count={view.stats.assets} />}
        {view.assetLinks.length > 0 && (
          <span className="tg-chip tg-chip-plain">
            asset links: on hover <span className="tg-chip-count">{view.assetLinks.length}</span>
          </span>
        )}
        {view.stats.inner > 0 && (
          <button
            type="button"
            className="tg-chip"
            aria-pressed={filters.showInner}
            onClick={() => c.setShowInner(!filters.showInner)}
            title={filters.showInner ? 'Show only top-level transactions' : 'Show inner transactions'}
          >
            <span className="tg-chip-text">inner txns</span>
            <span className="tg-chip-count">{view.stats.inner}</span>
          </button>
        )}
      </div>
      <div className="tg-hint">
        Arrows point from sender to receiver. Click an app with inner transactions to open it. Esc goes up.
      </div>
    </div>
  )
}

function BlockChip({ kind, label, count }: { kind: string; label: string; count: number }) {
  return (
    <span className="tg-chip">
      <span className="tg-chip-box" data-kind={kind} />
      {label} <span className="tg-chip-count">{count}</span>
    </span>
  )
}
