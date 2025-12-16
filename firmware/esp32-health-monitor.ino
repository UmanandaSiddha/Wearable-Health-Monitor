#include <Wire.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_GFX.h>
#include "MAX30100_PulseOximeter.h"
#include <MPU6050.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// ---------- OLED ----------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ---------- Sensors ----------
PulseOximeter pox;
MPU6050 mpu;

// ---------- Thermistor ----------
#define THERMISTOR_PIN 34
#define SERIES_RESISTOR 100000  // 100k
#define BETA_VALUE 3950         // Adjust if you know exact thermistor B-value

const char* WIFI_SSID = "YOUR_SSID";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
WebServer server(80);
const char* DEVICE_ID = "esp32-001";
#define LED_PIN 2

// ---------- Time ----------
uint32_t lastReadTime = 0;

float currentTemp = 36.5;
float currentHR = 0;
float currentSpO2 = 0;
int16_t currentAx = 0, currentAy = 0, currentAz = 0;
int16_t currentGx = 0, currentGy = 0, currentGz = 0;

// ------------------------------------------------------
// Read Thermistor
// ------------------------------------------------------
float readThermistor() {
  int adcValue = analogRead(THERMISTOR_PIN);
  float Vout = adcValue * 3.3 / 4095;
  float Rt = SERIES_RESISTOR * (3.3 - Vout) / Vout;

  float tempK = 1.0 / (1.0 / 298.15 + (1.0 / BETA_VALUE) * log(Rt / 100000.0));
  float tempC = tempK - 273.15;

  return tempC;
}

// ------------------------------------------------------
// MAX30100 callback
// ------------------------------------------------------
void onBeatDetected() {
  Serial.println("Beat detected!");
}

void handleTelemetry() {
  // Enable CORS
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.sendHeader("Content-Type", "application/json");
  
  StaticJsonDocument<512> doc;
  
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = millis();
  doc["heart_rate_bpm"] = (int)currentHR;
  doc["spo2_pct"] = (int)currentSpO2;
  doc["temperature_c"] = currentTemp;
  
  doc["accel"]["x"] = currentAx;
  doc["accel"]["y"] = currentAy;
  doc["accel"]["z"] = currentAz;
  
  doc["gyro"]["x"] = currentGx;
  doc["gyro"]["y"] = currentGy;
  doc["gyro"]["z"] = currentGz;
  
  doc["battery_mv"] = 3900;
  doc["status"]["motion"] = false;
  doc["status"]["fall"] = false;
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "application/json");
  
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["ip_address"] = WiFi.localIP().toString();
  doc["wifi_ssid"] = WiFi.SSID();
  doc["wifi_signal"] = WiFi.RSSI();
  doc["uptime_ms"] = millis();
  doc["connected"] = (WiFi.status() == WL_CONNECTED);
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Access sensor data at: http://");
    Serial.print(WiFi.localIP());
    Serial.println("/telemetry");
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println();
    Serial.println("Failed to connect to WiFi");
    digitalWrite(LED_PIN, LOW);
  }
}

void setupHTTPServer() {
  server.on("/telemetry", HTTP_GET, handleTelemetry);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", 
      "<h1>ESP32 Health Monitor</h1>"
      "<p>API Endpoints:</p>"
      "<ul>"
      "<li><a href='/telemetry'>/telemetry - Get current sensor data (JSON)</a></li>"
      "<li><a href='/status'>/status - Get device status</a></li>"
      "</ul>"
    );
  });
  
  server.begin();
  Serial.println("HTTP server started on port 80");
}

// ------------------------------------------------------
// Setup
// ------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // ----------- I²C INITIALIZATION -----------
  // MAX30100 requires 100kHz only. Force slow I2C.
  Wire.begin(21, 22);
  Wire.setClock(100000);  // <<< critical

  Serial.println("Initializing OLED...");
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED init failed");
    while (1)
      ;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // ----------- MAX30100 INIT ----------
  Serial.println("Initializing MAX30100...");
  if (!pox.begin()) {
    Serial.println("MAX30100 FAILED");
    while (1)
      ;
  }
  pox.setIRLedCurrent(MAX30100_LED_CURR_50MA);
  pox.setOnBeatDetectedCallback(onBeatDetected);


  // ----------- MPU6050 INIT ----------
  Serial.println("Initializing MPU6050...");
  // mpu.initialize();

  // if (!mpu.testConnection()) {
  //   Serial.println("MPU6050 FAILED");
  //   while (1);
  // }

  Serial.println("Scanning for MPU6050...");
  Wire.beginTransmission(0x68);
  if (Wire.endTransmission() == 0) {
    Serial.println("MPU6050 found at 0x68");
    mpu.initialize();
  } else {
    Wire.beginTransmission(0x69);
    if (Wire.endTransmission() == 0) {
      Serial.println("MPU6050 found at 0x69");
      mpu = MPU6050(0x69);  // ⬅ important
      mpu.initialize();
    } else {
      Serial.println("MPU6050 NOT FOUND on 0x68 or 0x69");
      while (1)
        ;
    }
  }

  setupWiFi();
  setupHTTPServer();

  Serial.println("All sensors initialized successfully.");
}

// ------------------------------------------------------
// Loop
// ------------------------------------------------------
void loop() {

  server.handleClient();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, attempting to reconnect...");
    WiFi.reconnect();
  }

  // --- MAX30100 update (must run every loop) ---
  pox.update();

  if (millis() - lastReadTime > 300) {
    lastReadTime = millis();

    // --- MPU data ---
    mpu.getMotion6(&currentAx, &currentAy, &currentAz, &currentGx, &currentGy, &currentGz);

    // --- Thermistor ---
    currentTemp = readThermistor();

    currentHR = pox.getHeartRate();
    currentSpO2 = pox.getSpO2();

    // ---------- OLED OUTPUT ----------
    display.clearDisplay();
    display.setCursor(0, 0);
    display.print("HR: ");
    display.print(currentHR, 1);

    display.print(" SpO2: ");
    display.print(currentSpO2, 1);

    display.setCursor(0, 16);
    display.print("AX:");
    display.print(currentAx);
    display.print(" AY:");
    display.print(currentAy);
    display.print(" AZ:");
    display.print(currentAz);

    display.setCursor(0, 32);
    display.print("Temp: ");
    display.print(currentTemp, 1);
    display.print(" C");

    display.display();

    // ---------- Serial Debug ----------
    Serial.print("HR: ");
    Serial.print(currentHR);
    Serial.print(" SpO2: ");
    Serial.print(currentSpO2);

    Serial.print(" | Temp: ");
    Serial.print(currentTemp);

    Serial.print(" | AX:");
    Serial.print(currentAx);
    Serial.print(" AY:");
    Serial.print(currentAy);
    Serial.print(" AZ:");
    Serial.println(currentAz);
  }
}
