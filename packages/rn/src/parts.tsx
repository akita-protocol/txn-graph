import React, { createContext, useContext, useMemo } from 'react'
import { Platform, StyleSheet, Text, type TextStyle } from 'react-native'
import Svg, { Line, Path } from 'react-native-svg'
import {
  useEntityTitle,
  useTheme,
  type ConnectionKind,
  type Entity,
  type ThemeTokens,
} from '@akita-protocol/txn-graph-core'

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })

export function makeStyles(t: ThemeTokens) {
  const c = t.color
  return StyleSheet.create({
    root: { backgroundColor: c.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, overflow: 'hidden' },
    header: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider },
    crumbs: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 },
    crumb: { color: c.textMuted, fontSize: 12, paddingVertical: 2, paddingHorizontal: 3 },
    crumbCurrent: { color: c.text },
    crumbSep: { color: c.textSubtle, fontSize: 12 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { color: c.text, fontSize: 18, fontWeight: '700', flexShrink: 1 },
    desc: { color: c.text, opacity: 0.88, fontSize: 13, lineHeight: 18 },
    summary: { color: c.textMuted, fontSize: 12 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 14 },
    legendLabel: { color: c.textMuted, fontSize: 11.5, fontWeight: '600', marginRight: 2 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 9,
      borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: c.chipBorder, backgroundColor: c.chipBg,
    },
    chipOff: { opacity: 0.42 },
    chipText: { color: c.text, fontSize: 12 },
    chipCount: { color: c.textSubtle, fontSize: 12, fontVariant: ['tabular-nums'] },
    hint: { color: c.textSubtle, fontSize: 11.5 },
    pill: {
      height: 18, paddingHorizontal: 6, borderRadius: 4, justifyContent: 'center',
      backgroundColor: c.cardHover, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    },
    pillText: { fontSize: 10, fontWeight: '600', color: c.textMuted, letterSpacing: 0.2 },

    viewport: { flex: 1, overflow: 'hidden', backgroundColor: c.canvas },
    stage: { position: 'absolute', left: 0, top: 0, transformOrigin: 'left top' },
    card: {
      position: 'absolute', paddingHorizontal: 10, paddingTop: 8, paddingBottom: 7, justifyContent: 'space-between',
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 7,
    },
    cardAsset: { backgroundColor: c.assetCard, borderColor: c.assetBorder },
    cardSelected: { borderColor: c.accent, borderWidth: 1.5 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    kind: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', color: c.textMuted },
    kindAsset: { color: c.link },
    cardTitle: { fontSize: 13, fontWeight: '600', color: c.text },
    mono: { fontFamily: MONO, fontSize: 12, letterSpacing: -0.2 },
    cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    cardFootText: { fontSize: 11, color: c.textMuted, flexShrink: 1 },
    open: { color: c.accent, fontSize: 15, lineHeight: 15, paddingLeft: 8 },
    badge: {
      position: 'absolute', width: 18, height: 18, marginLeft: -9, marginTop: -9, borderRadius: 9,
      alignItems: 'center', justifyContent: 'center', backgroundColor: c.badgeBg, borderWidth: 1, borderColor: c.badgeBorder,
    },
    badgeText: { fontSize: 10, fontWeight: '700', color: c.badgeText },
    assetCaption: { position: 'absolute', fontSize: 11.5, color: c.textMuted, backgroundColor: c.canvas, paddingRight: 8 },
    assetCaptionStrong: { color: c.text, fontWeight: '600' },
    toolbar: {
      position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', gap: 2, padding: 3,
      backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, borderRadius: 8,
    },
    tool: { minWidth: 30, height: 28, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
    toolText: { color: c.textMuted, fontSize: 14 },
    empty: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

    panel: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider },
    panelBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 18 },
    panelHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    panelTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
    panelId: { color: c.textMuted, fontFamily: MONO, fontSize: 11.5, marginTop: 2 },
    panelDesc: { color: c.text, opacity: 0.88, fontSize: 12.5, lineHeight: 17, marginTop: 8 },
    close: { marginLeft: 'auto', paddingHorizontal: 6, paddingVertical: 2 },
    closeText: { color: c.textSubtle, fontSize: 18 },
    section: { marginTop: 14 },
    sectionTitle: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: c.textMuted, marginBottom: 6 },
    kvRow: { flexDirection: 'row', gap: 12, paddingVertical: 1 },
    kvKey: { color: c.textMuted, fontSize: 12, width: 110 },
    kvVal: { color: c.text, fontSize: 12, fontVariant: ['tabular-nums'] },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    rowMain: { flex: 1, color: c.text, fontSize: 12.5 },
    rowSide: { color: c.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
    rowIdx: { color: c.textSubtle, fontFamily: MONO, fontSize: 11, minWidth: 38 },
    txn: { paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider },
    txnHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    txnTitle: { color: c.text, fontWeight: '600', fontSize: 12.5, flexShrink: 1 },
    txnAmount: { marginLeft: 'auto', color: c.text, fontSize: 12.5, fontVariant: ['tabular-nums'] },
    txnMeta: { color: c.textMuted, fontSize: 12, marginTop: 3, paddingLeft: 45 },
    openBtn: {
      marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12,
      borderRadius: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: c.borderStrong, backgroundColor: c.card,
    },
    openBtnText: { color: c.text, fontSize: 13 },
    more: { color: c.textSubtle, fontSize: 11.5, paddingTop: 4 },
    linkText: { color: c.text, textDecorationLine: 'underline', textDecorationColor: c.borderStrong },
  })
}

export type Styles = ReturnType<typeof makeStyles>

const StylesContext = createContext<Styles | null>(null)

export function StylesProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  return <StylesContext.Provider value={styles}>{children}</StylesContext.Provider>
}

export function useStyles(): Styles {
  const styles = useContext(StylesContext)
  if (!styles) throw new Error('useStyles must be used inside <StylesProvider>')
  return styles
}

export function LineSwatch({ kind, width = 22 }: { kind: ConnectionKind; width?: number }) {
  const style = useTheme().kinds[kind]
  return (
    <Svg width={width} height={8}>
      <Line
        x1={1}
        y1={4}
        x2={width - 6}
        y2={4}
        stroke={style.color}
        strokeWidth={1.6}
        strokeDasharray={style.dash ?? undefined}
        strokeLinecap="round"
      />
      <Path d={`M${width - 1},4 L${width - 6},1 L${width - 6},7 Z`} fill={style.color} />
    </Svg>
  )
}

export function EntityName({ entity, style }: { entity: Entity | undefined; style?: TextStyle | TextStyle[] }) {
  const s = useStyles()
  const { title, titleIsAddress } = useEntityTitle(entity)
  return (
    <Text style={[style, titleIsAddress && s.mono]} numberOfLines={1}>
      {title}
    </Text>
  )
}
