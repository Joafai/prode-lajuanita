// Dense-rank a leaderboard already ordered by `total_pts DESC, exact_count DESC, name ASC`.
//
// Rules (set by the user, see /how-to-play):
//   - Ties on total_pts are broken by `exact_count` — the player with more
//     exact-score predictions ranks higher. Only a tie on BOTH total_pts AND
//     exact_count produces a shared position.
//   - total_pts === 0 → no rank shown. The UI renders "—" instead of a
//     number so a player who hasn't scored yet doesn't get credit for just
//     having submitted picks.
//
// Returns the same length array. `null` means "render no rank".

export function denseRank<T extends { total_pts: number; exact_count?: number }>(
  rows: T[]
): (number | null)[] {
  let currentRank = 0
  let lastPts: number | null = null
  let lastExact: number | null = null
  return rows.map((r) => {
    if (r.total_pts === 0) return null
    const exact = r.exact_count ?? 0
    if (r.total_pts !== lastPts || exact !== lastExact) {
      currentRank++
      lastPts = r.total_pts
      lastExact = exact
    }
    return currentRank
  })
}
