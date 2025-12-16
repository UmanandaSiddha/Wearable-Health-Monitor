import { NextRequest, NextResponse } from "next/server"
import { verifyToken, extractTokenFromHeader } from "@/lib/auth"

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization")
        const token = extractTokenFromHeader(authHeader)

        if (!token) {
            return NextResponse.json({ error: "No token provided" }, { status: 401 })
        }

        const payload = verifyToken(token)

        return NextResponse.json({
            success: true,
            user: payload,
        })
    } catch (error: any) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
}
