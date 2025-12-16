# ESP32 Integration Script
# Update your ESP32 firmware to send data to the new ingestion endpoint

## Required Changes:

1. **Add JWT Token**: Get token from /api/auth/login
2. **Update Endpoint**: Change to /api/sensor/ingest
3. **Add Headers**: Include Authorization header
4. **Update Payload Format**: Match new schema

## Example ESP32 Code:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration
const char* serverUrl = "http://your-server.com/api/sensor/ingest";
const char* jwtToken = "YOUR_JWT_TOKEN_HERE"; // Get from /api/auth/login

// User ID (from registration)
const char* userId = "YOUR_USER_ID";

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(serverUrl);
  
  // Set headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + jwtToken);
  
  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["userId"] = userId;
  doc["heartRate"] = getHeartRate(); // Your sensor reading function
  doc["spo2"] = getSpO2();
  doc["temperature"] = getTemperature();
  
  JsonObject accel = doc.createNestedObject("accel");
  accel["x"] = getAccelX();
  accel["y"] = getAccelY();
  accel["z"] = getAccelZ();
  
  JsonObject gyro = doc.createNestedObject("gyro");
  gyro["x"] = getGyroX();
  gyro["y"] = getGyroY();
  gyro["z"] = getGyroZ();
  
  String payload;
  serializeJson(doc, payload);
  
  // Send POST request
  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Response: " + response);
  } else {
    Serial.println("Error: " + String(httpCode));
  }
  
  http.end();
}

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi connected");
}

void loop() {
  // Send sensor data every 1-2 seconds
  sendSensorData();
  delay(2000);
}
```

## Getting JWT Token:

### Option 1: Use cURL

```bash
curl -X POST http://your-server.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

### Option 2: Use ESP32 to login

```cpp
String getJWTToken(const char* email, const char* password) {
  HTTPClient http;
  http.begin("http://your-server.com/api/auth/login");
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\"email\":\"" + String(email) + "\",\"password\":\"" + String(password) + "\"}";
  int httpCode = http.POST(payload);
  
  if (httpCode == 200) {
    String response = http.getString();
    // Parse JSON to extract token
    // Return token
  }
  
  http.end();
  return "";
}
```

## Data Format Requirements:

- **heartRate**: 0-300 bpm
- **spo2**: 0-100%
- **temperature**: 20-50°C
- **accel**: {x, y, z} in g (gravity units)
- **gyro**: {x, y, z} in deg/s

## Error Codes:

- **401**: Invalid or missing JWT token
- **429**: Rate limit exceeded (max 120 req/min)
- **400**: Invalid data format or out of range values
- **500**: Server error

## Testing:

1. Register user: POST /api/auth/register
2. Login: POST /api/auth/login (get token)
3. Send data: POST /api/sensor/ingest (with token)
4. Check live data: GET /api/metrics/live (with token)
