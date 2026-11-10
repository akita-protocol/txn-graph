import { Pressable, Text, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated, { FadeIn } from 'react-native-reanimated'
import Svg, { G, Line, Path } from 'react-native-svg'
import {
  blockFooter,
  focusEquals,
  isInnerFlow,
  useEntityTitle,
  useTheme,
  visibleFlows,
  type Block,
  type Flow,
  type TxnGraphController,
} from '@akita-protocol/txn-graph-core'
import { useStyles } from './parts'
import { useViewport } from './useViewport'

/**
 * Touch has no hover, so the selection drives highlighting: tap a block to
 * light it up, tap it again (or its chevron) to open an app with inner
 * transactions.
 */
export function Canvas({ c }: { c: TxnGraphController }) {
  const theme = useTheme()
  const s = useStyles()
  const { view, scene, highlight, filters } = c
  const vp = useViewport(scene.width, scene.height, view.scope.key)

  const visible = new Map<string, Flow[]>()
  const pairCounts = new Map<string, number>()
  for (const conn of view.connections) {
    const flows = visibleFlows(conn.flows, view.scope, filters)
    if (!flows.length) continue
    visible.set(conn.id, flows)
    pairCounts.set(conn.pairKey, (pairCounts.get(conn.pairKey) ?? 0) + flows.length)
  }
  const dim = (lit: boolean) => (highlight && !lit ? theme.edge.dimOpacity : 1)
  const selectedBlock = c.selection?.type === 'block' ? c.selection.id : undefined

  const pressBlock = (block: Block) => {
    const focus = { type: 'block' as const, id: block.id }
    if (block.drillable && focusEquals(c.selection, focus)) c.open(block.id)
    else c.select(focusEquals(c.selection, focus) ? null : focus)
  }

  return (
    <GestureDetector gesture={vp.gesture}>
      <View style={s.viewport} onLayout={vp.onLayout} collapsable={false}>
        <Animated.View style={[s.stage, { width: scene.width, height: scene.height }, vp.stageStyle]}>
          <Animated.View key={view.scope.key} entering={FadeIn.duration(220)} style={{ width: scene.width, height: scene.height }}>
            <Svg width={scene.width} height={scene.height} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
              {view.assetLinks.map((link) =>
                highlight?.assetLinks.has(link.id) && scene.assetLinks[link.id] ? (
                  <Path
                    key={link.id}
                    d={scene.assetLinks[link.id]}
                    stroke={theme.color.link}
                    strokeWidth={1.5}
                    strokeDasharray={[2, 3]}
                    strokeLinecap="round"
                    fill="none"
                  />
                ) : null,
              )}
              {view.connections.map((conn) => {
                const geo = scene.connections[conn.id]
                const flows = visible.get(conn.id)
                if (!geo || !flows) return null
                const style = theme.kinds[conn.kind]
                const lit = highlight?.connections.has(conn.id) ?? false
                const inner = flows.every((f) => isInnerFlow(f, view.scope))
                const opacity = highlight ? dim(lit) : inner ? theme.edge.innerOpacity : 1
                return (
                  <G key={conn.id} opacity={opacity}>
                    <Path
                      d={geo.path}
                      stroke={style.color}
                      strokeWidth={lit ? theme.edge.activeWidth : theme.edge.width}
                      strokeDasharray={style.dash ?? undefined}
                      strokeLinecap="round"
                      fill="none"
                    />
                    <Path d={geo.arrow} fill={style.color} />
                  </G>
                )
              })}
              {scene.assetSection && (
                <Line
                  x1={scene.assetSection.x1}
                  x2={scene.assetSection.x2}
                  y1={scene.assetSection.y}
                  y2={scene.assetSection.y}
                  stroke={theme.color.border}
                  strokeDasharray={[4, 4]}
                />
              )}
            </Svg>

            {Object.entries(scene.badges).map(([key, p]) => {
              const count = pairCounts.get(key) ?? 0
              if (count < 2) return null
              const lit = view.connections.some((x) => x.pairKey === key && highlight?.connections.has(x.id))
              return (
                <Pressable
                  key={key}
                  hitSlop={8}
                  onPress={() => c.select(focusEquals(c.selection, { type: 'pair', key }) ? null : { type: 'pair', key })}
                  style={[s.badge, { left: p.x, top: p.y, opacity: dim(lit) }]}
                  accessibilityLabel={`${count} transactions between these blocks`}
                >
                  <Text style={s.badgeText}>{count}</Text>
                </Pressable>
              )
            })}

            {scene.assetSection && (
              <Text style={[s.assetCaption, { left: scene.assetSection.x1, top: scene.assetSection.y + 7 }]}>
                <Text style={s.assetCaptionStrong}>assets</Text> · links show on selection
              </Text>
            )}

            {[...view.blocks, ...view.assets].map((block) => (
              <Card
                key={block.id}
                c={c}
                block={block}
                dimmed={!!highlight && !highlight.blocks.has(block.id)}
                selected={selectedBlock === block.id}
                onPress={() => pressBlock(block)}
              />
            ))}
          </Animated.View>
        </Animated.View>

        {view.blocks.length === 0 && view.assets.length === 0 && (
          <View style={[s.empty, { pointerEvents: 'none' }]}>
            <Text style={s.hint}>No transactions</Text>
          </View>
        )}
        <View style={s.toolbar}>
          <Pressable style={s.tool} onPress={() => vp.zoomBy(1 / 1.25)} accessibilityLabel="Zoom out">
            <Text style={s.toolText}>−</Text>
          </Pressable>
          <Pressable style={s.tool} onPress={() => vp.fit(true)} accessibilityLabel="Fit to view">
            <Text style={[s.toolText, { fontSize: 12 }]}>fit</Text>
          </Pressable>
          <Pressable style={s.tool} onPress={() => vp.zoomBy(1.25)} accessibilityLabel="Zoom in">
            <Text style={s.toolText}>+</Text>
          </Pressable>
        </View>
      </View>
    </GestureDetector>
  )
}

function Card({
  c,
  block,
  dimmed,
  selected,
  onPress,
}: {
  c: TxnGraphController
  block: Block
  dimmed: boolean
  selected: boolean
  onPress: () => void
}) {
  const theme = useTheme()
  const s = useStyles()
  const { title, titleIsAddress } = useEntityTitle(block.entity)
  const rect = c.scene.rects[block.id]
  if (!rect) return null
  const kind = block.entity.kind
  const role = block.role ? theme.role[block.role] : undefined
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${theme.entityLabel[kind]} ${title}${block.drillable ? ', opens' : ''}`}
      style={({ pressed }) => [
        s.card,
        kind === 'asset' && s.cardAsset,
        (selected || block.isScopeRoot) && s.cardSelected,
        { left: rect.x, top: rect.y, width: rect.width, height: rect.height, opacity: dimmed ? 0.32 : 1 },
        pressed && { backgroundColor: theme.color.cardHover },
      ]}
    >
      <View style={s.cardTop}>
        <Text style={[s.kind, kind === 'asset' && s.kindAsset]}>
          {kind === 'asset' ? '◆ ' : ''}
          {theme.entityLabel[kind]}
        </Text>
        {role && block.role && (
          <View style={[s.pill, { backgroundColor: role.bg, borderColor: 'transparent' }]}>
            <Text style={[s.pillText, { color: role.text }]}>{block.role}</Text>
          </View>
        )}
      </View>
      <Text style={[s.cardTitle, titleIsAddress && s.mono]} numberOfLines={1}>
        {title}
      </Text>
      {kind !== 'asset' || block.stats.moves ? (
        <View style={s.cardFoot}>
          <Text style={s.cardFootText} numberOfLines={1}>
            {blockFooter(block)}
          </Text>
          {block.drillable && (
            <Pressable hitSlop={10} onPress={() => c.open(block.id)} accessibilityLabel="Open">
              <Text style={s.open}>›</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </Pressable>
  )
}
