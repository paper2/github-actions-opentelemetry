import * as opentelemetry from '@opentelemetry/api'

export const createGauge = (
  name: string,
  value: number,
  attributes: opentelemetry.Attributes,
  option?: opentelemetry.MetricOptions
): void => {
  const meter = opentelemetry.metrics.getMeter('github-actions-metrics')
  const gauge = meter.createObservableGauge(name, option)
  // NOTE: Usually, this callback is called by interval. But in this library, we call it manually last once.
  gauge.addCallback(result => {
    result.observe(value, attributes)
    console.log(`Gauge: ${name} ${value} ${JSON.stringify(attributes)}`)
  })
}
