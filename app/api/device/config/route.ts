// Device configuration endpoint for ESP32
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("device_id")

  if (!deviceId) {
    return NextResponse.json({ error: "device_id parameter required" }, { status: 400 })
  }

  // Return device configuration
  return NextResponse.json({
    device_id: deviceId,
    sampling_rate: 1, // 1 Hz default
    mqtt_broker: process.env.MQTT_BROKER || "mqtt.example.com",
    mqtt_port: process.env.MQTT_PORT || 8883,
    mqtt_topic: `devices/${deviceId}/telemetry`,
    thresholds: {
      hr_high: 100,
      hr_low: 50,
      spo2_threshold: 95,
      temp_high: 37.5,
      temp_low: 36,
    },
    update_interval_ms: 1000,
  })
}

// Update device configuration
export async function POST(request: NextRequest) {
  try {
    const config = await request.json()

    // Validate and store configuration
    // In production, this would update a database
    return NextResponse.json({
      success: true,
      message: "Device configuration updated",
      config,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 })
  }
}
