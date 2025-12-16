"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { SensorData } from "@/types/sensor"

interface LeftPanelProps {
  data: SensorData
  history: SensorData[]
}

export function LeftPanel({ data, history }: LeftPanelProps) {
  const chartData = history.length > 0
    ? history.slice(-60).map((d) => ({
      time: new Date(d.timestamp).toLocaleTimeString(),
      hr: Math.round(d.heart_rate_bpm),
      spo2: Math.round(d.spo2_pct),
    }))
    : [{ time: new Date().toLocaleTimeString(), hr: 0, spo2: 0 }]

  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="bg-card rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground mb-4">Vital Signs - Last Hour</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
              <YAxis stroke="rgba(255,255,255,0.5)" yAxisId="left" domain={[0, 200]} />
              <YAxis stroke="rgba(255,255,255,0.5)" yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                formatter={(value) => value}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="hr" stroke="#FF6B6B" name="Heart Rate (bpm)" />
              <Line yAxisId="right" type="monotone" dataKey="spo2" stroke="#4ECDC4" name="SpO₂ (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-2">Heart Rate Variability</p>
          <p className="text-2xl font-bold text-foreground">12.5</p>
          <p className="text-xs text-muted-foreground">SDNN (ms)</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground mb-2">Resting HR</p>
          <p className="text-2xl font-bold text-foreground">60</p>
          <p className="text-xs text-muted-foreground">bpm</p>
        </div>
      </div>
    </div>
  )
}
