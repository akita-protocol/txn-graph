/**
 * React Native variant — no-op. The real implementation lives in
 * `useKeyboardNavigation.ts`; Metro picks this `.native.ts` file automatically
 * when bundling for iOS / Android / Expo-tvOS so we don't reference the
 * `document` global on native.
 */

export type KeyboardNavigationHandlers = {
  onNext?: () => void
  onPrev?: () => void
  onEscape?: () => void
  onHome?: () => void
  onEnd?: () => void
  enabled?: boolean
  shouldHandle?: (event: unknown) => boolean
}

export function useKeyboardNavigation(_handlers: KeyboardNavigationHandlers): void {
  // Intentionally empty: RN has no document-level keyboard, so on-screen
  // buttons in <FlowStepper> handle navigation instead.
}
