import { LabelType } from '../models'
import type { LabelColorMap, ThemeTokens } from './tokens'

export type { ThemeTokens, LabelColor, LabelColorMap, SpringConfig } from './tokens'
export { ThemeProvider, useTheme, ThemeContext } from './context'

/**
 * Per-transaction-type palette. Values mirror algokit-lora's dark-mode CSS
 * variables from `src/index.css` lines 238–260, so lora consumers see an
 * identical color story. When running on web the ThemeProvider also injects
 * CSS custom properties (`--payment`, `--asset-transfer`, …) so
 * `className="text-payment"` style Tailwind utilities keep working.
 */
const akitaDarkLabel: LabelColorMap = {
  [LabelType.Payment]: { stroke: 'rgb(234, 100, 104)', fill: 'rgb(234, 100, 104)' },
  [LabelType.PaymentTransferRemainder]: {
    stroke: 'rgb(234, 100, 104)',
    fill: 'rgb(234, 100, 104)',
  },
  [LabelType.AssetTransfer]: { stroke: 'rgb(235, 117, 226)', fill: 'rgb(235, 117, 226)' },
  [LabelType.AssetTransferRemainder]: {
    stroke: 'rgb(235, 117, 226)',
    fill: 'rgb(235, 117, 226)',
  },
  [LabelType.Clawback]: { stroke: 'rgb(235, 117, 226)', fill: 'rgb(235, 117, 226)' },
  [LabelType.AppCall]: { stroke: 'rgb(43, 157, 195)', fill: 'rgb(43, 157, 195)' },
  [LabelType.AppCreate]: { stroke: 'rgb(43, 157, 195)', fill: 'rgb(43, 157, 195)' },
  [LabelType.AppUpdate]: { stroke: 'rgb(43, 157, 195)', fill: 'rgb(43, 157, 195)' },
  [LabelType.AssetCreate]: { stroke: 'rgb(170, 121, 245)', fill: 'rgb(170, 121, 245)' },
  [LabelType.AssetReconfigure]: { stroke: 'rgb(170, 121, 245)', fill: 'rgb(170, 121, 245)' },
  [LabelType.AssetDestroy]: { stroke: 'rgb(170, 121, 245)', fill: 'rgb(170, 121, 245)' },
  [LabelType.AssetFreeze]: { stroke: 'rgb(105, 154, 152)', fill: 'rgb(105, 154, 152)' },
  [LabelType.KeyReg]: { stroke: 'rgb(164, 144, 20)', fill: 'rgb(164, 144, 20)' },
  [LabelType.StateProof]: { stroke: 'rgb(43, 167, 22)', fill: 'rgb(43, 167, 22)' },
  [LabelType.Heartbeat]: { stroke: 'rgb(255, 234, 0)', fill: 'rgb(255, 234, 0)' },
}

/**
 * The default Akita-themed token set. Dark background, zinc neutrals, Akita
 * pink accent for active-edge glow, Akita purple for chrome. Spring configs
 * mirror `akita-rn/src/utils/animation.ts`.
 */
export const akitaDarkTheme: ThemeTokens = {
  palette: {
    bg: '#09090b', // zinc950
    surface: '#18181b', // zinc900
    surfaceElevated: '#27272a', // zinc800
    border: '#3f3f46', // zinc700
    text: '#fafafa', // zinc50
    textMuted: '#a1a1aa', // zinc400
    textSubtle: '#71717a', // zinc500
    accent: '#9439e6', // akitaPurple
    accentAlt: '#f35ff2', // akitaPink
    edgeBase: '#3f3f46', // zinc700
    edgeActive: '#f35ff2', // akitaPink
    edgeGlow: 'rgba(243, 95, 242, 0.55)',
  },
  label: akitaDarkLabel,
  typography: {
    fontFamily: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    size: { xs: 10, sm: 12, md: 14, lg: 16 },
    weight: { regular: '400', medium: '500', bold: '700' },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { sm: 4, md: 8, lg: 12, pill: 999 },
  // Mirrors akita-rn/src/utils/animation.ts
  spring: {
    default: { damping: 70, stiffness: 900, mass: 2, overshootClamping: false },
    enter: { damping: 80, stiffness: 900, mass: 2, overshootClamping: true },
    exit: { damping: 70, stiffness: 900, mass: 2, overshootClamping: true },
    sheet: { damping: 100, stiffness: 500, mass: 1, overshootClamping: true },
  },
  dots: { size: 6, gap: 8, speed: 60 },
  node: { width: 160, height: 72, radius: 12 },
  edge: { width: 1.5, activeWidth: 2.5, dimOpacity: 0.25, glowWidthMultiplier: 3 },
  viewport: { padding: 24 },
  cssVars: {
    // Matches lora's dark-mode CSS vars so existing className-driven colors keep working.
    '--payment': '234 100 104',
    '--asset-transfer': '235 117 226',
    '--application-call': '43 157 195',
    '--asset-config': '170 121 245',
    '--asset-freeze': '105 154 152',
    '--state-proof': '43 167 22',
    '--key-registration': '164 144 20',
    '--heartbeat': '255 234 0',
    '--akita-purple': '148 57 230',
    '--akita-pink': '243 95 242',
  },
}

export const defaultTheme = akitaDarkTheme

/** Shallow-merge override helper. Nested fields are replaced wholesale. */
export function defineTheme(overrides: Partial<ThemeTokens>): ThemeTokens {
  return {
    ...defaultTheme,
    ...overrides,
    palette: { ...defaultTheme.palette, ...(overrides.palette ?? {}) },
    label: { ...defaultTheme.label, ...(overrides.label ?? {}) },
    typography: { ...defaultTheme.typography, ...(overrides.typography ?? {}) },
    spacing: { ...defaultTheme.spacing, ...(overrides.spacing ?? {}) },
    radius: { ...defaultTheme.radius, ...(overrides.radius ?? {}) },
    spring: { ...defaultTheme.spring, ...(overrides.spring ?? {}) },
    dots: { ...defaultTheme.dots, ...(overrides.dots ?? {}) },
    node: { ...defaultTheme.node, ...(overrides.node ?? {}) },
    edge: { ...defaultTheme.edge, ...(overrides.edge ?? {}) },
    viewport: { ...defaultTheme.viewport, ...(overrides.viewport ?? {}) },
    cssVars: { ...(defaultTheme.cssVars ?? {}), ...(overrides.cssVars ?? {}) },
  }
}
