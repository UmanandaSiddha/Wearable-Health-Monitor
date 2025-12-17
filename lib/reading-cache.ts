import redis from "@/lib/redis"
import { READING_CACHE_CONFIG } from "@/lib/reading-cache-config"

export interface CachedReading {
    value: number
    timestamp: string
    serverTimestamp: string
    expiresAt: string
}

export interface ReadingCache {
    heartRate: CachedReading | null
    spo2: CachedReading | null
}

// Default hold time from config
const DEFAULT_HOLD_TIME = READING_CACHE_CONFIG.HOLD_TIME_SECONDS

/**
 * Store a cached reading for a specific metric
 * @param userId User ID
 * @param metricType 'heartRate' or 'spo2'
 * @param value The reading value
 * @param timestamp Original device timestamp
 * @param holdTimeSeconds How long to hold the reading (default: 30s)
 */
export async function cacheReading(
    userId: string,
    metricType: "heartRate" | "spo2",
    value: number,
    timestamp: string,
    holdTimeSeconds: number = DEFAULT_HOLD_TIME
): Promise<void> {
    const redisKey = `reading_cache:${userId}:${metricType}`
    const expiresAt = new Date(Date.now() + holdTimeSeconds * 1000).toISOString()

    const cachedReading: CachedReading = {
        value,
        timestamp,
        serverTimestamp: new Date().toISOString(),
        expiresAt,
    }

    // Store in Redis with TTL
    await redis.setex(
        redisKey,
        holdTimeSeconds,
        JSON.stringify(cachedReading)
    )
}

/**
 * Get a cached reading if it exists and hasn't expired
 * @param userId User ID
 * @param metricType 'heartRate' or 'spo2'
 * @returns Cached reading or null if expired/not found
 */
export async function getCachedReading(
    userId: string,
    metricType: "heartRate" | "spo2"
): Promise<CachedReading | null> {
    const redisKey = `reading_cache:${userId}:${metricType}`
    const cachedData = await redis.get(redisKey)

    if (!cachedData) {
        return null
    }

    const cachedReading: CachedReading = JSON.parse(cachedData)
    const now = new Date()
    const expiresAt = new Date(cachedReading.expiresAt)

    // Check if reading has expired
    if (now > expiresAt) {
        await redis.del(redisKey)
        return null
    }

    return cachedReading
}

/**
 * Get both cached readings
 */
export async function getAllCachedReadings(userId: string): Promise<ReadingCache> {
    const [heartRateCache, spo2Cache] = await Promise.all([
        getCachedReading(userId, "heartRate"),
        getCachedReading(userId, "spo2"),
    ])

    return {
        heartRate: heartRateCache,
        spo2: spo2Cache,
    }
}

/**
 * Clear all cached readings for a user
 */
export async function clearCachedReadings(userId: string): Promise<void> {
    await Promise.all([
        redis.del(`reading_cache:${userId}:heartRate`),
        redis.del(`reading_cache:${userId}:spo2`),
    ])
}
