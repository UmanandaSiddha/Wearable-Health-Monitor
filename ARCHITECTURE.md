# Wearable Health Data Aggregation System

## System Architecture Overview

This system implements a **two-tier data storage architecture** for wearable health monitoring:
1. **Redis** - Temporary buffer for raw sensor data
2. **MongoDB Atlas** - Permanent storage for aggregated metrics and health events

---

## 🏗️ Architecture Diagram

```
┌─────────────────┐
│   ESP32 Device  │
│  (Wearable)     │
└────────┬────────┘
         │ HTTP POST (1-2Hz)
         ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js Backend                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  POST /api/sensor/ingest                          │  │
│  │  • JWT Authentication                             │  │
│  │  • Rate Limiting (120 req/min)                    │  │
│  │  • Data Validation                                 │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     ▼                                    │
│  ┌─────────────────────────────────┐                   │
│  │      Redis (Temporary Buffer)    │                   │
│  │  • Key: sensor:{userId}          │                   │
│  │  • Type: List (LPUSH/LTRIM)      │                   │
│  │  • Retention: 60 minutes         │                   │
│  │  • Max Size: 3600 samples        │                   │
│  └──────────────┬──────────────────┘                   │
│                 │                                        │
│                 │ Every 1 minute (Cron Job)              │
│                 ▼                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │       Aggregation Service                        │  │
│  │  1. Fetch raw data (last 60 samples)             │  │
│  │  2. Calculate metrics:                            │  │
│  │     - Avg/Min/Max Heart Rate                      │  │
│  │     - Avg SpO₂, Temperature                       │  │
│  │     - Accelerometer magnitude                     │  │
│  │     - Activity level (resting/walking/active)     │  │
│  │  3. Detect health events:                         │  │
│  │     - Low SpO₂ (<92%)                             │  │
│  │     - High/Low Heart Rate                         │  │
│  │     - Fever (>37.5°C)                             │  │
│  │     - Fall detection                              │  │
│  │  4. Save to MongoDB                               │  │
│  └──────────────┬──────────────────────────────────┘  │
│                 │                                        │
│                 ▼                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │     MongoDB Atlas (Permanent Storage)            │  │
│  │  Collections:                                     │  │
│  │  • users                                          │  │
│  │  • aggregatedmetrics                              │  │
│  │    - 1min/5min/hour intervals                     │  │
│  │    - Indexed: userId + startTime                  │  │
│  │  • healthevents                                   │  │
│  │    - Anomaly alerts                               │  │
│  │    - Duplicate prevention (5min)                  │  │
│  └──────────────┬──────────────────────────────────┘  │
│                 │                                        │
└─────────────────┼────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │   Dashboard APIs   │
         │  • /api/metrics/live       - Real-time from Redis
         │  • /api/metrics/history    - Historical from MongoDB
         │  • /api/metrics/events     - Health alerts
         └────────────────────┘
```

---

## 📊 Data Flow

### 1️⃣ **Data Ingestion**
```
ESP32 → POST /api/sensor/ingest → Redis List
```
- Raw sensor data pushed to Redis every 1-2 seconds
- Stored in a **list data structure** (FIFO)
- Automatically trimmed to last 3600 entries (1 hour)
- TTL set to 1 hour

### 2️⃣ **Aggregation Pipeline**
```
Cron (every 1 min) → Fetch from Redis → Aggregate → Save to MongoDB
```
- **Input**: Last 60 raw samples (~1 minute of data)
- **Processing**:
  - Statistical aggregation (avg, min, max)
  - Activity classification
  - Anomaly detection
- **Output**: Single aggregated record per minute

### 3️⃣ **Health Event Detection**
```
Raw Data → Threshold Checks → Health Events → MongoDB
```
- Real-time monitoring during aggregation
- Duplicate prevention (5-minute window)
- Severity levels: info, warning, critical

---

## 🗄️ Database Schemas

### **Users Collection**
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  name: String,
  deviceId: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### **AggregatedMetrics Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  intervalType: "1min" | "5min" | "hour",
  startTime: Date,  // Aligned to interval boundary
  avgHeartRate: Number,
  minHeartRate: Number,
  maxHeartRate: Number,
  avgSpO2: Number,
  avgTemp: Number,
  activityLevel: "resting" | "walking" | "active",
  accelMagnitude: Number,
  sampleCount: Number,
  createdAt: Date
}
// Indexes: (userId, startTime), (userId, intervalType, startTime)
```

### **HealthEvents Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  eventType: "LOW_SPO2" | "HIGH_HR" | "LOW_HR" | "FEVER" | "HYPOTHERMIA" | "FALL_SUSPECTED",
  value: Number,
  severity: "info" | "warning" | "critical",
  timestamp: Date,
  acknowledged: Boolean,
  acknowledgedAt: Date,
  metadata: Object,
  createdAt: Date
}
// Indexes: (userId, timestamp), (userId, acknowledged, timestamp)
```

---

## 💡 Why This Architecture?

### **Why Redis?**
1. **High-Speed Writes**: Handles 1-2 req/sec per device without DB load
2. **Memory-Efficient**: Only stores last 60 minutes (3600 samples × ~200 bytes = ~700KB per user)
3. **Automatic Expiry**: TTL ensures old data is automatically cleaned up
4. **List Operations**: LPUSH/LRANGE are O(1) operations

### **Why Not Store Raw Data in MongoDB?**
| Raw Data (MongoDB) | Aggregated Data (MongoDB) |
|-------------------|---------------------------|
| 60-120 writes/min per user | 1 write/min per user |
| ~8.6 million docs/user/year | ~525K docs/user/year |
| No meaningful queries | Optimized for dashboards |
| High storage cost | 94% storage reduction |

**Storage Calculation**:
- Raw: 2 samples/sec × 60 sec × 60 min × 24 hr × 365 days = **63M documents/year**
- Aggregated (1min): 60 min × 24 hr × 365 days = **525K documents/year**
- **Savings**: ~99% reduction in database writes

### **Why Aggregation?**
1. **Reduce Database Load**: 60:1 write reduction
2. **Meaningful Insights**: Statistical summaries > raw noise
3. **Fast Queries**: Indexed aggregated data loads instantly
4. **ML-Ready**: Pre-processed features for future ML models

---

## 🔐 Security Features

- **JWT Authentication**: All endpoints require valid Bearer token
- **Rate Limiting**: 120 requests/min per user (Redis-backed)
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Type checking and range validation
- **CORS**: Configured for ESP32 cross-origin requests

---

## 📈 Data Retention Policy

| Data Type | Storage | Retention | Purpose |
|-----------|---------|-----------|---------|
| Raw Sensor | Redis | 60 minutes | Real-time dashboard |
| 1min Aggregate | MongoDB | Permanent | Recent trends (24hr) |
| 5min Aggregate | MongoDB | Permanent | Weekly analysis |
| Hour Aggregate | MongoDB | Permanent | Long-term patterns |
| Health Events | MongoDB | Permanent | Medical records |

---

## 🚀 API Endpoints

### **Authentication**
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Get JWT token
- `GET /api/auth/verify` - Verify token

### **Data Ingestion**
- `POST /api/sensor/ingest` - Submit sensor data (ESP32)

### **Dashboard**
- `GET /api/metrics/live` - Real-time data (Redis)
- `GET /api/metrics/history?range=1h&interval=1min` - Historical data
- `GET /api/metrics/events?acknowledged=false` - Health alerts

### **Admin**
- `POST /api/aggregation/trigger` - Manual aggregation trigger

---

## 🔧 Configuration

### **Required Environment Variables**
```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### **Aggregation Job**
- **Schedule**: Cron job runs every minute (`* * * * *`)
- **Startup**: Auto-starts with Next.js server
- **Processing**: All active users (users with Redis data)

---

## 📊 Performance Metrics

### **Expected Load (per user)**
- **Ingestion**: 1-2 req/sec
- **Redis Memory**: ~700KB
- **MongoDB Writes**: 1/minute
- **Dashboard Queries**: <100ms

### **Scalability**
- **100 users**: 120 req/sec, ~70MB Redis, 100 writes/min MongoDB
- **1000 users**: 1200 req/sec, ~700MB Redis, 1000 writes/min MongoDB

---

## 🧪 Testing the System

### **1. Register User**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

### **2. Ingest Sensor Data**
```bash
curl -X POST http://localhost:3000/api/sensor/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "USER_ID",
    "heartRate": 75,
    "spo2": 98,
    "temperature": 36.8,
    "accel": {"x": 0.1, "y": 0.2, "z": 0.9}
  }'
```

### **3. Fetch Live Data**
```bash
curl http://localhost:3000/api/metrics/live \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **4. Fetch Historical Data**
```bash
curl "http://localhost:3000/api/metrics/history?range=1h&interval=1min" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎯 Future Enhancements

1. **ML Model Integration**: Anomaly detection, sleep analysis
2. **WebSocket Support**: Real-time push notifications
3. **Multi-Device Support**: Link multiple wearables to one account
4. **Data Export**: CSV/JSON export for medical records
5. **Advanced Analytics**: Correlation analysis, trend prediction

---

## 🎓 Viva Defense Points

### **Why this architecture?**
- Redis = Speed, MongoDB = Persistence
- Aggregation reduces storage by 99%
- Real-time + Historical data access

### **How does it scale?**
- Redis: Horizontal scaling with Redis Cluster
- MongoDB: Sharding by userId
- Cron: Distributed job queue (Bull/BullMQ)

### **What if Redis fails?**
- Graceful degradation: Data writes fail, but app continues
- Solution: Redis persistence (RDB/AOF) + replicas

### **Data accuracy?**
- Timestamp alignment to interval boundaries
- Duplicate event prevention (5min window)
- Sample count tracking for confidence

---

## 📝 Summary

This system efficiently handles **wearable health data** by:
1. ✅ Buffering raw data in Redis (temporary)
2. ✅ Aggregating every minute to reduce DB load
3. ✅ Detecting health anomalies in real-time
4. ✅ Storing meaningful summaries in MongoDB
5. ✅ Providing fast dashboard queries
6. ✅ Preparing data for future ML analysis

**Result**: Scalable, cost-effective, and ML-ready health monitoring system! 🚀
