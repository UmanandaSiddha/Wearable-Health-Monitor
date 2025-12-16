import redis from "./redis"

// Rate limiting helper using Redis
export class RateLimiter {
    private prefix: string
    private maxRequests: number
    private windowMs: number

    constructor(prefix: string, maxRequests: number, windowMs: number) {
        this.prefix = prefix
        this.maxRequests = maxRequests
        this.windowMs = windowMs
    }

    async isAllowed(identifier: string): Promise<boolean> {
        const key = `${this.prefix}:${identifier}`
        const now = Date.now()
        const windowStart = now - this.windowMs

        try {
            // Remove old entries
            await redis.zremrangebyscore(key, 0, windowStart)

            // Count current requests
            const currentCount = await redis.zcard(key)

            if (currentCount >= this.maxRequests) {
                return false
            }

            // Add new request
            await redis.zadd(key, now, `${now}`)

            // Set expiry
            await redis.expire(key, Math.ceil(this.windowMs / 1000))

            return true
        } catch (error) {
            console.error("Rate limiter error:", error)
            // Fail open - allow request if rate limiter is broken
            return true
        }
    }

    async getRemainingRequests(identifier: string): Promise<number> {
        const key = `${this.prefix}:${identifier}`
        const now = Date.now()
        const windowStart = now - this.windowMs

        try {
            await redis.zremrangebyscore(key, 0, windowStart)
            const currentCount = await redis.zcard(key)
            return Math.max(0, this.maxRequests - currentCount)
        } catch (error) {
            console.error("Rate limiter error:", error)
            return this.maxRequests
        }
    }
}

// Sensor data ingestion rate limiter - 120 requests per minute per user
export const sensorRateLimiter = new RateLimiter("sensor_ingest", 120, 60000)
