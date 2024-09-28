export const calcDiffSec = (d1: Date, d2: Date): number => {
  const diffMilliSecond = d1.getTime() - d2.getTime()

  return Math.floor(Math.abs(diffMilliSecond / 1000))
}
