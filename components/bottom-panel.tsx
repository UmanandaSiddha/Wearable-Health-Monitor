"use client"

import { useState } from "react"
import type { SensorData } from "@/types/sensor"
import { ChevronDown } from "lucide-react"

interface Thresholds {
  hr_high: number
  hr_low: number
  spo2_threshold: number
  temp_high: number
  temp_low: number
}

interface BottomPanelProps {
  data: SensorData
  history: SensorData[]
  thresholds: Thresholds
  onThresholdsChange: (thresholds: Thresholds) => void
}

export function BottomPanel({ data, history, thresholds, onThresholdsChange }: BottomPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [timeRange, setTimeRange] = useState("1h")
  const [settingsMode, setSettingsMode] = useState(false)

  const handleExportCSV = () => {
    const csv = [
      ["Timestamp", "Temperature (°C)", "Heart Rate (bpm)", "SpO₂ (%)", "Battery (mV)"],
      ...history.map((d) => [
        d.timestamp,
        d.temperature_c.toFixed(2),
        d.heart_rate_bpm.toFixed(1),
        d.spo2_pct.toFixed(1),
        d.battery_mv,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `health-data-${new Date().toISOString()}.csv`
    a.click()
  }

  return (
    <div className="bg-card border-t border-border px-4 md:px-6 py-4">
      <div className="max-w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">
            {settingsMode ? "Alert Thresholds" : "Controls & Data"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsMode(!settingsMode)}
              className="text-xs text-accent hover:text-accent/80 font-medium"
            >
              {settingsMode ? "Back to Controls" : "Edit Thresholds"}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {settingsMode ? (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-2">HR High (bpm)</label>
                <input
                  type="number"
                  value={thresholds.hr_high}
                  onChange={(e) => onThresholdsChange({ ...thresholds, hr_high: Number.parseInt(e.target.value) })}
                  className="w-full px-2 py-1 bg-border text-foreground text-sm rounded border border-border"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">HR Low (bpm)</label>
                <input
                  type="number"
                  value={thresholds.hr_low}
                  onChange={(e) => onThresholdsChange({ ...thresholds, hr_low: Number.parseInt(e.target.value) })}
                  className="w-full px-2 py-1 bg-border text-foreground text-sm rounded border border-border"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">SpO₂ Min (%)</label>
                <input
                  type="number"
                  value={thresholds.spo2_threshold}
                  onChange={(e) =>
                    onThresholdsChange({ ...thresholds, spo2_threshold: Number.parseFloat(e.target.value) })
                  }
                  className="w-full px-2 py-1 bg-border text-foreground text-sm rounded border border-border"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Temp High (°C)</label>
                <input
                  type="number"
                  value={thresholds.temp_high}
                  onChange={(e) => onThresholdsChange({ ...thresholds, temp_high: Number.parseFloat(e.target.value) })}
                  className="w-full px-2 py-1 bg-border text-foreground text-sm rounded border border-border"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Temp Low (°C)</label>
                <input
                  type="number"
                  value={thresholds.temp_low}
                  onChange={(e) => onThresholdsChange({ ...thresholds, temp_low: Number.parseFloat(e.target.value) })}
                  className="w-full px-2 py-1 bg-border text-foreground text-sm rounded border border-border"
                  step="0.1"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Adjust thresholds to trigger alerts when vital signs fall outside normal ranges.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 bg-border text-foreground text-xs rounded border border-border"
              >
                <option value="5m">Last 5 min</option>
                <option value="1h">Last 1 hour</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-accent text-accent-foreground text-xs rounded font-medium hover:bg-accent/90"
              >
                Export CSV
              </button>

              <button className="px-3 py-2 bg-border text-foreground text-xs rounded border border-border hover:bg-border/80">
                Download JSON
              </button>
            </div>

            {expanded && (
              <div className="border-t border-border pt-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">Raw Data Table</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground">Timestamp</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Temp (°C)</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">HR (bpm)</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">SpO₂ (%)</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Battery (mV)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history
                        .slice(-10)
                        .reverse()
                        .map((d, i) => (
                          <tr key={i} className="border-b border-border hover:bg-border/50">
                            <td className="py-2 px-2 text-muted-foreground">
                              {new Date(d.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="text-right py-2 px-2 text-foreground">{d.temperature_c.toFixed(2)}</td>
                            <td className="text-right py-2 px-2 text-foreground">{Math.round(d.heart_rate_bpm)}</td>
                            <td className="text-right py-2 px-2 text-foreground">{Math.round(d.spo2_pct)}</td>
                            <td className="text-right py-2 px-2 text-foreground">{d.battery_mv}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
