import { defineConfig } from 'tsup'

/**
 * Emits a web-friendly dist bundle for consumers that can't consume our
 * source-only output (e.g. a downstream tool that trips on TS / JSX in
 * node_modules). lora's Vite setup + algomd-rn's Metro setup both read from
 * `src/` directly via the `source` field in package.json, so this build is a
 * backup. Publishing runs `pnpm build` before `pnpm publish` when we need it.
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'models/index': 'src/models/index.ts',
    'mappers/index': 'src/mappers/index.ts',
    'layouts/index': 'src/layouts/index.ts',
    'primitives/index': 'src/primitives/index.ts',
    'theme/index': 'src/theme/index.ts',
    'providers/index': 'src/providers/index.ts',
  },
  format: ['esm'],
  target: 'es2020',
  sourcemap: true,
  dts: true,
  clean: true,
  treeshake: true,
  splitting: false,
  platform: 'neutral',
  external: [
    'react',
    'react-dom',
    'react-native',
    'react-native-web',
    'react-native-svg',
    'react-native-reanimated',
    'react-native-gesture-handler',
    'nativewind',
    'clsx',
    '@dagrejs/dagre',
  ],
})
