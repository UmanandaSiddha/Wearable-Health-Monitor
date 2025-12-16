import { NextRequest, NextResponse } from "next/server"
import { verifyToken, extractTokenFromHeader } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { AggregatedMetrics } from "@/lib/models/AggregatedMetrics"
import mongoose from "mongoose"

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

        // Get query parameters
        const { searchParams } = request.nextUrl
        const timeRange = searchParams.get("range") || "1h" // 1h, 24h, 7d
        const intervalType = searchParams.get("interval") || "1min" // 1min, 5min, hour

        await connectDB()

        // Calculate time range
        let startTime: Date
        const now = new Date()

        switch (timeRange) {
            case "1h":
                startTime = new Date(now.getTime() - 60 * 60 * 1000)
                break
            case "24h":
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
                break
            case "7d":
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
            default:
                startTime = new Date(now.getTime() - 60 * 60 * 1000)
        }

        // Fetch aggregated metrics
        const metrics = await AggregatedMetrics.find({
            userId: new mongoose.Types.ObjectId(userId),
            intervalType,
            startTime: { $gte: startTime },
        })
            .sort({ startTime: -1 })
            .limit(1000)
            .lean()

        return NextResponse.json({
            success: true,
            data: metrics,
            count: metrics.length,
            timeRange,
            intervalType,
        })
    } catch (error: any) {
        console.error("Get history error:", error)

        if (error.message === "Invalid token") {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        return NextResponse.json(
            { error: "Failed to fetch historical data", details: error.message },
            { status: 500 }
        )
    }
}
