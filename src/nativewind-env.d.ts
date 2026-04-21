/// <reference types="nativewind/types" />

/**
 * Augments React Native's built-in component props with `className` so every
 * consumer (and the library itself) can pass Tailwind / NativeWind class
 * strings to `View`, `Text`, `Pressable`, `Animated.View`, etc.
 *
 * NativeWind itself ships the module augmentation via
 * `react-native-css-interop/types` — this file just hoists that reference
 * into the project's type graph so both library + downstream consumers see
 * it.
 */
