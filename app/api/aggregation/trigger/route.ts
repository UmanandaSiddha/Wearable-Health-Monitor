import { NextRequest, NextResponse } from "next/server"
import { verifyToken, extractTokenFromHeader } from "@/lib/auth"
import { triggerManualAggregation } from "@/lib/aggregation-job"

export async function POST(request: NextRequest) {
    try {
        // Authenticate (optional: restrict to admin users)
        const authHeader = request.headers.get("authorization")
        const token = extractTokenFromHeader(authHeader)

        if (!token) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        const payload = verifyToken(token)

        // Trigger aggregation
        await triggerManualAggregation(payload.userId)

        return NextResponse.json({
            success: true,
            message: "Aggregation triggered successfully",
        })
    } catch (error: any) {
        console.error("Trigger aggregation error:", error)
        return NextResponse.json(
            { error: "Failed to trigger aggregation", details: error.message },
            { status: 500 }
        )
    }
}
