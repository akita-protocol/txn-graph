import type { ThemeTokens } from '@akta/txn-graph-core'
import type { CSSProperties } from 'react'

/** Theme tokens as CSS custom properties on the root element. */
export function themeVars(theme: ThemeTokens): CSSProperties {
  const c = theme.color
  return {
    '--tg-bg': c.bg,
    '--tg-canvas': c.canvas,
    '--tg-card': c.card,
    '--tg-card-hover': c.cardHover,
    '--tg-asset-card': c.assetCard,
    '--tg-asset-border': c.assetBorder,
    '--tg-border': c.border,
    '--tg-border-strong': c.borderStrong,
    '--tg-divider': c.divider,
    '--tg-text': c.text,
    '--tg-muted': c.textMuted,
    '--tg-subtle': c.textSubtle,
    '--tg-accent': c.accent,
    '--tg-chip-bg': c.chipBg,
    '--tg-chip-border': c.chipBorder,
    '--tg-badge-bg': c.badgeBg,
    '--tg-badge-border': c.badgeBorder,
    '--tg-badge-text': c.badgeText,
    '--tg-tooltip-bg': c.tooltipBg,
    '--tg-tooltip-text': c.tooltipText,
    '--tg-link': c.link,
    '--tg-sans': theme.font.sans,
    '--tg-mono': theme.font.mono,
    '--tg-dim': String(theme.edge.dimOpacity),
    colorScheme: theme.scheme,
  } as CSSProperties
}

/**
 * Component styles, scoped under `.tg-root`. Shipped as a string so
 * consumers don't need a CSS pipeline (Tailwind, CSS modules) to use the
 * library.
 */
export const css = /* css */ `
.tg-root {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  background: var(--tg-bg);
  color: var(--tg-text);
  font-family: var(--tg-sans);
  font-size: 13px;
  line-height: 1.4;
  border: 1px solid var(--tg-border);
  border-radius: 10px;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
.tg-root[data-narrow] { display: flex; flex-direction: column; }
.tg-root[data-panel="off"] { grid-template-columns: minmax(0, 1fr); }
.tg-root *, .tg-root *::before, .tg-root *::after { box-sizing: border-box; }
.tg-root button { font: inherit; color: inherit; }
.tg-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.tg-root[data-narrow] .tg-main { height: var(--tg-height); flex: none; }

/* ── Header ─────────────────────────────────────────── */
.tg-header { padding: 14px 18px 10px; border-bottom: 1px solid var(--tg-divider); display: flex; flex-direction: column; gap: 7px; }
.tg-crumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 2px; font-size: 12px; color: var(--tg-subtle); }
.tg-crumb { background: none; border: 0; padding: 1px 4px; border-radius: 4px; cursor: pointer; color: var(--tg-muted); }
.tg-crumb:hover { background: var(--tg-card-hover); color: var(--tg-text); }
.tg-crumb[aria-current] { color: var(--tg-text); cursor: default; background: none; }
.tg-crumb-sep { color: var(--tg-subtle); }
.tg-title-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.tg-title { margin: 0; font-size: 18px; font-weight: 650; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tg-desc { margin: 0; color: var(--tg-text); opacity: 0.88; font-size: 13px; }
.tg-summary { color: var(--tg-muted); font-size: 12px; }
.tg-legend { display: flex; align-items: center; flex-wrap: wrap; gap: 5px 6px; }
.tg-legend-label { font-size: 11.5px; color: var(--tg-muted); font-weight: 600; margin-right: 4px; min-width: 72px; }
.tg-chip {
  display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px;
  border: 1px solid var(--tg-chip-border); border-radius: 999px; background: var(--tg-chip-bg);
  font-size: 11.5px; color: var(--tg-text); white-space: nowrap;
}
button.tg-chip { cursor: pointer; transition: opacity 140ms ease, border-color 140ms ease; }
button.tg-chip:hover { border-color: var(--tg-border-strong); }
.tg-chip[aria-pressed="false"] { opacity: 0.42; }
.tg-chip[aria-pressed="false"] .tg-chip-text { text-decoration: line-through; }
.tg-chip-count { color: var(--tg-subtle); font-variant-numeric: tabular-nums; }
.tg-chip-plain { border-color: transparent; background: none; padding: 0 4px; color: var(--tg-muted); }
.tg-chip-box { width: 11px; height: 9px; border-radius: 2px; border: 1px solid var(--tg-border-strong); }
.tg-chip-box[data-kind="asset"] { border-color: var(--tg-asset-border); background: var(--tg-asset-card); border-radius: 5px; }
.tg-chip-box[data-kind="app"] { border-color: var(--tg-accent); }
.tg-hint { font-size: 11.5px; color: var(--tg-subtle); }
.tg-pill {
  display: inline-flex; align-items: center; height: 17px; padding: 0 6px; border-radius: 4px;
  font-size: 10px; font-weight: 600; letter-spacing: 0.02em; white-space: nowrap;
  background: var(--tg-card-hover); color: var(--tg-muted); border: 1px solid var(--tg-border);
}
.tg-pill[data-tone="role"] { border-color: transparent; }

/* ── Canvas ─────────────────────────────────────────── */
.tg-viewport {
  position: relative; flex: 1; min-height: 0; overflow: hidden; background: var(--tg-canvas);
  cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; outline: none;
}
.tg-viewport[data-panning] { cursor: grabbing; }
.tg-stage { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform; }
.tg-scene { position: absolute; left: 0; top: 0; }
.tg-svg { position: absolute; left: 0; top: 0; overflow: visible; }
.tg-conn, .tg-link, .tg-badge, .tg-card { transition: opacity 160ms ease; }
.tg-conn[data-state="dim"], .tg-badge[data-state="dim"] { opacity: var(--tg-dim); }
.tg-conn-hit { stroke: transparent; fill: none; stroke-width: 12; pointer-events: stroke; cursor: pointer; }
.tg-conn-line { fill: none; stroke-linecap: round; transition: stroke-width 160ms ease; pointer-events: none; }
.tg-conn-arrow { pointer-events: none; }
.tg-badge { cursor: pointer; }
.tg-badge circle { fill: var(--tg-badge-bg); stroke: var(--tg-badge-border); }
.tg-badge text { fill: var(--tg-badge-text); font-size: 10px; font-weight: 600; font-family: var(--tg-sans); }
.tg-link { fill: none; stroke: var(--tg-link); stroke-width: 1.5; stroke-dasharray: 2 3; stroke-linecap: round; pointer-events: none; }

.tg-card {
  position: absolute; display: flex; flex-direction: column; justify-content: space-between;
  padding: 8px 10px 7px; text-align: left; cursor: pointer;
  background: var(--tg-card); border: 1px solid var(--tg-border); border-radius: 7px;
  box-shadow: 0 1px 0 rgba(0,0,0,0.25), 0 6px 16px -10px rgba(0,0,0,0.55);
  transition: opacity 160ms ease, border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
}
.tg-card > * { flex: none; min-width: 0; }
.tg-card:hover { background: var(--tg-card-hover); border-color: var(--tg-border-strong); }
.tg-card:focus-visible { outline: 2px solid var(--tg-accent); outline-offset: 2px; }
.tg-card[data-kind="asset"] { background: var(--tg-asset-card); border-color: var(--tg-asset-border); }
.tg-card[data-state="dim"] { opacity: 0.32; }
.tg-card[data-selected] { border-color: var(--tg-accent); box-shadow: 0 0 0 1px var(--tg-accent), 0 8px 20px -10px rgba(0,0,0,0.6); }
.tg-card[data-scope-root] { border-color: var(--tg-accent); }
.tg-card-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.tg-kind { font-size: 9.5px; font-weight: 650; letter-spacing: 0.07em; text-transform: uppercase; color: var(--tg-muted); }
.tg-card[data-kind="asset"] .tg-kind { color: var(--tg-link); }
.tg-card-title { font-size: 13px; font-weight: 620; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tg-mono { font-family: var(--tg-mono); font-size: 12px; font-weight: 550; letter-spacing: -0.01em; }
.tg-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 11px; color: var(--tg-muted); white-space: nowrap; }
.tg-card-foot > span:first-child { overflow: hidden; text-overflow: ellipsis; }
.tg-open { color: var(--tg-accent); font-size: 13px; line-height: 1; }

.tg-asset-sep { position: absolute; height: 0; border-top: 1px dashed var(--tg-border); }
.tg-asset-caption { position: absolute; font-size: 11.5px; color: var(--tg-muted); white-space: nowrap; background: var(--tg-canvas); padding: 0 8px 0 0; }
.tg-asset-caption b { color: var(--tg-text); font-weight: 600; }

.tg-tooltip {
  position: absolute; z-index: 5; pointer-events: none; max-width: 300px;
  padding: 5px 8px; border-radius: 6px; font-size: 11.5px; line-height: 1.35;
  background: var(--tg-tooltip-bg); color: var(--tg-tooltip-text);
  box-shadow: 0 6px 20px -6px rgba(0,0,0,0.5);
}
.tg-tooltip .tg-mono { font-size: 11px; }
.tg-tooltip-sub { opacity: 0.7; }

.tg-toolbar {
  position: absolute; left: 12px; bottom: 12px; display: flex; align-items: center; gap: 2px; padding: 3px;
  background: var(--tg-card); border: 1px solid var(--tg-border); border-radius: 8px; z-index: 4;
}
.tg-tool {
  min-width: 26px; height: 24px; padding: 0 6px; border: 0; border-radius: 5px; background: none; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; color: var(--tg-muted); font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.tg-tool:hover { background: var(--tg-card-hover); color: var(--tg-text); }
.tg-empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--tg-subtle); }

/* ── Panel ──────────────────────────────────────────── */
.tg-panel { border-left: 1px solid var(--tg-divider); padding: 14px 16px 20px; overflow: auto; min-height: 0; background: var(--tg-bg); }
.tg-root[data-narrow] .tg-panel { border-left: 0; border-top: 1px solid var(--tg-divider); max-height: 380px; }
.tg-panel-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.tg-panel-title { margin: 0; font-size: 17px; font-weight: 650; letter-spacing: -0.01em; word-break: break-word; }
.tg-panel-id { font-family: var(--tg-mono); font-size: 11.5px; color: var(--tg-muted); word-break: break-all; margin-top: 2px; }
.tg-panel-desc { margin: 10px 0 0; font-size: 12.5px; color: var(--tg-text); opacity: 0.88; }
.tg-panel-close { margin-left: auto; border: 0; background: none; color: var(--tg-subtle); cursor: pointer; font-size: 15px; line-height: 1; padding: 2px 4px; border-radius: 4px; }
.tg-panel-close:hover { color: var(--tg-text); background: var(--tg-card-hover); }
.tg-section { margin-top: 18px; }
.tg-section-title { font-size: 10.5px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tg-muted); margin: 0 0 6px; }
.tg-kv { display: grid; grid-template-columns: auto 1fr; gap: 3px 14px; font-size: 12px; }
.tg-kv dt { color: var(--tg-muted); }
.tg-kv dd { margin: 0; font-variant-numeric: tabular-nums; }
.tg-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }
.tg-row {
  display: flex; align-items: center; gap: 7px; width: 100%; padding: 5px 6px; margin: 0 -6px; border: 0;
  border-radius: 5px; background: none; text-align: left; font-size: 12px; min-width: 0;
}
button.tg-row { cursor: pointer; }
button.tg-row:hover { background: var(--tg-card-hover); }
.tg-row-main { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tg-row-side { color: var(--tg-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.tg-row-idx { color: var(--tg-subtle); font-family: var(--tg-mono); font-size: 11px; min-width: 34px; }
.tg-swatch { flex: none; }
.tg-txn { padding: 6px 0; border-top: 1px solid var(--tg-divider); font-size: 12px; }
.tg-txn:first-child { border-top: 0; }
.tg-txn-head { display: flex; align-items: baseline; gap: 7px; }
.tg-txn-title { font-weight: 600; }
.tg-txn-amount { margin-left: auto; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tg-txn-meta { color: var(--tg-muted); margin-top: 2px; padding-left: 41px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tg-link-btn { border: 0; background: none; padding: 0; cursor: pointer; color: var(--tg-text); text-decoration: underline; text-decoration-color: var(--tg-border-strong); text-underline-offset: 2px; }
.tg-link-btn:hover { text-decoration-color: currentColor; }
.tg-open-btn {
  margin-top: 12px; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px;
  border-radius: 6px; border: 1px solid var(--tg-border-strong); background: var(--tg-card); cursor: pointer; font-size: 12px;
}
.tg-open-btn:hover { background: var(--tg-card-hover); }
.tg-more { font-size: 11.5px; color: var(--tg-subtle); padding-top: 4px; }

@media (prefers-reduced-motion: reduce) {
  .tg-root *, .tg-root *::before, .tg-root *::after { transition-duration: 0ms !important; }
}
`
