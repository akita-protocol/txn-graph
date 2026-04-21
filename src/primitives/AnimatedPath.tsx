import { Path } from 'react-native-svg'
import Animated from 'react-native-reanimated'

/**
 * Reanimated-friendly wrapper around react-native-svg's `<Path>`. Lets
 * `useAnimatedProps` mutate `strokeDashoffset`, `strokeOpacity`, `strokeWidth`,
 * and `stroke` on the UI thread.
 *
 * The `d` attr is not animated — on layout changes we re-mount, which Metro
 * and react-native-svg handle cheaply.
 */
export const AnimatedPath = Animated.createAnimatedComponent(Path)
export default AnimatedPath
