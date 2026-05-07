from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

app = Flask(__name__)

# Konfigurasi Path Absolut
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Daftar file yang wajib ada 
required_files = [
    "model_regresi.pkl",
    "model_hara.pkl",
    "model_varietas.pkl",
    "encoder_hara.pkl",
    "encoder_varietas.pkl"
]

# Validasi keberadaan file sebelum dimuat
print("🔍 Mengecek keberadaan file model ML...")
for f in required_files:
    path = os.path.join(BASE_DIR, f)
    if not os.path.exists(path):
        error_msg = f"File model tidak ditemukan: {path}"
        print(error_msg)
        raise FileNotFoundError(error_msg)

# Memuat model klasifikasi dan regresi
print("Memuat model ML ke memori...")
model_regresi = joblib.load(os.path.join(BASE_DIR, "model_regresi.pkl"))
model_hara = joblib.load(os.path.join(BASE_DIR, "model_hara.pkl"))
model_varietas = joblib.load(os.path.join(BASE_DIR, "model_varietas.pkl"))

encoder_hara = joblib.load(os.path.join(BASE_DIR, "encoder_hara.pkl"))
encoder_varietas = joblib.load(os.path.join(BASE_DIR, "encoder_varietas.pkl"))

print("Model ML berhasil dimuat")

@app.route('/predict', methods=['POST'])
def predict():
    print("--- ML REQUEST RECEIVED ---")
    data_json = request.get_json()
    print("DATA MASUK:", data_json)
    
    if not data_json:
        return jsonify({"error": "No data provided"}), 400
        
    try:
        # Ambil data dari request
        ph = data_json.get('ph')
        n = data_json.get('n')
        p = data_json.get('p')
        k = data_json.get('k')
        
        # Validasi input
        if ph is None or n is None or p is None or k is None:
            return jsonify({"error": "Field ph, n, p, dan k wajib diisi"}), 400
            
        # Data untuk model varietas (4 fitur: n, p, k, ph)
        input_var = np.array([[float(n), float(p), float(k), float(ph)]])
        
        # Data untuk model hara (13 fitur: ph, n, p, k, umur_hst, jarak_tanam, benih, urea, npk, sp36, kcl, umur_panen, hasil_panen)
        # Menggunakan nilai default/dummy untuk fitur yang tidak dikirim oleh sensor ESP32
        input_hara = np.array([[
            float(ph), float(n), float(p), float(k),
            105.0, 0.0, 1.0, 100.0, 100.0, 50.0, 0.0, 105.0, 6.5
        ]])
        
        # Eksekusi Prediksi Klasifikasi
        pred_hara = model_hara.predict(input_hara)
        pred_var = model_varietas.predict(input_var)
        
        # Decode label
        hara_label = encoder_hara.inverse_transform(pred_hara)[0]
        varietas_label = encoder_varietas.inverse_transform(pred_var)[0]
        
        # Eksekusi Prediksi Regresi (Hasil Panen) menggunakan model_regresi
        # Model regresi dilatih dengan 4 fitur: n, p, k, ph
        input_regresi = np.array([[float(n), float(p), float(k), float(ph)]])
        pred_regresi = model_regresi.predict(input_regresi)[0]
        hasil_panen_val = round(float(pred_regresi), 2)
        
        # Response JSON
        hasil = {
            "hasil_panen": hasil_panen_val,
            "kekurangan_hara": hara_label,
            "rekomendasi_varietas": varietas_label,
            "status": "ML Model Aktif (Full)"
        }
        
        print("HASIL:", hasil)
        return jsonify(hasil)
        
    except Exception as e:
        print(f"ERROR PREDIKSI: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("SmartAgri ML API running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000)
