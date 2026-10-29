// Share of passed lessons as a percentage with 2 decimals; 0 for an
// empty course.
export function progressPercent(passed: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((passed / total) * 10_000) / 100;
}
