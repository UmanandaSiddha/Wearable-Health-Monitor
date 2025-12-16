import type { SensorData } from "@/types/sensor"

export interface Alert {
  type: "hr" | "spo2" | "temp" | "motion" | "fall"
  severity: "info" | "warning" | "critical"
  title: string
  message: string
  timestamp: string
}

export interface Thresholds {
  hr_high: number
  hr_low: number
  spo2_threshold: number
  temp_high: number
  temp_low: number
}

export function checkThresholds(data: SensorData, thresholds: Thresholds): Alert[] {
  const alerts: Alert[] = []
  const now = new Date().toISOString()

  // Heart rate checks
  if (data.heart_rate_bpm > 120) {
    alerts.push({
      type: "hr",
      severity: "critical",
      title: "Critical Heart Rate",
      message: `Heart rate ${Math.round(data.heart_rate_bpm)} bpm is dangerously high`,
      timestamp: now,
    })
  } else if (data.heart_rate_bpm > thresholds.hr_high) {
    alerts.push({
      type: "hr",
      severity: "warning",
      title: "Elevated Heart Rate",
      message: `Heart rate ${Math.round(data.heart_rate_bpm)} bpm exceeds threshold (${thresholds.hr_high})`,
      timestamp: now,
    })
  } else if (data.heart_rate_bpm < 40) {
    alerts.push({
      type: "hr",
      severity: "critical",
      title: "Critical Bradycardia",
      message: `Heart rate ${Math.round(data.heart_rate_bpm)} bpm is dangerously low`,
      timestamp: now,
    })
  } else if (data.heart_rate_bpm < thresholds.hr_low) {
    alerts.push({
      type: "hr",
      severity: "warning",
      title: "Low Heart Rate",
      message: `Heart rate ${Math.round(data.heart_rate_bpm)} bpm below threshold (${thresholds.hr_low})`,
      timestamp: now,
    })
  }

  // SpO2 checks
  if (data.spo2_pct < 90) {
    alerts.push({
      type: "spo2",
      severity: "critical",
      title: "Critical Low Oxygen",
      message: `SpO₂ ${Math.round(data.spo2_pct)}% - Severe hypoxemia detected`,
      timestamp: now,
    })
  } else if (data.spo2_pct < thresholds.spo2_threshold) {
    alerts.push({
      type: "spo2",
      severity: "warning",
      title: "Low Oxygen Saturation",
      message: `SpO₂ ${Math.round(data.spo2_pct)}% below threshold (${thresholds.spo2_threshold})`,
      timestamp: now,
    })
  }

  // Temperature checks
  if (data.temperature_c > 39) {
    alerts.push({
      type: "temp",
      severity: "critical",
      title: "Critical Fever",
      message: `Temperature ${data.temperature_c.toFixed(1)}°C - High fever detected`,
      timestamp: now,
    })
  } else if (data.temperature_c > thresholds.temp_high) {
    alerts.push({
      type: "temp",
      severity: "warning",
      title: "Elevated Temperature",
      message: `Temperature ${data.temperature_c.toFixed(1)}°C exceeds threshold (${thresholds.temp_high})`,
      timestamp: now,
    })
  } else if (data.temperature_c < 35) {
    alerts.push({
      type: "temp",
      severity: "critical",
      title: "Critical Hypothermia",
      message: `Temperature ${data.temperature_c.toFixed(1)}°C - Dangerous low temperature`,
      timestamp: now,
    })
  } else if (data.temperature_c < thresholds.temp_low) {
    alerts.push({
      type: "temp",
      severity: "warning",
      title: "Low Temperature",
      message: `Temperature ${data.temperature_c.toFixed(1)}°C below threshold (${thresholds.temp_low})`,
      timestamp: now,
    })
  }

  // Fall detection
  if (data.status.fall) {
    alerts.push({
      type: "fall",
      severity: "critical",
      title: "Fall Detected",
      message: "Potential fall detected - immediate assistance may be needed",
      timestamp: now,
    })
  }

  return alerts
}
