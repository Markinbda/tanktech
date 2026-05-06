export function computeNextDueDate(startDateISO: string, intervalMonths: number): string {
  const start = new Date(startDateISO);
  const result = new Date(start.getTime());
  result.setMonth(result.getMonth() + intervalMonths);
  return result.toISOString().slice(0, 10);
}
