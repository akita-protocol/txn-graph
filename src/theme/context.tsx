import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { Platform } from 'react-native'
import { akitaDarkTheme, defineTheme } from './index'
import type { ThemeTokens } from './tokens'

export const ThemeContext = createContext<ThemeTokens>(akitaDarkTheme)

export type ThemeProviderProps = {
  /** Partial override — deep-merged with `akitaDarkTheme`. */
  theme?: Partial<ThemeTokens>
  /** Pre-built theme — wins over `theme`. */
  value?: ThemeTokens
  children: React.ReactNode
}

export function ThemeProvider({ theme, value, children }: ThemeProviderProps) {
  const resolved = useMemo<ThemeTokens>(
    () => value ?? (theme ? defineTheme(theme) : akitaDarkTheme),
    [theme, value],
  )

  // On web, inject CSS custom properties so className-based Tailwind utilities
  // can read them (e.g. `border-[color:rgb(var(--akita-pink))]`).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return
    const vars = resolved.cssVars
    if (!vars) return
    const root = document.documentElement
    const previous = new Map<string, string>()
    Object.entries(vars).forEach(([k, v]) => {
      previous.set(k, root.style.getPropertyValue(k))
      root.style.setProperty(k, v)
    })
    return () => {
      previous.forEach((prevValue, k) => {
        if (prevValue) {
          root.style.setProperty(k, prevValue)
        } else {
          root.style.removeProperty(k)
        }
      })
    }
  }, [resolved])

  return <ThemeContext.Provider value={resolved}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext)
}
