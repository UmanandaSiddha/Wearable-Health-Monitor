// import { startAggregationJob } from "./lib/aggregation-job"

import { startAggregationJob } from "./aggregation-job"

// Start the aggregation cron job when the server starts
if (typeof window === "undefined") {
    // Only run on server side
    console.log("🚀 Initializing server-side services...")

    // Start aggregation job
    startAggregationJob()

    console.log("✅ Server services initialized")
}

export { }
