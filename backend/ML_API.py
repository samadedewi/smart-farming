from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

app = Flask(__name__)

# Konfigurasi Path Absolut ke direktori model baru
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "MODEL_ML", "new")

# Daftar file yang wajib ada 
required_files = [
    "model_rekomendasi_varietas.pkl",
    "model_estimasi_pupuk.pkl",
    "model_estimasi_waktu.pkl",
    "model_estimasi_hasil.pkl",
    "le_kecamatan.pkl",
    "le_tanah.pkl",
    "le_tekstur.pkl",
    "le_fase.pkl",
    "le_varietas.pkl"
]

# Validasi keberadaan file sebelum dimuat
print("[ML] Mengecek keberadaan file model ML baru...")
for f in required_files:
    path = os.path.join(MODEL_DIR, f)
    if not os.path.exists(path):
        error_msg = f"File model tidak ditemukan: {path}"
        print(error_msg)
        raise FileNotFoundError(error_msg)

# Memuat model klasifikasi, regresi, dan label encoders
print("Memuat model ML baru ke memori...")
model_varietas = joblib.load(os.path.join(MODEL_DIR, "model_rekomendasi_varietas.pkl"))
model_pupuk = joblib.load(os.path.join(MODEL_DIR, "model_estimasi_pupuk.pkl"))
model_waktu = joblib.load(os.path.join(MODEL_DIR, "model_estimasi_waktu.pkl"))
model_hasil = joblib.load(os.path.join(MODEL_DIR, "model_estimasi_hasil.pkl"))

le_kecamatan = joblib.load(os.path.join(MODEL_DIR, "le_kecamatan.pkl"))
le_tanah = joblib.load(os.path.join(MODEL_DIR, "le_tanah.pkl"))
le_tekstur = joblib.load(os.path.join(MODEL_DIR, "le_tekstur.pkl"))
le_fase = joblib.load(os.path.join(MODEL_DIR, "le_fase.pkl"))
le_varietas = joblib.load(os.path.join(MODEL_DIR, "le_varietas.pkl"))

print("Model ML Baru berhasil dimuat.")

def safe_encode(encoder, value, default_idx=0):
    try:
        val_str = str(value).strip()
        # Mapping khusus untuk fase tanaman
        if encoder == le_fase:
            if "awal" in val_str.lower() or "v1" in val_str.lower():
                val_str = "Vegetatif Awal"
            elif "aktif" in val_str.lower() or "akhir" in val_str.lower() or "v6" in val_str.lower() or "vt" in val_str.lower():
                val_str = "Vegetatif Aktif"
            elif "generatif" in val_str.lower() or "r1" in val_str.lower() or "panen" in val_str.lower():
                val_str = "Generatif"

        # Cek kecocokan langsung
        if val_str in encoder.classes_:
            return int(encoder.transform([val_str])[0])
        
        # Cek kecocokan case-insensitive
        for cls in encoder.classes_:
            if str(cls).lower() == val_str.lower():
                return int(encoder.transform([cls])[0])
                
        # Cek substring
        for cls in encoder.classes_:
            if val_str.lower() in str(cls).lower() or str(cls).lower() in val_str.lower():
                return int(encoder.transform([cls])[0])
                
        # Default fallback
        print(f"[ML] Warning: Value '{value}' mapped to '{val_str}' not found in classes {encoder.classes_}. Using class at index {default_idx} ({encoder.classes_[default_idx]})")
        return int(default_idx)
    except Exception as e:
        print(f"[ML] Encoding error for {value}: {str(e)}. Using default index {default_idx}")
        return int(default_idx)

@app.route('/predict', methods=['POST'])
def predict():
    print("--- ML REQUEST RECEIVED ---")
    data_json = request.get_json()
    print("DATA MASUK:", data_json)
    
    if not data_json:
        return jsonify({"error": "No data provided"}), 400
        
    try:
        # Ambil input dengan fallback nilai default yang masuk akal
        ph = float(data_json.get('ph', 6.5))
        n_ppm = float(data_json.get('n', data_json.get('nitrogen', 100.0)))
        p_ppm = float(data_json.get('p', data_json.get('phosphorus', 50.0)))
        k_ppm = float(data_json.get('k', data_json.get('kalium', 80.0)))
        
        # Data lahan tambahan (dari konfigurasi lahan)
        kecamatan_str = data_json.get('kecamatan', 'Tomohon')
        jenis_tanah_str = data_json.get('jenis_tanah', 'Andosol')
        tekstur_str = data_json.get('tekstur', 'Lempung') # 'Lempung', 'Lempung Berpasir', 'Pasir'
        varietas_str = data_json.get('varietas', '') # jika kosong akan diprediksi dulu
        
        total_n_dasar = float(data_json.get('total_n_dasar', 50.0))
        total_p_dasar = float(data_json.get('total_p_dasar', 40.0))
        total_k_dasar = float(data_json.get('total_k_dasar', 30.0))
        
        umur_hst = float(data_json.get('umur_hst', data_json.get('umur_tanaman_aktif', 15.0)))
        fase_str = data_json.get('fase_tanaman', 'Vegetatif Awal')

        # Encode categorical inputs
        kecamatan_encoded = safe_encode(le_kecamatan, kecamatan_str, default_idx=5) # default Tomohon
        jenis_tanah_encoded = safe_encode(le_tanah, jenis_tanah_str, default_idx=0) # default Andosol
        tekstur_encoded = safe_encode(le_tekstur, tekstur_str, default_idx=0) # default Lempung
        fase_encoded = safe_encode(le_fase, fase_str, default_idx=2) # default Vegetatif Awal
        
        # --- MODEL 1: REKOMENDASI VARIETAS ---
        # Features: ['kecamatan_encoded', 'jenis_tanah_encoded', 'tekstur_encoded', 'ph']
        input_var = np.array([[kecamatan_encoded, jenis_tanah_encoded, tekstur_encoded, ph]])
        pred_var = model_varietas.predict(input_var)[0]
        rekomendasi_varietas = le_varietas.inverse_transform([pred_var])[0]
        
        # Jika varietas_str tidak dikirim oleh client, gunakan rekomendasi dari Model 1
        if not varietas_str:
            varietas_str = rekomendasi_varietas
            
        varietas_encoded = safe_encode(le_varietas, varietas_str, default_idx=pred_var)

        # --- MODEL 2: ESTIMASI DOSIS PUPUK SUSULAN ---
        # Features: ['kecamatan_encoded', 'varietas_encoded', 'jenis_tanah_encoded', 'tekstur_encoded', 
        #            'total_n_dasar', 'total_p_dasar', 'total_k_dasar', 'umur_hst', 'fase_tanaman_encoded', 
        #            'ph', 'n_ppm', 'p_ppm', 'k_ppm']
        input_pupuk = np.array([[
            kecamatan_encoded, varietas_encoded, jenis_tanah_encoded, tekstur_encoded,
            total_n_dasar, total_p_dasar, total_k_dasar, umur_hst, fase_encoded,
            ph, n_ppm, p_ppm, k_ppm
        ]])
        pred_pupuk = model_pupuk.predict(input_pupuk)[0]
        dosis_urea = max(0.0, round(float(pred_pupuk[0]), 2))
        dosis_sp36 = max(0.0, round(float(pred_pupuk[1]), 2))
        dosis_kcl = max(0.0, round(float(pred_pupuk[2]), 2))

        # --- MODEL 3: ESTIMASI SISA HARI PANEN ---
        # Features: ['varietas_encoded', 'umur_hst', 'fase_tanaman_encoded', 'ph', 'n_ppm', 'p_ppm', 'k_ppm']
        input_waktu = np.array([[
            varietas_encoded, umur_hst, fase_encoded, ph, n_ppm, p_ppm, k_ppm
        ]])
        pred_waktu = model_waktu.predict(input_waktu)[0]
        sisa_hari_panen = max(0.0, round(float(pred_waktu), 1))

        # --- MODEL 4: ESTIMASI HASIL AKHIR PANEN ---
        # Features: ['kecamatan_encoded', 'varietas_encoded', 'jenis_tanah_encoded', 'tekstur_encoded', 
        #            'total_n_dasar', 'total_p_dasar', 'total_k_dasar', 'ph', 'n_ppm', 'p_ppm', 'k_ppm']
        input_hasil = np.array([[
            kecamatan_encoded, varietas_encoded, jenis_tanah_encoded, tekstur_encoded,
            total_n_dasar, total_p_dasar, total_k_dasar, ph, n_ppm, p_ppm, k_ppm
        ]])
        pred_hasil = model_hasil.predict(input_hasil)[0]
        hasil_panen_estimasi = max(0.0, round(float(pred_hasil), 2))

        # Response JSON yang lengkap
        hasil = {
            "rekomendasi_varietas": rekomendasi_varietas,
            "dosis_urea": dosis_urea,
            "dosis_sp36": dosis_sp36,
            "dosis_kcl": dosis_kcl,
            "sisa_hari_panen": sisa_hari_panen,
            "hasil_panen": hasil_panen_estimasi,
            "status": "ML Model Baru Aktif (Full 4 Model)"
        }
        
        print("HASIL PREDISKI:", hasil)
        return jsonify(hasil)
        
    except Exception as e:
        print(f"ERROR PREDIKSI: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("SiTani ML API (4 Model Baru) running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000)
