# Changelog

All notable changes to `@akita-protocol/txn-graph-{core,web,rn}` (published as
`@akta/txn-graph-*` up to 0.2.1) are documented
here. The project loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). All three
packages release together at matched versions.

## Unreleased

### Changed

- The packages moved to the `@akita-protocol` npm scope:
  `@akita-protocol/txn-graph-core`, `@akita-protocol/txn-graph-web` and
  `@akita-protocol/txn-graph-rn`. 0.2.1 is republished under the new names
  unchanged; the `@akta/txn-graph-*` packages are deprecated.

## [0.2.1] — 2026-10-04

### Fixed

- Packages now publish compiled ESM JavaScript (JSX already transformed to
  `react/jsx-runtime`) plus `.d.ts` declarations. 0.2.0 shipped `.tsx`
  source whose automatic-JSX setting lived in the repo's tsconfig, so
  bundlers compiling it from `node_modules` fell back to the classic runtime
  and threw `React is not defined` (seen in Vite 7 + SWC). Consumers no
  longer need to compile the packages at all.

## [0.2.0] — 2026-10-04

First npm release of the redesigned packages.

### Packaging

- `@akta/txn-graph-web` and `@akta/txn-graph-rn` depend on
  `@akta/txn-graph-core` directly (it was a peer), so one install is enough.
- Packages ship TypeScript source for the runtime plus generated `.d.ts`
  declarations as their `types`, so consumers' own `tsc` (including Vite's
  default `erasableSyntaxOnly` setup) never type-checks library source.
- Per-package README and LICENSE.

### Added

- Web render slots: `renderTransactionDetails` (expandable transaction rows
  in the panel) and `renderLink` (route `DataProvider.resolveHref` links
  through a router). Panels link entity, app, group and transaction pages
  when hrefs resolve; `LoraHrefs` gains optional `transaction` / `group`.
- The scope panel lists the scope's outermost transactions (web + RN).
- `animate` prop (web), off by default under `NODE_ENV=test` for
  deterministic DOM snapshots.

### Fixed

- `useResolved` no longer leaks an unhandled rejection when a priming
  lookup fails.

### Changed — breaking: overview redesign

The sequence and DAG renderers are replaced by a single interactive
overview modeled on an architecture map: a high-level view of the whole
group, clickable blocks that open into app internals, and visible typed
connections.

- **New input:** `<TxnGraph transactions={GraphTransaction[]} />` on both
  platforms. `asTransactionsGraphData`, `TransactionsGraph`, the
  horizontals/verticals model, `sequenceLayout`/`dagLayout`,
  `useStepController` and the step-through animation are removed.
  `GraphTransaction` and its variants are unchanged.
- **Blocks:** accounts and apps are ranked top-to-bottom by dagre. Assets
  sit in a separate row, and their links show on hover or selection. App
  escrow addresses resolve onto their app.
- **Connections:** one line per (from, to, kind), with parallel lanes
  between a pair and pair count badges.
  - New kinds: `close`, `clawback`, and `auth` ("signs for": a rekeyed
    signer → sender, which makes ARC-58 plugin flows visible).
  - Legend chips toggle kinds, and an *inner txns* toggle hides everything
    except the scope's outermost transactions.
- **Drill-down:** apps with inner transactions open into a scope made of
  the calls into that app and everything they did. There is a breadcrumb,
  and Esc or Android back goes up.
- **Layout:** long edges thread through dagre's gaps. Asset-bound lines
  detour through clear corridors. Large fan-outs (airdrops, batch payouts)
  pack into a grid.
- **Details panel:** shows the scope, a block, a connection or a pair, with
  counts, methods called, and per-transaction rows (amounts, decoded ABI
  args).
- **Theme:** new `darkTheme` / `lightTheme`, `defineTheme(base, input)`, and
  `colorScheme: 'auto'` by default. Kinds accept a string shorthand for
  their color.
- **`useTxnGraph`:** a platform-neutral controller. `buildTxnGraph`,
  `resolveScope`, `getScopeView`, `layoutScene` and `computeHighlight` are
  exported for custom renderers.
- **Web:** the component ships scoped CSS, so Tailwind and the
  `tailwind.preset` export are no longer needed. Wheel pans, ctrl/⌘ + wheel
  zooms, and the panel moves under the graph below 820px.
- **React Native:** nativewind and clsx are dropped. Tap to select, tap again
  (or `›`) to open. Pan and pinch run on the UI thread.
- **Examples:** `examples/web` (Vite) and `examples/native` (Expo SDK 54),
  sharing `examples/fixtures`. The Expo app's Metro config pins the native
  singletons so pnpm's isolated installs don't bundle two `react-native`
  copies.

### Added

- **ARC-56 decoded-method display on app-call edges.** `AppCallGraphTransaction`
  grows an optional `method?: DecodedAbiMethod` field — consumers decode an
  app call against its ARC-56 spec with their own tooling (`algosdk` ABI codec
  + a cached spec) and attach the result. When set, the edge badge shows
  `method.name` (e.g. `"swap"`) in place of the generic `"app call"` /
  `"app create"` / `"app update"` text. The categorical pill color still
  encodes the sub-type, so replacing the word doesn't lose that signal.
  Richer fields (`signature`, `args`, `returnValue`, `description`) sit on
  the same object for consumer tooltip / horizontal-title renderers. The
  library itself does no decoding — this preserves the core's zero-SDK
  boundary. New types `DecodedAbiMethod` and `DecodedAbiArg` are re-exported
  from both `@akta/txn-graph-web` and `@akta/txn-graph-rn`.

## [0.1.0] — 2026-04-21

First semver-stable release. API is now frozen through the `0.x`
series except for explicitly-noted breaks.

### Architecture

Single-repo, three source-only packages in a pnpm-workspaces monorepo:

- **`@akta/txn-graph-core`** — platform-neutral core: models, mappers,
  layouts (sequence + DAG), bezier helpers, theme tokens + `ThemeContext`,
  `DataProvider`, `useStepController`, lora-adapter, utilities. Pure
  TypeScript + pure React. Zero platform dependencies. Safe to import
  from Node.js tests, Next.js SSR, React Native, and browser bundles.
- **`@akta/txn-graph-web`** — web renderer. DOM `<svg>` + Motion
  (`motion/react`) for animation + native Pointer Events for pan / zoom
  + ResizeObserver for auto-fit. Zero React Native footprint. Re-exports
  the full core surface so web consumers install one package.
- **`@akta/txn-graph-rn`** — React Native renderer. `react-native-svg`
  + Reanimated 4 + `react-native-gesture-handler`. Re-exports the full
  core surface so RN consumers install one package. Ships a `<Modal>`
  for fullscreen.

Both renderer packages peer-depend on `@akta/txn-graph-core`, which is
auto-installed by pnpm/npm/yarn.

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
- **Animated active edge.**
  - **Web (`-web`)** — Motion `MotionValue`s drive `strokeOpacity`,
    `strokeDashoffset`, and the two-pass halo opacity. One
    `MotionValue<string | null>` broadcasts the active edge id across
    the primitive tree so step changes mutate shared values only — no
    React re-render across the edge set.
  - **Native (`-rn`)** — Reanimated 4 shared values drive the same
    attributes on the UI thread. Identical visual output without SVG
    `<filter>` (which `react-native-svg` doesn't support).
- **Step controller** (`useStepController`, `<FlowStepper>`). Supports
  controlled (`activeStep` prop) and uncontrolled
  (`defaultActiveStep`) modes. Keyboard arrow-left / right / home /
  end on web; on-screen buttons + optional horizontal swipe gesture on
  native.
- **Pan / zoom / fullscreen** (`useZoomPan`, `<GraphViewport>`,
  `<ZoomToolbar>`).
  - Web: native Pointer Events with a `Map<pointerId, {x,y}>` for
    multi-touch pinch; `wheel` for mouse zoom; ResizeObserver for
    viewport measurement. Fullscreen promotes to a fixed overlay.
  - Native: `Gesture.Pinch` + `Gesture.Pan` from gesture-handler.
    Fullscreen promotes to a `<Modal>`.
- **Web download** (`<DownloadButton>`). Serializes the SVG via
  `XMLSerializer` + `<canvas>.drawImage` and dispatches a `.png`
  download. Web-only.
- **Theming.** `ThemeProvider`, `defineTheme`, `useTheme`,
  `akitaDarkTheme`, `defaultTheme`. SVG primitives read token values
  directly (className on SVG attrs is unreliable cross-platform);
  non-SVG chrome accepts `className` for Tailwind / NativeWind. Web
  `ThemeProvider` also mounts a scoped `<style>` tag exposing CSS vars
  so forked consumers' existing `--payment` / `--asset-transfer` rules
  keep working. `skipCssVars` opts out.
- **DataProvider.** React-context-based injection for account, asset,
  and application summaries. Resolvers may return a value, a
  `Promise`, or `undefined`. No assumption about the underlying cache
  (React Query, Jotai, SWR, REST — all work).
- **Lora adapter** (`@akta/txn-graph-core/lora-adapter`).
  `createLoraDataProvider` accepts plain resolver functions
  (`getAccountResult`, `getAssetSummary`, `getApplicationSummary`,
  optional `hrefs`) and normalizes algokit-lora's native shapes into
  the core's `AccountSummary` / `AssetSummary` / `ApplicationSummary`.
  No runtime Jotai dependency — the consumer wires `store.get(atom(...))`
  inside each resolver.
- **Tailwind preset.** `@akta/txn-graph-core/tailwind.preset` exports
  Akita color tokens + a safelist for dynamic label classes. Drop into
  your `tailwind.config.js` `presets` array.

### Decoupling from algokit-lora

Lora's `Label` ADT embedded `AsyncMaybeAtom<AssetSummary>` on several
variants and `Horizontal.transaction` was a lora-specific
`Transaction | InnerTransaction`. Both couplings are removed: labels
now carry a plain `AssetRef = { id }` (resolved lazily through the
DataProvider), and horizontals carry a narrow `GraphTransaction` with
an opaque `original: unknown` passthrough. The mappers
(`verticals.ts`, `horizontals.ts`, `flatten-inner-transactions.ts`)
are ports of lora's originals; the algorithms are unchanged.

### Peer dependencies

**`@akta/txn-graph-web`:**
- `@akta/txn-graph-core` (workspace peer)
- `react >=18.2`
- `react-dom >=18.2`
- `motion >=12.0.0`
- `clsx >=2.0.0` (optional)

**`@akta/txn-graph-rn`:**
- `@akta/txn-graph-core` (workspace peer)
- `react >=18.2`
- `react-native >=0.81`
- `react-native-svg >=15`
- `react-native-reanimated >=4`
- `react-native-gesture-handler >=2.20`
- `nativewind >=4` (optional)
- `clsx >=2.0.0` (optional)

**`@akta/txn-graph-core`:**
- `react >=18.2`
- `@dagrejs/dagre ^1.1.4` (bundled dependency)

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

### Migration from `@akita/visual-explorer@0.0.x`

The previous single-package canary (`@akita/visual-explorer`) is
replaced by the three-package split above. To migrate:

1. Replace the single install with a renderer + peers:
   ```diff
   - pnpm add @akita/visual-explorer react-native-svg react-native-reanimated react-native-gesture-handler react-native-web
   + # web:
   + pnpm add @akta/txn-graph-web motion
   + # native:
   + pnpm add @akta/txn-graph-rn react-native-svg react-native-reanimated react-native-gesture-handler
   ```
2. Rename imports:
   ```diff
   - import { TransactionsGraph } from '@akita/visual-explorer'
   + import { TransactionsGraph } from '@akta/txn-graph-web'     // or '-rn'
   ```
3. Remove the `react-native-web` alias from your Vite / Webpack config —
   the web package is native DOM and no longer needs it.
4. Tailwind preset path:
   ```diff
   - presets: [require('@akita/visual-explorer/tailwind.preset')]
   + presets: [require('@akta/txn-graph-core/tailwind.preset')]
   ```
5. The component API (`GraphProps`) is unchanged except that `style`
   is now typed to the platform-appropriate shape
   (`React.CSSProperties` on web, `StyleProp<ViewStyle>` on RN).
