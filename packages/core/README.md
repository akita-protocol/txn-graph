# @akita-protocol/txn-graph-core

Platform-neutral core of the Akita transaction graph: turns an Algorand
transaction group (`GraphTransaction[]`) into an interactive, drillable
overview model, and lays it out. Used by `@akita-protocol/txn-graph-web` and
`@akita-protocol/txn-graph-rn`; install one of those unless you are writing your own
renderer.

- `buildTxnGraph`: numbers every transaction (inner ones included), resolves
  app escrow addresses onto their app, and splits transactions into typed
  flows (`appl`, `pay`, `axfer`, `acfg`, `afrz`, `close`, `clawback`, `auth`, …)
- `resolveScope` / `getScopeView`: drill-down scopes (an app's calls plus
  everything they did), blocks, bundled connections, asset links, counts
- `layoutScene`: dagre ranking, parallel lanes, port spreading, corridor
  routing around cards, and grid packing for large fan-outs
- `computeHighlight`, theme tokens (`darkTheme`, `lightTheme`,
  `defineTheme`), `DataProvider`, and the `useTxnGraph` React controller
- `createLoraDataProvider` (from `@akita-protocol/txn-graph-core/lora-adapter`) for
  algokit-lora style resolvers

No DOM or React Native code.

MIT licensed.
