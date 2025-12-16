import { type SensorData, getStatusColor, getStatusLabel } from "@/types/sensor"

interface SummaryBarProps {
  data: SensorData
  isStabilizing?: boolean
}

export function SummaryBar({ data, isStabilizing = false }: SummaryBarProps) {
  const hasValidTemp = Number.isFinite(data.temperature_c)
  const hasValidHr = Number.isFinite(data.heart_rate_bpm) && data.heart_rate_bpm > 0
  const hasValidSpo2 = Number.isFinite(data.spo2_pct) && data.spo2_pct > 0
  const isZeroReadings = (data.heart_rate_bpm === 0) || (data.spo2_pct === 0)
  const safeTemp = hasValidTemp ? `${data.temperature_c.toFixed(1)}°C` : "Waiting..."
  const safeHr = hasValidHr ? Math.round(data.heart_rate_bpm).toString() : "Waiting..."
  const safeSpo2 = hasValidSpo2 ? `${Math.round(data.spo2_pct)}%` : "Waiting..."
  const batteryPct = Number.isFinite(data.battery_mv)
    ? `${Math.round((data.battery_mv / 1000) * 100)}%`
    : "—"
  const batteryMv = Number.isFinite(data.battery_mv) ? `${data.battery_mv}mV` : "—"

  const statusColor = isZeroReadings
    ? "bg-amber-500 text-black"
    : hasValidHr && hasValidSpo2 && hasValidTemp
      ? getStatusColor(data)
      : "bg-muted text-foreground"

  const statusLabel = isZeroReadings
    ? "Press on the sensor for 30 sec"
    : isStabilizing
      ? "Stabilizing"
      : hasValidHr && hasValidSpo2 && hasValidTemp
        ? getStatusLabel(data)
        : "Awaiting sensor"

  return (
    <div className="bg-card border-b border-border px-4 md:px-6 py-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground font-medium">TEMPERATURE</p>
          <p className="text-3xl font-bold text-foreground">{safeTemp}</p>
          <p className="text-xs text-muted-foreground">Body Temp</p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground font-medium">HEART RATE</p>
          <p className="text-3xl font-bold text-[#FF6B6B]">{safeHr}</p>
          <p className="text-xs text-muted-foreground">bpm</p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground font-medium">SpO₂</p>
          <p className="text-3xl font-bold text-[#4ECDC4]">{safeSpo2}</p>
          <p className="text-xs text-muted-foreground">Oxygen</p>
        </div>

        {/* <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground font-medium">BATTERY</p>
          <p className="text-3xl font-bold text-[#FFD93D]">{batteryPct}</p>
          <p className="text-xs text-muted-foreground">{batteryMv}</p>
        </div> */}

        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground font-medium">STATUS</p>
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
            {statusLabel}
          </div>
          <p className="text-xs text-muted-foreground">Last: {new Date(data.timestamp).toLocaleTimeString()}</p>
          {(isStabilizing || isZeroReadings) && (
            <p className="text-xs text-amber-500 font-medium">Place your finger on the sensor for ~30s to stabilize readings.</p>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        <p>Tip: Hold your finger on the SpO₂/heart-rate sensor for ~30 seconds until readings stabilize.</p>
      </div>
    </div>
  )
}
