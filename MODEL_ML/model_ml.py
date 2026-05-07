import os

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score, classification_report, ConfusionMatrixDisplay
from sklearn.preprocessing import LabelEncoder
import pickle

# =========================
# FOLDER OUTPUT
# =========================
os.makedirs("output_model", exist_ok=True)

# =========================
# LOAD DATA
# =========================
df = pd.read_csv('D:/Kuliah/Semester 6/Pembelajaran Mesin/Project/Dataset/data_jagung_bersih.csv')
df.columns = df.columns.str.strip().str.lower()

# =========================
# CLEANING
# =========================
def convert_jarak(x):
    try:
        if isinstance(x, str) and 'x' in x:
            a, b = x.split('x')
            return (int(a) + int(b)) / 2
        return 0
    except:
        return 0

df['jarak_tanam'] = df['jarak_tanam'].apply(convert_jarak)
df['kekurangan_hara'] = df['kekurangan_hara'].replace('-', 'seimbang')

df['varietas'] = df['varietas'].astype(str).str.strip()
df = df.fillna(0)

# =========================
# ENCODING
# =========================
df_encoded = pd.get_dummies(df, columns=['varietas', 'jenis_tanah', 'tekstur'], drop_first=True)

# =========================================================
# 1. REGRESI
# =========================================================

y_reg = df['hasil']

X_reg = df[['n', 'p', 'k', 'ph']].fillna(0)

Xr_train, Xr_test, yr_train, yr_test = train_test_split(
    X_reg,
    y_reg,
    test_size=0.2,
    random_state=42
)

lr = LinearRegression()

lr.fit(Xr_train, yr_train)

y_pred_reg = lr.predict(Xr_test)

print("\n=== REGRESI ===")
print("MAE:", round(mean_absolute_error(yr_test, y_pred_reg), 3))
print("R2:", round(r2_score(yr_test, y_pred_reg), 3))

plt.figure()

plt.scatter(yr_test, y_pred_reg)

plt.xlabel("Aktual")
plt.ylabel("Prediksi")

plt.title("Regresi: Aktual vs Prediksi")

plt.savefig(
    "output_model/regresi.png",
    dpi=300,
    bbox_inches='tight'
)

plt.close()

# =========================================================
# 2. RANDOM FOREST HARA
# =========================================================
y_hara = df_encoded['kekurangan_hara']
X_hara = df_encoded.drop(columns=['kekurangan_hara', 'hasil', 'rekomendasi'])
X_hara = X_hara.select_dtypes(include=np.number)

le_hara = LabelEncoder()
y_hara_enc = le_hara.fit_transform(y_hara)

Xh_train, Xh_test, yh_train, yh_test = train_test_split(
    X_hara, y_hara_enc, test_size=0.2, random_state=42
)

rf_hara = RandomForestClassifier(n_estimators=150, max_depth=12, random_state=42)
rf_hara.fit(Xh_train, yh_train)

y_pred_hara = rf_hara.predict(Xh_test)

print("\n=== RANDOM FOREST HARA ===")
print("Akurasi:", round(accuracy_score(yh_test, y_pred_hara), 3))
print(classification_report(yh_test, y_pred_hara, target_names=le_hara.classes_, zero_division=0))

# CONFUSION MATRIX HARA
plt.figure()
ConfusionMatrixDisplay.from_predictions(yh_test, y_pred_hara)
plt.title("Confusion Matrix - HARA")
plt.savefig("output_model/confusion_matrix_hara.png", dpi=300, bbox_inches='tight')
plt.close()

# =========================================================
# 3. RANDOM FOREST VARIETAS
# =========================================================
y_var = df['varietas']
X_var = df[['n', 'p', 'k', 'ph']].fillna(0)

le_var = LabelEncoder()
y_var_enc = le_var.fit_transform(y_var)

counts = pd.Series(y_var_enc).value_counts()
valid = counts[counts > 1].index
mask = np.isin(y_var_enc, valid)

X_var = X_var[mask]
y_var_enc = y_var_enc[mask]

Xv_train, Xv_test, yv_train, yv_test = train_test_split(
    X_var, y_var_enc,
    test_size=0.2,
    random_state=42,
    stratify=y_var_enc
)

rf_var = RandomForestClassifier(n_estimators=200, max_depth=15, random_state=42)
rf_var.fit(Xv_train, yv_train)

y_pred_var = rf_var.predict(Xv_test)

print("\n=== RANDOM FOREST VARIETAS ===")
print("Akurasi:", round(accuracy_score(yv_test, y_pred_var), 3))

print(classification_report(
    yv_test,
    y_pred_var,
    labels=np.unique(y_var_enc),
    target_names=le_var.inverse_transform(np.unique(y_var_enc)),
    zero_division=0
))

# CONFUSION MATRIX VARIETAS
plt.figure()
ConfusionMatrixDisplay.from_predictions(yv_test, y_pred_var)
plt.title("Confusion Matrix - VARIETAS")
plt.savefig("output_model/confusion_matrix_varietas.png", dpi=300, bbox_inches='tight')
plt.close()

# =========================================================
# PREDIKSI
# =========================================================
sample_hara = X_hara.iloc[[0]]
sample_reg = X_reg.iloc[[0]]
sample_var = X_var.iloc[[0]]

pred_hara = rf_hara.predict(sample_hara)
label_hara = le_hara.inverse_transform(pred_hara)[0]

pred_hasil = lr.predict(sample_reg)[0]

sample_var_fix = pd.DataFrame([{
    'n': sample_var.iloc[0]['n'],
    'p': sample_var.iloc[0]['p'],
    'k': sample_var.iloc[0]['k'],
    'ph': sample_var.iloc[0]['ph']
}])

pred_var = rf_var.predict(sample_var_fix)
label_var = le_var.inverse_transform(pred_var)[0]

print("\n=== HASIL SISTEM ===")
print("Prediksi Hasil Panen:", round(pred_hasil, 2), "ton/ha")
print("Kekurangan Hara:", label_hara)
print("Rekomendasi Varietas:", label_var)

# =========================================================
# VISUAL NPK
# =========================================================
n = sample_var_fix.iloc[0]['n']
p = sample_var_fix.iloc[0]['p']
k = sample_var_fix.iloc[0]['k']

plt.figure()
plt.bar(['N','P','K'], [n, p, k])
plt.title("Kondisi Tanah + Rekomendasi Varietas")
plt.text(1, max(n,p,k)*0.9, f"Varietas: {label_var}", ha='center')

plt.savefig("output_model/npk_varietas.png", dpi=300, bbox_inches='tight')
plt.close()

# =========================================================
# SAVE MODEL
# =========================================================
pickle.dump(lr, open("model_regresi.pkl", "wb"))
pickle.dump(rf_hara, open("model_hara.pkl", "wb"))
pickle.dump(rf_var, open("model_varietas.pkl", "wb"))
pickle.dump(le_hara, open("encoder_hara.pkl", "wb"))
pickle.dump(le_var, open("encoder_varietas.pkl", "wb"))

print("\nMODEL + SEMUA OUTPUT GAMBAR SIAP (output_model/)")