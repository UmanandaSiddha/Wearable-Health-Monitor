import mongoose, { Document, Schema } from "mongoose"

// Health Event Model
export interface IHealthEvent extends Document {
    userId: mongoose.Types.ObjectId
    eventType: "LOW_SPO2" | "HIGH_HR" | "LOW_HR" | "FEVER" | "HYPOTHERMIA" | "FALL_SUSPECTED"
    value: number
    severity: "info" | "warning" | "critical"
    timestamp: Date
    acknowledged: boolean
    acknowledgedAt?: Date
    metadata?: Record<string, any>
    createdAt: Date
}

const HealthEventSchema = new Schema<IHealthEvent>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        eventType: {
            type: String,
            enum: ["LOW_SPO2", "HIGH_HR", "LOW_HR", "FEVER", "HYPOTHERMIA", "FALL_SUSPECTED"],
            required: true,
        },
        value: {
            type: Number,
            required: true,
        },
        severity: {
            type: String,
            enum: ["info", "warning", "critical"],
            required: true,
        },
        timestamp: {
            type: Date,
            required: true,
            index: true,
        },
        acknowledged: {
            type: Boolean,
            default: false,
        },
        acknowledgedAt: {
            type: Date,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
)

// Compound indexes for efficient queries
HealthEventSchema.index({ userId: 1, timestamp: -1 })
HealthEventSchema.index({ userId: 1, acknowledged: 1, timestamp: -1 })
HealthEventSchema.index({ eventType: 1, timestamp: -1 })

export const HealthEvent =
    mongoose.models.HealthEvent || mongoose.model<IHealthEvent>("HealthEvent", HealthEventSchema)
