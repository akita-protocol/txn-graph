# @akta/txn-graph

Interactive overview of an Algorand transaction group, for the web and React
Native. Accounts and apps are blocks, every transaction is a typed,
color-coded connection, and assets sit in their own row. Click an app with
inner transactions to open it. Esc (or the breadcrumb, or Android back) goes
back up.

| Package                | What it is                                                        |
| ---------------------- | ----------------------------------------------------------------- |
| `@akta/txn-graph-core` | Graph building, drill-down scopes, layout, theme, `useTxnGraph`   |
| `@akta/txn-graph-web`  | `<TxnGraph>` for the web: DOM + SVG + [Motion](https://motion.dev) |
| `@akta/txn-graph-rn`   | `<TxnGraph>` for React Native: react-native-svg + Reanimated + RNGH |

Both renderers re-export the whole core, so you install one package.

## What you see

- **Header:** the scope's title, a one-line summary, and two legend rows.
  - *Connections*: one chip per transaction kind, showing its line style and count. Click a chip to hide or show that kind.
  - *Blocks*: counts by kind, plus an *inner txns* toggle that hides everything except the scope's outermost transactions.
- **Canvas:** blocks are ranked top-to-bottom, and arrows point from sender to receiver.
  - Several kinds between the same two blocks run as parallel lanes. A count badge marks pairs with more than one transaction.
  - Long edges route through the gaps between cards.
  - A large fan-out, like an airdrop or batch payout, is packed into a grid instead of one very wide row.
- **Assets** sit in a row under the graph. Their links to accounts and apps are dotted and only appear while the asset, or something touching it, is hovered or selected.
- **Hover** (web) or **tap** (native) lights up a block's connections and dims everything else.
- **Details panel**: shows the scope by default: counts, transaction types, senders, and methods called. Selecting a block, connection, or count badge switches it to that item's transactions, with amounts and decoded ABI args.
- **Drill-down:** an app block with a `›` has inner transactions. Opening it narrows the view to the calls into that app plus everything they did, recursively. Open as deep as the call tree goes.

### Connection kinds

| Kind       | Meaning                                                                  |
| ---------- | ------------------------------------------------------------------------ |
| `appl`     | app call (sender → app)                                                  |
| `pay`      | payment                                                                  |
| `axfer`    | asset transfer (opt-ins show as self-transfers on the card)              |
| `acfg`     | asset create / reconfigure / destroy (sender → asset)                    |
| `afrz`     | freeze (sender → frozen account)                                         |
| `close`    | close-remainder of a payment or asset transfer                           |
| `clawback` | clawback (from the clawed-back account → receiver)                       |
| `auth`     | *signs for*: a rekeyed signer → the sender it signed for (ARC-58 plugins) |
| `keyreg`, `stpf`, `hb` | self-only; counted on the card                               |

App escrow addresses resolve onto their app, so a payment to an app's
address lands on the app's block.

## Install

Web:

```bash
pnpm add @akta/txn-graph-web motion react react-dom
```

React Native:

```bash
pnpm add @akta/txn-graph-rn react-native-svg react-native-reanimated react-native-gesture-handler
```

## Web

```tsx
import { TxnGraph, type DataProviderApi } from '@akta/txn-graph-web'

const dataProvider: DataProviderApi = {
  getAccountSummary: (address) => ({ address, name: nfdFor(address) }),
  getAssetSummary: (id) => ({ id, decimals: 6, unitName: 'USDC' }),
  getApplicationSummary: (id) => ({ id, name: appNames[String(id)] }),
}

<TxnGraph transactions={transactions} dataProvider={dataProvider} height={680} />
```

The component ships its own scoped CSS, so it needs no Tailwind or CSS
pipeline. Below `narrowBreakpoint` (820px by default) the details panel
moves under the graph. Wheel pans, ctrl/⌘ + wheel (or trackpad pinch) zooms,
drag pans, and the toolbar's percentage button refits.

## React Native

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { TxnGraph } from '@akta/txn-graph-rn'

<GestureHandlerRootView style={{ flex: 1 }}>
  <TxnGraph transactions={transactions} dataProvider={dataProvider} height={440} />
</GestureHandlerRootView>
```

On touch, the selection does the highlighting. Tap a block to light it up.
Tap a highlighted app again, or its `›`, to open it. Pan with one finger,
pinch to zoom.

## Props (both platforms)

| Prop                 | Default               | Notes                                              |
| -------------------- | --------------------- | -------------------------------------------------- |
| `transactions`       | (required)            | `GraphTransaction[]`: the group, inner txns nested |
| `title`              | `'Transaction group'` | Root scope title                                   |
| `colorScheme`        | `'auto'`              | `'dark' \| 'light' \| 'auto'`                      |
| `theme`              | —                     | `ThemeInput`, merged onto the light/dark theme     |
| `height`             | 680 web / flex on RN  | Graph area height (RN: omit to fill `style={{ flex: 1 }}`) |
| `showPanel`          | `true`                | Details panel                                      |
| `dataProvider`       | —                     | Shortcut for wrapping in `<DataProvider>`          |
| `initialScopePath`   | `[]`                  | e.g. `['app:1002']` to open an app on mount        |
| `onScopeChange`      | —                     | `(path: EntityId[]) => void`                       |
| `onSelectionChange`  | —                     | `(focus: Focus \| null) => void`                   |

Theme overrides are deep-partial. A kind given as a string just sets its color:

```tsx
<TxnGraph theme={{ kinds: { pay: '#00f0ff' }, layout: { maxFan: 8 } }} … />
```

## Custom renderers

Everything the components draw comes from one platform-neutral hook:

```ts
const c = useTxnGraph({ transactions })
c.view     // ScopeView: blocks, assets, connections, asset links, counts
c.scene    // SceneLayout: card rects, SVG paths + arrowheads, badge anchors
c.highlight, c.activate(id), c.open(id), c.up(), c.toggleKind(k) …
```

The pure functions behind it (`buildTxnGraph`, `resolveScope`,
`getScopeView`, `layoutScene`, `computeHighlight`) are exported too.

## Lora

`createLoraDataProvider` still adapts lora's resolvers into a
`DataProviderApi`. Map lora's transactions to `GraphTransaction` (plain
data, with `original` as a passthrough) and render `<TxnGraph>`.

## Examples

```bash
pnpm install
pnpm --filter @akta/txn-graph-example-web dev       # Vite, http://localhost:5181
pnpm --filter @akta/txn-graph-example-native start  # Expo (iOS / Android / web)
```

Both examples render the fixtures in `examples/fixtures`: an ARC-58 wallet
plugin swap through a router and two pools (three levels of drill-down), an
asset lifecycle, an airdrop fan-out, a DEX swap and a single payment.
