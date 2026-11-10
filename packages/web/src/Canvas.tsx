import React, { forwardRef, useImperativeHandle, useState } from 'react'
import { motion } from 'motion/react'
import {
  blockFooter,
  connectionKindLabel,
  isInnerFlow,
  useEntityTitle,
  useTheme,
  visibleFlows,
  type Block,
  type Connection,
  type Flow,
  type Focus,
  type TxnGraphController,
} from '@akita-protocol/txn-graph-core'
import { useViewport, type Viewport } from './useViewport'
import { EntityName, FlowAmount } from './parts'
import { useRenderSlots } from './render-context'

type State = 'on' | 'dim' | undefined

export function Canvas({ c }: { c: TxnGraphController }) {
  const theme = useTheme()
  const { view, scene, highlight, filters } = c
  const vp = useViewport(scene.width, scene.height, view.scope.key)
  const tooltip = React.useRef<TooltipHandle>(null)
  const { animate = true } = useRenderSlots()

  const stateOf = (lit: boolean): State => (highlight ? (lit ? 'on' : 'dim') : undefined)
  const track = (e: React.PointerEvent) => {
    const rect = vp.ref.current?.getBoundingClientRect()
    if (rect) tooltip.current?.move(e.clientX - rect.left, e.clientY - rect.top)
  }
  const hoverProps = (focus: Focus) => ({
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      track(e)
      c.setHover(focus)
    },
    onPointerMove: (e: React.PointerEvent) => e.pointerType === 'mouse' && track(e),
    onPointerLeave: () => c.setHover(null),
  })

  const visible = new Map<string, Flow[]>()
  for (const conn of view.connections) {
    const flows = visibleFlows(conn.flows, view.scope, filters)
    if (flows.length) visible.set(conn.id, flows)
  }
  const pairCounts = new Map<string, number>()
  for (const conn of view.connections) {
    const n = visible.get(conn.id)?.length ?? 0
    if (n) pairCounts.set(conn.pairKey, (pairCounts.get(conn.pairKey) ?? 0) + n)
  }

  const selectedBlock = c.selection?.type === 'block' ? c.selection.id : undefined
  const empty = view.blocks.length === 0 && view.assets.length === 0

  return (
    <div
      ref={vp.ref}
      className="tg-viewport"
      data-panning={vp.panning || undefined}
      {...vp.handlers}
      onClick={() => {
        if (!vp.consumeDrag()) c.select(null)
      }}
    >
      <motion.div className="tg-stage" style={{ x: vp.x, y: vp.y, scale: vp.scale }}>
        <motion.div
          key={view.scope.key}
          className="tg-scene"
          style={{ width: scene.width, height: scene.height }}
          initial={animate ? { opacity: 0, scale: 0.985 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        >
          <svg className="tg-svg" width={scene.width} height={scene.height} aria-hidden>
            {view.assetLinks.map((link) =>
              highlight?.assetLinks.has(link.id) && scene.assetLinks[link.id] ? (
                <path key={link.id} className="tg-link" d={scene.assetLinks[link.id]} />
              ) : null,
            )}
            {view.connections.map((conn) => {
              const geo = scene.connections[conn.id]
              const flows = visible.get(conn.id)
              if (!geo || !flows) return null
              const style = theme.kinds[conn.kind]
              const lit = highlight?.connections.has(conn.id) ?? false
              const state = stateOf(lit)
              const inner = flows.every((f) => isInnerFlow(f, view.scope))
              return (
                <g
                  key={conn.id}
                  className="tg-conn"
                  data-state={state}
                  style={!state && inner ? { opacity: theme.edge.innerOpacity } : undefined}
                  {...hoverProps({ type: 'connection', id: conn.id })}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!vp.consumeDrag()) c.select({ type: 'connection', id: conn.id })
                  }}
                >
                  <path className="tg-conn-hit" d={geo.path} />
                  <path
                    className="tg-conn-line"
                    d={geo.path}
                    stroke={style.color}
                    strokeWidth={lit ? theme.edge.activeWidth : theme.edge.width}
                    strokeDasharray={style.dash?.join(' ')}
                  />
                  <path className="tg-conn-arrow" d={geo.arrow} fill={style.color} />
                </g>
              )
            })}
            {Object.entries(scene.badges).map(([key, p]) => {
              const count = pairCounts.get(key) ?? 0
              if (count < 2) return null
              const lit = view.connections.some((x) => x.pairKey === key && highlight?.connections.has(x.id))
              return (
                <g
                  key={key}
                  className="tg-badge"
                  data-state={stateOf(lit)}
                  transform={`translate(${p.x},${p.y})`}
                  {...hoverProps({ type: 'pair', key })}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!vp.consumeDrag()) c.select({ type: 'pair', key })
                  }}
                >
                  <circle r={8} strokeWidth={1} />
                  <text textAnchor="middle" dy="0.35em">
                    {count}
                  </text>
                </g>
              )
            })}
          </svg>

          {scene.assetSection && (
            <>
              <div
                className="tg-asset-sep"
                style={{
                  left: scene.assetSection.x1,
                  width: scene.assetSection.x2 - scene.assetSection.x1,
                  top: scene.assetSection.y,
                }}
              />
              <div className="tg-asset-caption" style={{ left: scene.assetSection.x1, top: scene.assetSection.y + 7 }}>
                <b>assets</b> · links show on hover or selection
              </div>
            </>
          )}

          {[...view.blocks, ...view.assets].map((block) => (
            <Card
              key={block.id}
              block={block}
              rect={scene.rects[block.id]}
              state={stateOf(highlight?.blocks.has(block.id) ?? false)}
              selected={selectedBlock === block.id}
              hoverProps={hoverProps({ type: 'block', id: block.id })}
              onActivate={() => {
                if (!vp.consumeDrag()) c.activate(block.id)
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      {empty && <div className="tg-empty">No transactions</div>}
      <Tooltip ref={tooltip} c={c} />
      <Toolbar vp={vp} />
    </div>
  )
}

function Card({
  block,
  rect,
  state,
  selected,
  hoverProps,
  onActivate,
}: {
  block: Block
  rect: { x: number; y: number; width: number; height: number } | undefined
  state: State
  selected: boolean
  hoverProps: React.DOMAttributes<HTMLButtonElement>
  onActivate: () => void
}) {
  const theme = useTheme()
  const { title, titleIsAddress } = useEntityTitle(block.entity)
  if (!rect) return null
  const role = block.role ? theme.role[block.role] : undefined
  const kind = block.entity.kind
  return (
    <button
      type="button"
      className="tg-card"
      data-kind={kind}
      data-state={state}
      data-selected={selected || undefined}
      data-scope-root={block.isScopeRoot || undefined}
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      aria-label={`${theme.entityLabel[kind]} ${title}${block.drillable ? ', opens' : ''}`}
      {...hoverProps}
      onClick={(e) => {
        e.stopPropagation()
        onActivate()
      }}
    >
      <div className="tg-card-top">
        <span className="tg-kind">
          {kind === 'asset' ? '◆ ' : ''}
          {theme.entityLabel[kind]}
        </span>
        {role && block.role && (
          <span className="tg-pill" data-tone="role" style={{ background: role.bg, color: role.text }}>
            {block.role}
          </span>
        )}
      </div>
      <div className={`tg-card-title${titleIsAddress ? ' tg-mono' : ''}`}>{title}</div>
      {kind !== 'asset' || block.stats.moves ? (
        <div className="tg-card-foot">
          <span>{blockFooter(block)}</span>
          {block.drillable && <span className="tg-open">›</span>}
        </div>
      ) : null}
    </button>
  )
}

type TooltipHandle = { move: (x: number, y: number) => void }

const Tooltip = forwardRef<TooltipHandle, { c: TxnGraphController }>(function Tooltip({ c }, ref) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useImperativeHandle(ref, () => ({ move: (x, y) => setPos({ x, y }) }), [])
  const hover = c.hover
  if (!hover) return null
  let body: React.ReactNode = null
  if (hover.type === 'block') {
    const block = c.blocks.get(hover.id)
    if (block) body = <BlockTip block={block} />
  } else if (hover.type === 'connection') {
    const conn = c.connections.get(hover.id)
    if (conn) body = <ConnectionTip c={c} conns={[conn]} />
  } else {
    const conns = c.view.connections.filter((x) => x.pairKey === hover.key)
    if (conns.length) body = <ConnectionTip c={c} conns={conns} />
  }
  if (!body) return null
  return (
    <div className="tg-tooltip" style={{ left: pos.x + 14, top: pos.y + 16 }}>
      {body}
    </div>
  )
})

function BlockTip({ block }: { block: Block }) {
  const e = block.entity
  const full = e.kind === 'account' ? e.address : e.kind === 'app' ? `App #${String(e.appId)}` : `Asset #${String(e.assetId)}`
  return (
    <>
      <div className={e.kind === 'account' ? 'tg-mono' : undefined} style={{ wordBreak: 'break-all' }}>
        {full}
      </div>
      <div className="tg-tooltip-sub">
        {block.drillable ? `${blockFooter(block)} · click to open` : blockFooter(block)}
      </div>
    </>
  )
}

function ConnectionTip({ c, conns }: { c: TxnGraphController; conns: Connection[] }) {
  const flows = conns.flatMap((x) => visibleFlows(x.flows, c.view.scope, c.filters))
  const first = conns[0]
  const kinds = [...new Set(conns.map((x) => connectionKindLabel[x.kind]))].join(', ')
  return (
    <>
      <div>
        <EntityName entity={c.graph.entities.get(first.from)} /> → <EntityName entity={c.graph.entities.get(first.to)} />
        {conns.some((x) => x.from !== first.from) ? ' (both ways)' : ''}
      </div>
      <div className="tg-tooltip-sub">
        {kinds} · {flows.length} {flows.length === 1 ? 'txn' : 'txns'}
        {flows.length === 1 && flows[0].amount !== undefined ? (
          <>
            {' · '}
            <FlowAmount flow={flows[0]} />
          </>
        ) : null}
      </div>
    </>
  )
}

function Toolbar({ vp }: { vp: Viewport }) {
  const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation()
  return (
    <div className="tg-toolbar" onPointerDown={stop} onClick={stop}>
      <button type="button" className="tg-tool" aria-label="Zoom out" onClick={() => vp.zoomBy(1 / 1.25)}>
        −
      </button>
      <button type="button" className="tg-tool" aria-label="Fit to view" title="Fit" onClick={() => vp.fit(true)}>
        {vp.zoom}%
      </button>
      <button type="button" className="tg-tool" aria-label="Zoom in" onClick={() => vp.zoomBy(1.25)}>
        +
      </button>
    </div>
  )
}
