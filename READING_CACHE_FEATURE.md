# Reading Cache Feature Documentation

## Overview

The reading cache feature allows heart rate and SpO2 readings to be held/retained for a configurable amount of time after being received. This ensures that even if the sensor temporarily stops sending new readings, the dashboard will continue to display the last valid readings.

## How It Works

### Flow

1. **Sensor Reading Received**: When the ESP32 sends a new heart rate or SpO2 reading to the `/api/sensor/ingest` endpoint
2. **Data Cached**: The reading is immediately cached in Redis with an expiration time (default: 30 seconds)
3. **Data Retrieved**: When the frontend requests current metrics via `/api/metrics/live`:
   - If new data exists, it returns the fresh reading
   - If no new data exists, it returns the cached reading (if not expired)
   - If cached data has expired, it returns null

### Benefits

- **Smooth UI Experience**: Displays don't show "no data" temporarily if readings are delayed
- **Network Resilience**: Handles gaps in sensor transmission gracefully
- **Zero Configuration**: Works out of the box with sensible defaults

## Configuration

Edit [lib/reading-cache-config.ts](lib/reading-cache-config.ts) to adjust behavior:

```typescript
export const READING_CACHE_CONFIG = {
    // How long to hold readings (default: 30 seconds)
    HOLD_TIME_SECONDS: 30,

    // Max age before data considered stale (default: 30 seconds)
    MAX_CACHE_AGE_SECONDS: 30,

    // Include cache metadata in responses (default: true)
    INCLUDE_CACHE_METADATA: true,
}
```

### Recommended Settings

- **2-second sensor updates**: Use 4-5 second hold time
- **5-second sensor updates**: Use 10 second hold time
- **10-second sensor updates**: Use 20-30 second hold time

## Implementation Details

### Files Modified

1. **[app/api/sensor/ingest/route.ts](app/api/sensor/ingest/route.ts)**
   - Now caches heart rate and SpO2 readings when received
   - Calls `cacheReading()` for each metric

2. **[app/api/metrics/live/route.ts](app/api/metrics/live/route.ts)**
   - Returns cached readings as fallback when fresh data unavailable
   - Includes `isCached: boolean` flag in response to indicate data source

### New Files Created

1. **[lib/reading-cache.ts](lib/reading-cache.ts)**
   - Core caching logic
   - Functions: `cacheReading()`, `getCachedReading()`, `getAllCachedReadings()`, `clearCachedReadings()`

2. **[lib/reading-cache-config.ts](lib/reading-cache-config.ts)**
   - Configuration constants
   - Centralized settings for hold times and behavior

## API Response Changes

### Live Metrics Response

The `/api/metrics/live` endpoint now returns an additional field:

```json
{
    "success": true,
    "data": {
        "heartRate": 72,
        "spo2": 98,
        "temperature": 36.5,
        "timestamp": "2025-12-17T10:30:00Z",
        "isCached": false  // NEW: indicates if this is cached data
    }
}
```

- `isCached: false` = Fresh sensor reading
- `isCached: true` = Previously cached reading (sensor data delayed)
- `isCached: true` + `heartRate/spo2` = Only holding cached readings, no new data

## Data Persistence

- Cached readings are stored in Redis
- TTL (Time-To-Live) is automatically set based on `HOLD_TIME_SECONDS`
- Expired data is automatically cleaned up by Redis

## Testing

To test the feature:

1. Start receiving sensor readings normally
2. Stop the sensor temporarily (or simulate by pausing requests)
3. The dashboard will continue displaying the last reading for the configured hold time
4. After the hold time expires, the display will return to "No data"

## Limitations

- Only caches heart rate and SpO2 (the most critical metrics)
- Requires Redis to be running
- Hold time is global for all users (can be modified per-user if needed)
