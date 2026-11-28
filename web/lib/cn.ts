import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export { EASE_OUT_CRAFT } from './motion';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0';
