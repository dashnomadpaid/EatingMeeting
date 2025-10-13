type TelemetryPayload = Record<string, unknown>;

// Minimal telemetry shim. For now, logs to console.
// Swap implementation later to send to an analytics endpoint.
export function trackEvent(name: string, payload: TelemetryPayload = {}): void {
  try {
    // eslint-disable-next-line no-console
    console.log(`[TELEMETRY] ${name}`, payload);
  } catch {}
}

