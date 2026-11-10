import React from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import {
  CONNECTION_KINDS,
  TransactionType,
  connectionKindLabel,
  describeScope,
  formatFlowAmount,
  methodsCalled,
  truncateAddress,
  txnTitle,
  useAssetSummary,
  useEntityTitle,
  useTheme,
  visibleFlows,
  type Block,
  type Connection,
  type Flow,
  type TxnGraphController,
} from '@akita-protocol/txn-graph-core'
import { EntityName, LineSwatch, useStyles } from './parts'

const MAX_ROWS = 30

export function Panel({ c, rootTitle, maxHeight }: { c: TxnGraphController; rootTitle: string; maxHeight: number }) {
  const s = useStyles()
  const sel = c.selection
  let body: React.ReactNode = null
  if (sel?.type === 'block' && c.blocks.get(sel.id)) body = <BlockPanel c={c} block={c.blocks.get(sel.id)!} />
  else if (sel?.type === 'connection' && c.connections.get(sel.id)) body = <ConnectionPanel c={c} conns={[c.connections.get(sel.id)!]} />
  else if (sel?.type === 'pair') {
    const conns = c.view.connections.filter((x) => x.pairKey === sel.key)
    if (conns.length) body = <ConnectionPanel c={c} conns={conns} />
  }
  return (
    <ScrollView style={[s.panel, { maxHeight }]} contentContainerStyle={s.panelBody}>
      {body ?? <ScopePanel c={c} rootTitle={rootTitle} />}
    </ScrollView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const s = useStyles()
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Pill({ label, tone }: { label: string; tone?: { bg: string; text: string } }) {
  const s = useStyles()
  return (
    <View style={[s.pill, tone && { backgroundColor: tone.bg, borderColor: 'transparent' }]}>
      <Text style={[s.pillText, tone && { color: tone.text }]}>{label}</Text>
    </View>
  )
}

function Close({ c }: { c: TxnGraphController }) {
  const s = useStyles()
  return (
    <Pressable style={s.close} onPress={() => c.select(null)} hitSlop={8} accessibilityLabel="Clear selection">
      <Text style={s.closeText}>×</Text>
    </Pressable>
  )
}

function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  const s = useStyles()
  return (
    <View>
      {rows.map(([k, v]) => (
        <View key={k} style={s.kvRow}>
          <Text style={s.kvKey}>{k}</Text>
          <Text style={s.kvVal}>{v}</Text>
        </View>
      ))}
    </View>
  )
}

function ScopePanel({ c, rootTitle }: { c: TxnGraphController; rootTitle: string }) {
  const s = useStyles()
  const { view, graph } = c
  const title = useEntityTitle(view.entity)
  const people = view.entity
    ? [...new Set(view.connections.filter((x) => x.kind === 'appl' && x.to === view.entity!.id).map((x) => x.from))]
    : view.signers
  const rows: [string, React.ReactNode][] = [
    [view.entity ? 'Calls' : 'Top-level txns', view.stats.outer],
    ['Inner txns', view.stats.inner],
    ['Accounts', view.stats.accounts],
    ['Apps', view.stats.apps],
    ['Assets', view.stats.assets],
  ]
  if (graph.round !== undefined) rows.push(['Round', String(graph.round)])
  return (
    <>
      <View style={s.panelHead}>
        <Pill label={view.entity ? 'APP' : 'GROUP'} />
        <Pill label={`${view.stats.txns} txns`} />
      </View>
      <Text style={s.panelTitle}>{view.entity ? title.title : rootTitle}</Text>
      <Text style={s.panelId} numberOfLines={2}>
        {view.entity
          ? `#${String(view.entity.appId)}${view.entity.address ? ` · ${truncateAddress(view.entity.address)}` : ''}`
          : graph.groupId ?? 'no group id'}
      </Text>
      <Section title="Counts">
        <KV rows={rows} />
      </Section>
      <Section title="Transaction types">
        {CONNECTION_KINDS.filter((k) => view.kindCounts[k]).map((k) => (
          <View key={k} style={s.row}>
            <LineSwatch kind={k} />
            <Text style={s.rowMain}>{connectionKindLabel[k]}</Text>
            <Text style={s.rowSide}>{view.kindCounts[k]}</Text>
          </View>
        ))}
      </Section>
      {view.entity && (
        <Section title="Methods">
          {methodsCalled(graph, view, view.entity.id).map((m) => (
            <View key={m.name} style={s.row}>
              <Text style={[s.rowMain, s.mono]}>{m.name}</Text>
              <Text style={s.rowSide}>×{m.count}</Text>
            </View>
          ))}
        </Section>
      )}
      {people.length > 0 && (
        <Section title={view.entity ? 'Called by' : 'Senders'}>
          {people.map((id) => (
            <Pressable key={id} style={s.row} onPress={() => c.select({ type: 'block', id })}>
              <EntityName entity={graph.entities.get(id)} style={s.rowMain} />
              <Text style={s.rowSide}>{c.blocks.get(id)?.role}</Text>
            </Pressable>
          ))}
        </Section>
      )}
      <Text style={s.panelDesc}>{describeScope(view)}</Text>
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
  const s = useStyles()
  const theme = useTheme()
  const { graph, view } = c
  const { title, titleIsAddress } = useEntityTitle(block.entity)
  const e = block.entity
  const id =
    e.kind === 'account' ? e.address : e.kind === 'app' ? `#${String(e.appId)}${e.address ? ` · ${truncateAddress(e.address)}` : ''}` : `#${String(e.assetId)}`
  const conns = view.connections.filter(
    (x) => x.from === block.id || x.to === block.id || (e.kind === 'asset' && x.assetIds.some((a) => `asset:${String(a)}` === block.id)),
  )
  const flows =
    e.kind === 'asset'
      ? view.assetLinks.filter((l) => l.assetId === block.id).flatMap((l) => l.flows).concat(conns.filter((x) => x.to === block.id).flatMap((x) => x.flows))
      : [...conns.flatMap((x) => x.flows), ...block.selfFlows]

  const counts: [string, React.ReactNode][] =
    e.kind === 'asset'
      ? [['Movements', block.stats.moves]]
      : [
          ['Sent', block.stats.out],
          ['Received', block.stats.in],
          ...(e.kind === 'app' ? ([['Calls', block.stats.calls], ['Inner txns', block.parts]] as [string, number][]) : []),
          ...(block.stats.self ? ([['Self', block.stats.self]] as [string, number][]) : []),
        ]

  return (
    <>
      <View style={s.panelHead}>
        <Pill label={theme.entityLabel[e.kind].toUpperCase()} />
        {block.role && <Pill label={block.role} tone={theme.role[block.role]} />}
        <Close c={c} />
      </View>
      <Text style={[s.panelTitle, titleIsAddress && s.mono]}>{title}</Text>
      <Text style={s.panelId} selectable>
        {id}
      </Text>
      {block.drillable && (
        <Pressable style={s.openBtn} onPress={() => c.open(block.id)}>
          <Text style={s.openBtnText}>Open {block.parts} inner transactions</Text>
          <Text style={s.open}>›</Text>
        </Pressable>
      )}
      <Section title="Counts">
        <KV rows={counts} />
      </Section>
      {conns.length > 0 && (
        <Section title="Connections">
          {conns.map((x) => (
            <Pressable key={x.id} style={s.row} onPress={() => c.select({ type: 'connection', id: x.id })}>
              <LineSwatch kind={x.kind} width={18} />
              <Text style={s.rowSide}>{x.from === block.id ? '→' : '←'}</Text>
              <EntityName entity={graph.entities.get(x.from === block.id ? x.to : x.from)} style={s.rowMain} />
              <Text style={s.rowSide}>×{x.flows.length}</Text>
            </Pressable>
          ))}
        </Section>
      )}
      <TxnList c={c} flows={flows} />
    </>
  )
}

function ConnectionPanel({ c, conns }: { c: TxnGraphController; conns: Connection[] }) {
  const s = useStyles()
  const { graph, view, filters } = c
  const first = conns[0]
  const flows = conns.flatMap((x) => visibleFlows(x.flows, view.scope, filters))
  const kinds = [...new Set(conns.map((x) => x.kind))]
  return (
    <>
      <View style={s.panelHead}>
        <Pill label={conns.length > 1 ? 'CONNECTIONS' : 'CONNECTION'} />
        <Pill label={`${flows.length} txns`} />
        <Close c={c} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Pressable onPress={() => c.select({ type: 'block', id: first.from })}>
          <EntityName entity={graph.entities.get(first.from)} style={[s.panelTitle, s.linkText]} />
        </Pressable>
        <Text style={s.panelTitle}>{conns.some((x) => x.from !== first.from) ? '↔' : '→'}</Text>
        <Pressable onPress={() => c.select({ type: 'block', id: first.to })}>
          <EntityName entity={graph.entities.get(first.to)} style={[s.panelTitle, s.linkText]} />
        </Pressable>
      </View>
      <Section title="Kinds">
        {kinds.map((k) => (
          <View key={k} style={s.row}>
            <LineSwatch kind={k} />
            <Text style={s.rowMain}>{connectionKindLabel[k]}</Text>
            <Text style={s.rowSide}>{flows.filter((f) => f.kind === k).length}</Text>
          </View>
        ))}
      </Section>
      <TxnList c={c} flows={flows} />
    </>
  )
}

function TxnList({ c, flows, title = 'Transactions' }: { c: TxnGraphController; flows: Flow[]; title?: string }) {
  const s = useStyles()
  const seen = new Set<string>()
  const unique = flows.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)))
  if (!unique.length) return null
  const order = new Map(c.graph.order.map((id, i) => [id, i]))
  unique.sort((a, b) => order.get(a.txnId)! - order.get(b.txnId)! || a.id.localeCompare(b.id))
  return (
    <Section title={title}>
      {unique.slice(0, MAX_ROWS).map((f) => (
        <TxnItem key={f.id} c={c} flow={f} />
      ))}
      {unique.length > MAX_ROWS && <Text style={s.more}>+{unique.length - MAX_ROWS} more</Text>}
    </Section>
  )
}

function TxnItem({ c, flow }: { c: TxnGraphController; flow: Flow }) {
  const s = useStyles()
  const asset = useAssetSummary(flow.assetId ?? null)
  const record = c.graph.txns.get(flow.txnId)!
  const { txn } = record
  const title =
    flow.kind === 'close'
      ? 'Close remainder'
      : flow.kind === 'auth'
        ? `Signs ${txnTitle(txn).replace(/^[A-Z]/, (ch) => ch.toLowerCase())}`
        : txnTitle(txn)
  const method = txn.type === TransactionType.AppCall ? txn.method : undefined
  return (
    <View style={s.txn}>
      <View style={s.txnHead}>
        <Text style={s.rowIdx}>#{record.path}</Text>
        <LineSwatch kind={flow.kind} width={16} />
        <Text style={s.txnTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={s.txnAmount}>{formatFlowAmount(flow, asset) ?? ''}</Text>
      </View>
      <View style={[s.txnHead, { paddingLeft: 45, marginTop: 3 }]}>
        <Pressable onPress={() => c.select({ type: 'block', id: flow.from })} style={{ flexShrink: 1 }}>
          <EntityName entity={c.graph.entities.get(flow.from)} style={s.rowSide} />
        </Pressable>
        {flow.from !== flow.to && (
          <>
            <Text style={s.rowSide}>→</Text>
            <Pressable onPress={() => c.select({ type: 'block', id: flow.to })} style={{ flexShrink: 1 }}>
              <EntityName entity={c.graph.entities.get(flow.to)} style={s.rowSide} />
            </Pressable>
          </>
        )}
      </View>
      {method?.args?.length ? (
        <Text style={s.txnMeta} numberOfLines={1}>
          {method.args.map((a) => `${a.name ?? a.type}=${String(a.value)}`).join(', ')}
        </Text>
      ) : null}
    </View>
  )
}
