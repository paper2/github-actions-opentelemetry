import * as opentelemetry from '@opentelemetry/api'

// Disable opentelemetry global components for test initialization.
export const opentelemetryAllDisable = (): void => {
  opentelemetry.metrics.disable()
  opentelemetry.trace.disable()
  opentelemetry.diag.disable()
  opentelemetry.context.disable()
  opentelemetry.propagation.disable()
}
