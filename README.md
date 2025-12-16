# Wearable Health Monitoring System - Setup Guide

## 📋 Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account
- Redis installed locally or Redis Cloud account

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# MongoDB Atlas - Get from cloud.mongodb.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wearable-health?retryWrites=true&w=majority

# Redis - Local or Cloud
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# JWT Secret - Generate a random string
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start Redis (if running locally)

```bash
# Windows
redis-server

# Linux/Mac
sudo service redis-server start
```

### 4. Run Development Server

```bash
npm run dev
```

Server will start on [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing the API

### Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

Save the `token` for subsequent requests.

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

### Ingest Sensor Data (ESP32 or Testing)

```bash
curl -X POST http://localhost:3000/api/sensor/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user_id",
    "heartRate": 75,
    "spo2": 98,
    "temperature": 36.8,
    "accel": {"x": 0.1, "y": 0.2, "z": 0.9},
    "gyro": {"x": 0, "y": 0, "z": 0}
  }'
```

### Fetch Live Data

```bash
curl -X GET http://localhost:3000/api/metrics/live \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Fetch Historical Data

```bash
# Last 1 hour (1-minute intervals)
curl -X GET "http://localhost:3000/api/metrics/history?range=1h&interval=1min" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Last 24 hours (5-minute intervals)
curl -X GET "http://localhost:3000/api/metrics/history?range=24h&interval=5min" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Last 7 days (hourly intervals)
curl -X GET "http://localhost:3000/api/metrics/history?range=7d&interval=hour" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Fetch Health Events

```bash
# All events
curl -X GET "http://localhost:3000/api/metrics/events" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Only unacknowledged events
curl -X GET "http://localhost:3000/api/metrics/events?acknowledged=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Limit results
curl -X GET "http://localhost:3000/api/metrics/events?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📂 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/route.ts   # User registration
│   │   │   ├── login/route.ts      # User login
│   │   │   └── verify/route.ts     # Token verification
│   │   ├── sensor/
│   │   │   └── ingest/route.ts     # Sensor data ingestion
│   │   ├── metrics/
│   │   │   ├── live/route.ts       # Real-time data
│   │   │   ├── history/route.ts    # Historical data
│   │   │   └── events/route.ts     # Health events
│   │   └── aggregation/
│   │       └── trigger/route.ts    # Manual aggregation
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   ├── models/
│   │   ├── User.ts                 # User model
│   │   ├── AggregatedMetrics.ts    # Aggregated data model
│   │   └── HealthEvent.ts          # Health event model
│   ├── mongodb.ts                  # MongoDB connection
│   ├── redis.ts                    # Redis client
│   ├── auth.ts                     # JWT helpers
│   ├── rate-limiter.ts             # Rate limiting
│   ├── aggregation-service.ts      # Aggregation logic
│   ├── aggregation-job.ts          # Cron job
│   └── server-init.ts              # Server initialization
├── .env.example                    # Environment template
├── ARCHITECTURE.md                 # System documentation
└── README.md                       # This file
```

---

## 🔧 Configuration

### Aggregation Job

The aggregation cron job runs automatically when the server starts:
- **Frequency**: Every 1 minute
- **Task**: Processes all active users (users with data in Redis)
- **Output**: Aggregated metrics and health events saved to MongoDB

To manually trigger aggregation:

```bash
curl -X POST http://localhost:3000/api/aggregation/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Rate Limiting

- **Sensor Ingestion**: 120 requests per minute per user
- **Implementation**: Redis-backed sliding window
- **Response**: 429 status code when exceeded

---

## 🔌 ESP32 Integration

Update your ESP32 firmware to send data to:

```cpp
const char* serverUrl = "http://your-server.com/api/sensor/ingest";
const char* jwtToken = "Bearer YOUR_JWT_TOKEN";

void sendSensorData() {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", jwtToken);
  
  String payload = "{";
  payload += "\"userId\":\"" + String(userId) + "\",";
  payload += "\"heartRate\":" + String(heartRate) + ",";
  payload += "\"spo2\":" + String(spo2) + ",";
  payload += "\"temperature\":" + String(temperature) + ",";
  payload += "\"accel\":{\"x\":" + String(accelX) + ",\"y\":" + String(accelY) + ",\"z\":" + String(accelZ) + "},";
  payload += "\"gyro\":{\"x\":" + String(gyroX) + ",\"y\":" + String(gyroY) + ",\"z\":" + String(gyroZ) + "}";
  payload += "}";
  
  int httpCode = http.POST(payload);
  http.end();
}
```

---

## 📊 Monitoring

### Check Redis Keys

```bash
# List all sensor keys
redis-cli KEYS "sensor:*"

# Get data for specific user
redis-cli LRANGE "sensor:USER_ID" 0 10
```

### Check MongoDB Collections

Use MongoDB Compass or CLI:

```bash
# Connect
mongosh "mongodb+srv://cluster.mongodb.net/wearable-health"

# Query aggregated metrics
db.aggregatedmetrics.find({userId: ObjectId("user_id")}).sort({startTime: -1}).limit(10)

# Query health events
db.healthevents.find({userId: ObjectId("user_id"), acknowledged: false})
```

---

## 🐛 Troubleshooting

### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Windows: Start Redis
redis-server

# Linux/Mac
sudo service redis-server start
```

### MongoDB Connection Failed
- Verify MONGODB_URI in `.env.local`
- Check network access in MongoDB Atlas (add your IP to whitelist)
- Verify username/password

### Aggregation Not Running
- Check server logs for cron job messages
- Verify `server-init.ts` is imported in `layout.tsx`
- Manually trigger: `POST /api/aggregation/trigger`

---

## 🎯 Next Steps

1. ✅ Set up `.env.local` with your credentials
2. ✅ Register a test user
3. ✅ Send some test sensor data
4. ✅ Wait 1 minute for aggregation to run
5. ✅ Fetch historical data to see aggregated metrics
6. ✅ Review [ARCHITECTURE.md](ARCHITECTURE.md) for system details

---

## 📚 Additional Resources

- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/getting-started/)
- [Redis Installation](https://redis.io/docs/getting-started/)
- [JWT.io Debugger](https://jwt.io/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## 🤝 Support

For questions or issues:
1. Review [ARCHITECTURE.md](ARCHITECTURE.md)
2. Check server logs: `npm run dev`
3. Verify Redis: `redis-cli ping`
4. Test MongoDB connection

---

**Built with**: Next.js 16, MongoDB, Redis, TypeScript, Node-Cron
