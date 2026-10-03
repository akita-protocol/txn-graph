import React, { useMemo } from 'react'
import {
  CONNECTION_KINDS,
  connectionKindLabel,
  describeScope,
  methodsCalled,
  truncateAddress,
  useEntityHref,
  useEntityTitle,
  useTheme,
  visibleFlows,
  type Block,
  type Connection,
  type Flow,
  type TxnGraphController,
} from '@akta/txn-graph-core'
import { EntityName, LineSwatch, TxnItem } from './parts'
import { MaybeLink } from './render-context'

const MAX_ROWS = 40

export function Panel({ c, rootTitle }: { c: TxnGraphController; rootTitle: string }) {
  const sel = c.selection
  let body: React.ReactNode
  if (sel?.type === 'block' && c.blocks.get(sel.id)) body = <BlockPanel c={c} block={c.blocks.get(sel.id)!} />
  else if (sel?.type === 'connection' && c.connections.get(sel.id)) body = <ConnectionPanel c={c} conns={[c.connections.get(sel.id)!]} />
  else if (sel?.type === 'pair') {
    const conns = c.view.connections.filter((x) => x.pairKey === sel.key)
    body = conns.length ? <ConnectionPanel c={c} conns={conns} /> : null
  }
  return <aside className="tg-panel">{body ?? <ScopePanel c={c} rootTitle={rootTitle} />}</aside>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="tg-section">
      <h4 className="tg-section-title">{title}</h4>
      {children}
    </section>
  )
}

function Close({ c }: { c: TxnGraphController }) {
  return (
    <button type="button" className="tg-panel-close" aria-label="Clear selection" onClick={() => c.select(null)}>
      ×
    </button>
  )
}

function ScopePanel({ c, rootTitle }: { c: TxnGraphController; rootTitle: string }) {
  const { view, graph } = c
  const title = useEntityTitle(view.entity)
  const scopeRef = useMemo(
    () =>
      view.entity
        ? ({ kind: 'application', id: view.entity.appId } as const)
        : graph.groupId
          ? ({ kind: 'group', id: graph.groupId } as const)
          : null,
    [graph.groupId, view.entity],
  )
  const scopeHref = useEntityHref(scopeRef)
  const callers = view.entity
    ? [...new Set(view.connections.filter((x) => x.kind === 'appl' && x.to === view.entity!.id).map((x) => x.from))]
    : []
  return (
    <>
      <div className="tg-panel-head">
        <span className="tg-pill">{view.entity ? 'APP' : 'GROUP'}</span>
        <span className="tg-pill">{view.stats.txns} txns</span>
      </div>
      <h3 className="tg-panel-title">{view.entity ? title.title : rootTitle}</h3>
      <div className="tg-panel-id">
        {view.entity
          ? `#${String(view.entity.appId)}${view.entity.address ? ` · ${truncateAddress(view.entity.address)}` : ''}`
          : graph.groupId ?? 'no group id'}
      </div>
      {scopeHref && (
        <MaybeLink href={scopeHref} className="tg-ext-link">
          {view.entity ? 'Open app page' : 'Open group page'} ↗
        </MaybeLink>
      )}
      <p className="tg-panel-desc">{describeScope(view)}</p>
      <Section title="Counts">
        <dl className="tg-kv">
          <dt>{view.entity ? 'Calls' : 'Top-level txns'}</dt>
          <dd>{view.stats.outer}</dd>
          <dt>Inner txns</dt>
          <dd>{view.stats.inner}</dd>
          <dt>Accounts</dt>
          <dd>{view.stats.accounts}</dd>
          <dt>Apps</dt>
          <dd>{view.stats.apps}</dd>
          <dt>Assets</dt>
          <dd>{view.stats.assets}</dd>
          {graph.round !== undefined && (
            <>
              <dt>Round</dt>
              <dd>{String(graph.round)}</dd>
            </>
          )}
        </dl>
      </Section>
      <Section title="Transaction types">
        <ul className="tg-list">
          {CONNECTION_KINDS.filter((k) => view.kindCounts[k]).map((k) => (
            <li key={k} className="tg-row">
              <LineSwatch kind={k} />
              <span className="tg-row-main">{connectionKindLabel[k]}</span>
              <span className="tg-row-side">{view.kindCounts[k]}</span>
            </li>
          ))}
        </ul>
      </Section>
      {view.entity && (
        <Section title="Methods">
          <ul className="tg-list">
            {methodsCalled(graph, view, view.entity.id).map((m) => (
              <li key={m.name} className="tg-row">
                <span className="tg-row-main tg-mono">{m.name}</span>
                <span className="tg-row-side">×{m.count}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {(view.entity ? callers : view.signers).length > 0 && (
        <Section title={view.entity ? 'Called by' : 'Senders'}>
          <ul className="tg-list">
            {(view.entity ? callers : view.signers).map((id) => (
              <li key={id}>
                <button type="button" className="tg-row" onClick={() => c.select({ type: 'block', id })}>
                  <span className="tg-row-main">
                    <EntityName entity={graph.entities.get(id)} />
                  </span>
                  <span className="tg-row-side">{c.blocks.get(id)?.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <TxnList c={c} flows={outerFlows(c)} title={view.entity ? 'Calls' : 'Top-level transactions'} />
    </>
  )
}

/** The main flow of each of the scope's outermost transactions, in group order. */
function outerFlows(c: TxnGraphController): Flow[] {
  const flows: Flow[] = []
  for (const id of c.graph.order) {
    if (!c.view.scope.rootTxnIds.has(id)) continue
    const main = c.graph.flowsByTxn.get(id)?.[0]
    if (main) flows.push(main)
  }
  return flows
}

function BlockPanel({ c, block }: { c: TxnGraphController; block: Block }) {
  const theme = useTheme()
  const { graph, view } = c
  const { title, titleIsAddress } = useEntityTitle(block.entity)
  const e = block.entity
  const id =
    e.kind === 'account' ? e.address : e.kind === 'app' ? `#${String(e.appId)}${e.address ? ` · ${e.address}` : ''}` : `#${String(e.assetId)}`
  const role = block.role ? theme.role[block.role] : undefined
  const ref = useMemo(
    () =>
      e.kind === 'account'
        ? ({ kind: 'account', address: e.address } as const)
        : e.kind === 'app'
          ? ({ kind: 'application', id: e.appId } as const)
          : ({ kind: 'asset', id: e.assetId } as const),
    [e],
  )
  const href = useEntityHref(ref)

  const conns = view.connections.filter(
    (x) => x.from === block.id || x.to === block.id || (e.kind === 'asset' && x.assetIds.some((a) => `asset:${String(a)}` === block.id)),
  )
  const flows: Flow[] =
    e.kind === 'asset'
      ? view.assetLinks.filter((l) => l.assetId === block.id).flatMap((l) => l.flows).concat(conns.filter((x) => x.to === block.id).flatMap((x) => x.flows))
      : [...conns.flatMap((x) => x.flows), ...block.selfFlows]
  const unique = dedupeFlows(flows)

  return (
    <>
      <div className="tg-panel-head">
        <span className="tg-pill">{theme.entityLabel[e.kind].toUpperCase()}</span>
        {role && block.role && (
          <span className="tg-pill" data-tone="role" style={{ background: role.bg, color: role.text }}>
            {block.role}
          </span>
        )}
        <Close c={c} />
      </div>
      <h3 className={`tg-panel-title${titleIsAddress ? ' tg-mono' : ''}`}>{title}</h3>
      <div className="tg-panel-id">{id}</div>
      {href && (
        <MaybeLink href={href} className="tg-ext-link">
          Open {theme.entityLabel[e.kind].toLowerCase()} page ↗
        </MaybeLink>
      )}
      {block.drillable && (
        <button type="button" className="tg-open-btn" onClick={() => c.open(block.id)}>
          Open {block.parts} inner transactions <span className="tg-open">›</span>
        </button>
      )}
      <Section title="Counts">
        <dl className="tg-kv">
          {e.kind === 'asset' ? (
            <>
              <dt>Movements</dt>
              <dd>{block.stats.moves}</dd>
            </>
          ) : (
            <>
              <dt>Sent</dt>
              <dd>{block.stats.out}</dd>
              <dt>Received</dt>
              <dd>{block.stats.in}</dd>
              {e.kind === 'app' && (
                <>
                  <dt>Calls</dt>
                  <dd>{block.stats.calls}</dd>
                  <dt>Inner txns</dt>
                  <dd>{block.parts}</dd>
                </>
              )}
              {block.stats.self > 0 && (
                <>
                  <dt>Self</dt>
                  <dd>{block.stats.self}</dd>
                </>
              )}
            </>
          )}
        </dl>
      </Section>
      {conns.length > 0 && (
        <Section title="Connections">
          <ul className="tg-list">
            {conns.map((x) => (
              <li key={x.id}>
                <button type="button" className="tg-row" onClick={() => c.select({ type: 'connection', id: x.id })}>
                  <LineSwatch kind={x.kind} width={18} />
                  <span className="tg-row-main">
                    {x.from === block.id ? '→ ' : '← '}
                    <EntityName entity={graph.entities.get(x.from === block.id ? x.to : x.from)} />
                  </span>
                  <span className="tg-row-side">×{x.flows.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <TxnList c={c} flows={unique} />
    </>
  )
}

function ConnectionPanel({ c, conns }: { c: TxnGraphController; conns: Connection[] }) {
  const { graph, view, filters } = c
  const first = conns[0]
  const flows = dedupeFlows(conns.flatMap((x) => visibleFlows(x.flows, view.scope, filters)))
  const kinds = [...new Set(conns.map((x) => x.kind))]
  return (
    <>
      <div className="tg-panel-head">
        <span className="tg-pill">{conns.length > 1 ? 'CONNECTIONS' : 'CONNECTION'}</span>
        <span className="tg-pill">{flows.length} txns</span>
        <Close c={c} />
      </div>
      <h3 className="tg-panel-title">
        <button type="button" className="tg-link-btn" onClick={() => c.select({ type: 'block', id: first.from })}>
          <EntityName entity={graph.entities.get(first.from)} />
        </button>{' '}
        {conns.some((x) => x.from !== first.from) ? '↔' : '→'}{' '}
        <button type="button" className="tg-link-btn" onClick={() => c.select({ type: 'block', id: first.to })}>
          <EntityName entity={graph.entities.get(first.to)} />
        </button>
      </h3>
      <Section title="Kinds">
        <ul className="tg-list">
          {kinds.map((k) => (
            <li key={k} className="tg-row">
              <LineSwatch kind={k} />
              <span className="tg-row-main">{connectionKindLabel[k]}</span>
              <span className="tg-row-side">{flows.filter((f) => f.kind === k).length}</span>
            </li>
          ))}
        </ul>
      </Section>
      <TxnList c={c} flows={flows} />
    </>
  )
}

function TxnList({ c, flows, title = 'Transactions' }: { c: TxnGraphController; flows: Flow[]; title?: string }) {
  if (!flows.length) return null
  const order = new Map(c.graph.order.map((id, i) => [id, i]))
  const sorted = [...flows].sort((a, b) => order.get(a.txnId)! - order.get(b.txnId)! || a.id.localeCompare(b.id))
  return (
    <Section title={title}>
      <ul className="tg-list">
        {sorted.slice(0, MAX_ROWS).map((f) => (
          <TxnItem key={f.id} graph={c.graph} flow={f} onEntity={(id) => c.select({ type: 'block', id })} />
        ))}
      </ul>
      {sorted.length > MAX_ROWS && <div className="tg-more">+{sorted.length - MAX_ROWS} more</div>}
    </Section>
  )
}

function dedupeFlows(flows: Flow[]): Flow[] {
  const seen = new Set<string>()
  return flows.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)))
}
