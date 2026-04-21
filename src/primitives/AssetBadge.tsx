import React from 'react'
import { G, Rect, Text } from 'react-native-svg'
import { useTheme } from '../theme'
import { useAssetSummary } from '../providers'
import { formatAlgo, formatAssetAmount } from '../utils/format-amount'
import type { Label } from '../models'
import { LabelType } from '../models'

export type AssetBadgeProps = {
  x: number
  y: number
  label: Label
  /** Optional max width hint — the renderer truncates unit names to fit. */
  maxWidth?: number
}

/**
 * Center pill that sits above an edge. Renders either a payment amount ("5.2
 * ALGO"), an asset transfer amount resolved against injected AssetSummary
 * metadata ("125 USDC"), or a plain label for AppCall / KeyReg / etc.
 */
export function AssetBadge({ x, y, label, maxWidth }: AssetBadgeProps): React.JSX.Element | null {
  const theme = useTheme()
  const palette = theme.label[label.type]
  const display = useAssetLabelText(label)
  if (!display) return null

  const paddingX = theme.spacing.sm
  const paddingY = theme.spacing.xs / 2
  const fontSize = theme.typography.size.xs
  // Monospace-ish width estimate; good enough for layout without measuring.
  const estimatedTextWidth = Math.min(maxWidth ?? 160, display.length * (fontSize * 0.6))
  const rectWidth = estimatedTextWidth + paddingX * 2
  const rectHeight = fontSize + paddingY * 2

  return (
    <G>
      <Rect
        x={x - rectWidth / 2}
        y={y - rectHeight / 2}
        width={rectWidth}
        height={rectHeight}
        rx={theme.radius.pill}
        ry={theme.radius.pill}
        fill={theme.palette.surface}
        stroke={palette.stroke}
        strokeWidth={1}
        opacity={0.95}
      />
      <Text
        x={x}
        y={y + fontSize / 3}
        textAnchor="middle"
        fontFamily={theme.typography.fontFamily}
        fontSize={fontSize}
        fontWeight={theme.typography.weight.medium}
        fill={palette.fill}
      >
        {display}
      </Text>
    </G>
  )
}

function useAssetLabelText(label: Label): string | null {
  const assetId =
    label.type === LabelType.AssetTransfer ||
    label.type === LabelType.AssetTransferRemainder ||
    label.type === LabelType.Clawback
      ? label.asset.id
      : undefined
  const asset = useAssetSummary(assetId)

  switch (label.type) {
    case LabelType.Payment:
      return formatAlgo(label.amount)
    case LabelType.PaymentTransferRemainder:
      return `Close → ${formatAlgo(label.amount)}`
    case LabelType.AssetTransfer:
    case LabelType.Clawback:
      return formatAssetAmount(label.amount, asset?.decimals ?? 0, asset?.unitName ?? asaFallback(label.asset.id))
    case LabelType.AssetTransferRemainder:
      return `Close → ${formatAssetAmount(label.amount, asset?.decimals ?? 0, asset?.unitName ?? asaFallback(label.asset.id))}`
    case LabelType.AppCall:
      return 'app call'
    case LabelType.AppCreate:
      return 'app create'
    case LabelType.AppUpdate:
      return 'app update'
    case LabelType.AssetCreate:
      return 'asset create'
    case LabelType.AssetReconfigure:
      return 'asset reconfigure'
    case LabelType.AssetDestroy:
      return 'asset destroy'
    case LabelType.AssetFreeze:
      return 'asset freeze'
    case LabelType.KeyReg:
      return 'key reg'
    case LabelType.StateProof:
      return 'state proof'
    case LabelType.Heartbeat:
      return 'heartbeat'
    default:
      return null
  }
}

function asaFallback(id: bigint | number): string {
  return `ASA ${String(id)}`
}
