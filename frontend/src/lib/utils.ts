import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function round(value: number) {
  return Number.isInteger(value) ? value : Math.round(value * 10) / 10
}
