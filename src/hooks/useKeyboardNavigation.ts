import { useEffect } from 'react'

export type KeyboardNavigationHandlers = {
  onNext?: () => void
  onPrev?: () => void
  onEscape?: () => void
  onHome?: () => void
  onEnd?: () => void
  /** When false, listeners are not attached. Default: true. */
  enabled?: boolean
  /**
   * Optional predicate. When returns false for a keyboard event, the hook
   * ignores the event. Use this to avoid hijacking arrow keys while the user
   * has an `<input>` focused.
   */
  shouldHandle?: (event: KeyboardEvent) => boolean
}

/**
 * Web implementation — attaches a document-level keydown listener and routes
 * ArrowLeft / ArrowRight / Escape / Home / End to the provided handlers.
 *
 * The native variant (`.native.ts`) is a no-op so RN bundlers pick it up and
 * avoid referencing the `document` global.
 */
export function useKeyboardNavigation(handlers: KeyboardNavigationHandlers): void {
  const { onNext, onPrev, onEscape, onHome, onEnd, enabled = true, shouldHandle } = handlers

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldHandle && !shouldHandle(event)) return
      const target = event.target as HTMLElement | null
      if (isEditable(target)) return

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          if (onNext) {
            event.preventDefault()
            onNext()
          }
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          if (onPrev) {
            event.preventDefault()
            onPrev()
          }
          break
        case 'Escape':
          if (onEscape) {
            event.preventDefault()
            onEscape()
          }
          break
        case 'Home':
          if (onHome) {
            event.preventDefault()
            onHome()
          }
          break
        case 'End':
          if (onEnd) {
            event.preventDefault()
            onEnd()
          }
          break
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled, onEnd, onEscape, onHome, onNext, onPrev, shouldHandle])
}

function isEditable(el: HTMLElement | null): boolean {
  if (!el) return false
  const tag = el.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (el.isContentEditable) return true
  return false
}
