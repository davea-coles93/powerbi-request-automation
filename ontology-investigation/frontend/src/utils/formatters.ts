/**
 * Format a duration in minutes to a human-readable string.
 *
 * Examples: 45 → "45m", 90 → "1h 30m", 120 → "2h", undefined → "-"
 */
export function formatDuration(minutes: number | undefined | null): string {
  if (minutes == null || minutes === 0) return '-';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/**
 * Compact duration format for graph edge labels.
 *
 * Examples: 45 → "45m", 90 → "1.5h", 120 → "2.0h"
 */
export function formatDurationCompact(minutes: number): string {
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${Math.round(minutes)}m`;
}

/**
 * Effort severity: background color class (Tailwind).
 * >70% = red, 30-70% = amber, <30% = green.
 */
export function getEffortColor(pct: number): string {
  if (pct > 70) return 'bg-red-500';
  if (pct >= 30) return 'bg-amber-500';
  return 'bg-emerald-500';
}

/**
 * Effort severity: text color class (Tailwind).
 */
export function getEffortTextColor(pct: number): string {
  if (pct > 70) return 'text-red-600';
  if (pct >= 30) return 'text-amber-600';
  return 'text-emerald-600';
}
