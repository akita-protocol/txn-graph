import React from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import {
  CONNECTION_KINDS,
  connectionKindLabel,
  describeScope,
  useEntityTitle,
  visibleFlows,
  type TxnGraphController,
} from '@akita-protocol/txn-graph-core'
import { EntityName, LineSwatch, useStyles } from './parts'

export function Header({ c, rootTitle }: { c: TxnGraphController; rootTitle: string }) {
  const s = useStyles()
  const { view, filters } = c
  const scopeTitle = useEntityTitle(view.entity)
  const kinds = CONNECTION_KINDS.filter((k) => view.kindCounts[k])
  const lines = view.connections.filter((x) => visibleFlows(x.flows, view.scope, filters).length > 0).length

  return (
    <View style={s.header}>
      {view.scope.path.length > 0 && (
        <View style={s.crumbs} accessibilityRole="header">
          <Pressable onPress={() => c.goTo(0)} hitSlop={6}>
            <Text style={s.crumb}>‹ {rootTitle}</Text>
          </Pressable>
          {view.scope.path.map((id, i) => {
            const last = i === view.scope.path.length - 1
            return (
              <React.Fragment key={id}>
                <Text style={s.crumbSep}>›</Text>
                <Pressable onPress={() => !last && c.goTo(i + 1)} disabled={last} hitSlop={6}>
                  <EntityName entity={c.graph.entities.get(id)} style={[s.crumb, ...(last ? [s.crumbCurrent] : [])]} />
                </Pressable>
              </React.Fragment>
            )
          })}
        </View>
      )}
      <View style={s.titleRow}>
        <Text style={s.title} numberOfLines={1}>
          {view.entity ? scopeTitle.title : rootTitle}
        </Text>
        <View style={s.pill}>
          <Text style={s.pillText}>
            {view.stats.txns} {view.stats.txns === 1 ? 'txn' : 'txns'}
          </Text>
        </View>
      </View>
      <Text style={s.desc}>{describeScope(view)}</Text>
      <Text style={s.summary}>
        {view.blocks.length + view.assets.length} blocks · {lines} connections
      </Text>
      {kinds.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.legendRow}>
            {kinds.map((k) => {
              const on = !filters.hiddenKinds.has(k)
              return (
                <Pressable
                  key={k}
                  onPress={() => c.toggleKind(k)}
                  style={[s.chip, !on && s.chipOff]}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: on }}
                >
                  <LineSwatch kind={k} />
                  <Text style={[s.chipText, !on && { textDecorationLine: 'line-through' }]}>{connectionKindLabel[k]}</Text>
                  <Text style={s.chipCount}>{view.kindCounts[k]}</Text>
                </Pressable>
              )
            })}
            {view.stats.inner > 0 && (
              <Pressable
                onPress={() => c.setShowInner(!filters.showInner)}
                style={[s.chip, !filters.showInner && s.chipOff]}
                accessibilityRole="switch"
                accessibilityState={{ checked: filters.showInner }}
              >
                <Text style={[s.chipText, !filters.showInner && { textDecorationLine: 'line-through' }]}>inner txns</Text>
                <Text style={s.chipCount}>{view.stats.inner}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}
      <Text style={s.hint}>Tap a block to highlight it. Tap an app again (or ›) to open its inner transactions.</Text>
    </View>
  )
}
