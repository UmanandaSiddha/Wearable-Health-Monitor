/**
 * Reading Cache Configuration
 * Adjust these values based on your sensor update frequency
 */

export const READING_CACHE_CONFIG = {
    /**
     * How long to hold readings after receiving them (in seconds)
     * Default: 30 seconds
     * Use this to bridge gaps between sensor readings
     */
    HOLD_TIME_SECONDS: 30,

    /**
     * Maximum age of cached data before it's considered stale (in seconds)
     * Default: 30 seconds (same as hold time)
     */
    MAX_CACHE_AGE_SECONDS: 30,

    /**
     * Whether to include cache hit information in responses
     * Default: true (includes 'isCached' flag in response)
     */
    INCLUDE_CACHE_METADATA: true,
}

/**
 * Adjust hold time based on your sensor configuration
 * Examples:
 * - Sensor reading every 2 seconds: Use 4-5 seconds hold time
 * - Sensor reading every 5 seconds: Use 10 seconds hold time
 * - Sensor reading every 10 seconds: Use 20-30 seconds hold time
 */
