export const calcDiffSec = (startDate: Date, endDate: Date): number => {
  const diffMs = endDate.getTime() - startDate.getTime()
  return Math.floor(diffMs / 1000)
}
