# @akta/txn-graph-web

Interactive overview of an Algorand transaction group for React on the web.
Accounts and apps are blocks, every transaction is a typed, color-coded
connection, and assets sit in their own row. Click an app with inner
transactions to open it; Esc goes back up. A details panel shows the group, a
block, or a connection.

```bash
npm install @akta/txn-graph-web motion react react-dom
```

```tsx
import { TxnGraph, type DataProviderApi } from '@akta/txn-graph-web'

const dataProvider: DataProviderApi = {
  getAccountSummary: (address) => ({ address }),
  getAssetSummary: (id) => ({ id, decimals: 6, unitName: 'USDC' }),
  getApplicationSummary: (id) => ({ id }),
}

<TxnGraph transactions={transactions} dataProvider={dataProvider} height={680} />
```

`transactions` is a `GraphTransaction[]` (plain data; inner transactions
nested on app calls). The component ships its own scoped CSS, so it needs no
Tailwind or CSS pipeline. Useful props: `colorScheme` (`'auto'` by default),
`theme`, `renderTransactionDetails` (expandable rows in the panel),
`renderLink` (route `DataProvider.resolveHref` links through your router),
`initialScopePath`, `onScopeChange`, `onSelectionChange`.

Everything from `@akta/txn-graph-core` is re-exported, including the
`useTxnGraph` controller for custom renderers.

MIT licensed.
