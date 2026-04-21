import React from 'react'
import { View } from 'react-native'
import type { HorizontalTitleRow, PositionedEdge } from '../layouts/types'
import type { RenderHorizontalTitleContext } from '../types'

export type HorizontalTitleOverlayProps = {
  /**
   * Title rows — one per horizontal. The overlay positions each row
   * absolutely so the HTML content lines up with the SVG row it labels.
   */
  rows: HorizontalTitleRow[]
  /**
   * All edges from the layout result — the overlay maps each horizontal to
   * its "primary" edge (subIndex 0) so the render context has a concrete edge
   * reference for consumers that want it (e.g. tooltip positioning).
   */
  edges: PositionedEdge[]
  /** Left position of the title column in user-space. */
  left: number
  /** Width of the title column in user-space. */
  width: number
  /** Caller-provided render function. */
  render: (ctx: RenderHorizontalTitleContext) => React.ReactNode
}

/**
 * HTML-first overlay rendered as a sibling of the SVG inside the same
 * Animated.View, so it scales/pans with the graph. Each row is an absolutely
 * positioned box that the consumer fills — lora passes a `<TransactionLink>`
 * per row so the rendered DOM carries real `<a href>` tags that screen
 * readers + tests + middle-click can interact with.
 *
 * On native (react-native-svg on RN), HTML anchors don't exist, but
 * `renderHorizontalTitle` still renders whatever RN components the consumer
 * supplies (`<Pressable><Text>…</Text></Pressable>` with an `onPress` that
 * navigates). So the overlay is valuable on both platforms; only the
 * rendered children differ.
 */
export function HorizontalTitleOverlay({
  rows,
  edges,
  left,
  width,
  render,
}: HorizontalTitleOverlayProps): React.JSX.Element | null {
  if (rows.length === 0) return null

  return (
    <View
      // `box-none` lets pan gestures pass through the empty spaces of the
      // overlay to the SVG underneath. Concrete children (links / buttons)
      // still receive their own pointer events.
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left,
        top: 0,
        width,
        // Height is implied by the contentHeight of the GraphViewport's
        // Animated.View. Leaving it undefined lets the overlay size to its
        // children's absolute positions.
      }}
    >
      {rows.map((row) => {
        const primary = edges.find(
          (e) => e.horizontalIndex === row.horizontalIndex && e.subIndex === 0,
        )
        if (!primary) return null
        return (
          <View
            key={row.horizontalIndex}
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: 0,
              top: row.y,
              width,
              height: row.height,
              justifyContent: 'center',
            }}
          >
            {render({ edge: primary, horizontal: row.horizontal })}
          </View>
        )
      })}
    </View>
  )
}
