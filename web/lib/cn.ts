import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Emil Kowalski ease-out curve for crisp, physical UI entrances (150ms–220ms).
 */
export const EASE_OUT_CRAFT = [0.23, 1, 0.32, 1] as const;

export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0';
