import clsx, { type ClassValue } from 'clsx'

/**
 * Thin clsx wrapper so we always have a consistent `cn(…)` entry point in the
 * library. Keeps the door open for a tailwind-merge pass later.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
