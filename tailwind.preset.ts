import type { Config } from 'tailwindcss'

/**
 * Tailwind preset exported to downstream consumers (lora + algomd-rn + akita-rn).
 *
 * Usage:
 *   // tailwind.config.js
 *   module.exports = {
 *     content: [...],
 *     presets: [require('@akita/visual-explorer/tailwind.preset')],
 *   }
 *
 * Provides:
 *   - Akita brand colors (pink / purple) as `bg-akita-pink`, `text-akita-purple`, …
 *   - Per-transaction-type colors that read from the same CSS vars ThemeProvider
 *     injects on web (`--payment`, `--asset-transfer`, …) so lora's existing
 *     class-driven palette keeps working.
 *   - A safelist for dynamic label classes — dynamically-built `text-{type}`
 *     strings survive Tailwind's purge.
 */
const preset: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        'akita-pink': 'rgb(var(--akita-pink, 243 95 242) / <alpha-value>)',
        'akita-purple': 'rgb(var(--akita-purple, 148 57 230) / <alpha-value>)',
        payment: 'rgb(var(--payment, 234 100 104) / <alpha-value>)',
        'asset-transfer': 'rgb(var(--asset-transfer, 235 117 226) / <alpha-value>)',
        'application-call': 'rgb(var(--application-call, 43 157 195) / <alpha-value>)',
        'asset-config': 'rgb(var(--asset-config, 170 121 245) / <alpha-value>)',
        'asset-freeze': 'rgb(var(--asset-freeze, 105 154 152) / <alpha-value>)',
        'state-proof': 'rgb(var(--state-proof, 43 167 22) / <alpha-value>)',
        'key-registration': 'rgb(var(--key-registration, 164 144 20) / <alpha-value>)',
        heartbeat: 'rgb(var(--heartbeat, 255 234 0) / <alpha-value>)',
      },
      fontFamily: {
        grotesk: [
          '"Space Grotesk"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  safelist: [
    'text-payment',
    'text-asset-transfer',
    'text-application-call',
    'text-asset-config',
    'text-asset-freeze',
    'text-state-proof',
    'text-key-registration',
    'text-heartbeat',
    'bg-payment',
    'bg-asset-transfer',
    'bg-application-call',
    'bg-asset-config',
    'bg-asset-freeze',
    'bg-state-proof',
    'bg-key-registration',
    'bg-heartbeat',
    'border-akita-pink',
    'border-akita-purple',
    'text-akita-pink',
    'text-akita-purple',
    'bg-akita-pink',
    'bg-akita-purple',
  ],
  plugins: [],
}

export default preset

/** CommonJS compatibility export so `require('@akita/visual-explorer/tailwind.preset')` works. */
// @ts-ignore — module-level assignment for CJS consumers that can't import ESM defaults.
module.exports = preset
// @ts-ignore
module.exports.default = preset
