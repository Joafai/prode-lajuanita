// Dense-rank a leaderboard already ordered by `total_pts DESC, name ASC`.
//
// Rules (set by the user, see /how-to-play):
//   - Equal total_pts → shared position (e.g. two players tied at the top both
//     get rank 1; the next player gets rank 2, not 3).
//   - total_pts === 0 → no rank shown. The UI renders "—" instead of a
//     number so a player who hasn't scored yet doesn't get credit for just
//     having submitted picks.
//
// Returns the same length array. `null` means "render no rank".

export function denseRank<T extends { total_pts: number }>(rows: T[]): (number | null)[] {
  let currentRank = 0
  let lastPts: number | null = null
  return rows.map((r) => {
    if (r.total_pts === 0) return null
    if (r.total_pts !== lastPts) {
      currentRank++
      lastPts = r.total_pts
    }
    return currentRank
  })
}
