# @akta/txn-graph-rn

Interactive overview of an Algorand transaction group for React Native
(iOS, Android, and react-native-web). Accounts and apps are blocks, every
transaction is a typed, color-coded connection, and assets sit in their own
row. Tap a block to highlight it; tap an app with inner transactions again
(or its `›`) to open it. Pan with one finger, pinch to zoom.

```bash
npm install @akta/txn-graph-rn react-native-svg react-native-reanimated react-native-gesture-handler
```

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { TxnGraph } from '@akta/txn-graph-rn'

<GestureHandlerRootView style={{ flex: 1 }}>
  <TxnGraph transactions={transactions} dataProvider={dataProvider} style={{ flex: 1 }} />
</GestureHandlerRootView>
```

Omit `height` to let the canvas fill the root (`style={{ flex: 1 }}`), or pass
a number. The details panel sits under the graph (`panelMaxHeight`, default
260), and the Android back button clears the selection, then climbs out of
opened apps.

Everything from `@akta/txn-graph-core` is re-exported, including the
`useTxnGraph` controller for custom renderers.

## Monorepos

With pnpm's isolated installs,
make sure `react-native` and its native peers resolve to a single copy (two
copies of `react-native` in one bundle crash at startup); see
`examples/native/metro.config.js` in the repository for a resolver that pins
them.

MIT licensed.
