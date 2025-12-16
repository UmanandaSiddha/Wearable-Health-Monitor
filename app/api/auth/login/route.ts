import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import connectDB from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { signToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
    try {
        await connectDB()

        const { email, password } = await request.json()

        // Validation
        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
        }

        // Find user
        const user = await User.findOne({ email })
        if (!user) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
        }

        // Generate token
        const token = signToken({
            userId: user._id.toString(),
            email: user.email,
        })

        return NextResponse.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                deviceId: user.deviceId,
            },
        })
    } catch (error: any) {
        console.error("Login error:", error)
        return NextResponse.json({ error: "Login failed", details: error.message }, { status: 500 })
    }
}
