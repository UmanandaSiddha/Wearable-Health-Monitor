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
	const [lastError, setLastError] = useState<string>("")
	const esp32FetchIntervalRef = useRef<NodeJS.Timeout | null>(null)

	const fetchESP32Data = useCallback(async () => {
		if (!esp32Ip || !isAuthenticated) return

		try {
			console.log(`http://${esp32Ip}:80/telemetry`);
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

			// Validate required fields
			if (!data || typeof data !== "object") {
				throw new Error("Invalid response: expected JSON object")
			}

			// Ensure status object exists
			if (!data.status || typeof data.status !== "object") {
				data.status = { motion: false, fall: false }
			}

			// Ensure all required numeric fields are present
			const defaults = {
				heart_rate_bpm: 0,
				spo2_pct: 0,
				temperature_c: 0,
				battery_mv: 0,
				device_id: "unknown",
			}

			const sensorData: SensorData = {
				...defaults,
				...data,
				timestamp: data.timestamp_ms ? new Date(data.timestamp_ms).toISOString() : new Date().toISOString(),
				status: data.status || { motion: false, fall: false },
			}

			setSensorData(sensorData)
			setHistory((prev) => [...prev, sensorData].slice(-200)) // Keep last 200 entries
			setIsConnected(true)
			setLastError("") // Clear error on success

			// Check thresholds and create alerts
			// const newAlerts = checkThresholds(sensorData, thresholds)
			// if (newAlerts.length > 0) {
			// 	setAlerts((prev) => [...newAlerts, ...prev].slice(0, 10))
			// 	newAlerts.forEach((alert) => {
			// 		if ("Notification" in window && Notification.permission === "granted") {
			// 			new Notification("Health Alert", {
			// 				body: alert.message,
			// 				tag: alert.type,
			// 				requireInteraction: alert.severity === "critical",
			// 			})
			// 		}
			// 	})
			// }
		} catch (error) {
			// Device not connected - clear state and log error
			const errorMsg = error instanceof Error ? error.message : String(error)
			console.error("ESP32 fetch failed:", errorMsg)
			setLastError(errorMsg)
			setIsConnected(false)
			setSensorData(null)
			setHistory([])
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

	useEffect(() => {
		if (isConnected || !isAuthenticated) return

		if ("Notification" in window && Notification.permission === "default") {
			Notification.requestPermission()
		}
	}, [isConnected, isAuthenticated])

	const handleUpdateEsp32Ip = () => {
		setEsp32Ip(esp32InputIp)
		setLastError("")
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
					{/* <BottomPanel data={sensorData} history={history} thresholds={thresholds} onThresholdsChange={setThresholds} /> */}
					{/* <AlertToast alerts={alerts} /> */}
				</>
			)}
			{!sensorData && (
				<>
					<div className="p-4 md:p-6 space-y-4">
						<div className="bg-card rounded-lg border border-border p-8 text-center space-y-3">
							<p className="text-lg font-semibold text-foreground">ESP32 Device Disconnected</p>
							<p className="text-sm text-muted-foreground">Please ensure your ESP32 device is turned on and connected to the network.</p>
							<p className="text-xs text-muted-foreground">Currently configured IP: {esp32Ip}</p>
							{lastError && (
								<div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
									<p className="font-semibold">Error:</p>
									<p>{lastError}</p>
								</div>
							)}
						</div>

						{/* IP Configuration Panel */}
						<div className="bg-card rounded-lg border border-border p-6 space-y-4">
							<p className="font-semibold text-foreground">ESP32 Network Configuration</p>
							<div className="space-y-3">
								<div className="flex flex-col gap-2">
									<label className="text-sm text-muted-foreground">ESP32 IP Address</label>
									<input
										type="text"
										value={esp32InputIp}
										onChange={(e) => setEsp32InputIp(e.target.value)}
										className="px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
										placeholder="e.g., 10.160.189.82"
									/>
									<p className="text-xs text-muted-foreground">Default: 10.160.189.82:80/telemetry</p>
								</div>
								<button
									onClick={handleUpdateEsp32Ip}
									className="w-full px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
								>
									Update IP & Reconnect
								</button>
							</div>

							<div className="border-t border-border pt-4">
								<p className="text-sm font-semibold text-foreground mb-2">Troubleshooting:</p>
								<ul className="text-xs text-muted-foreground space-y-1">
									<li>• Verify ESP32 IP address using your router</li>
									<li>• Check that ESP32 is responding to ping</li>
									<li>• Ensure both devices are on the same WiFi network</li>
									<li>• Verify ESP32 /telemetry endpoint is active</li>
									<li>• Check browser console (F12) for CORS errors</li>
								</ul>
							</div>
						</div>
					</div>
				</>
			)}
		</main>
	)
}
