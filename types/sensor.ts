export interface SensorData {
  device_id: string
  timestamp: string
  temperature_c: number
  accel: { x: number; y: number; z: number }
  gyro: { x: number; y: number; z: number }
  heart_rate_bpm: number
  spo2_pct: number
  battery_mv: number
  status: { motion: boolean; fall: boolean }
}

export function getStatusColor(data: SensorData): string {
  const isAbnormal =
    data.heart_rate_bpm < 50 ||
    data.heart_rate_bpm > 100 ||
    data.spo2_pct < 95 ||
    data.temperature_c > 37.5 ||
    data.temperature_c < 36

  if (data.heart_rate_bpm < 40 || data.spo2_pct < 90 || data.temperature_c > 39) {
    return "bg-red-600 text-white px-3 py-1 rounded-full"
  }
  if (isAbnormal) {
    return "bg-yellow-600 text-white px-3 py-1 rounded-full"
  }
  return "bg-green-600 text-white px-3 py-1 rounded-full"
}

export function getStatusLabel(data: SensorData): string {
  if (data.heart_rate_bpm < 40 || data.spo2_pct < 90 || data.temperature_c > 39) {
    return "CRITICAL"
  }
  const isAbnormal =
    data.heart_rate_bpm < 50 ||
    data.heart_rate_bpm > 100 ||
    data.spo2_pct < 95 ||
    data.temperature_c > 37.5 ||
    data.temperature_c < 36
  if (isAbnormal) {
    return "WARNING"
  }
  return "OK"
}
