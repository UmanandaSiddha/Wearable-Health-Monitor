"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MQTT_CONFIG } from "@/lib/mqtt-config"
import { Copy, Check } from "lucide-react"
import { useState } from "react"

export function DeviceSetup() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Device Configuration</CardTitle>
          <CardDescription>Setup your ESP32 wearable device to stream data</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mqtt" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mqtt">MQTT Setup</TabsTrigger>
              <TabsTrigger value="rest">REST API</TabsTrigger>
            </TabsList>

            <TabsContent value="mqtt" className="space-y-4">
              <div className="bg-card rounded-lg border border-border p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Broker Address</p>
                  <p className="text-xs text-muted-foreground font-mono">{MQTT_CONFIG.broker}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Port</p>
                  <p className="text-xs text-muted-foreground font-mono">{MQTT_CONFIG.port}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Topic</p>
                  <p className="text-xs text-muted-foreground font-mono">devices/esp32-001/telemetry</p>
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-foreground mb-2">Arduino Sketch Example</p>
                {/* <div className="bg-background rounded p-3 relative max-h-48 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap wrap-break-word">
                    {ESP32_SKETCH_EXAMPLE}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(ESP32_SKETCH_EXAMPLE)}
                    className="absolute top-2 right-2 p-2 bg-accent text-accent-foreground rounded hover:bg-accent/90"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div> */}
              </div>
            </TabsContent>

            <TabsContent value="rest" className="space-y-4">
              <div className="bg-card rounded-lg border border-border p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Endpoint</p>
                  <p className="text-xs text-muted-foreground font-mono">POST /api/telemetry</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Content-Type</p>
                  <p className="text-xs text-muted-foreground font-mono">application/json</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Payload Example</p>
                  <pre className="text-xs text-muted-foreground font-mono bg-background rounded p-2 mt-1 overflow-x-auto">
                    {`{
  "device_id": "esp32-001",
  "timestamp": "2025-11-24T14:30:00Z",
  "temperature_c": 36.5,
  "heart_rate_bpm": 72,
  "spo2_pct": 98,
  "battery_mv": 3900,
  "accel": {"x": 0.1, "y": 0.2, "z": 9.8},
  "gyro": {"x": 0, "y": 0, "z": 0},
  "status": {"motion": false, "fall": false}
}`}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
