# SmartAgri IoT — Backend (Express.js)

Backend REST API untuk menerima data sensor dari ESP32 dan menyajikannya ke dashboard React.

## Cara Menjalankan

```bash
cd backend
node server.js
# Server berjalan di http://localhost:3001
```

---

## Endpoint API

### `GET /`
Health check, menampilkan info server dan daftar endpoint.

---

### `POST /api/sensor`
Menerima data sensor dari ESP32.

**Request Body:**
```json
{
  "ph": 6.5,
  "nitrogen": 120,
  "phosphorus": 80,
  "kalium": 95,
  "suhu": 29.5,
  "kelembaban": 65
}
```
> ⚠️ `ph`, `nitrogen`, `phosphorus`, `kalium` **wajib diisi**.  
> `suhu` dan `kelembaban` opsional.

**Response (201):**
```json
{
  "success": true,
  "message": "Data sensor berhasil disimpan",
  "data": {
    "id": 21,
    "ph": 6.5,
    "nitrogen": 120,
    "phosphorus": 80,
    "kalium": 95,
    "suhu": 29.5,
    "kelembaban": 65,
    "timestamp": "2026-04-29T10:15:09.000Z",
    "source": "esp32",
    "analysis": {
      "phStatus": "Optimal",
      "nStatus": "Cukup",
      "pStatus": "Cukup",
      "kStatus": "Cukup",
      "soilStatus": "Siap Tanam"
    }
  }
}
```

**Response Validasi Gagal (422):**
```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": ["kalium wajib diisi"]
}
```

---

### `GET /api/sensor/latest`
Mengambil 1 data sensor paling baru.

---

### `GET /api/sensor/history`
Mengambil semua riwayat data. Mendukung pagination:

```
GET /api/sensor/history?limit=10&page=1&order=desc
```

| Parameter | Default | Deskripsi |
|-----------|---------|-----------|
| `limit`   | semua   | Jumlah data per halaman |
| `page`    | 1       | Halaman ke- |
| `order`   | `desc`  | Urutan: `asc` / `desc` |

---

### `GET /api/sensor/stats`
Mengembalikan statistik rata-rata, min, dan maks dari semua data.

---

### `DELETE /api/sensor/clear`
Menghapus semua data dari memori (untuk keperluan testing).

---

## Integrasi ESP32

Contoh kode Arduino untuk mengirim data ke API ini:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "NamaWiFi";
const char* password = "PasswordWiFi";
const char* serverUrl = "http://192.168.1.100:3001/api/sensor"; // IP PC Anda

void kirimData(float ph, int nitrogen, int phosphorus, int kalium, float suhu, int kelembaban) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String payload = "{";
    payload += "\"ph\":" + String(ph, 1) + ",";
    payload += "\"nitrogen\":" + String(nitrogen) + ",";
    payload += "\"phosphorus\":" + String(phosphorus) + ",";
    payload += "\"kalium\":" + String(kalium) + ",";
    payload += "\"suhu\":" + String(suhu, 1) + ",";
    payload += "\"kelembaban\":" + String(kelembaban);
    payload += "}";

    int httpCode = http.POST(payload);
    Serial.println("HTTP Code: " + String(httpCode));
    http.end();
  }
}
```

---

## Catatan

- Data disimpan **sementara di memori (array)**. Data akan hilang saat server restart.
- Untuk produksi, ganti array dengan database seperti **MySQL** atau **MongoDB**.
- Batas penyimpanan: **500 rekaman** (data lama otomatis terhapus saat penuh).
