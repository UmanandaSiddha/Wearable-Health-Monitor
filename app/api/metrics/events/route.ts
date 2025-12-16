import { NextRequest, NextResponse } from "next/server"
import { verifyToken, extractTokenFromHeader } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { HealthEvent } from "@/lib/models/HealthEvent"
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
        const limit = Number.parseInt(searchParams.get("limit") || "50", 10)
        const acknowledged = searchParams.get("acknowledged") // true, false, or null (all)

        await connectDB()

        // Build query
        const query: any = {
            userId: new mongoose.Types.ObjectId(userId),
        }

        if (acknowledged === "true") {
            query.acknowledged = true
        } else if (acknowledged === "false") {
            query.acknowledged = false
        }

        // Fetch events
        const events = await HealthEvent.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean()

        return NextResponse.json({
            success: true,
            data: events,
            count: events.length,
        })
    } catch (error: any) {
        console.error("Get events error:", error)

        if (error.message === "Invalid token") {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        return NextResponse.json(
            { error: "Failed to fetch health events", details: error.message },
            { status: 500 }
        )
    }
}
