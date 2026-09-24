/** Gap used when appending to either end of a column or starting an empty one. */
export const POSITION_STEP = 1000
/** Below this gap, midpoints lose precision and the column should be renumbered. */
export const MIN_POSITION_GAP = 1e-6

/** A position strictly between two neighbours (either may be missing). */
export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return POSITION_STEP
  if (before === null) return (after as number) - POSITION_STEP
  if (after === null) return before + POSITION_STEP
  return (before + after) / 2
}

/** Position for the item at `index` of an ordered list that already excludes it. */
export function positionAtIndex(orderedPositions: readonly number[], index: number): number {
  const before = index > 0 ? orderedPositions[index - 1] : null
  const after = index < orderedPositions.length ? orderedPositions[index] : null
  return positionBetween(before ?? null, after ?? null)
}

export function needsRebalance(orderedPositions: readonly number[]): boolean {
  return orderedPositions.some(
    (position, i) => i > 0 && position - orderedPositions[i - 1] < MIN_POSITION_GAP
  )
}

/** Evenly spaced positions for `count` items, preserving order. */
export function rebalancedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_STEP)
}

/**
 * Position for a card dropped between two visible neighbours when the column
 * may also hold cards hidden by filters. The card lands directly after its
 * visible predecessor (or directly before its visible successor), measured
 * against every position in the column, so it never ties with a hidden card.
 *
 * `columnPositions` is the full column, sorted, excluding the moved card.
 */
export function positionForDrop(
  columnPositions: readonly number[],
  before: number | null,
  after: number | null
): number {
  if (before !== null) {
    const next = columnPositions.find((position) => position > before) ?? null
    return positionBetween(before, next)
  }
  if (after !== null) {
    const previous = [...columnPositions].reverse().find((position) => position < after) ?? null
    return positionBetween(previous, after)
  }
  return positionBetween(columnPositions.at(-1) ?? null, null)
}
