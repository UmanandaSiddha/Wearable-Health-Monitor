import mongoose, { Document, Schema } from "mongoose"

// User Model
export interface IUser extends Document {
    email: string
    password: string
    name: string
    deviceId?: string
    createdAt: Date
    updatedAt: Date
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        deviceId: {
            type: String,
            unique: true,
            sparse: true,
        },
    },
    {
        timestamps: true,
    }
)

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
