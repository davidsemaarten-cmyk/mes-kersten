import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate plate area in m² from width and length in mm.
 * Returns a string with 3 decimal places.
 */
export function calculatePlateArea(width: number, length: number): string {
  return (width * length / 1_000_000).toFixed(3)
}
