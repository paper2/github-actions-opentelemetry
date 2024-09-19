import * as opentelemetry from '@opentelemetry/api'

export const createGauge = (
  name: string,
  value: number,
  attributes: opentelemetry.Attributes
): void => {
  const meter = opentelemetry.metrics.getMeter('github-actions-metrics')
  const gauge = meter.createObservableGauge(name)
  // NOTE: Usually, this callback is called by interval. But in this library, we call it manually last once.
  gauge.addCallback(result => {
    result.observe(value, attributes)
    console.log(`Gauge: ${name} ${value} ${JSON.stringify(attributes)}`)
  })
}

// TODO: move to utils.
export const calcDiffSec = (
  targetDateTime: Date,
  compareDateTime: Date
): number => {
  const diffMilliSecond = targetDateTime.getTime() - compareDateTime.getTime()

  return Math.floor(Math.abs(diffMilliSecond / 1000))
}
