# Changelog

All notable changes to `@akita/visual-explorer` are documented here.
The project loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-04-21

First semver-stable release. API is now frozen through the `0.x`
series except for explicitly-noted breaks.

### Added

- **Sequence layout.** Ports algokit-lora's grid math (columns per
  account, rows per transaction, right-angle SVG paths with rounded
  corners) into a plain `Layout` that emits the same `LayoutResult`
  shape as DAG mode.
- **DAG layout** (`dagLayout`, `makeDagLayout`). Feeds verticals +
  Vector horizontals through `@dagrejs/dagre` in multigraph mode, then
  smooths each waypoint polyline to a cubic Bezier via centripetal
  Catmull-Rom. `SelfLoop` and `Point` horizontals bypass dagre and
  synthesize paths from resolved node centers so parallel edges don't
  collapse.
- **Animated active edge.** Two-pass stroke (bloom + base) drives the
  pink-glow effect without relying on SVG `<filter>` (which
  react-native-svg doesn't support on native). Marching-dot animation
  runs entirely on the UI thread via Reanimated 4 shared values; step
  changes only mutate a shared `activeEdgeId`, so the React tree
  doesn't re-render across the edge set.
- **Step controller** (`useStepController`, `<FlowStepper>`). Supports
  controlled (`activeStep` prop) and uncontrolled
  (`defaultActiveStep`) modes. Keyboard arrow-left/right/escape on web;
  on-screen buttons + optional horizontal swipe gesture on native.
- **Pan / zoom / fullscreen** (`useZoomPan`, `<GraphViewport>`,
  `<ZoomToolbar>`). Pinch + wheel + drag on all platforms. Fullscreen
  promotes to a native `<Modal>` on RN and a fixed overlay on web.
- **Web download** (`<DownloadButton>`). Serializes the SVG via
  `XMLSerializer` + `<canvas>.drawImage` and dispatches a `.png`
  download. Web-only; silently ignored on native.
- **Theming.** `ThemeProvider`, `defineTheme`, `useTheme`,
  `akitaDarkTheme`, `akitaLightTheme`. SVG primitives read token values
  directly (className on SVG attrs is unreliable cross-platform);
  non-SVG chrome accepts `className` for NativeWind. Web
  `ThemeProvider` also mounts a `<style>` tag exposing CSS vars so
  forked consumers' existing `--payment` / `--asset-transfer` rules
  keep working.
- **DataProvider.** React-context-based injection for account, asset,
  and application summaries. Resolvers may return a value, a
  `Promise`, or `undefined`. No assumption about the underlying cache
  (React Query, Jotai, SWR, REST — all work).
- **Lora adapter** (`./lora-adapter`). `createLoraDataProvider`
  wraps a Jotai store so algokit-lora forks can reuse their existing
  `accountAtom` / `assetSummaryAtom` / application atoms without
  rewriting resolvers.
- **Tailwind preset.** `tailwind.preset.ts` exports Akita color tokens
  + a safelist for dynamic label classes. Drop into your
  `tailwind.config.js` `presets` array.
- **Expo example** harness under `example/` with three hand-written
  fixtures (simple payment, app-call with inner transfers, clawback
  with close-remainder) and a sequence ↔ dag toggle.

### Decoupling from algokit-lora

Lora's `Label` ADT embedded `AsyncMaybeAtom<AssetSummary>` on several
variants and `Horizontal.transaction` was a lora-specific
`Transaction | InnerTransaction`. Both couplings are removed: labels
now carry a plain `AssetRef = { id }` (resolved lazily through the
DataProvider), and horizontals carry a narrow
`GraphTransactionSummary` with an opaque `original: unknown`
passthrough. The mappers (`verticals.ts`, `horizontals.ts`,
`flatten-inner-transactions.ts`) are ports of lora's originals; the
algorithms are unchanged.

### Peer dependencies

- `react >=18.2`
- `react-native >=0.81` (optional — library also runs on the web via
  `react-native-web >=0.19`)
- `react-native-svg >=15`
- `react-native-reanimated >=4`
- `react-native-gesture-handler >=2.20`
- `nativewind >=4` (optional)

### Known limitations

- `react-native-svg`'s `<filter>` is a no-op on native, so true
  Gaussian-blur glow is web-only; native uses the two-pass stroke
  approach. Both read as "glowing" but the web variant has softer
  falloff.
- `d` attribute on `<Path>` is not animated — layout changes re-mount
  the edge element. This is rare in practice (step changes reuse the
  same edges).
- `@dagrejs/dagre` adds ~180 kB minified. Tree-shakeable but still
  sizeable for a visualization lib. A worker-based layout can be
  added later if groups routinely exceed ~200 nodes.
