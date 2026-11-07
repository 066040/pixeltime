/*
  PixelTime Saat — Wi-Fi senkron deneme yazılımı (ESP32-C3)

  Ne yapar:
   - İlk açılışta Wi-Fi bilgisi yoksa "PixelTime-XXXX" adında bir ağ açar. Telefonla bu ağa bağlan,
     açılan sayfadan evdeki Wi-Fi'yi seç, şifreyi yaz. (WiFiManager kütüphanesi)
   - Biten her 25 dakikalık bloğu hafızaya (NVS) yazar. İnternet yokken de birikir, kapanınca silinmez.
   - Wi-Fi bulunca saati internetten ayarlar (NTP) ve biriken blokları imzalı olarak siteye gönderir.
   - Site kabul ettiği blokları bildirir, saat onları hafızadan siler.

  Deneme için: BOOT tuşuna (GPIO9) bir kez bas = "şu an biten 25 dakikalık bir blok" eklenir.
  Gerçek saatte bu çağrıyı pomodoro bittiğinde queueBlock(baslangic, bitis) yapacak.

  Gerekenler (Arduino IDE → Kütüphane Yöneticisi):
   - WiFiManager (tzapu)        - ArduinoJson (Benoit Blanchon, 7.x)
  Kart: "ESP32C3 Dev Module", USB CDC On Boot: Enabled

  Kurulum:
   1) python3 tools/yeni_saat.py PT-0001  → cihaz_kimligi.h oluşur, SQL satırını Supabase'de çalıştır
   2) ayarlar.h içine Supabase URL ve anon anahtarını yaz
   3) Yükle, Seri Monitör 115200
*/
#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <time.h>
#include "mbedtls/md.h"
#include "ayarlar.h"
#include "cihaz_kimligi.h"

#define BTN_PIN 9
const uint32_t BLOCK_SEC = 25 * 60;
const int MAX_QUEUE = 200;            // ~83 saat; daha fazlası birikirse en eskiler gider
const uint32_t SYNC_EVERY_MS = 5UL * 60 * 1000;

Preferences nvs;
struct Block { uint32_t id, s, e; };
Block q[MAX_QUEUE];
int qn = 0;
uint32_t nextId = 1;
uint32_t lastSync = 0;
bool timeOk = false;

// ---------- Hafıza (kapanınca silinmez) ----------
void loadQueue() {
  nvs.begin("pt", false);
  nextId = nvs.getUInt("next", 1);
  qn = nvs.getBytesLength("q") / sizeof(Block);
  if (qn > MAX_QUEUE) qn = 0;
  if (qn) nvs.getBytes("q", q, qn * sizeof(Block));
}
void saveQueue() {
  nvs.putUInt("next", nextId);
  if (qn) nvs.putBytes("q", q, qn * sizeof(Block)); else nvs.remove("q");
}
void queueBlock(uint32_t s, uint32_t e) {
  if (qn == MAX_QUEUE) { memmove(q, q + 1, (MAX_QUEUE - 1) * sizeof(Block)); qn--; }
  q[qn++] = { nextId++, s, e };
  saveQueue();
  Serial.printf("Blok eklendi #%u (%d bekliyor)\n", q[qn - 1].id, qn);
}

// ---------- İmza: HMAC-SHA256(secret, serial|ts|id,s,e;id,s,e) ----------
String hmacHex(const String& msg) {
  uint8_t out[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1);
  mbedtls_md_hmac_starts(&ctx, (const uint8_t*)PT_SECRET, strlen(PT_SECRET));
  mbedtls_md_hmac_update(&ctx, (const uint8_t*)msg.c_str(), msg.length());
  mbedtls_md_hmac_finish(&ctx, out);
  mbedtls_md_free(&ctx);
  char hex[65];
  for (int i = 0; i < 32; i++) sprintf(hex + i * 2, "%02x", out[i]);
  return String(hex);
}

// ---------- Gönderim ----------
bool syncNow() {
  if (WiFi.status() != WL_CONNECTED || !timeOk) return false;
  if (!qn) return true;
  int n = qn > 60 ? 60 : qn;                 // sunucu tek seferde en fazla 60 alır
  uint32_t ts = (uint32_t)time(nullptr);

  JsonDocument doc;
  doc["p_serial"] = PT_SERIAL;
  doc["p_ts"] = ts;
  doc["p_fw"] = PT_FW_VERSION;
  JsonArray arr = doc["p_blocks"].to<JsonArray>();
  String msg = String(PT_SERIAL) + "|" + String(ts) + "|";
  for (int i = 0; i < n; i++) {
    JsonObject o = arr.add<JsonObject>();
    o["c"] = String(q[i].id); o["s"] = q[i].s; o["e"] = q[i].e;
    if (i) msg += ";";
    msg += String(q[i].id) + "," + String(q[i].s) + "," + String(q[i].e);
  }
  doc["p_sig"] = hmacHex(msg);
  String body; serializeJson(doc, body);

  WiFiClientSecure tls;
  tls.setInsecure();   // TODO ürün: Supabase kök sertifikasını ekle (setCACert). İmza zaten sahte kaydı engelliyor.
  HTTPClient http;
  http.begin(tls, String(PT_SUPABASE_URL) + "/rest/v1/rpc/device_record");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", PT_SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + PT_SUPABASE_KEY);
  int code = http.POST(body);
  String resp = http.getString();
  http.end();
  Serial.printf("Gönderim: HTTP %d %s\n", code, resp.c_str());
  if (code != 200) return false;

  JsonDocument r;
  if (deserializeJson(r, resp)) return false;
  if (r["unclaimed"] | false) {
    Serial.printf("Saat henüz bir hesaba bağlı değil. Sitede Profil → Saatini bağla → %s\n", PT_CLAIM_CODE);
    return false;   // bloklar silinmez, bağlanınca gönderilir
  }
  // Kabul edilenler ve kalıcı olarak reddedilenler (süre, çakışma, günlük sınır...) kuyruktan çıkar
  auto drop = [&](uint32_t id) {
    for (int i = 0; i < qn; i++) if (q[i].id == id) { memmove(q + i, q + i + 1, (qn - i - 1) * sizeof(Block)); qn--; return; }
  };
  for (JsonVariant v : r["accepted"].as<JsonArray>()) drop(String(v.as<const char*>()).toInt());
  for (JsonVariant v : r["rejected"].as<JsonArray>()) {
    Serial.printf("Reddedildi #%s: %s\n", v["c"].as<const char*>(), v["reason"].as<const char*>());
    drop(String(v["c"].as<const char*>()).toInt());
  }
  saveQueue();
  Serial.printf("Kuyrukta kalan: %d\n", qn);
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(BTN_PIN, INPUT_PULLUP);
  loadQueue();
  Serial.printf("\nPixelTime Saat %s · %s · eşleştirme kodu %s · %d blok bekliyor\n", PT_SERIAL, PT_FW_VERSION, PT_CLAIM_CODE, qn);

  WiFiManager wm;
  wm.setConfigPortalTimeout(180);            // 3 dk içinde kurulmazsa çevrimdışı devam
  String ap = String("PixelTime-") + String(PT_SERIAL).substring(3);
  if (wm.autoConnect(ap.c_str())) Serial.println("Wi-Fi bağlı.");
  else Serial.println("Wi-Fi yok, çevrimdışı devam (bloklar birikir).");

  configTime(0, 0, "pool.ntp.org", "time.google.com");   // UTC; ekranda göstermek için +3 eklenir
}

void loop() {
  if (!timeOk && time(nullptr) > 1700000000) { timeOk = true; Serial.println("Saat internetten ayarlandı."); syncNow(); lastSync = millis(); }

  static bool last = HIGH;
  bool now = digitalRead(BTN_PIN);
  if (last == HIGH && now == LOW) {
    if (!timeOk) Serial.println("Önce saat ayarlanmalı (Wi-Fi gerekli). Gerçek saatte RTC (RV-3028) bu işi görür.");
    else { uint32_t e = time(nullptr); queueBlock(e - BLOCK_SEC, e); syncNow(); lastSync = millis(); }
    delay(250);
  }
  last = now;

  if (WiFi.status() == WL_CONNECTED && millis() - lastSync > SYNC_EVERY_MS) { syncNow(); lastSync = millis(); }
}
