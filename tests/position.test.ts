import { describe, expect, test } from "vitest"

import {
  MIN_POSITION_GAP,
  POSITION_STEP,
  needsRebalance,
  positionAtIndex,
  positionBetween,
  positionForDrop,
  rebalancedPositions,
} from "@/lib/tasks/position"

describe("positionBetween", () => {
  test("starts an empty column at the step", () => {
    expect(positionBetween(null, null)).toBe(POSITION_STEP)
  })

  test("goes before the first item", () => {
    expect(positionBetween(null, 500)).toBe(500 - POSITION_STEP)
  })

  test("goes after the last item", () => {
    expect(positionBetween(2000, null)).toBe(2000 + POSITION_STEP)
  })

  test("takes the midpoint between neighbours", () => {
    expect(positionBetween(1000, 2000)).toBe(1500)
  })
})

describe("positionAtIndex", () => {
  const positions = [1000, 2000, 3000]

  test("inserts at the top", () => {
    expect(positionAtIndex(positions, 0)).toBeLessThan(1000)
  })

  test("inserts in the middle", () => {
    expect(positionAtIndex(positions, 1)).toBe(1500)
  })

  test("inserts at the end", () => {
    expect(positionAtIndex(positions, 3)).toBe(4000)
  })

  test("handles an empty column", () => {
    expect(positionAtIndex([], 0)).toBe(POSITION_STEP)
  })
})

describe("rebalancing", () => {
  test("flags gaps below the minimum", () => {
    expect(needsRebalance([1, 1 + MIN_POSITION_GAP / 2])).toBe(true)
    expect(needsRebalance([1000, 2000])).toBe(false)
  })

  test("repeated halving eventually needs a rebalance", () => {
    const low = 1000
    let mid = 2000
    for (let i = 0; i < 60; i += 1) mid = positionBetween(low, mid)
    expect(needsRebalance([low, mid])).toBe(true)
  })

  test("produces evenly spaced ascending positions", () => {
    expect(rebalancedPositions(3)).toEqual([1000, 2000, 3000])
  })
})

describe("positionForDrop", () => {
  // Visible: 1000 and 2000. Hidden by a filter: 1500 and 1750.
  const column = [1000, 1500, 1750, 2000]

  test("lands right after the visible predecessor, before hidden cards", () => {
    const position = positionForDrop(column, 1000, 2000)
    expect(position).toBe(1250)
    expect(column).not.toContain(position)
  })

  test("lands right before the visible successor when dropped at the top", () => {
    expect(positionForDrop(column, null, 1500)).toBe(1250)
    expect(positionForDrop(column, null, 1000)).toBe(0)
  })

  test("appends after every card when the visible column is empty", () => {
    expect(positionForDrop(column, null, null)).toBe(3000)
    expect(positionForDrop([], null, null)).toBe(POSITION_STEP)
  })

  test("appends after the last card when dropped at the visible end", () => {
    expect(positionForDrop(column, 2000, null)).toBe(3000)
  })
})
