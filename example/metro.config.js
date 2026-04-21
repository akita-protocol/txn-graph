/* eslint-env node */
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')
const librarySrc = path.resolve(workspaceRoot, 'src')

const config = getDefaultConfig(projectRoot)

// Watch the library's `src/` so Fast Refresh fires when you edit it.
config.watchFolders = [workspaceRoot]

// Allow the example to pull in the library's own `node_modules` (peer deps).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// `file:../visual-explorer` installs a pnpm-store copy; aliasing the library
// to its real `src/` makes Metro rebuild on every library file edit (Fast
// Refresh) rather than the stale snapshot.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@akita/visual-explorer': librarySrc,
}
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@akita/visual-explorer') {
    return { filePath: path.join(librarySrc, 'index.ts'), type: 'sourceFile' }
  }
  if (moduleName.startsWith('@akita/visual-explorer/')) {
    const subPath = moduleName.slice('@akita/visual-explorer/'.length)
    return {
      filePath: path.join(librarySrc, subPath + (subPath.endsWith('.ts') ? '' : '.ts')),
      type: 'sourceFile',
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

// Single-instance resolution of shared peer deps — prevents duplicate copies
// of Reanimated / SVG from crashing the UI thread.
config.resolver.disableHierarchicalLookup = false

module.exports = withNativeWind(config, { input: './global.css' })
