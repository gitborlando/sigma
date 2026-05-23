import { twMerge } from 'tailwind-merge'

export function cn(...inputs: (string | undefined)[]) {
  return twMerge(cx(...inputs))
}
