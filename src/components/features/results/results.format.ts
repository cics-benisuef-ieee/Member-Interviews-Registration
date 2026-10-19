/** Formats a queue day (YYYY-MM-DD) as e.g. "12 Oct 2025". */
export function formatQueueDay(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
