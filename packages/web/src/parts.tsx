import React from 'react'
import {
  TransactionType,
  formatFlowAmount,
  txnTitle,
  useAssetSummary,
  useEntityTitle,
  useTheme,
  type ConnectionKind,
  type Entity,
  type Flow,
  type TxnGraph,
} from '@akta/txn-graph-core'

/** Legend sample of a connection kind: its color and dash, with an arrowhead. */
export function LineSwatch({ kind, width = 22 }: { kind: ConnectionKind; width?: number }) {
  const style = useTheme().kinds[kind]
  return (
    <svg className="tg-swatch" width={width} height={8} viewBox={`0 0 ${width} 8`} aria-hidden>
      <line
        x1={1}
        y1={4}
        x2={width - 6}
        y2={4}
        stroke={style.color}
        strokeWidth={1.6}
        strokeDasharray={style.dash?.join(' ')}
        strokeLinecap="round"
      />
      <path d={`M${width - 1},4 L${width - 6},1 L${width - 6},7 Z`} fill={style.color} />
    </svg>
  )
}

export function EntityName({ entity, className }: { entity: Entity | undefined; className?: string }) {
  const { title, titleIsAddress } = useEntityTitle(entity)
  return <span className={[titleIsAddress ? 'tg-mono' : '', className ?? ''].join(' ').trim()}>{title}</span>
}

export function FlowAmount({ flow }: { flow: Flow }) {
  const asset = useAssetSummary(flow.assetId ?? null)
  const text = formatFlowAmount(flow, asset)
  return text ? <>{text}</> : null
}

/** One transaction row in the panel. */
export function TxnItem({
  graph,
  flow,
  onEntity,
}: {
  graph: TxnGraph
  flow: Flow
  onEntity?: (id: string) => void
}) {
  const record = graph.txns.get(flow.txnId)!
  const { txn } = record
  const from = graph.entities.get(flow.from)
  const to = graph.entities.get(flow.to)
  const method = txn.type === TransactionType.AppCall ? txn.method : undefined
  const name = (id: string, e: Entity | undefined) =>
    onEntity ? (
      <button type="button" className="tg-link-btn" onClick={() => onEntity(id)}>
        <EntityName entity={e} />
      </button>
    ) : (
      <EntityName entity={e} />
    )
  return (
    <li className="tg-txn">
      <div className="tg-txn-head">
        <span className="tg-row-idx">#{record.path}</span>
        <LineSwatch kind={flow.kind} width={16} />
        <span className="tg-txn-title">{flow.kind === 'close' ? 'Close remainder' : flow.kind === 'auth' ? `Signs ${txnTitle(txn).replace(/^[A-Z]/, (ch) => ch.toLowerCase())}` : txnTitle(txn)}</span>
        <span className="tg-txn-amount">
          <FlowAmount flow={flow} />
        </span>
      </div>
      <div className="tg-txn-meta">
        {flow.from === flow.to ? (
          name(flow.from, from)
        ) : (
          <>
            {name(flow.from, from)} → {name(flow.to, to)}
          </>
        )}
        {method?.args?.length ? (
          <span>
            {' · '}
            {method.args.map((a) => `${a.name ?? a.type}=${formatArg(a.value)}`).join(', ')}
          </span>
        ) : null}
      </div>
    </li>
  )
}

function formatArg(value: unknown): string {
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'string') return value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value
  try {
    return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
  } catch {
    return String(value)
  }
}
