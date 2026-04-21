import React, { useCallback } from 'react'
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'
import { isWeb } from '../utils/is-web'
import { cn } from '../utils/cn'

export type DownloadButtonProps = {
  /**
   * DOM ref to the rendered `<svg>` element. The button serializes that node
   * to PNG and triggers a browser download. On native the button renders
   * nothing — RN SVG export is out of scope for M1 and is gated via `isWeb`.
   */
  svgRef: { current: SVGSVGElement | null } | null
  filename?: string
  className?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Web-only. Serializes the parent SVG to a Blob, rasterizes via `<canvas>` and
 * downloads as a PNG. Uses `<a href download>` which works in Chromium /
 * Firefox / Safari.
 */
export function DownloadButton({
  svgRef,
  filename = 'transaction-group.png',
  className,
  style,
}: DownloadButtonProps): React.JSX.Element | null {
  const theme = useTheme()

  const onPress = useCallback(async () => {
    if (!isWeb) return
    const svg = svgRef?.current
    if (!svg) return
    try {
      const dataUrl = await serializeSvgToPng(svg)
      triggerDownload(dataUrl, filename)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[visual-explorer] download failed:', err)
    }
  }, [filename, svgRef])

  if (!isWeb) return null
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Download as PNG"
      className={cn(className)}
      style={[
        {
          width: 32,
          height: 32,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.palette.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.palette.border,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: theme.palette.text,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.size.md,
          lineHeight: theme.typography.size.md + 2,
        }}
      >
        ↓
      </Text>
    </Pressable>
  )
}

async function serializeSvgToPng(svg: SVGSVGElement): Promise<string> {
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svg)
  const width = svg.clientWidth || parseFloat(svg.getAttribute('width') || '0') || 1024
  const height = svg.clientHeight || parseFloat(svg.getAttribute('height') || '0') || 768

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    const scale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d context unavailable')
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0, width, height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = url
  })
}

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
