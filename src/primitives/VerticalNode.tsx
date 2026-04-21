import React from 'react'
import type { PositionedNode } from '../layouts/types'
import type { EntityRef } from '../providers'
import { useApplicationSummary, useAssetSummary } from '../providers'
import { useTheme } from '../theme'
import { AccountNode } from './AccountNode'
import { VerticalBox } from './VerticalBox'

export type VerticalNodeProps = {
  node: PositionedNode
  onPress?: (ref: EntityRef) => void
}

/**
 * Dispatch renderer for a PositionedNode. Picks the right per-type box based
 * on `node.vertical.type`. Placeholder verticals render as a faint empty box.
 */
export function VerticalNode({ node, onPress }: VerticalNodeProps): React.JSX.Element | null {
  const vertical = node.vertical

  switch (vertical.type) {
    case 'Account':
      return (
        <AccountNode
          node={node}
          vertical={vertical}
          onPress={() => onPress?.({ kind: 'account', address: vertical.accountAddress })}
        />
      )
    case 'Application':
      return (
        <ApplicationNodeInner
          node={node}
          onPress={() => onPress?.({ kind: 'application', id: vertical.applicationId })}
          applicationId={vertical.applicationId}
          linkedAccountNumber={vertical.linkedAccount.accountNumber}
        />
      )
    case 'Asset':
      return (
        <AssetNodeInner
          node={node}
          onPress={() => onPress?.({ kind: 'asset', id: vertical.assetId })}
          assetId={vertical.assetId}
        />
      )
    case 'OpUp':
      return <OpUpNodeInner node={node} />
    case 'Placeholder':
      return <PlaceholderNodeInner node={node} />
  }
}

function ApplicationNodeInner({
  node,
  onPress: _onPress,
  applicationId,
  linkedAccountNumber,
}: {
  node: PositionedNode
  onPress: () => void
  applicationId: bigint | number
  linkedAccountNumber: number
}): React.JSX.Element {
  const theme = useTheme()
  const summary = useApplicationSummary(applicationId)
  const title = summary?.name ?? `App ${String(applicationId)}`
  const subtitle = `Account ${linkedAccountNumber}`
  return (
    <VerticalBox
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      title={title}
      subtitle={subtitle}
      accent={theme.palette.accentAlt}
    />
  )
}

function AssetNodeInner({
  node,
  onPress: _onPress,
  assetId,
}: {
  node: PositionedNode
  onPress: () => void
  assetId: bigint | number
}): React.JSX.Element {
  const theme = useTheme()
  const summary = useAssetSummary(assetId)
  const title = summary?.name ?? summary?.unitName ?? `Asset ${String(assetId)}`
  const subtitle = summary?.unitName && summary.unitName !== title ? summary.unitName : undefined
  return (
    <VerticalBox
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      title={title}
      subtitle={subtitle}
      accent={theme.label.AssetTransfer.stroke}
    />
  )
}

function OpUpNodeInner({ node }: { node: PositionedNode }): React.JSX.Element {
  const theme = useTheme()
  return (
    <VerticalBox
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      title="OpUp"
      subtitle="inner calls"
      accent={theme.palette.textSubtle}
    />
  )
}

function PlaceholderNodeInner({ node }: { node: PositionedNode }): React.JSX.Element {
  const theme = useTheme()
  return (
    <VerticalBox
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      title=""
      accent={theme.palette.border}
    />
  )
}
