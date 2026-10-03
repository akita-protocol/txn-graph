// pnpm's isolated installs give the workspace packages their own copies of
// react-native & friends (different peer hashes), and two copies of
// react-native in one bundle crash at startup. Resolve the native
// singletons from this app no matter who imports them.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

const SINGLETONS = [
  'react',
  'react-dom',
  'react-native',
  'react-native-web',
  'react-native-svg',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'react-native-worklets',
  'react-native-safe-area-context',
]
const appOrigin = path.join(__dirname, 'index.ts')
const upstream = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstream ?? context.resolveRequest
  if (SINGLETONS.some((name) => moduleName === name || moduleName.startsWith(`${name}/`))) {
    return resolve({ ...context, originModulePath: appOrigin }, moduleName, platform)
  }
  return resolve(context, moduleName, platform)
}

module.exports = config
