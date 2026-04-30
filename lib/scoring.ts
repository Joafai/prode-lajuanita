export function calcMatchPts(
  pickHome: number,
  pickAway: number,
  resultHome: number,
  resultAway: number
): number {
  if (pickHome === resultHome && pickAway === resultAway) return 3
  if (Math.sign(pickHome - pickAway) === Math.sign(resultHome - resultAway)) return 1
  return 0
}
