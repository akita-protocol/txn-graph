# @akita/visual-explorer

Cross-platform (React web + React Native) animated visualizer for
Algorand transaction groups. Ships two layout modes:

- **`sequence`** — accounts as columns, transactions as rows (preserves
  the [algokit-lora](https://github.com/algorandfoundation/algokit-lora)
  look).
- **`dag`** — nodes ranked by
  [`@dagrejs/dagre`](https://github.com/dagrejs/dagre), edges smoothed
  to cubic Bezier curves, step through transfers one at a time with
  animated marching dots and a pink glow.

One SVG renderer drives both layouts on web (via `react-native-web`),
iOS, and Android. Step-through and zoom / pan work identically in all
three environments.

## Install

```bash
pnpm add @akita/visual-explorer \
  react-native-svg react-native-reanimated react-native-gesture-handler
# web only:
pnpm add react-native-web
```

`react`, `react-dom`, and the native peers (`react-native-svg`,
`react-native-reanimated`, `react-native-gesture-handler`) are all
peer-declared — the library holds no copies of its own.

## Quick start

```tsx
import {
  TransactionsGraph,
  DataProvider,
  asTransactionsGraphData,
  akitaDarkTheme,
  type DataProviderApi,
} from '@akita/visual-explorer'

const dataApi: DataProviderApi = {
  getAccountSummary: (address) => ({ address }),
  getAssetSummary:   (id)      => ({ id, decimals: 6 }),
  getApplicationSummary: (id)  => ({ id }),
}

export function Example({ transactions }) {
  const data = asTransactionsGraphData(transactions)
  return (
    <DataProvider api={dataApi}>
      <TransactionsGraph
        data={data}
        layout="sequence"
        theme={akitaDarkTheme}
        onStepChange={(i, step) => console.log('step', i + 1, step)}
      />
    </DataProvider>
  )
}
```

See `example/` for an Expo dev harness toggling sequence ↔ dag across
three fixtures (simple payment, app-call with inner transactions,
clawback with close-remainder).

## Layout modes

| Prop                | Sequence                 | DAG                            |
| ------------------- | ------------------------ | ------------------------------ |
| Accounts            | columns                  | nodes (dagre-ranked)           |
| Transactions        | rows (top → bottom)      | edges (curved Bezier)          |
| Self-loops          | hand-rolled arc          | hand-rolled arc (dagre bypass) |
| Good for            | single-group timelines   | dense inner-tx graphs          |

Toggle at the prop level:

```tsx
<TransactionsGraph data={data} layout="dag" dagOptions={{
  rankdir:  'LR',
  nodesep:  60,
  ranksep:  140,
}} />
```

`dagOptions` are forwarded to `dagre.Graph.setGraph(…)`; see
`DagLayoutOptions` for the full list (nodesep, ranksep, rankdir,
margins, node sizing, smoothing tension).

## DataProvider

The library is deliberately ignorant of where your account / asset /
application summaries come from. Implement `DataProviderApi` and wrap
the graph in `<DataProvider api={…}>`:

```ts
type DataProviderApi = {
  getAccountSummary(address: string):
    | AccountSummary | Promise<AccountSummary> | undefined
  getAssetSummary(id: bigint | number):
    | AssetSummary   | Promise<AssetSummary>   | undefined
  getApplicationSummary(id: bigint | number):
    | ApplicationSummary | Promise<ApplicationSummary> | undefined
  /** Optional; used for `<a href>` on web so middle-click / right-click
      open the entity in your explorer. */
  resolveHref?(ref: EntityRef): string | null
}
```

Resolvers can return a value synchronously (in-memory cache hit), a
`Promise` (let the graph `await` it), or `undefined` (renders a pill
with just the id/address).

Common consumer shapes:

- **React Query** — wrap `queryClient.fetchQuery` inside the resolvers;
  pick the same `queryKey` shape your app uses so cache lines are
  shared with surrounding components.
- **Jotai** — `store.get(accountAtom(address))` etc. The library ships
  `./lora-adapter` which does exactly this for algokit-lora's atoms.
- **SWR** / **tRPC** / **REST** — anything returning a value or
  `Promise` is fine.

## Theming

```ts
import {
  ThemeProvider,
  akitaDarkTheme,
  akitaLightTheme,
  defineTheme,
  type ThemeTokens,
} from '@akita/visual-explorer/theme'

const myTheme = defineTheme({
  palette: { accent: '#9439e6', accentAlt: '#f35ff2' /* … */ },
})

<ThemeProvider theme={myTheme}>{children}</ThemeProvider>
```

Or pass `theme` directly on the graph (merges over the default):

```tsx
<TransactionsGraph data={data} theme={{ palette: { accent: '#f0a' } }} />
```

Tailwind / NativeWind users can also pull in the color tokens at build
time:

```js
// tailwind.config.js
module.exports = {
  presets: [require('@akita/visual-explorer/tailwind.preset')],
  content: [
    /* your usual globs */,
    './node_modules/@akita/visual-explorer/src/**/*.{ts,tsx}',
  ],
}
```

## Step controller

Step state is controllable or uncontrolled:

```tsx
// uncontrolled:
<TransactionsGraph data={data} defaultActiveStep={0} onStepChange={(i) => …} />

// controlled:
<TransactionsGraph data={data} activeStep={i} onStepChange={(i) => setI(i)} />
```

Or drive the same state manually:

```tsx
import { useStepController } from '@akita/visual-explorer'

const { index, next, prev, goTo, isFirst, isLast } = useStepController({
  total: data.horizontals.length,
})
```

## Public API

Top-level:

- **Components:** `TransactionsGraph`, `GraphViewport`, `FlowStepper`,
  `ZoomToolbar`, `DownloadButton` (web only)
- **Primitives:** `TxEdge`, `TxNode`, `AccountNode`, `AssetBadge`,
  `StepPill`, `AnimatedPath`, `Marker`, `SequenceBackdrop`
- **Hooks:** `useStepController`, `useMarchingDots`, `useZoomPan`,
  `useKeyboardNavigation`, `useTheme`, `useDataProvider`
- **Mappers:** `asTransactionsGraphData`, `flattenInnerTransactions`
- **Layouts:** `sequenceLayout`, `dagLayout`, `makeDagLayout`
- **Theme:** `ThemeProvider`, `akitaDarkTheme`, `akitaLightTheme`,
  `defineTheme`
- **Data:** `DataProvider`
- **Types:** `GraphProps`, `LayoutMode`, `DagLayoutOptions`,
  `ThemeTokens`, `DataProviderApi`, `GraphTransaction`, `Step`, all
  model / summary shapes

Subpath entries (`./models`, `./mappers`, `./layouts`, `./primitives`,
`./theme`, `./lora-adapter`) let you import narrowly without pulling
the whole bundle.

## Lora adapter

For [algokit-lora](https://github.com/algorandfoundation/algokit-lora)
forks, a thin adapter wraps the existing Jotai store as a
`DataProviderApi`:

```ts
import { createLoraDataProvider } from '@akita/visual-explorer/lora-adapter'

<DataProvider api={createLoraDataProvider(jotaiStore, { networkId })}>
  <TransactionsGraph data={data} />
</DataProvider>
```

This is how Akita's lora fork reuses all of lora's existing account /
asset / application atoms without rewriting resolvers.

## Versioning

Starting at `0.1.0`. Semantic until `1.0.0`, at which point the API
locks. Breaking changes between `0.x` minors will be called out in
`CHANGELOG.md`.

## License

MIT © Akita contributors
