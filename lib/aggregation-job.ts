import cron from "node-cron"
import { aggregationService } from "./aggregation-service"

let isJobRunning = false

/**
 * Aggregation job that runs every minute
 * Processes data for all active users
 */
export async function runAggregationJob() {
    if (isJobRunning) {
        console.log("⏳ Aggregation job already running, skipping...")
        return
    }

    isJobRunning = true
    const startTime = Date.now()

    try {
        console.log("🔄 Starting aggregation job...")

        // Get all active users (users with data in Redis)
        const activeUsers = await aggregationService.getActiveUsers()

        if (activeUsers.length === 0) {
            console.log("No active users to process")
            return
        }

        console.log(`Processing ${activeUsers.length} active users`)

        // Process each user
        let successCount = 0
        let errorCount = 0

        for (const userId of activeUsers) {
            try {
                await aggregationService.processUserAggregation(userId)
                successCount++
            } catch (error) {
                console.error(`Failed to process user ${userId}:`, error)
                errorCount++
            }
        }

        const duration = Date.now() - startTime
        console.log(
            `✅ Aggregation job completed in ${duration}ms (${successCount} succeeded, ${errorCount} failed)`
        )
    } catch (error) {
        console.error("❌ Aggregation job failed:", error)
    } finally {
        isJobRunning = false
    }
}

/**
 * Start the aggregation cron job
 * Runs every minute: "* * * * *"
 */
export function startAggregationJob() {
    console.log("🚀 Starting aggregation cron job (runs every minute)")

    // Run every minute
    const job = cron.schedule("* * * * *", async () => {
        await runAggregationJob()
    })

    // Run immediately on startup
    runAggregationJob()

    return job
}

/**
 * Manually trigger aggregation (for API endpoint)
 */
export async function triggerManualAggregation(userId?: string) {
    if (userId) {
        console.log(`Manually triggering aggregation for user ${userId}`)
        await aggregationService.processUserAggregation(userId)
    } else {
        console.log("Manually triggering aggregation for all active users")
        await runAggregationJob()
    }
}
