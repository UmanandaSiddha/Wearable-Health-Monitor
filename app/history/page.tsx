"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

interface AggregatedMetric {
    _id: string
    userId: string
    intervalType: "1min" | "5min" | "hour"
    startTime: string
    avgHeartRate: number
    minHeartRate: number
    maxHeartRate: number
    avgSpO2: number
    avgTemp: number
    activityLevel: "resting" | "walking" | "active"
    accelMagnitude?: number
    sampleCount: number
    createdAt?: string
}

const RANGE_OPTIONS = [
    { value: "1h", label: "Last 1 hour" },
    { value: "24h", label: "Last 24 hours" },
    { value: "7d", label: "Last 7 days" },
]

const INTERVAL_OPTIONS = [
    { value: "1min", label: "1 minute" },
    { value: "5min", label: "5 minutes" },
    { value: "hour", label: "Hourly" },
]

export default function HistoryPage() {
    const { isAuthenticated, isLoading, token } = useAuth()
    const router = useRouter()
    const [range, setRange] = useState("1h")
    const [interval, setInterval] = useState("1min")
    const [data, setData] = useState<AggregatedMetric[]>([])
    const [loadingData, setLoadingData] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/auth/login")
        }
    }, [isAuthenticated, isLoading, router])

    const fetchHistory = async () => {
        if (!token) return
        setLoadingData(true)
        setError(null)

        try {
            const res = await fetch(`/api/metrics/history?range=${range}&interval=${interval}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const json = await res.json()
            if (!res.ok) {
                throw new Error(json.error || "Failed to load history")
            }

            setData(json.data || [])
        } catch (err: any) {
            setError(err.message || "Failed to load history")
        } finally {
            setLoadingData(false)
        }
    }

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchHistory()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, token, range, interval])

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    }, [data])

    if (isLoading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Checking authentication...</p>
            </main>
        )
    }

    if (!isAuthenticated) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>Protected</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-muted-foreground">Please sign in to view your health history.</p>
                        <Button onClick={() => router.push("/auth/login")}>Go to Login</Button>
                    </CardContent>
                </Card>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Health History</h1>
                        <p className="text-sm text-muted-foreground">Aggregated metrics from your device</p>
                    </div>
                    <div className="flex gap-2">
                        <Select value={range} onValueChange={setRange}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="Range" />
                            </SelectTrigger>
                            <SelectContent>
                                {RANGE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={interval} onValueChange={setInterval}>
                            <SelectTrigger className="w-28">
                                <SelectValue placeholder="Interval" />
                            </SelectTrigger>
                            <SelectContent>
                                {INTERVAL_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchHistory} disabled={loadingData}>
                            {loadingData ? "Refreshing..." : "Refresh"}
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {loadingData ? (
                    <div className="grid gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : sortedData.length === 0 ? (
                    <Card>
                        <CardContent className="py-6 text-center text-muted-foreground">
                            No history found for this range.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="overflow-x-auto border border-border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-left">Start</th>
                                    <th className="px-4 py-3 text-left">Interval</th>
                                    <th className="px-4 py-3 text-left">Avg HR</th>
                                    <th className="px-4 py-3 text-left">Min HR</th>
                                    <th className="px-4 py-3 text-left">Max HR</th>
                                    <th className="px-4 py-3 text-left">SpO₂</th>
                                    <th className="px-4 py-3 text-left">Temp</th>
                                    <th className="px-4 py-3 text-left">Activity</th>
                                    <th className="px-4 py-3 text-left">Samples</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((row) => (
                                    <tr key={row._id} className="border-t border-border">
                                        <td className="px-4 py-3 text-foreground">
                                            {new Date(row.startTime).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{row.intervalType}</td>
                                        <td className="px-4 py-3 text-foreground">{Math.round(row.avgHeartRate)}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{Math.round(row.minHeartRate)}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{Math.round(row.maxHeartRate)}</td>
                                        <td className="px-4 py-3 text-foreground">{row.avgSpO2.toFixed(1)}%</td>
                                        <td className="px-4 py-3 text-foreground">{row.avgTemp.toFixed(1)}°C</td>
                                        <td className="px-4 py-3 text-muted-foreground capitalize">{row.activityLevel}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{row.sampleCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    )
}
