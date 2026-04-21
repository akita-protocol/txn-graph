# Post-publish runbook

Steps to run after `npm publish --otp=<code>` succeeds on
`@akita/visual-explorer@0.1.0`. All are independent of the publish
command itself but should land in order so the dependency graph stays
consistent across repos.

## 0. Verify the publish

```bash
npm view @akita/visual-explorer version
# expect: 0.1.0
```

## 1. Tag + push the library

```bash
cd ~/akita/visual-explorer
git tag -a v0.1.0 -m "v0.1.0" 0ae60c0
git push origin main v0.1.0
```

The local tag was pre-created by the autonomous loop; `git push origin
v0.1.0` publishes it to the remote. If you skipped the auto-tag, run
the full command above.

## 2. Bump lora's pin

`~/akita/lora` currently uses `file:../visual-explorer` during dev.
After publish, pin a real version:

```bash
cd ~/akita/lora
# edit package.json: "@akita/visual-explorer": "^0.1.0"
pnpm install
pnpm check-types
pnpm test   # regenerate snapshots only if you visually inspect the output first
git add package.json pnpm-lock.yaml
git commit -m "akita: pin @akita/visual-explorer@^0.1.0"
```

## 3. Bump algomd-rn's pin

`~/akita/algomd-rn` has `@akita/visual-explorer` as a peer
(`>=0.0.1`) and a devDep (`file:../visual-explorer`). Keep the peer
loose (so consumers can pick any compatible minor); tighten the devDep
to the published range so CI uses the real npm tarball:

```bash
cd ~/akita/algomd-rn
# edit package.json devDependencies: "@akita/visual-explorer": "^0.1.0"
# edit package.json peerDependencies: keep ">=0.0.1" (or tighten to ">=0.1.0")
pnpm install
pnpm run compile
git add package.json pnpm-lock.yaml
git commit -m "algomd-rn: pin @akita/visual-explorer devDep to ^0.1.0"
```

Then bump algomd-rn's own version + publish (optional — only if you
want akita-rn to pick up the new `TransactionsGraph` wrapper):

```bash
npm version patch    # 0.0.5-canary -> 0.0.6-canary (or 0.1.0 for stable)
npm publish --otp=<code>
```

## 4. Bump akita-rn's pin

`~/akita/akita-rn` has `@akita/visual-explorer` as a direct dep via
`file:../visual-explorer`. After publish, switch to the real version:

```bash
cd ~/akita/akita-rn
# edit package.json dependencies: "@akita/visual-explorer": "^0.1.0"
pnpm install
pnpm run compile     # should not add new errors
npx expo export --platform web
npx expo export --platform ios
git add package.json pnpm-lock.yaml
git commit -m "akita: pin @akita/visual-explorer@^0.1.0"
```

Optional: once algomd-rn publishes a version with the
`TransactionsGraph` wrapper (step 3 above), swap the demo screen's
import:

```diff
-import {
-  AppCallSubType,
-  AssetTransferSubType,
-  DataProvider,
-  TransactionType,
-  TransactionsGraph,
-  …
-} from "@akita/visual-explorer"
+import {
+  TransactionsGraph,
+  AppCallSubType,
+  AssetTransferSubType,
+  TransactionType,
+} from "@akta/algomd-rn"
```

The wrapper already injects `DataProvider` internally, so you can also
drop the `<DataProvider>` wrap in the JSX.

## 5. Smoke-test lora in a browser

```bash
cd ~/akita/lora
pnpm dev
# navigate to any transaction-group page, verify:
#   - sequence layout renders identically to pre-migration
#   - step-through works (keyboard left/right)
#   - tooltips still open on hover/click
#   - download-as-PNG still produces a valid file
```

## 6. Done

At this point:

- `@akita/visual-explorer@0.1.0` is live on npm
- `v0.1.0` tag on the library repo
- All three downstream consumers (lora, algomd-rn, akita-rn) pin
  the published range
- Fork migration doc (`docs/MIGRATING_TO_VISUAL_EXPLORER.md` in the
  lora fork) is already committed on `akita-main`

Roll into whatever comes next — M4 tuning pass, Playwright visual
regression, or feature work.
