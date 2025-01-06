import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

export function formatDate(date: string | null): string {
  if (!date) return '';
  const [year, month, day] = date.split('-').map(Number);
  // Add one day to the display date
  const displayDate = new Date(year, month - 1, day + 1);
  return displayDate.toISOString().split('T')[0];
}

export function isOverdue(date: string | null): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = date.split('-').map(Number);
  // Don't add a day for overdue check - we want it to match the actual date
  const followUpDate = new Date(year, month - 1, day); 
  return followUpDate <= today;
}