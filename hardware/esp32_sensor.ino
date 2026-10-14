/*
 * ============================================================================
 * PROJETO INTEGRADOR UNIVESP - PI4
 * CASA CUIDA: Sistema IoT para Prevenção de Mofo e Saúde Respiratória
 * 
 * Firmware do Nó Sensor ESP32 + DHT11 / DHT22
 * ============================================================================
 * 
 * ESQUEMA DE LIGAÇÃO (Apenas 3 Fios - Plug and Play, sem solda):
 * 
 *       ESP32 DOIT DevKit V1                 Sensor DHT11 / DHT22
 *      ┌────────────────────┐               ┌────────────────────┐
 *      │                3V3 │───────────────│ VCC (Pino 1)       │
 *      │                GND │───────────────│ GND (Pino 4 / -)   │
 *      │             GPIO 4 │───────────────│ DATA (Pino 2 / out)│
 *      └────────────────────┘               └────────────────────┘
 * 
 * BIBLIOTECAS NECESSÁRIAS NA IDE ARDUINO:
 * 1. DHT sensor library by Adafruit (Gerenciador de Bibliotecas)
 * 2. Adafruit Unified Sensor
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// --- CONFIGURAÇÃO DE REDE WI-FI ---
const char* ssid     = "SEU_WIFI_AQUI";        // Nome da rede Wi-Fi da residência
const char* password = "SUA_SENHA_AQUI";       // Senha do Wi-Fi

// --- ENDEREÇO DA API DE INGESTÃO ---
// Substitua pelo IP do computador onde o script Python está rodando
// Exemplo: http://192.168.1.105:8000/api/telemetria
const char* serverUrl = "http://192.168.15.10:8000/api/telemetria";

// --- CHAVE DE SEGURANÇA IOT (X-SENSOR-KEY) ---
const char* apiKey = "casa-cuida-esp32-key-2026";

// --- IDENTIFICADOR DO NÓ SENSOR ---
const char* sensorId = "esp32_quarto_01";

// --- CONFIGURAÇÃO DO SENSOR DHT ---
#define DHTPIN 4          // Pino GPIO conectado ao pino de dados do DHT
#define DHTTYPE DHT11     // Mude para DHT22 se estiver utilizando o modelo branco
DHT dht(DHTPIN, DHTTYPE);

#define LED_BUILTIN 2     // LED onboard do ESP32 para sinalização visual
const unsigned long INTERVALO_LEITURA_MS = 5000; // Envia a cada 5 segundos

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  Serial.println("\n--- INICIALIZANDO CASA CUIDA (ESP32) ---");
  dht.begin();

  // Conexão ao Wi-Fi
  Serial.print("Conectando ao Wi-Fi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 25) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n-> Wi-Fi Conectado com sucesso!");
    Serial.print("-> Endereço IP do ESP32: ");
    Serial.println(WiFi.localIP());
    // Pisca LED 3x para confirmar conexão
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_BUILTIN, HIGH); delay(150);
      digitalWrite(LED_BUILTIN, LOW); delay(150);
    }
  } else {
    Serial.println("\n-> Falha na conexão Wi-Fi. Verifique SSID e senha.");
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // 1. Leitura dos dados ambientais
    float umidade = dht.readHumidity();
    float temperatura = dht.readTemperature();

    // Validação da leitura do sensor
    if (isnan(umidade) || isnan(temperatura)) {
      Serial.println("[AVISO] Falha ao ler dados do sensor DHT! Verifique as conexões.");
      delay(2000);
      return;
    }

    Serial.printf("[SENSOR] Temp: %.1f °C | Umid: %.1f %%\n", temperatura, umidade);

    // 2. Montagem do payload JSON
    String jsonPayload = "{";
    jsonPayload += "\"sensor_id\":\"" + String(sensorId) + "\",";
    jsonPayload += "\"temperatura\":" + String(temperatura, 2) + ",";
    jsonPayload += "\"umidade\":" + String(umidade, 2);
    jsonPayload += "}";

    // 3. Envio HTTP POST para a API
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Sensor-Key", apiKey);

    digitalWrite(LED_BUILTIN, HIGH); // Acende LED durante transmissão
    int httpResponseCode = http.POST(jsonPayload);
    digitalWrite(LED_BUILTIN, LOW);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("[HTTP %d] Resposta da API: %s\n", httpResponseCode, response.c_str());
    } else {
      Serial.printf("[ERRO HTTP] Falha ao enviar requisição. Código: %d\n", httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("[ALERTA] Wi-Fi desconectado. Tentando reconectar...");
    WiFi.reconnect();
  }

  delay(INTERVALO_LEITURA_MS);
}
