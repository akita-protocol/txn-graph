/**
 * Three hand-written fixture groups to exercise the layout + renderer.
 *
 * 1. simple-payment — two-participant ALGO transfer
 * 2. app-call      — app call with inner asset-transfer + payment
 * 3. clawback      — asset-transfer with clawback sender + close remainder
 */

import {
  AppCallSubType,
  AssetTransferSubType,
  TransactionType,
  asTransactionsGraphData,
  type GraphTransaction,
  type TransactionsGraphData,
} from '@akita/visual-explorer'

const ALICE = 'ALICE7Y6HLFKJIQ7DOQLSHMTFD34LKCTZFJ4GRDOGAYZL4YWJ4KMUJ3JQEA'
const BOB = 'BOBTPJZ5BDBNTIT7W7WZPSOMXQZLWQYBK44MHZ5W6UGKYX5YZQGFMWVBBM'
const CAROL = 'CAROLYXMA5OM5YYTZKPEKCBXL3DBCAGRRCLGF3JAKGQ7WZBMVYZEIUVFYQ'
const APP_ADDR = 'APP7MYTKZBHQN7TNGHHXDC7Q4RXXDDQE3PSKGENHQFYRQQKABRBANE2PPY'

const USDC_ID = 31566704n
const GALGO_ID = 2320804n
const SAMPLE_APP_ID = 1234567n

const basePaymentTxns: GraphTransaction[] = [
  {
    id: 'PAY-1',
    type: TransactionType.Payment,
    sender: ALICE,
    receiver: BOB,
    amount: { microAlgos: 5_200_000n },
    confirmedRound: 12345678n,
    group: 'demo-group',
  },
  {
    id: 'PAY-2',
    type: TransactionType.Payment,
    sender: BOB,
    receiver: CAROL,
    amount: { microAlgos: 1_000_000n },
    confirmedRound: 12345678n,
    group: 'demo-group',
  },
]

const appCallTxns: GraphTransaction[] = [
  {
    id: 'OUTER-1',
    type: TransactionType.Payment,
    sender: ALICE,
    receiver: APP_ADDR,
    amount: { microAlgos: 100_000n },
    confirmedRound: 12345600n,
    group: 'app-demo',
  },
  {
    id: 'OUTER-2',
    type: TransactionType.AppCall,
    sender: ALICE,
    applicationId: SAMPLE_APP_ID,
    applicationAddress: APP_ADDR,
    subType: AppCallSubType.Call,
    confirmedRound: 12345600n,
    group: 'app-demo',
    innerTransactions: [
      {
        id: 'INNER-1',
        type: TransactionType.AssetTransfer,
        sender: APP_ADDR,
        receiver: BOB,
        amount: 250_000_000n,
        asset: { id: USDC_ID },
        subType: AssetTransferSubType.Send,
      },
      {
        id: 'INNER-2',
        type: TransactionType.Payment,
        sender: APP_ADDR,
        receiver: CAROL,
        amount: { microAlgos: 50_000n },
      },
    ],
  },
]

const clawbackTxns: GraphTransaction[] = [
  {
    id: 'CLAW-1',
    type: TransactionType.AssetTransfer,
    sender: ALICE,
    receiver: CAROL,
    clawbackFrom: BOB,
    subType: AssetTransferSubType.Clawback,
    amount: 100_000_000n,
    asset: { id: GALGO_ID },
    closeRemainder: { to: CAROL, amount: 25_000_000n },
    confirmedRound: 12345700n,
    group: 'clawback-demo',
  },
]

export const fixtures: Record<string, TransactionsGraphData> = {
  'simple-payment': asTransactionsGraphData(basePaymentTxns),
  'app-call': asTransactionsGraphData(appCallTxns),
  clawback: asTransactionsGraphData(clawbackTxns),
}

export type FixtureKey = keyof typeof fixtures
