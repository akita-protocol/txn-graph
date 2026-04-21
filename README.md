# @akita/visual-explorer

Cross-platform (React web + React Native) animated visualizer for Algorand transaction groups. Ships two layout modes:

- `sequence` — accounts as columns, transactions as rows (preserves the [algokit-lora](https://github.com/algorandfoundation/algokit-lora) look).
- `dag` — DAG-laid-out nodes with curved Bezier edges; step through transfers one at a time with animated marching dots and a pink glow.

Built on `react-native-svg` + `react-native-reanimated@4` so one codebase renders on web (via `react-native-web`), iOS, and Android.

## Install

```bash
pnpm add @akita/visual-explorer react-native-svg react-native-reanimated react-native-gesture-handler
# web only:
pnpm add react-native-web
```

## Quick start

```tsx
import {
  TransactionsGraph,
  DataProvider,
  asTransactionsGraphData,
  akitaDarkTheme,
} from '@akita/visual-explorer'

export function Example({ transactions, dataApi }) {
  const data = asTransactionsGraphData(transactions)
  return (
    <DataProvider api={dataApi}>
      <TransactionsGraph
        data={data}
        layout="sequence"
        theme={akitaDarkTheme}
        onStepChange={(i, meta) => console.log('step', i, 'of', meta.total)}
      />
    </DataProvider>
  )
}
```

See `example/` for an Expo dev harness demonstrating both layouts.

## Status

Canary. API may shift before `0.1.0`.
