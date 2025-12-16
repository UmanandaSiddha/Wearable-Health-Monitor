"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useEffect, useState } from "react"

import type { SensorData } from "@/types/sensor"
import type { Alert } from "@/utils/alerts"

interface RightPanelProps {
  data: SensorData
  history: SensorData[]
  alerts?: Alert[]
}

type GyroVec = { x: number; y: number; z: number }

// Simple 3D cube that rotates based on gyro values
function GyroCube({ gyro }: { gyro: GyroVec }) {
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0])

  useEffect(() => {
    // Scale raw gyro values to radians so cube doesn't spin insanely
    const SCALE = 0.01
    setRotation([gyro.x * SCALE, gyro.y * SCALE, gyro.z * SCALE])
  }, [gyro.x, gyro.y, gyro.z])

  return (
    <mesh rotation={rotation}>
      <boxGeometry args={[1.3, 1.3, 1.3]} />
      <meshStandardMaterial color="#6366f1" />
    </mesh>
  )
}

export function RightPanel({ data, history, alerts = [] }: RightPanelProps) {
  // --- Temperature history (unchanged) ---
  // const tempHistory =
  //   history.length > 0
  //     ? history.slice(-144).map((d, i) => ({
  //       time: i,
  //       temp: Number.parseFloat(d.temperature_c.toFixed(1)),
  //     }))
  //     : [{ time: 0, temp: 0 }]

  // --- Acceleration (same idea, just left as-is) ---
  const accelData = [
    { axis: "X", value: Math.abs(data.accel.x) },
    { axis: "Y", value: Math.abs(data.accel.y) },
    { axis: "Z", value: Math.abs(data.accel.z) },
  ]

  // --- Gyroscope data (for numeric info + magnitude) ---
  const gyro = data.gyro
  const gyroMagnitude = Math.sqrt(gyro.x * gyro.x + gyro.y * gyro.y + gyro.z * gyro.z)

  // Use recent history to give some context / scaling if needed later
  const gyroHistorySlice = history.length > 0 ? history.slice(-60) : []
  const maxGyroValue =
    gyroHistorySlice.length > 0
      ? gyroHistorySlice.reduce((max, d) => {
        const vals = [Math.abs(d.gyro.x), Math.abs(d.gyro.y), Math.abs(d.gyro.z)]
        return Math.max(max, ...vals)
      }, 0) || 1
      : 1

  // --- Basic fall detection on the frontend (unchanged) ---
  const accelWindow = history.length > 0 ? history.slice(-20) : [] // last N samples
  let possibleFall = false

  if (accelWindow.length > 5) {
    let minMag = Number.POSITIVE_INFINITY
    let maxMag = 0

    for (const sample of accelWindow) {
      const ax = sample.accel.x
      const ay = sample.accel.y
      const az = sample.accel.z
      const mag = Math.sqrt(ax * ax + ay * ay + az * az)

      if (mag < minMag) minMag = mag
      if (mag > maxMag) maxMag = mag
    }

    // NOTE: These thresholds assume accel is roughly in "g" units.
    const FREE_FALL_THRESHOLD = 0.5 // ~0.5 g → near free-fall
    const IMPACT_THRESHOLD = 2.5 // ~2.5 g → impact spike

    if (minMag < FREE_FALL_THRESHOLD && maxMag > IMPACT_THRESHOLD) {
      possibleFall = true
    }
  }

  const currentAccelMag = Math.sqrt(
    data.accel.x * data.accel.x + data.accel.y * data.accel.y + data.accel.z * data.accel.z,
  )

  return (
    <div className="lg:col-span-1 space-y-4">
      {/* Temperature card */}
      {/* <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3">Temperature Trend</h3>
        <div className="h-24 w-full mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tempHistory}>
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFD93D" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FFD93D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" hide />
              <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
              <Area type="monotone" dataKey="temp" stroke="#FFD93D" fillOpacity={1} fill="url(#colorTemp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-lg font-bold text-foreground">{data.temperature_c.toFixed(1)}°C</p>
      </div> */}

      {/* Motion + 3D Gyro + Fall detection */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3">Motion Activity</h3>

        {/* Acceleration */}
        <div className="space-y-2">
          {accelData.map((item) => (
            <div key={item.axis}>
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-muted-foreground">{item.axis}-Axis Accel</p>
                <p className="text-xs font-semibold text-foreground">{item.value.toFixed(2)} g</p>
              </div>
              <div className="w-full bg-border rounded h-2">
                <div
                  className="bg-accent h-2 rounded transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, item.value * 10))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 3D Gyroscope visual */}
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-muted-foreground">Rotation (Gyroscope - 3D)</p>
            <p className="text-[10px] text-muted-foreground">
              |ω|: <span className="font-semibold text-foreground">{gyroMagnitude.toFixed(2)}</span>
            </p>
          </div>
          <div className="w-full h-44 rounded-md overflow-hidden bg-background border border-border">
            <Canvas camera={{ position: [0, 0, 3] }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[4, 4, 4]} intensity={0.8} />
              <GyroCube gyro={gyro} />
              <OrbitControls enablePan={false} enableZoom={false} enableRotate />
            </Canvas>
          </div>

          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>X: {gyro.x.toFixed(2)}</span>
            <span>Y: {gyro.y.toFixed(2)}</span>
            <span>Z: {gyro.z.toFixed(2)}</span>
          </div>
        </div>

        {/* Basic fall detection status */}
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Fall Detection</p>
            <p className="text-[10px] text-muted-foreground">
              Accel magnitude now: {currentAccelMag.toFixed(2)}
            </p>
          </div>
          <span
            className={`px-2 py-1 rounded text-[10px] font-semibold ${possibleFall
              ? "bg-red-100 text-red-700 border border-red-300"
              : "bg-emerald-100 text-emerald-700 border border-emerald-300"
              }`}
          >
            {possibleFall ? "POSSIBLE FALL" : "STABLE"}
          </span>
        </div>
      </div>

      {/* Alerts card */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3">Recent Alerts</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No alerts</p>
          ) : (
            alerts.slice(0, 5).map((alert, i) => (
              <div key={i} className="text-xs flex justify-between items-start pb-2 border-b border-border">
                <div className="flex-1">
                  <p className="text-foreground font-medium">{alert.title}</p>
                  <p className="text-muted-foreground">{alert.message}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ml-2
                  ${alert.severity === "critical"
                      ? "bg-red-900 text-red-100"
                      : alert.severity === "warning"
                        ? "bg-yellow-900 text-yellow-100"
                        : "bg-blue-900 text-blue-100"
                    }`}
                >
                  {alert.severity.toUpperCase()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
