"use client"

import { useState, useEffect } from "react"
import type { Alert } from "@/utils/alerts"
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react"

interface AlertToastProps {
  alerts: Alert[]
}

export function AlertToast({ alerts }: AlertToastProps) {
  const [visibleAlerts, setVisibleAlerts] = useState<Alert[]>([])

  useEffect(() => {
    if (alerts.length > 0) {
      setVisibleAlerts([alerts[0]])
      const timer = setTimeout(() => {
        setVisibleAlerts([])
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [alerts])

  const getIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5" />
      case "warning":
        return <AlertTriangle className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const getColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-900 border-red-700 text-red-100"
      case "warning":
        return "bg-yellow-900 border-yellow-700 text-yellow-100"
      default:
        return "bg-blue-900 border-blue-700 text-blue-100"
    }
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm space-y-2 z-50">
      {visibleAlerts.map((alert) => (
        <div
          key={`${alert.type}-${alert.timestamp}`}
          className={`border rounded-lg p-4 flex items-start gap-3 ${getColor(alert.severity)}`}
        >
          {getIcon(alert.severity)}
          <div className="flex-1">
            <p className="font-semibold text-sm">{alert.title}</p>
            <p className="text-xs opacity-90">{alert.message}</p>
          </div>
          <button onClick={() => setVisibleAlerts([])} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
