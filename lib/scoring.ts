// Scoring rule for a single match. Must match the SQL in supabase/migrations:
// the `get_leaderboard` function reproduces this same logic for ranking.
//
//   3 pts → exact score. A draw counts as exact (e.g. 1-1 vs 1-1).
//   1 pt  → correct outcome but wrong score. The "outcome" is one of:
//             • home wins   (pickHome > pickAway && resultHome > resultAway)
//             • away wins   (pickHome < pickAway && resultHome < resultAway)
//             • draw        (pickHome === pickAway && resultHome === resultAway)
//           Example: predict 3-3, real is 1-1 → 1 pt (got the draw, wrong score).
//                    predict 2-0, real is 3-1 → 1 pt (home win, wrong score).
//   0 pts → wrong outcome (or one is a draw and the other isn't).

export function calcMatchPts(
  pickHome: number,
  pickAway: number,
  resultHome: number,
  resultAway: number
): number {
  if (pickHome === resultHome && pickAway === resultAway) return 3

  const pickOutcome = Math.sign(pickHome - pickAway)
  const resultOutcome = Math.sign(resultHome - resultAway)
  if (pickOutcome === resultOutcome) return 1

  return 0
}
