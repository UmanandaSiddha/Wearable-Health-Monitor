// MQTT configuration helper for ESP32 device setup
export const MQTT_CONFIG = {
  broker: process.env.NEXT_PUBLIC_MQTT_BROKER || "broker.hivemq.com",
  port: Number.parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "8884"),
  username: process.env.MQTT_USERNAME || "",
  password: process.env.MQTT_PASSWORD || "",
  clientId: "health-dashboard-client",

  // Topics
  getTelemetryTopic: (deviceId: string) => `devices/${deviceId}/telemetry`,
  getConfigTopic: (deviceId: string) => `devices/${deviceId}/config`,
  getStatusTopic: (deviceId: string) => `devices/${deviceId}/status`,
}

// ESP32 now uses HTTP/WiFi only for data transmission
// Access telemetry at: http://ESP32_IP/telemetry
// Access status at: http://ESP32_IP/status
export const ESP32_HTTP_ENDPOINTS = {
  telemetry: "/telemetry",
  status: "/status",
}
