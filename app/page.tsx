"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { SummaryBar } from "@/components/summary-bar"
import { LeftPanel } from "@/components/left-panel"
import { RightPanel } from "@/components/right-panel"
import { BottomPanel } from "@/components/bottom-panel"
import { AlertToast } from "@/components/alert-toast"
import type { SensorData } from "@/types/sensor"
import { type Alert, checkThresholds } from "@/utils/alerts"
import { useAuth } from "@/lib/auth-context"

// Generate mock sensor data (smooth sinusoidal) for when IP data is unavailable
const generateMockData = (): SensorData => {
  const now = new Date()
  const t = Date.now() / 1000 // seconds

  const sin = (f: number, a = 1, phase = 0) => a * Math.sin(f * t + phase)
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

  // Smooth vital signs
  const heart = clamp(75 + sin(0.4, 10) + sin(1.1, 3), 60, 95)
  const spo2 = clamp(97 + sin(0.2, 1.2), 95, 99)
  const temp = clamp(36.7 + sin(0.05, 0.2), 36.3, 37.2)

  // Motion signals
  const ax = 0.3 + sin(1.5, 0.35)
  const ay = 0.3 + sin(1.1, 0.30, Math.PI / 3)
  const az = 0.3 + sin(0.9, 0.40, Math.PI / 5)
  const gx = sin(0.7, 3)
  const gy = sin(0.8, 3.5, Math.PI / 4)
  const gz = sin(0.6, 2.5, Math.PI / 6)

  // Simple activity flag
  const accelMag = Math.sqrt(ax * ax + ay * ay + az * az)
  const motion = accelMag > 0.75

  // Battery drifts slowly but stays reasonable
  const battery = clamp(3700 + sin(0.01, 80), 3550, 3950)

  return {
    device_id: "MOCK_DEVICE",
    timestamp: now.toISOString(),
    temperature_c: temp,
    accel: { x: ax, y: ay, z: az },
    gyro: { x: gx, y: gy, z: gz },
    heart_rate_bpm: heart,
    spo2_pct: spo2,
    battery_mv: battery,
    status: { motion, fall: false },
  }
}

export default function Home() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [history, setHistory] = useState<SensorData[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [thresholds, setThresholds] = useState({
    hr_high: 100,
    hr_low: 50,
    spo2_threshold: 95,
    temp_high: 37.5,
    temp_low: 36,
  })
  const [esp32Ip, setEsp32Ip] = useState<string>("10.160.189.82")
  const [esp32InputIp, setEsp32InputIp] = useState<string>("10.160.189.82")
  const esp32FetchIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mockDataIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchESP32Data = useCallback(async () => {
    if (!esp32Ip || !isAuthenticated) return

    try {
      const response = await fetch(`http://${esp32Ip}:80/telemetry`, {
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Convert timestamp from milliseconds to ISO string if needed
      const sensorData: SensorData = {
        ...data,
        timestamp: new Date().toISOString(),
      }

      setSensorData(sensorData)
      setHistory((prev) => [...prev, sensorData].slice(-200)) // Keep last 200 entries
      setIsConnected(true)

      // Check thresholds and create alerts
      const newAlerts = checkThresholds(sensorData, thresholds)
      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 10))
        newAlerts.forEach((alert) => {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Health Alert", {
              body: alert.message,
              tag: alert.type,
              requireInteraction: alert.severity === "critical",
            })
          }
        })
      }
    } catch (error) {
      // console.error("Failed to fetch ESP32 data:", error)
      setIsConnected(false)
    }
  }, [esp32Ip, thresholds, isAuthenticated])

  useEffect(() => {
    if (!esp32Ip || !isAuthenticated) return

    // Fetch immediately on mount
    fetchESP32Data()

    // Set up polling interval
    esp32FetchIntervalRef.current = setInterval(() => {
      fetchESP32Data()
    }, 2000)

    return () => {
      if (esp32FetchIntervalRef.current) {
        clearInterval(esp32FetchIntervalRef.current)
      }
    }
  }, [esp32Ip, fetchESP32Data, isAuthenticated])

  // Generate mock data when not connected
  useEffect(() => {
    if (!isAuthenticated) return

    if (isConnected) {
      // Clear mock data interval when connected
      if (mockDataIntervalRef.current) {
        clearInterval(mockDataIntervalRef.current)
        mockDataIntervalRef.current = null
      }
      return
    }

    // Initialize with mock data if no data exists
    const mockData = generateMockData()
    setSensorData(mockData)
    setHistory([mockData])
    setIsConnected(true)

    // Set up mock data generation interval when not connected
    mockDataIntervalRef.current = setInterval(() => {
      const mockData = generateMockData()
      setSensorData(mockData)
      setHistory((prev) => [...prev, mockData].slice(-200)) // Keep last 200 entries
      setIsConnected(true)
    }, 2000)

    return () => {
      if (mockDataIntervalRef.current) {
        clearInterval(mockDataIntervalRef.current)
      }
    }
  }, [isConnected, isAuthenticated])

  useEffect(() => {
    if (isConnected || !isAuthenticated) return

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [isConnected, isAuthenticated])

  const handleUpdateEsp32Ip = () => {
    setEsp32Ip(esp32InputIp)
  }

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthLoading, isAuthenticated, router])

  const isStabilizing = history.length < 15 // ~30s at 2s interval

  if (isAuthLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Checking authentication...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">Please sign in to view your dashboard.</p>
          <button
            onClick={() => router.push("/auth/login")}
            className="text-primary hover:underline text-sm"
          >
            Go to Login
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header
        isConnected={isConnected}
      // esp32Ip={esp32Ip}
      // onEsp32IpChange={setEsp32InputIp}
      // onUpdateEsp32Ip={handleUpdateEsp32Ip}
      />
      {sensorData && (
        <>
          <SummaryBar data={sensorData} isStabilizing={isStabilizing} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 md:p-6">
            <LeftPanel data={sensorData} history={history} />
            <RightPanel data={sensorData} history={history} alerts={alerts} />
          </div>
          <BottomPanel data={sensorData} history={history} thresholds={thresholds} onThresholdsChange={setThresholds} />
          <AlertToast alerts={alerts} />
        </>
      )}
      {!sensorData && (
        <>
          <div className="p-4 md:p-6">
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <p className="text-muted-foreground">Initializing mock data...</p>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
