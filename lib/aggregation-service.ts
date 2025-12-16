import redis from "./redis"
import connectDB from "./mongodb"
import { AggregatedMetrics } from "./models/AggregatedMetrics"
import { HealthEvent } from "./models/HealthEvent"
import mongoose from "mongoose"

interface RawSensorData {
    userId: string
    heartRate: number
    spo2: number
    temperature: number
    accel: { x: number; y: number; z: number }
    gyro: { x: number; y: number; z: number }
    timestamp: string
    serverTimestamp: string
}

interface AggregatedData {
    userId: string
    intervalType: "1min" | "5min" | "hour"
    startTime: Date
    avgHeartRate: number
    minHeartRate: number
    maxHeartRate: number
    avgSpO2: number
    avgTemp: number
    activityLevel: "resting" | "walking" | "active"
    accelMagnitude: number
    sampleCount: number
}

interface HealthEventData {
    userId: string
    eventType: "LOW_SPO2" | "HIGH_HR" | "LOW_HR" | "FEVER" | "HYPOTHERMIA" | "FALL_SUSPECTED"
    value: number
    severity: "info" | "warning" | "critical"
    timestamp: Date
    metadata?: Record<string, any>
}

export class AggregationService {
    /**
     * Fetch raw sensor data from Redis for a specific user
     */
    async getRawSensorData(userId: string, limit: number = 60): Promise<RawSensorData[]> {
        const redisKey = `sensor:${userId}`
        const rawData = await redis.lrange(redisKey, 0, limit - 1)

        return rawData.map((item) => JSON.parse(item))
    }

    /**
     * Calculate accelerometer magnitude
     */
    calculateAccelMagnitude(accel: { x: number; y: number; z: number }): number {
        return Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2)
    }

    /**
     * Infer activity level from accelerometer magnitude
     */
    inferActivityLevel(magnitude: number): "resting" | "walking" | "active" {
        if (magnitude < 1.2) return "resting"
        if (magnitude < 2.5) return "walking"
        return "active"
    }

    /**
     * Aggregate raw sensor data into metrics
     */
    aggregateMetrics(
        rawData: RawSensorData[],
        intervalType: "1min" | "5min" | "hour"
    ): AggregatedData | null {
        if (rawData.length === 0) return null

        const userId = rawData[0].userId

        // Calculate averages and extremes
        const heartRates = rawData.map((d) => d.heartRate)
        const spo2Values = rawData.map((d) => d.spo2)
        const temperatures = rawData.map((d) => d.temperature)
        const accelMagnitudes = rawData.map((d) => this.calculateAccelMagnitude(d.accel))

        const avgHeartRate = heartRates.reduce((a, b) => a + b, 0) / heartRates.length
        const minHeartRate = Math.min(...heartRates)
        const maxHeartRate = Math.max(...heartRates)
        const avgSpO2 = spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length
        const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length
        const avgAccelMagnitude = accelMagnitudes.reduce((a, b) => a + b, 0) / accelMagnitudes.length

        // Determine start time (align to interval boundary)
        const latestTimestamp = new Date(rawData[0].serverTimestamp)
        const startTime = this.alignToInterval(latestTimestamp, intervalType)

        return {
            userId,
            intervalType,
            startTime,
            avgHeartRate: Math.round(avgHeartRate * 100) / 100,
            minHeartRate: Math.round(minHeartRate),
            maxHeartRate: Math.round(maxHeartRate),
            avgSpO2: Math.round(avgSpO2 * 100) / 100,
            avgTemp: Math.round(avgTemp * 100) / 100,
            activityLevel: this.inferActivityLevel(avgAccelMagnitude),
            accelMagnitude: Math.round(avgAccelMagnitude * 100) / 100,
            sampleCount: rawData.length,
        }
    }

    /**
     * Align timestamp to interval boundary
     */
    alignToInterval(timestamp: Date, intervalType: "1min" | "5min" | "hour"): Date {
        const aligned = new Date(timestamp)

        switch (intervalType) {
            case "1min":
                aligned.setSeconds(0, 0)
                break
            case "5min":
                aligned.setMinutes(Math.floor(aligned.getMinutes() / 5) * 5, 0, 0)
                break
            case "hour":
                aligned.setMinutes(0, 0, 0)
                break
        }

        return aligned
    }

    /**
     * Detect health events from raw sensor data
     */
    detectHealthEvents(rawData: RawSensorData[]): HealthEventData[] {
        const events: HealthEventData[] = []
        const latestData = rawData[0]

        if (!latestData) return events

        const userId = latestData.userId
        const timestamp = new Date(latestData.serverTimestamp)

        // SpO2 checks
        if (latestData.spo2 < 90) {
            events.push({
                userId,
                eventType: "LOW_SPO2",
                value: latestData.spo2,
                severity: "critical",
                timestamp,
                metadata: { threshold: 90 },
            })
        } else if (latestData.spo2 < 92) {
            events.push({
                userId,
                eventType: "LOW_SPO2",
                value: latestData.spo2,
                severity: "warning",
                timestamp,
                metadata: { threshold: 92 },
            })
        }

        // Heart rate checks
        if (latestData.heartRate > 140) {
            events.push({
                userId,
                eventType: "HIGH_HR",
                value: latestData.heartRate,
                severity: "critical",
                timestamp,
                metadata: { threshold: 140 },
            })
        } else if (latestData.heartRate > 120) {
            events.push({
                userId,
                eventType: "HIGH_HR",
                value: latestData.heartRate,
                severity: "warning",
                timestamp,
                metadata: { threshold: 120 },
            })
        }

        if (latestData.heartRate < 40) {
            events.push({
                userId,
                eventType: "LOW_HR",
                value: latestData.heartRate,
                severity: "critical",
                timestamp,
                metadata: { threshold: 40 },
            })
        } else if (latestData.heartRate < 50) {
            events.push({
                userId,
                eventType: "LOW_HR",
                value: latestData.heartRate,
                severity: "warning",
                timestamp,
                metadata: { threshold: 50 },
            })
        }

        // Temperature checks
        if (latestData.temperature > 39) {
            events.push({
                userId,
                eventType: "FEVER",
                value: latestData.temperature,
                severity: "critical",
                timestamp,
                metadata: { threshold: 39 },
            })
        } else if (latestData.temperature > 37.5) {
            events.push({
                userId,
                eventType: "FEVER",
                value: latestData.temperature,
                severity: "warning",
                timestamp,
                metadata: { threshold: 37.5 },
            })
        }

        if (latestData.temperature < 35) {
            events.push({
                userId,
                eventType: "HYPOTHERMIA",
                value: latestData.temperature,
                severity: "critical",
                timestamp,
                metadata: { threshold: 35 },
            })
        }

        // Fall detection (sudden acceleration spike)
        const accelMagnitude = this.calculateAccelMagnitude(latestData.accel)
        if (accelMagnitude > 3.5) {
            events.push({
                userId,
                eventType: "FALL_SUSPECTED",
                value: accelMagnitude,
                severity: "critical",
                timestamp,
                metadata: { accelMagnitude, threshold: 3.5 },
            })
        }

        return events
    }

    /**
     * Check if event already exists in recent history (avoid duplicates)
     */
    async isRecentEvent(
        userId: string,
        eventType: string,
        withinMinutes: number = 5
    ): Promise<boolean> {
        await connectDB()

        const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000)

        const existingEvent = await HealthEvent.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            eventType,
            timestamp: { $gte: cutoffTime },
        })

        return !!existingEvent
    }

    /**
     * Save aggregated metrics to MongoDB
     */
    async saveAggregatedMetrics(data: AggregatedData): Promise<void> {
        await connectDB()

        await AggregatedMetrics.create({
            userId: new mongoose.Types.ObjectId(data.userId),
            intervalType: data.intervalType,
            startTime: data.startTime,
            avgHeartRate: data.avgHeartRate,
            minHeartRate: data.minHeartRate,
            maxHeartRate: data.maxHeartRate,
            avgSpO2: data.avgSpO2,
            avgTemp: data.avgTemp,
            activityLevel: data.activityLevel,
            accelMagnitude: data.accelMagnitude,
            sampleCount: data.sampleCount,
        })
    }

    /**
     * Save health event to MongoDB (with duplicate check)
     */
    async saveHealthEvent(event: HealthEventData): Promise<void> {
        await connectDB()

        // Check for recent duplicate
        const isDuplicate = await this.isRecentEvent(event.userId, event.eventType, 5)
        if (isDuplicate) {
            console.log(`Skipping duplicate event: ${event.eventType} for user ${event.userId}`)
            return
        }

        await HealthEvent.create({
            userId: new mongoose.Types.ObjectId(event.userId),
            eventType: event.eventType,
            value: event.value,
            severity: event.severity,
            timestamp: event.timestamp,
            metadata: event.metadata,
            acknowledged: false,
        })
    }

    /**
     * Process aggregation for a specific user
     */
    async processUserAggregation(userId: string): Promise<void> {
        try {
            // Fetch raw data (last 60 samples = 1 minute at 1Hz)
            const rawData = await this.getRawSensorData(userId, 60)

            if (rawData.length === 0) {
                console.log(`No data to aggregate for user ${userId}`)
                return
            }

            // Aggregate metrics
            const aggregated = this.aggregateMetrics(rawData, "1min")
            if (aggregated) {
                await this.saveAggregatedMetrics(aggregated)
                console.log(`✅ Aggregated ${rawData.length} samples for user ${userId}`)
            }

            // Detect and save health events
            const events = this.detectHealthEvents(rawData)
            for (const event of events) {
                await this.saveHealthEvent(event)
                console.log(`⚠️  Health event detected: ${event.eventType} for user ${userId}`)
            }
        } catch (error) {
            console.error(`Error processing aggregation for user ${userId}:`, error)
            throw error
        }
    }

    /**
     * Get list of active users (users with data in Redis)
     */
    async getActiveUsers(): Promise<string[]> {
        const keys = await redis.keys("sensor:*")
        return keys.map((key) => key.replace("sensor:", ""))
    }
}

export const aggregationService = new AggregationService()
