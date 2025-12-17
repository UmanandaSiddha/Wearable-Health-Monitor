import { NextRequest, NextResponse } from "next/server"
import { verifyToken, extractTokenFromHeader } from "@/lib/auth"
import redis from "@/lib/redis"
import { sensorRateLimiter } from "@/lib/rate-limiter"
import { cacheReading } from "@/lib/reading-cache"
import { READING_CACHE_CONFIG } from "@/lib/reading-cache-config"

interface SensorPayload {
    userId: string
    heartRate: number
    spo2: number
    temperature: number
    accel: { x: number; y: number; z: number }
    gyro?: { x: number; y: number; z: number }
    timestamp?: string
}

export async function POST(request: NextRequest) {
    try {
        // Authenticate
        const authHeader = request.headers.get("authorization")
        const token = extractTokenFromHeader(authHeader)

        if (!token) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        const payload = verifyToken(token)
        const userId = payload.userId

        // Rate limiting
        const isAllowed = await sensorRateLimiter.isAllowed(userId)
        if (!isAllowed) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Max 120 requests per minute." },
                { status: 429 }
            )
        }

        // Parse and validate payload
        const body: SensorPayload = await request.json()

        if (!body.heartRate || !body.spo2 || !body.temperature || !body.accel) {
            return NextResponse.json(
                { error: "Missing required fields: heartRate, spo2, temperature, accel" },
                { status: 400 }
            )
        }

        // Validate ranges
        if (body.heartRate < 0 || body.heartRate > 300) {
            return NextResponse.json({ error: "Invalid heart rate value" }, { status: 400 })
        }

        if (body.spo2 < 0 || body.spo2 > 100) {
            return NextResponse.json({ error: "Invalid SpO2 value" }, { status: 400 })
        }

        if (body.temperature < 20 || body.temperature > 50) {
            return NextResponse.json({ error: "Invalid temperature value" }, { status: 400 })
        }

        // Prepare sensor data
        const sensorData = {
            userId,
            heartRate: body.heartRate,
            spo2: body.spo2,
            temperature: body.temperature,
            accel: body.accel,
            gyro: body.gyro || { x: 0, y: 0, z: 0 },
            timestamp: body.timestamp || new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
        }

        // Store in Redis (15-minute buffer)
        const redisKey = `sensor:${userId}`
        const MAX_SAMPLES = 900 // supports up to 1Hz sampling for 15 minutes
        const TTL_SECONDS = 15 * 60 // 15 minutes

        await redis.lpush(redisKey, JSON.stringify(sensorData))

        // Trim to keep only last 15 minutes
        await redis.ltrim(redisKey, 0, MAX_SAMPLES - 1)

        // Set TTL to 15 minutes
        await redis.expire(redisKey, TTL_SECONDS)

        // Cache heart rate and spo2 readings for configured hold time
        // This allows the readings to be held/displayed even if new readings are delayed
        await Promise.all([
            cacheReading(
                userId,
                "heartRate",
                body.heartRate,
                body.timestamp || new Date().toISOString(),
                READING_CACHE_CONFIG.HOLD_TIME_SECONDS
            ),
            cacheReading(
                userId,
                "spo2",
                body.spo2,
                body.timestamp || new Date().toISOString(),
                READING_CACHE_CONFIG.HOLD_TIME_SECONDS
            ),
        ])

        return NextResponse.json({
            success: true,
            message: "Sensor data ingested successfully",
            timestamp: sensorData.serverTimestamp,
        })
    } catch (error: any) {
        console.error("Sensor ingest error:", error)

        if (error.message === "Invalid token") {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        return NextResponse.json(
            { error: "Failed to ingest sensor data", details: error.message },
            { status: 500 }
        )
    }
}
