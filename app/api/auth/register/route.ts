import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import connectDB from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { signToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
    try {
        await connectDB()

        const { email, password, name } = await request.json()

        // Validation
        if (!email || !password || !name) {
            return NextResponse.json(
                { error: "Email, password, and name are required" },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            name,
        })

        // Generate token
        const token = signToken({
            userId: user._id.toString(),
            email: user.email,
        })

        return NextResponse.json(
            {
                success: true,
                message: "User registered successfully",
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                },
            },
            { status: 201 }
        )
    } catch (error: any) {
        console.error("Register error:", error)
        return NextResponse.json({ error: "Registration failed", details: error.message }, { status: 500 })
    }
}
