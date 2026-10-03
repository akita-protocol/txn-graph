import { createContext, useContext } from 'react'
import type { BlockRole } from '../graph/scope'
import type { ConnectionKind, EntityKind } from '../graph/types'
import { defaultLayoutOptions, type LayoutOptions } from '../layout/scene'

export type KindStyle = {
  color: string
  /** Stroke dash pattern; `null` for a solid line. */
  dash: number[] | null
}

export type ThemeTokens = {
  scheme: 'dark' | 'light'
  color: {
    /** Page / panel background. */
    bg: string
    /** Graph canvas background. */
    canvas: string
    card: string
    cardHover: string
    /** Asset cards — tinted to read as a second kind of block. */
    assetCard: string
    assetBorder: string
    border: string
    borderStrong: string
    divider: string
    text: string
    textMuted: string
    textSubtle: string
    accent: string
    chipBg: string
    chipBorder: string
    badgeBg: string
    badgeBorder: string
    badgeText: string
    tooltipBg: string
    tooltipText: string
    /** Asset links (hover-only). */
    link: string
  }
  kinds: Record<ConnectionKind, KindStyle>
  entityLabel: Record<EntityKind, string>
  role: Record<BlockRole, { bg: string; text: string }>
  font: { sans: string; mono: string }
  edge: {
    width: number
    activeWidth: number
    /** Opacity of everything outside the focus while something is focused. */
    dimOpacity: number
    /** Opacity of lines whose flows are all inner transactions. */
    innerOpacity: number
  }
  layout: LayoutOptions
}

const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'

export const darkTheme: ThemeTokens = {
  scheme: 'dark',
  color: {
    bg: '#0d0f12',
    canvas: '#0d0f12',
    card: '#16191e',
    cardHover: '#1c2026',
    assetCard: '#1a1420',
    assetBorder: '#4a2f55',
    border: '#2a2f37',
    borderStrong: '#3b424d',
    divider: '#22262d',
    text: '#eceff3',
    textMuted: '#a3abb7',
    textSubtle: '#6c7480',
    accent: '#8fb4ff',
    chipBg: '#16191e',
    chipBorder: '#2a2f37',
    badgeBg: '#1f242b',
    badgeBorder: '#4a525e',
    badgeText: '#d6dbe2',
    tooltipBg: '#f1f3f6',
    tooltipText: '#111418',
    link: '#d68be6',
  },
  kinds: {
    appl: { color: '#7fa6ff', dash: null },
    pay: { color: '#4fd1df', dash: null },
    axfer: { color: '#5edb9a', dash: [6, 3] },
    acfg: { color: '#f2b84b', dash: [8, 3, 2, 3] },
    afrz: { color: '#d68be6', dash: [2, 3] },
    close: { color: '#f2837a', dash: [4, 3] },
    clawback: { color: '#ff9d5c', dash: [7, 3, 2, 3] },
    keyreg: { color: '#e5e06b', dash: null },
    stpf: { color: '#a98bf0', dash: null },
    hb: { color: '#8ad06f', dash: null },
    auth: { color: '#9aa3b0', dash: [1.5, 3.5] },
  },
  entityLabel: { account: 'Account', app: 'App', asset: 'Asset' },
  role: {
    signer: { bg: 'rgba(74, 222, 128, 0.14)', text: '#6ee59a' },
    rekeyed: { bg: 'rgba(242, 184, 75, 0.16)', text: '#f4c56b' },
    create: { bg: 'rgba(127, 166, 255, 0.16)', text: '#9dbbff' },
    update: { bg: 'rgba(127, 166, 255, 0.16)', text: '#9dbbff' },
    called: { bg: 'rgba(163, 171, 183, 0.12)', text: '#a3abb7' },
    created: { bg: 'rgba(242, 184, 75, 0.16)', text: '#f4c56b' },
    reconfigured: { bg: 'rgba(242, 184, 75, 0.16)', text: '#f4c56b' },
    destroyed: { bg: 'rgba(242, 131, 122, 0.16)', text: '#f59a92' },
  },
  font: { sans: SANS, mono: MONO },
  edge: { width: 1.5, activeWidth: 2.25, dimOpacity: 0.12, innerOpacity: 0.7 },
  layout: defaultLayoutOptions,
}

export const lightTheme: ThemeTokens = {
  ...darkTheme,
  scheme: 'light',
  color: {
    bg: '#f7f8fa',
    canvas: '#f7f8fa',
    card: '#ffffff',
    cardHover: '#f2f4f7',
    assetCard: '#fbf5fd',
    assetBorder: '#e2c6ea',
    border: '#dde1e7',
    borderStrong: '#c3c9d2',
    divider: '#e6e9ee',
    text: '#14171c',
    textMuted: '#4d5562',
    textSubtle: '#808894',
    accent: '#2f5fd0',
    chipBg: '#ffffff',
    chipBorder: '#dde1e7',
    badgeBg: '#ffffff',
    badgeBorder: '#b9c0ca',
    badgeText: '#2a3038',
    tooltipBg: '#14171c',
    tooltipText: '#f4f6f8',
    link: '#a548b8',
  },
  kinds: {
    appl: { color: '#3d6be0', dash: null },
    pay: { color: '#0f9fb0', dash: null },
    axfer: { color: '#16a06a', dash: [6, 3] },
    acfg: { color: '#c48a12', dash: [8, 3, 2, 3] },
    afrz: { color: '#a548b8', dash: [2, 3] },
    close: { color: '#d4473c', dash: [4, 3] },
    clawback: { color: '#d96a1c', dash: [7, 3, 2, 3] },
    keyreg: { color: '#a39a0f', dash: null },
    stpf: { color: '#6c4fd0', dash: null },
    hb: { color: '#4f9a32', dash: null },
    auth: { color: '#6b7380', dash: [1.5, 3.5] },
  },
  role: {
    signer: { bg: 'rgba(22, 160, 106, 0.12)', text: '#11804f' },
    rekeyed: { bg: 'rgba(196, 138, 18, 0.14)', text: '#8f640c' },
    create: { bg: 'rgba(61, 107, 224, 0.12)', text: '#2f56b8' },
    update: { bg: 'rgba(61, 107, 224, 0.12)', text: '#2f56b8' },
    called: { bg: 'rgba(77, 85, 98, 0.1)', text: '#4d5562' },
    created: { bg: 'rgba(196, 138, 18, 0.14)', text: '#8f640c' },
    reconfigured: { bg: 'rgba(196, 138, 18, 0.14)', text: '#8f640c' },
    destroyed: { bg: 'rgba(212, 71, 60, 0.12)', text: '#b13a30' },
  },
  edge: { width: 1.5, activeWidth: 2.25, dimOpacity: 0.14, innerOpacity: 0.75 },
}

/** Deep-partial override accepted by `defineTheme` and the `theme` prop. */
export type ThemeInput = {
  color?: Partial<ThemeTokens['color']>
  kinds?: Partial<Record<ConnectionKind, Partial<KindStyle> | string>>
  entityLabel?: Partial<ThemeTokens['entityLabel']>
  role?: Partial<ThemeTokens['role']>
  font?: Partial<ThemeTokens['font']>
  edge?: Partial<ThemeTokens['edge']>
  layout?: Partial<LayoutOptions>
}

/** Merge an override onto a base theme. A kind given as a string sets its color. */
export function defineTheme(base: ThemeTokens, input: ThemeInput = {}): ThemeTokens {
  const kinds = { ...base.kinds }
  for (const [k, v] of Object.entries(input.kinds ?? {}) as [ConnectionKind, Partial<KindStyle> | string][]) {
    kinds[k] = typeof v === 'string' ? { ...kinds[k], color: v } : { ...kinds[k], ...v }
  }
  return {
    ...base,
    color: { ...base.color, ...input.color },
    kinds,
    entityLabel: { ...base.entityLabel, ...input.entityLabel },
    role: { ...base.role, ...input.role },
    font: { ...base.font, ...input.font },
    edge: { ...base.edge, ...input.edge },
    layout: { ...base.layout, ...input.layout },
  }
}

export const ThemeContext = createContext<ThemeTokens>(darkTheme)

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext)
}
