import {
  AppCallSubType,
  AssetConfigSubType,
  AssetTransferSubType,
  TransactionType,
  type AppCallGraphTransaction,
  type DataProviderApi,
  type GraphTransaction,
} from '@akta/txn-graph-core'

// ── Deterministic fake addresses / ids ───────────────────────────────────────

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function addr(seed: string): string {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  let out = seed.toUpperCase().replace(/[^A-Z2-7]/g, '').slice(0, 12)
  while (out.length < 58) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
    out += B32[h % 32]
  }
  return out
}
let txCounter = 0
function txid(): string {
  txCounter += 1
  return addr(`TX${txCounter}`).slice(0, 52)
}

const GROUP = 'gH4f1Yx9Qk0bW2cJmL7pR8sT3uV5zA6dE1nO9iK0yXc='
const base = (sender: string, extra: { signer?: string } = {}) => ({
  id: txid(),
  sender,
  group: GROUP,
  confirmedRound: 48_211_907,
  ...extra,
})

const app = (id: number, name: string) => ({ id, name, address: addr(`APP${name}`) })
const appl = (
  sender: string,
  target: { id: number; address: string },
  method: string,
  inner: GraphTransaction[] = [],
  extra: Partial<AppCallGraphTransaction> & { signer?: string } = {},
): GraphTransaction => ({
  ...base(sender, { signer: extra.signer }),
  type: TransactionType.AppCall,
  subType: AppCallSubType.Call,
  applicationId: target.id,
  applicationAddress: target.address,
  method: method ? { name: method, signature: `${method}()void` } : undefined,
  innerTransactions: inner,
  ...extra,
})
const pay = (sender: string, receiver: string, algos: number, extra: { signer?: string } = {}): GraphTransaction => ({
  ...base(sender, extra),
  type: TransactionType.Payment,
  receiver,
  amount: BigInt(Math.round(algos * 1_000_000)),
})
const axfer = (
  sender: string,
  receiver: string,
  assetId: number,
  units: bigint,
  extra: { signer?: string; subType?: AssetTransferSubType; clawbackFrom?: string; closeTo?: string } = {},
): GraphTransaction => ({
  ...base(sender, { signer: extra.signer }),
  type: TransactionType.AssetTransfer,
  subType: extra.subType ?? AssetTransferSubType.Send,
  receiver,
  amount: units,
  asset: { id: assetId },
  clawbackFrom: extra.clawbackFrom,
  closeRemainder: extra.closeTo ? { to: extra.closeTo, amount: 0n } : undefined,
})

// ── Assets ──────────────────────────────────────────────────────────────────

const USDC = 31566704
const AKTA = 523683256
const GOLD = 777001
const DROP = 880120

export const assets: Record<number, { unitName: string; name: string; decimals: number }> = {
  [USDC]: { unitName: 'USDC', name: 'USDC', decimals: 6 },
  [AKTA]: { unitName: 'AKTA', name: 'Akita Inu', decimals: 6 },
  [GOLD]: { unitName: 'GOLD', name: 'Meld Gold', decimals: 2 },
  [DROP]: { unitName: 'DROP', name: 'Airdrop Token', decimals: 0 },
}

// ── 1. ARC-58 wallet: plugin swap through a router ──────────────────────────

const user = addr('KYLE')
const wallet = app(1001, 'Akita Wallet')
const plugin = app(1002, 'Swap Plugin')
const router = app(1003, 'Haystack Router')
const poolA = app(1004, 'Pool USDC-ALGO')
const poolB = app(1005, 'Pool ALGO-AKTA')
const opup = app(1006, 'OpUp')

function pluginSwap(): GraphTransaction[] {
  return [
    axfer(user, user, AKTA, 0n, { subType: AssetTransferSubType.OptIn }),
    pay(user, wallet.address, 0.3),
    appl(user, wallet, 'arc58_rekeyToPlugin'),
    appl(user, plugin, 'swap', [
      axfer(wallet.address, router.address, USDC, 250_000_000n, { signer: plugin.address }),
      appl(
        wallet.address,
        router,
        'route',
        [
          axfer(router.address, poolA.address, USDC, 250_000_000n),
          appl(router.address, poolA, 'swap', [pay(poolA.address, router.address, 118.42)]),
          pay(router.address, poolB.address, 118.42),
          appl(router.address, poolB, 'swap', [axfer(poolB.address, router.address, AKTA, 4_200_000_000n)]),
          axfer(router.address, wallet.address, AKTA, 4_200_000_000n),
        ],
        { signer: plugin.address },
      ),
      appl(plugin.address, opup, '', [], { isOpUp: true, method: undefined }),
    ]),
    appl(user, wallet, 'arc58_verifyAuthAddress'),
  ]
}

// ── 2. Asset lifecycle ──────────────────────────────────────────────────────

const issuer = addr('MELDISSUER')
const holder = addr('HOLDER')
const treasury = addr('TREASURY')

function assetLifecycle(): GraphTransaction[] {
  return [
    {
      ...base(issuer),
      type: TransactionType.AssetConfig,
      subType: AssetConfigSubType.Create,
      assetId: GOLD,
    },
    axfer(holder, holder, GOLD, 0n, { subType: AssetTransferSubType.OptIn }),
    axfer(issuer, holder, GOLD, 50_000n),
    { ...base(issuer), type: TransactionType.AssetFreeze, address: holder },
    axfer(issuer, treasury, GOLD, 12_500n, { subType: AssetTransferSubType.Clawback, clawbackFrom: holder }),
    axfer(holder, issuer, GOLD, 37_500n, { closeTo: issuer, subType: AssetTransferSubType.OptOut }),
    {
      ...base(issuer),
      type: TransactionType.AssetConfig,
      subType: AssetConfigSubType.Reconfigure,
      assetId: GOLD,
    },
    {
      ...base(treasury),
      type: TransactionType.Payment,
      receiver: issuer,
      amount: 2_000_000n,
      closeRemainder: { to: issuer, amount: 7_812_000n },
    },
  ]
}

// ── 3. Airdrop fan-out ──────────────────────────────────────────────────────

const distributor = addr('DISTRIBUTOR')
const dropApp = app(2001, 'Airdrop')

function airdrop(): GraphTransaction[] {
  const recipients = Array.from({ length: 12 }, (_, i) => addr(`RECIPIENT${i}`))
  return [
    pay(distributor, dropApp.address, 1.2),
    appl(
      distributor,
      dropApp,
      'claimBatch',
      recipients.map((r, i) => axfer(dropApp.address, r, DROP, BigInt(1000 + i * 250))),
    ),
  ]
}

// ── 4. Plain DEX swap ───────────────────────────────────────────────────────

const trader = addr('TRADER')
const tinyPool = app(3001, 'Tinyman USDC-ALGO')

function dexSwap(): GraphTransaction[] {
  return [
    pay(trader, tinyPool.address, 25),
    appl(trader, tinyPool, 'swap', [axfer(tinyPool.address, trader, USDC, 53_118_204n)]),
  ]
}

// ── 5. Single payment ───────────────────────────────────────────────────────

function singlePayment(): GraphTransaction[] {
  return [pay(addr('ALICE'), addr('BOB'), 42)]
}

export type Fixture = { key: string; label: string; transactions: GraphTransaction[] }

export const fixtures: Fixture[] = [
  { key: 'plugin-swap', label: 'Wallet plugin swap', transactions: pluginSwap() },
  { key: 'asset-lifecycle', label: 'Asset lifecycle', transactions: assetLifecycle() },
  { key: 'airdrop', label: 'Airdrop', transactions: airdrop() },
  { key: 'dex-swap', label: 'DEX swap', transactions: dexSwap() },
  { key: 'payment', label: 'Payment', transactions: singlePayment() },
]

const appNames = new Map<number, string>(
  [wallet, plugin, router, poolA, poolB, opup, dropApp, tinyPool].map((a) => [a.id, a.name]),
)
const accountNames = new Map<string, string>([
  [user, 'kyle.algo'],
  [issuer, 'meld.algo'],
  [treasury, 'treasury.meld.algo'],
])

export const mockDataProvider: DataProviderApi = {
  getAccountSummary: (address) => ({ address, name: accountNames.get(address) }),
  getAssetSummary: (id) => ({ id, ...(assets[Number(id)] ?? { decimals: 0 }) }),
  getApplicationSummary: (id) => ({ id, name: appNames.get(Number(id)) }),
}
