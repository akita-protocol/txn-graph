import { LabelType } from '../models'

/** Reanimated-compatible spring configuration (duck-typed). */
export type SpringConfig = {
  damping: number
  stiffness: number
  mass: number
  overshootClamping?: boolean
}

export type LabelColor = {
  stroke: string
  fill: string
  /** Optional glow color used for the active-edge bloom. Defaults to `stroke`. */
  glow?: string
}

export type LabelColorMap = Record<LabelType, LabelColor>

export type ThemeTokens = {
  palette: {
    bg: string
    surface: string
    surfaceElevated: string
    border: string
    text: string
    textMuted: string
    textSubtle: string
    accent: string
    accentAlt: string
    edgeBase: string
    edgeActive: string
    edgeGlow: string
  }
  label: LabelColorMap
  typography: {
    fontFamily: string
    size: { xs: number; sm: number; md: number; lg: number }
    weight: { regular: '400'; medium: '500'; bold: '700' }
  }
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number }
  radius: { sm: number; md: number; lg: number; pill: number }
  spring: {
    default: SpringConfig
    enter: SpringConfig
    exit: SpringConfig
    sheet: SpringConfig
  }
  dots: { size: number; gap: number; speed: number }
  node: { width: number; height: number; radius: number }
  edge: { width: number; activeWidth: number; dimOpacity: number; glowWidthMultiplier: number }
  viewport: { padding: number }
  /** CSS variables injected on web by ThemeProvider — consumers can override. */
  cssVars?: Record<string, string>
}
