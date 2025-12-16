import mongoose, { Document, Schema } from "mongoose"

// Aggregated Metrics Model
export interface IAggregatedMetrics extends Document {
    userId: mongoose.Types.ObjectId
    intervalType: "1min" | "5min" | "hour"
    startTime: Date
    avgHeartRate: number
    minHeartRate: number
    maxHeartRate: number
    avgSpO2: number
    avgTemp: number
    activityLevel: "resting" | "walking" | "active"
    accelMagnitude?: number
    sampleCount: number
    createdAt: Date
}

const AggregatedMetricsSchema = new Schema<IAggregatedMetrics>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        intervalType: {
            type: String,
            enum: ["1min", "5min", "hour"],
            required: true,
        },
        startTime: {
            type: Date,
            required: true,
            index: true,
        },
        avgHeartRate: {
            type: Number,
            required: true,
        },
        minHeartRate: {
            type: Number,
            required: true,
        },
        maxHeartRate: {
            type: Number,
            required: true,
        },
        avgSpO2: {
            type: Number,
            required: true,
        },
        avgTemp: {
            type: Number,
            required: true,
        },
        activityLevel: {
            type: String,
            enum: ["resting", "walking", "active"],
            required: true,
        },
        accelMagnitude: {
            type: Number,
        },
        sampleCount: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    }
)

// Compound index for efficient queries
AggregatedMetricsSchema.index({ userId: 1, startTime: -1 })
AggregatedMetricsSchema.index({ userId: 1, intervalType: 1, startTime: -1 })

export const AggregatedMetrics =
    mongoose.models.AggregatedMetrics ||
    mongoose.model<IAggregatedMetrics>("AggregatedMetrics", AggregatedMetricsSchema)
