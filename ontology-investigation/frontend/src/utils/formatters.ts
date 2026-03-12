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
