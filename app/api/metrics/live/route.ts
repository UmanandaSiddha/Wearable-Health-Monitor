import { NextRequest, NextResponse } from "next/server"
import { verifyToken, extractTokenFromHeader } from "@/lib/auth"
import redis from "@/lib/redis"

export async function GET(request: NextRequest) {
    try {
        // Authenticate
        const authHeader = request.headers.get("authorization")
        const token = extractTokenFromHeader(authHeader)

        if (!token) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        const payload = verifyToken(token)
        const userId = payload.userId

        // Get latest sensor data from Redis
        const redisKey = `sensor:${userId}`
        const latestData = await redis.lrange(redisKey, 0, 0)

        if (latestData.length === 0) {
            return NextResponse.json({
                success: true,
                data: null,
                message: "No live data available",
            })
        }

        const sensorData = JSON.parse(latestData[0])

        return NextResponse.json({
            success: true,
            data: {
                heartRate: sensorData.heartRate,
                spo2: sensorData.spo2,
                temperature: sensorData.temperature,
                accel: sensorData.accel,
                gyro: sensorData.gyro,
                timestamp: sensorData.serverTimestamp,
            },
        })
    } catch (error: any) {
        console.error("Get live data error:", error)

        if (error.message === "Invalid token") {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        return NextResponse.json(
            { error: "Failed to fetch live data", details: error.message },
            { status: 500 }
        )
    }
}
