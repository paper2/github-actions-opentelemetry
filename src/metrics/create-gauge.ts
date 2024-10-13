import * as opentelemetry from '@opentelemetry/api'

export const createGauge = (
  name: string,
  value: number,
  attributes: opentelemetry.Attributes,
  option?: opentelemetry.MetricOptions
): void => {
  // TODO: Examplarsの活用できないか検討
  // FYI: https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars
  const meter = opentelemetry.metrics.getMeter('github-actions-metrics')

  const gauge = meter.createGauge(name, option)
  gauge.record(value, attributes)
}
