import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import { StatCard, StatusBanner } from '../components/Cards';
import { PhChart, NPKChart } from '../components/Charts';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { generateNotifications } from '../components/Notifications';
import { BASE_URL } from '../services/sensorService';

// Konfigurasi Varietas Jagung (Logika Agronomis)
const VARIETIES = {
  'Bisi 2': {
    harvest: 115,
    phases: { vAwal: 30, vAkhir: 60, generatif: 115 },
    ideals: {
      vAwal: { n: [100, 120], p: [60, 80], k: [80, 100], ph: [5.5, 7.5] },
      vAkhir: { n: [120, 150], p: [80, 100], k: [100, 120], ph: [5.5, 7.5] },
      generatif: { n: [80, 100], p: [50, 70], k: [110, 130], ph: [5.5, 7.5] }
    }
  },
  'NK Perkasa': {
    harvest: 110,
    phases: { vAwal: 25, vAkhir: 55, generatif: 110 },
    ideals: {
      vAwal: { n: [100, 120], p: [60, 80], k: [80, 100], ph: [5.5, 7.5] },
      vAkhir: { n: [120, 150], p: [80, 100], k: [100, 120], ph: [5.5, 7.5] },
      generatif: { n: [80, 100], p: [50, 70], k: [110, 130], ph: [5.5, 7.5] }
    }
  },
  'Pertiwi': {
    harvest: 105,
    phases: { vAwal: 25, vAkhir: 50, generatif: 105 },
    ideals: {
      vAwal: { n: [100, 120], p: [60, 80], k: [80, 100], ph: [5.5, 7.5] },
      vAkhir: { n: [120, 150], p: [80, 100], k: [100, 120], ph: [5.5, 7.5] },
      generatif: { n: [80, 100], p: [50, 70], k: [110, 130], ph: [5.5, 7.5] }
    }
  },
  'Pioneer Sweet Corn': {
    harvest: 90,
    phases: { vAwal: 20, vAkhir: 45, generatif: 90 },
    ideals: {
      vAwal: { n: [100, 120], p: [60, 80], k: [80, 100], ph: [5.5, 7.5] },
      vAkhir: { n: [120, 150], p: [80, 100], k: [100, 120], ph: [5.5, 7.5] },
      generatif: { n: [80, 100], p: [50, 70], k: [110, 130], ph: [5.5, 7.5] }
    }
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'lahan', 'perencanaan', 'eksekusi'

  // Data State
  const [latestSensor, setLatestSensor] = useState(null);
  const [sensorHistory, setSensorHistory] = useState([]);
  const [lahanList, setLahanList] = useState([]);
  const [selectedLahanId, setSelectedLahanId] = useState('');
  const [pemupukanList, setPemupukanList] = useState([]);

  // UI & Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Utility to prevent date shifting due to timezone differences when communicating with MySQL DATE columns
  const formatDateLocal = useCallback((dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Custom Notification & Confirm States
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null, onCancel: null });
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'info' });
  const [pendingVariety, setPendingVariety] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, isOpen: false })), 3500);
  }, []);

  // Modal / Form States
  const [showAddLahan, setShowAddLahan] = useState(false);
  const [isEditingLahan, setIsEditingLahan] = useState(false);
  const [lahanForm, setLahanForm] = useState({
    nama_blok: '',
    luas_lahan: '',
    jenis_tanah: 'Andosol',
    tekstur: 'Lempung',
    kecamatan: 'Tomohon',
    id_varietas: 'Bisi 2',
    tanggal_tanam: '',
    n_dasar: '50',
    p_dasar: '40',
    k_dasar: '30',
    ph: '6.0',
    varietas_mode: 'recommendation',
    benih_per_lubang: '2'
  });

  const [predictingVar, setPredictingVar] = useState(false);
  const [predictedVarResult, setPredictedVarResult] = useState('');

  const handleCheckAIRecommendation = async () => {
    setPredictingVar(true);
    setPredictedVarResult('');
    try {
      const res = await fetch(`${BASE_URL}/sensor`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ph: parseFloat(lahanForm.ph || 6.0),
          nitrogen: 100,
          phosphorus: 50,
          kalium: 80,
          kecamatan: lahanForm.kecamatan,
          jenis_tanah: lahanForm.jenis_tanah,
          tekstur: lahanForm.tekstur
        })
      });
      const d = await res.json();
      if (d.success) {
        setPredictedVarResult(d.data.prediksi.rekomendasi);
      } else {
        setPredictedVarResult('Gagal memuat rekomendasi');
      }
    } catch (err) {
      console.error(err);
      setPredictedVarResult('Gagal menghubungkan server ML');
    } finally {
      setPredictingVar(false);
    }
  };

  const [operatorsList, setOperatorsList] = useState([]);

  // Fertilizer custom instructions form
  const [customOrderForm, setCustomOrderForm] = useState({
    jenis_fase: 'Pemupukan Susulan I',
    umur_target_hst: '15',
    dosis_urea: '',
    dosis_sp36: '',
    dosis_kcl: '',
    id_operator_eksekutor: '',
    catatan: ''
  });

  // Operator execution modal
  const [executingOrder, setExecutingOrder] = useState(null);
  const [realizationText, setRealizationText] = useState('');

  // Substitution tool states
  const [subTool, setSubTool] = useState({
    targetFert: 'NPK Phonska',
    targetQty: '100',
    subType: 'Urea+SP36+KCl'
  });

  const getHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user?.token}`
    };
  }, [user]);

  // Fetch Lahan
  const fetchLahan = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/lahan`, { headers: getHeaders() });
      const d = await res.json();
      if (d.success) {
        setLahanList(d.data || []);
        if (d.data?.length > 0 && !selectedLahanId) {
          setSelectedLahanId(d.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [getHeaders, selectedLahanId]);

  // Fetch Pemupukan
  const fetchPemupukan = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/pemupukan`, { headers: getHeaders() });
      const d = await res.json();
      if (d.success) {
        setPemupukanList(d.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [getHeaders]);

  // Fetch Sensor
  const fetchSensor = useCallback(async () => {
    try {
      const [resLatest, resHist] = await Promise.all([
        fetch(`${BASE_URL}/sensor/latest`, { headers: getHeaders() }),
        fetch(`${BASE_URL}/sensor/my-data`, { headers: getHeaders() })
      ]);
      const dLatest = await resLatest.json();
      const dHist = await resHist.json();

      if (dLatest.success) setLatestSensor(dLatest.data);
      if (dHist.success) setSensorHistory(dHist.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [getHeaders]);

  // Fetch Operators
  const fetchOperators = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/operators`, { headers: getHeaders() });
      const d = await res.json();
      if (d.success) {
        setOperatorsList(d.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [getHeaders]);

  const loadAllData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    setErrorMsg('');
    try {
      await Promise.all([fetchLahan(), fetchPemupukan(), fetchSensor(), fetchOperators()]);
    } catch (err) {
      setErrorMsg('Gagal memuat data dari server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchLahan, fetchPemupukan, fetchSensor, fetchOperators]);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 5000); // Auto-refresh setiap 5 detik untuk menyelaraskan data IoT secara real-time
    return () => clearInterval(interval);
  }, [loadAllData]);

  // Handle Lahan Form Submit (Supports Create and Edit)
  const handleLahanFormSubmit = async (e) => {
    e.preventDefault();
    const isEdit = activeLahan !== null;
    const url = isEdit
      ? `${BASE_URL}/lahan/${activeLahan.id}`
      : `${BASE_URL}/lahan`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const payload = {
        ...lahanForm,
        id_varietas: lahanForm.varietas_mode === 'recommendation' ? 'rekomendasi' : lahanForm.id_varietas
      };

      const res = await fetch(url, {
        method: method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (d.success) {
        showToast(d.message, 'success');
        setShowAddLahan(false);
        setIsEditingLahan(false);
        setLahanForm({
          nama_blok: '',
          luas_lahan: '',
          jenis_tanah: 'Andosol',
          tekstur: 'Lempung',
          kecamatan: 'Tomohon',
          id_varietas: 'Bisi 2',
          tanggal_tanam: '',
          n_dasar: '50',
          p_dasar: '40',
          k_dasar: '30',
          ph: '6.0',
          varietas_mode: 'recommendation',
          benih_per_lubang: '2'
        });
        setPredictedVarResult('');
        loadAllData();
        setActiveTab('lahan');
      } else {
        showToast(d.message, 'error');
      }
    } catch (err) {
      showToast(`Gagal ${isEdit ? 'mengubah' : 'menyimpan'} konfigurasi lahan.`, 'error');
    }
  };

  const startEditLahan = () => {
    if (!activeLahan) return;
    setLahanForm({
      nama_blok: activeLahan.nama_blok,
      luas_lahan: String(activeLahan.luas_lahan),
      jenis_tanah: activeLahan.jenis_tanah,
      tekstur: activeLahan.tekstur,
      kecamatan: activeLahan.kecamatan,
      id_varietas: activeLahan.id_varietas,
      tanggal_tanam: formatDateLocal(activeLahan.tanggal_tanam),
      n_dasar: String(activeLahan.n_dasar),
      p_dasar: String(activeLahan.p_dasar),
      k_dasar: String(activeLahan.k_dasar),
      ph: '6.0',
      varietas_mode: 'manual',
      benih_per_lubang: String(activeLahan.benih_per_lubang || 2)
    });
    setIsEditingLahan(true);
    setShowAddLahan(true);
  };

  // Handle Lahan Deletion
  const handleDeleteLahan = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus konfigurasi lahan ini dan seluruh rencana pemupukannya?')) return;
    try {
      const res = await fetch(`${BASE_URL}/lahan/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const d = await res.json();
      if (d.success) {
        showToast(d.message, 'success');
        loadAllData();
      }
    } catch (err) {
      showToast('Gagal menghapus lahan.', 'error');
    }
  };

  // Handle Pemupukan Deletion
  const handleDeletePemupukan = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus instruksi pemupukan ini?')) return;
    try {
      const res = await fetch(`${BASE_URL}/pemupukan/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const d = await res.json();
      if (d.success) {
        setToast({ isOpen: true, message: d.message, type: 'success' });
        setTimeout(() => setToast(prev => ({ ...prev, isOpen: false })), 3000);
        fetchPemupukan();
      } else {
        setToast({ isOpen: true, message: d.message || 'Gagal menghapus instruksi.', type: 'error' });
        setTimeout(() => setToast(prev => ({ ...prev, isOpen: false })), 3000);
      }
    } catch (err) {
      setToast({ isOpen: true, message: 'Gagal menghapus instruksi.', type: 'error' });
      setTimeout(() => setToast(prev => ({ ...prev, isOpen: false })), 3000);
    }
  };

  // Handle Kirim Perintah Pemupukan (Manager)
  const handleSendOrder = async (e) => {
    e.preventDefault();
    if (!activeLahan) {
      showToast('Lahan belum dikonfigurasi.', 'error');
      return;
    }

    const payload = {
      lahan_id: activeLahan.id,
      jenis_fase: customOrderForm.jenis_fase,
      umur_target_hst: parseInt(customOrderForm.umur_target_hst),
      dosis_urea: parseFloat(customOrderForm.dosis_urea || 0),
      dosis_sp36: parseFloat(customOrderForm.dosis_sp36 || 0),
      dosis_kcl: parseFloat(customOrderForm.dosis_kcl || 0),
      id_operator_eksekutor: customOrderForm.id_operator_eksekutor ? parseInt(customOrderForm.id_operator_eksekutor) : null,
      catatan: customOrderForm.catatan || null
    };

    try {
      const res = await fetch(`${BASE_URL}/pemupukan`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (d.success) {
        showToast(d.message, 'success');
        setCustomOrderForm({
          jenis_fase: 'Pemupukan Susulan I',
          umur_target_hst: '15',
          dosis_urea: '',
          dosis_sp36: '',
          dosis_kcl: '',
          id_operator_eksekutor: '',
          catatan: ''
        });
        fetchPemupukan();
      } else {
        showToast(d.message, 'error');
      }
    } catch (err) {
      showToast('Gagal mengirim perintah pemupukan.', 'error');
    }
  };

  // Handle Ambil Eksekusi (Operator)
  const handleTakeOrder = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/pemupukan/${id}/take`, {
        method: 'PUT',
        headers: getHeaders()
      });
      const d = await res.json();
      if (d.success) {
        showToast(d.message, 'success');
        fetchPemupukan();
      }
    } catch (err) {
      showToast('Gagal mengambil tugas.', 'error');
    }
  };

  // Handle Selesai/Update Realisasi (Operator)
  const handleCompleteOrder = async (e) => {
    e.preventDefault();
    if (!executingOrder) return;

    try {
      const res = await fetch(`${BASE_URL}/pemupukan/${executingOrder.id}/complete`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ realisasi_pupuk_digunakan: realizationText })
      });
      const d = await res.json();
      if (d.success) {
        showToast(d.message, 'success');
        setExecutingOrder(null);
        setRealizationText('');
        fetchPemupukan();
      }
    } catch (err) {
      showToast('Gagal menyelesaikan tugas.', 'error');
    }
  };

  const handleVerifyOrder = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/pemupukan/${id}/verify`, {
        method: 'PUT',
        headers: getHeaders()
      });
      const d = await res.json();
      if (d.success) {
        showToast(d.message, 'success');
        fetchPemupukan();
      } else {
        showToast(d.message, 'error');
      }
    } catch (err) {
      showToast('Gagal memvalidasi tugas.', 'error');
    }
  };

  const handleAssignOperatorDirect = async (id, operatorId) => {
    try {
      const res = await fetch(`${BASE_URL}/pemupukan/${id}/assign`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ id_operator_eksekutor: operatorId })
      });
      const d = await res.json();
      if (d.success) {
        fetchPemupukan();
      } else {
        showToast(d.message, 'error');
      }
    } catch (err) {
      showToast('Gagal memperbarui petugas pelaksana.', 'error');
    }
  };

  const handleSendInstructionDirect = async (p) => {
    if (!p.id_operator_eksekutor) {
      showToast("Silakan pilih operator pelaksana terlebih dahulu pada dropdown.", 'error');
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/pemupukan/${p.id}/send`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ id_operator_eksekutor: p.id_operator_eksekutor })
      });
      const d = await res.json();
      if (d.success) {
        showToast(d.message, 'success');
        fetchPemupukan();
      } else {
        showToast(d.message, 'error');
      }
    } catch (err) {
      showToast('Gagal mengirim perintah pemupukan.', 'error');
    }
  };

  // ─── LOGIKA PEMILIHAN DATA LAHAN TERPILIH ───────────────────────
  const activeLahan = lahanList[0] || null;

  // hitung fase tanaman berdasarkan varietas dan HST saat ini
  let hstDays = 0;
  let activePhase = 'Pra Tanam';
  let harvestTotal = 90;
  let ideals = null;

  if (activeLahan) {
    if (activeLahan.tanggal_tanam) {
      const diff = new Date() - new Date(activeLahan.tanggal_tanam);
      hstDays = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }
    const varConfig = VARIETIES[activeLahan.id_varietas || 'Bisi 2'];
    if (varConfig) {
      harvestTotal = varConfig.harvest;
      if (hstDays === 0) {
        activePhase = 'Pra Tanam / Dasar';
        ideals = varConfig.ideals.vAwal;
      } else if (hstDays <= varConfig.phases.vAwal) {
        activePhase = 'Fase Vegetatif Awal (V1 - V5)';
        ideals = varConfig.ideals.vAwal;
      } else if (hstDays <= varConfig.phases.vAkhir) {
        activePhase = 'Fase Vegetatif Akhir (V6 - VT)';
        ideals = varConfig.ideals.vAkhir;
      } else {
        activePhase = 'Fase Generatif (R1 - R6)';
        ideals = varConfig.ideals.generatif;
      }
    }
  }

  // ─── LOGIKA KOREKSI SENSOR (II.3) ──────────────────────────────
  let corrections = [];
  if (latestSensor && ideals && activeLahan) {
    const acreage = parseFloat(activeLahan.luas_lahan);
    const n = latestSensor.nitrogen;
    const p = latestSensor.phosphorus;
    const k = latestSensor.kalium;

    // Nitrogen / Urea
    if (n < ideals.n[0]) {
      const diff = ideals.n[0] - n;
      const addUrea = Math.round((diff * 0.3) * (acreage / 10000) * 100) / 100;
      corrections.push({ parameter: 'Nitrogen (N)', status: 'Kurang', text: `Tambahkan Urea sebanyak ${addUrea} kg karena kadar N tanah rendah.` });
    } else if (n > ideals.n[1]) {
      const reduction = Math.round((20) * (acreage / 10000) * 100) / 100;
      corrections.push({ parameter: 'Nitrogen (N)', status: 'Berlebih', text: `Pangkas dosis Urea sebesar ${reduction} kg untuk mencegah over-fertilization & hemat biaya.` });
    }

    // Phosphorus / SP36
    if (p < ideals.p[0]) {
      const diff = ideals.p[0] - p;
      const addSp36 = Math.round((diff * 0.2) * (acreage / 10000) * 100) / 100;
      corrections.push({ parameter: 'Fosfor (P)', status: 'Kurang', text: `Tambahkan SP36 sebanyak ${addSp36} kg karena kadar P tanah rendah.` });
    } else if (p > ideals.p[1]) {
      const reduction = Math.round((15) * (acreage / 10000) * 100) / 100;
      corrections.push({ parameter: 'Fosfor (P)', status: 'Berlebih', text: `Pangkas dosis SP36 sebesar ${reduction} kg untuk menjaga keseimbangan unsur hara.` });
    }

    // Potassium / KCl
    if (k < ideals.k[0]) {
      const diff = ideals.k[0] - k;
      const addKcl = Math.round((diff * 0.2) * (acreage / 10000) * 100) / 100;
      corrections.push({ parameter: 'Kalium (K)', status: 'Kurang', text: `Tambahkan KCl sebanyak ${addKcl} kg karena kadar K tanah rendah.` });
    } else if (k > ideals.k[1]) {
      const reduction = Math.round((15) * (acreage / 10000) * 100) / 100;
      corrections.push({ parameter: 'Kalium (K)', status: 'Berlebih', text: `Pangkas dosis KCl sebesar ${reduction} kg untuk efisiensi biaya.` });
    }

    // pH / Kapur & Belerang
    if (latestSensor.ph < ideals.ph[0]) {
      const dolo = Math.round((200) * (acreage / 1000) * 100) / 100;
      corrections.push({ parameter: 'pH Tanah', status: 'Terlalu Asam', text: `pH Asam (${latestSensor.ph}). Tambahkan kapur dolomit sekitar ${dolo} kg untuk menetralkan.` });
    } else if (latestSensor.ph > ideals.ph[1]) {
      const sulfur = Math.round((20) * (acreage / 1000) * 100) / 100;
      corrections.push({ parameter: 'pH Tanah', status: 'Terlalu Basa', text: `pH Basa (${latestSensor.ph}). Tambahkan belerang sekitar ${sulfur} kg untuk menurunkan pH.` });
    }
  }

  // ─── SUBSTITUSI PUPUK CALCULATOR (III.1) ───────────────────────
  const getSubstitutedResult = () => {
    const qty = parseFloat(subTool.targetQty || 0);
    if (subTool.targetFert === 'NPK Phonska') {
      // 100kg NPK Phonska (15-15-15) = 15kg N, 15kg P, 15kg K
      // Urea (46% N) = 15 / 0.46 = 32.6%
      // SP36 (36% P) = 15 / 0.36 = 41.7%
      // KCl (60% K) = 15 / 0.60 = 25%
      const ureaEq = Math.round(qty * 0.326 * 10) / 10;
      const sp36Eq = Math.round(qty * 0.417 * 10) / 10;
      const kclEq = Math.round(qty * 0.25 * 10) / 10;
      return `${ureaEq} kg Urea + ${sp36Eq} kg SP36 + ${kclEq} kg KCl`;
    } else if (subTool.targetFert === 'Urea' && subTool.subType === 'ZA') {
      // Urea (46% N) -> ZA (21% N)
      // 1 kg Urea = 46/21 = 2.19 kg ZA
      const zaEq = Math.round(qty * 2.19 * 10) / 10;
      return `${zaEq} kg ZA (Pupuk Amonium Sulfat)`;
    } else if (subTool.targetFert === 'SP36' && subTool.subType === 'TSP') {
      // SP36 (36% P) -> TSP (46% P)
      // 1 kg SP36 = 36/46 = 0.78 kg TSP
      const tspEq = Math.round(qty * 0.78 * 10) / 10;
      return `${tspEq} kg TSP (Triple Super Phosphate)`;
    }
    return '';
  };

  const autofillRealization = () => {
    const resStr = `Substitusi ${subTool.targetQty} kg ${subTool.targetFert} menjadi: ${getSubstitutedResult()}`;
    setRealizationText(resStr);
  };

  const autofillMLRecommendation = () => {
    if (!activeLahan) return;
    const ureaEq = Math.round((latestSensor?.dosis_urea || 140) * (activeLahan.luas_lahan / 10000) * 10) / 10;
    const sp36Eq = Math.round((latestSensor?.dosis_sp36 || 90) * (activeLahan.luas_lahan / 10000) * 10) / 10;
    const kclEq = Math.round((latestSensor?.dosis_kcl || 60) * (activeLahan.luas_lahan / 10000) * 10) / 10;

    setCustomOrderForm(prev => ({
      ...prev,
      dosis_urea: String(ureaEq),
      dosis_sp36: String(sp36Eq),
      dosis_kcl: String(kclEq)
    }));
  };

  if (loading && lahanList.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <p style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>Mengambil data SiTani...</p>
      </div>
    );
  }

  return (
    <AppLayout isOnline={latestSensor !== null} lastUpdate={latestSensor?.timestamp}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* Banner Selamat Datang & Informasi Role */}
        <div className="card" style={{ borderRadius: '16px', padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Selamat Datang, {user?.name}!</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Sistem Smart Farming Terintegrasi untuk Optimasi Produktivitas Tanaman Jagung.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, padding: '8px 16px', borderRadius: '20px', background: user?.role === 'manager_user' ? '#e0f2fe' : '#fef3c7', color: user?.role === 'manager_user' ? '#0369a1' : '#b45309', border: '1px solid' }}>
              ROLE: {user?.role === 'manager_user' ? 'MANAGER / USER' : 'OPERATOR LAPANGAN'}
            </span>
            <button onClick={() => loadAllData(true)} className="btn btn-outline" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem' }}>
              {refreshing ? 'Memperbarui...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Lahan Header Info */}
        {activeLahan && (
          <div className="card" style={{ padding: '16px 24px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary-dark)', fontWeight: 800 }}>
                  {activeLahan.nama_blok}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Varietas Jagung: <strong style={{ color: 'var(--primary-light)' }}>{activeLahan.id_varietas}</strong>
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
              <span><strong>Luas:</strong> {activeLahan.luas_lahan} m²</span>
              <span>•</span>
              <span><strong>Benih/Lubang:</strong> {activeLahan.benih_per_lubang || 2} benih</span>
              <span>•</span>
              <span><strong>Kecamatan:</strong> {activeLahan.kecamatan}</span>
              <span>•</span>
              <span><strong>Tanah:</strong> {activeLahan.jenis_tanah} ({activeLahan.tekstur})</span>
              <span>•</span>
              <span><strong>HST:</strong> <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>{hstDays} Hari</span></span>
              <span>•</span>
              <span><strong>Fase:</strong> <span style={{ color: 'var(--success)', fontWeight: 700 }}>{activePhase}</span></span>
            </div>
          </div>
        )}

        {/* Jika belum ada lahan */}
        {lahanList.length === 0 && !showAddLahan && (
          <div style={{ padding: '60px 40px', background: 'white', borderRadius: '16px', textAlign: 'center', boxShadow: 'var(--shadow-sm)', maxWidth: '600px', margin: '40px auto' }}>
            <h3 style={{ marginBottom: '12px' }}>Belum Ada Lahan yang Dikonfigurasi</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              Untuk memulai kalender pemupukan dan memuat kecerdasan 4 model Machine Learning SiTani, Anda wajib menginput konfigurasi awal lahan terlebih dahulu.
            </p>
            {user?.role === 'manager_user' ? (
              <button onClick={() => setShowAddLahan(true)} className="btn btn-primary">
                Konfigurasi Blok Lahan Sekarang
              </button>
            ) : (
              <p style={{ color: 'var(--danger)', fontWeight: 600 }}>Tolong minta Manager untuk mengonfigurasi blok lahan pertama Anda.</p>
            )}
          </div>
        )}

        {/* MODAL CONFIGURASI LAHAN BARU (III.2) */}
        {(showAddLahan || (lahanList.length === 0 && user?.role === 'manager_user')) && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', marginBottom: '24px', boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isEditingLahan ? 'Edit Konfigurasi Lahan & Siklus Tanam' : 'Input Konfigurasi Awal & Siklus Tanam Baru'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
              Setiap lahan memiliki karakteristik tersendiri. Parameter di bawah menentukan kalkulasi kecerdasan agronomi dan kalender pemupukan Anda secara dinamis.
            </p>

            <form onSubmit={handleLahanFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

              {/* Seksi I: Parameter Tanah & Lokasi (Sesuai Fitur Model ML) */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 16px 0', color: 'var(--primary-dark)', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  1. Karakteristik Lokasi & Parameter Tanah (Dari Model ML)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>Kecamatan Lahan</label>
                    <select
                      value={lahanForm.kecamatan}
                      onChange={(e) => setLahanForm({ ...lahanForm, kecamatan: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                    >
                      <option value="Airmadidi">Airmadidi</option>
                      <option value="Kauditan">Kauditan</option>
                      <option value="Langowan">Langowan</option>
                      <option value="Sonder">Sonder</option>
                      <option value="Tombulu">Tombulu</option>
                      <option value="Tomohon">Tomohon</option>
                      <option value="Tondano Selatan">Tondano Selatan</option>
                      <option value="Tondano Utara">Tondano Utara</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>Jenis Tanah</label>
                    <select
                      value={lahanForm.jenis_tanah}
                      onChange={(e) => setLahanForm({ ...lahanForm, jenis_tanah: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                    >
                      <option value="Andosol">Andosol</option>
                      <option value="Latosol">Latosol</option>
                      <option value="Regosol">Regosol</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>Tekstur Tanah</label>
                    <select
                      value={lahanForm.tekstur}
                      onChange={(e) => setLahanForm({ ...lahanForm, tekstur: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                    >
                      <option value="Lempung">Lempung (Sedang)</option>
                      <option value="Lempung Berpasir">Lempung Berpasir (Sedang-Kasar)</option>
                      <option value="Pasir">Pasir (Kasar)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>pH Lahan</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="Misal: 6.0"
                      value={lahanForm.ph}
                      onChange={(e) => setLahanForm({ ...lahanForm, ph: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Seksi II: Pemilihan Jalur Varietas (Skenario Pilihan) */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 16px 0', color: 'var(--primary-dark)', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  2. Jalur Penentuan Varietas Jagung
                </h4>

                <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="varietas_mode"
                      value="recommendation"
                      checked={lahanForm.varietas_mode === 'recommendation'}
                      onChange={() => setLahanForm({ ...lahanForm, varietas_mode: 'recommendation' })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary-light)' }}
                    />
                    Dapatkan Rekomendasi Varietas Terbaik (AI Model 1)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="varietas_mode"
                      value="manual"
                      checked={lahanForm.varietas_mode === 'manual'}
                      onChange={() => setLahanForm({ ...lahanForm, varietas_mode: 'manual' })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary-light)' }}
                    />
                    Saya sudah memiliki varietas sendiri (Input Manual)
                  </label>
                </div>

                {lahanForm.varietas_mode === 'recommendation' ? (
                  <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Sistem akan memanggil Model Klasifikasi AI untuk menganalisis pH dan karakteristik tanah Anda, lalu memilih varietas jagung paling cocok secara otomatis saat disimpan.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={handleCheckAIRecommendation}
                        disabled={predictingVar}
                        className="btn btn-outline"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        {predictingVar ? 'Menganalisis...' : 'Cek Rekomendasi AI Sekarang'}
                      </button>
                      {predictedVarResult && (
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--success)', background: '#f0fdf4', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                          Hasil Analisis AI: {predictedVarResult}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>Varietas Jagung Aktif</label>
                    <select
                      value={lahanForm.id_varietas}
                      onChange={(e) => setLahanForm({ ...lahanForm, id_varietas: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                    >
                      <option value="Bisi 2">Bisi 2 (Umur Panen ~115 HST)</option>
                      <option value="NK Perkasa">NK Perkasa (Umur Panen ~110 HST)</option>
                      <option value="Pertiwi">Pertiwi (Umur Panen ~105 HST)</option>
                      <option value="Pioneer Sweet Corn">Pioneer Sweet Corn (Umur Panen ~90 HST)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Seksi III: Detail Operasional & Siklus Tanam */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 16px 0', color: 'var(--primary-dark)', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  3. Informasi Siklus & Operasional Lahan
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>Luas Lahan (m²)</label>
                    <input
                      type="number"
                      required
                      placeholder="Misal: 5000"
                      value={lahanForm.luas_lahan}
                      onChange={(e) => setLahanForm({ ...lahanForm, luas_lahan: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>Tanggal Tanam (Baseline Umur HST)</label>
                    <input
                      type="date"
                      required
                      value={lahanForm.tanggal_tanam}
                      onChange={(e) => setLahanForm({ ...lahanForm, tanggal_tanam: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>Nama Lahan / Blok (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Opsional: Diisi otomatis jika kosong"
                      value={lahanForm.nama_blok}
                      onChange={(e) => setLahanForm({ ...lahanForm, nama_blok: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>Jumlah Benih per Lubang</label>
                    <select
                      value={lahanForm.benih_per_lubang}
                      onChange={(e) => setLahanForm({ ...lahanForm, benih_per_lubang: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', outline: 'none' }}
                    >
                      <option value="1">1 Benih per Lubang</option>
                      <option value="2">2 Benih per Lubang (Standar)</option>
                      <option value="3">3 Benih per Lubang</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.75rem' }}>N-Dasar (kg/ha)</label>
                      <input type="number" required value={lahanForm.n_dasar} onChange={(e) => setLahanForm({ ...lahanForm, n_dasar: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.75rem' }}>P-Dasar (kg/ha)</label>
                      <input type="number" required value={lahanForm.p_dasar} onChange={(e) => setLahanForm({ ...lahanForm, p_dasar: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.75rem' }}>K-Dasar (kg/ha)</label>
                      <input type="number" required value={lahanForm.k_dasar} onChange={(e) => setLahanForm({ ...lahanForm, k_dasar: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end', marginTop: '12px' }}>
                {lahanList.length > 0 && (
                  <button type="button" onClick={() => { setShowAddLahan(false); setIsEditingLahan(false); }} className="btn btn-outline" style={{ borderRadius: '8px' }}>
                    Batalkan
                  </button>
                )}
                <button type="submit" className="btn btn-primary" style={{ borderRadius: '8px', padding: '12px 24px' }}>
                  {isEditingLahan ? 'Simpan Perubahan Konfigurasi' : 'Simpan Konfigurasi & Inisialisasi Siklus'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab Navigation Menu */}
        {lahanList.length > 0 && (
          <div style={{ display: 'flex', borderBottom: '2px solid rgba(255, 255, 255, 0.4)', marginBottom: '24px', gap: '8px' }}>
            {[
              { id: 'dashboard', label: 'Monitoring Harian (Read-Only)', visible: true },
              { id: 'lahan', label: 'Manajemen Lahan & Varietas', visible: true },
              { id: 'perencanaan', label: 'Kirim Perintah Pemupukan', visible: user?.role === 'manager_user' },
              { id: 'eksekusi', label: user?.role === 'manager_user' ? 'Laporan Perintah Lapangan' : 'Eksekusi Perintah Lapangan', visible: true }
            ].filter(t => t.visible).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '12px 20px',
                  background: activeTab === t.id ? 'var(--primary-dark)' : 'rgba(255, 255, 255, 0.45)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: activeTab === t.id ? 'white' : 'var(--text-muted)',
                  borderRadius: '12px 12px 0 0',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderBottom: 'none',
                  transition: 'all 0.2s ease',
                  transform: activeTab === t.id ? 'translateY(1px)' : 'none'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* TAB 1: DAILY MONITORING DASHBOARD (READ-ONLY) */}
        {activeTab === 'dashboard' && lahanList.length > 0 && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>

            {/* pH & NPK Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <StatCard
                label="pH Tanah" value={latestSensor?.ph ?? 6.5} unit=""
                status={(latestSensor?.ph ?? 6.5) < 5.5 ? 'Terlalu Asam' : (latestSensor?.ph ?? 6.5) > 7.5 ? 'Terlalu Basa' : 'Optimal'}
                statusColor={(latestSensor?.ph ?? 6.5) < 5.5 || (latestSensor?.ph ?? 6.5) > 7.5 ? 'var(--danger)' : 'var(--success)'}
                barPercent={((latestSensor?.ph ?? 6.5) / 14) * 100}
                barColor={(latestSensor?.ph ?? 6.5) < 5.5 || (latestSensor?.ph ?? 6.5) > 7.5 ? 'var(--danger)' : 'var(--success)'}
              />
              <StatCard
                label="Nitrogen (N)" value={latestSensor?.nitrogen ?? 110} unit="ppm"
                status={(latestSensor?.nitrogen ?? 110) < 100 ? 'Rendah' : (latestSensor?.nitrogen ?? 110) > 150 ? 'Tinggi' : 'Cukup'}
                statusColor={(latestSensor?.nitrogen ?? 110) < 100 ? 'var(--danger)' : (latestSensor?.nitrogen ?? 110) > 150 ? 'var(--warning)' : 'var(--success)'}
                barPercent={(((latestSensor?.nitrogen ?? 110)) / 200) * 100}
                barColor={(latestSensor?.nitrogen ?? 110) < 100 ? 'var(--danger)' : (latestSensor?.nitrogen ?? 110) > 150 ? 'var(--warning)' : 'var(--success)'}
              />
              <StatCard
                label="Fosfor (P)" value={latestSensor?.phosphorus ?? 75} unit="ppm"
                status={(latestSensor?.phosphorus ?? 75) < 60 ? 'Rendah' : (latestSensor?.phosphorus ?? 75) > 100 ? 'Tinggi' : 'Cukup'}
                statusColor={(latestSensor?.phosphorus ?? 75) < 60 ? 'var(--danger)' : (latestSensor?.phosphorus ?? 75) > 100 ? 'var(--warning)' : 'var(--success)'}
                barPercent={(((latestSensor?.phosphorus ?? 75)) / 150) * 100}
                barColor={(latestSensor?.phosphorus ?? 75) < 60 ? 'var(--danger)' : (latestSensor?.phosphorus ?? 75) > 100 ? 'var(--warning)' : 'var(--success)'}
              />
              <StatCard
                label="Kalium (K)" value={latestSensor?.kalium ?? 95} unit="ppm"
                status={(latestSensor?.kalium ?? 95) < 80 ? 'Rendah' : (latestSensor?.kalium ?? 95) > 120 ? 'Tinggi' : 'Cukup'}
                statusColor={(latestSensor?.kalium ?? 95) < 80 ? 'var(--danger)' : (latestSensor?.kalium ?? 95) > 120 ? 'var(--warning)' : 'var(--success)'}
                barPercent={(((latestSensor?.kalium ?? 95)) / 150) * 100}
                barColor={(latestSensor?.kalium ?? 95) < 80 ? 'var(--danger)' : (latestSensor?.kalium ?? 95) > 120 ? 'var(--warning)' : 'var(--success)'}
              />
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <PhChart data={sensorHistory} />
              <NPKChart data={sensorHistory} />
            </div>

            {/* ML ESTIMASI & PREDIKSI OUTPUT BOX (MODEL 3 & 4) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="card">
                <h3>Hasil Estimasi Panen (Machine Learning)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Varietas Aktif:</span>
                    <strong style={{ color: 'var(--primary-dark)' }}>{activeLahan?.id_varietas}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Umur Tanaman Harian:</span>
                    <strong>{hstDays} HST</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sisa Hari Menuju Panen (Model 3):</span>
                    <strong style={{ color: 'var(--primary-light)', fontSize: '1.1rem' }}>
                      {latestSensor?.sisa_hari_panen ?? (harvestTotal - hstDays)} Hari lagi
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Potensi Hasil Panen (Model 4):</span>
                    <strong style={{ color: 'var(--success)', fontSize: '1.2rem' }}>
                      {latestSensor?.hasil_panen ?? 8.5} Ton/Hektar
                    </strong>
                  </div>
                </div>
              </div>

              <div className="card" style={{ background: 'rgba(240, 253, 244, 0.45)', backdropFilter: 'blur(16px)', border: '1px solid rgba(187, 247, 208, 0.5)' }}>
                <h3 style={{ color: '#166534' }}>Status Siklus & Rekomendasi Varietas</h3>
                <p style={{ fontSize: '0.9rem', color: '#15803d', marginTop: '8px', lineHeight: 1.6 }}>
                  Rekomendasi jenis varietas tanaman jagung optimal berdasarkan parameter hara sensor terkini ({latestSensor?.ph} pH, N {latestSensor?.nitrogen} ppm):
                </p>
                <div style={{ background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(8px)', padding: '16px', borderRadius: '12px', marginTop: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid rgba(134, 239, 172, 0.4)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>REKOMENDASI VARIETAS (Model 1):</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginTop: '4px' }}>
                    {latestSensor?.rekomendasi || 'Bisi 2'}
                  </div>
                </div>
                <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#166534' }}>
                  <strong>Langkah Lanjutan:</strong> Manager dapat merencanakan pemupukan susulan proporsional di tab <strong>"Rencana Pemupukan"</strong> berdasarkan sensor correction.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANAJEMEN LAHAN & VARIETAS */}
        {activeTab === 'lahan' && activeLahan && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Konfigurasi Lahan & Analisis Kebutuhan Benih</h3>
              {user?.role === 'manager_user' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={startEditLahan} className="btn btn-outline" style={{ borderRadius: '8px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Edit Konfigurasi
                  </button>
                  <button onClick={() => handleDeleteLahan(activeLahan.id)} className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', borderRadius: '8px', padding: '10px 20px' }}>
                    Hapus Lahan
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>

              {/* Card 1: Karakteristik Lahan */}
              <div className="card" style={{ padding: '24px', position: 'relative' }}>
                <h4 style={{ color: 'var(--primary-dark)', margin: '0 0 16px 0', fontSize: '1.1rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                  Karakteristik & Status Lahan
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>NAMA LAHAN</span>
                    <strong style={{ fontSize: '1rem' }}>{activeLahan.nama_blok}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>VARIETAS AKTIF</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--primary-light)' }}>{activeLahan.id_varietas}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>LUAS LAHAN</span>
                    <strong>{activeLahan.luas_lahan} m²</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>KECAMATAN</span>
                    <strong>{activeLahan.kecamatan}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>KARAKTERISTIK TANAH</span>
                    <strong>{activeLahan.jenis_tanah} ({activeLahan.tekstur})</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>UMUR TANAMAN</span>
                    <strong style={{ color: 'var(--success)' }}>{hstDays} Hari (HST)</strong>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginTop: '20px', border: '1px solid #f1f5f9', fontSize: '0.8rem' }}>
                  <strong>Fase Saat Ini:</strong> {activePhase} (Siklus tanaman jagung sedang berjalan dan dipantau secara real-time).
                </div>
              </div>

              {/* Card 2: Kalkulasi Presisi Kebutuhan Benih */}
              <div className="card" style={{ padding: '24px' }}>
                <h4 style={{ color: 'var(--primary-dark)', margin: '0 0 16px 0', fontSize: '1.1rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                  Analisis Kepadatan & Kebutuhan Benih
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>JARAK TANAM</span>
                    <strong>70 cm x 20 cm</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>BENIH PER LUBANG</span>
                    <strong>{activeLahan.benih_per_lubang || 2} benih</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>ESTIMASI LUBANG TANAM</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--primary-dark)' }}>
                      {Math.round(activeLahan.luas_lahan / 0.14).toLocaleString('id-ID')} lubang
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>TOTAL KEBUTUHAN BENIH</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--primary-dark)' }}>
                      {Math.round((activeLahan.luas_lahan / 0.14) * (activeLahan.benih_per_lubang || 2)).toLocaleString('id-ID')} butir
                    </strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Panel Manual Override Varietas */}
            {user?.role === 'manager_user' && (
              <div className="card" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '24px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--primary-dark)' }}>Ganti Varietas Jagung (Manual Override)</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                  Jika varietas rekomendasi kecerdasan AI (<strong>{activeLahan.id_varietas}</strong>) tidak tersedia di lapangan/toko benih setempat, Anda dapat langsung mengubahnya ke varietas pilihan Anda sendiri di bawah ini.
                  <strong> Seluruh kalkulasi umur HST, fase pertumbuhan aktif, estimasi hari panen, target NPK ideal, dan rekomendasi pemupukan susulan akan otomatis diperbarui dan diselaraskan mengikuti siklus varietas yang baru.</strong>
                </p>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={pendingVariety || activeLahan.id_varietas}
                    onChange={(e) => {
                      const newVariety = e.target.value;
                      setPendingVariety(newVariety);
                      setConfirmDialog({
                        isOpen: true,
                        message: `Apakah Anda yakin ingin mengubah varietas aktif menjadi "${newVariety}"? Seluruh siklus pertumbuhan dan rekomendasi pupuk akan dihitung ulang.`,
                        onCancel: () => setPendingVariety(null),
                        onConfirm: async () => {
                          setLahanList(prev => prev.map(l => l.id === activeLahan.id ? { ...l, id_varietas: newVariety } : l));
                          setPendingVariety(null);
                          try {
                            const res = await fetch(`${BASE_URL}/lahan/${activeLahan.id}`, {
                              method: 'PUT',
                              headers: getHeaders(),
                              body: JSON.stringify({
                                ...activeLahan,
                                id_varietas: newVariety,
                                tanggal_tanam: formatDateLocal(activeLahan.tanggal_tanam) || null
                              })
                            });
                            const d = await res.json();
                            if (d.success) {
                              showToast(`Varietas berhasil di-override menjadi "${newVariety}"!`, 'success');
                              loadAllData();
                            } else {
                              showToast(d.message, 'error');
                              loadAllData(); // Revert on failure
                            }
                          } catch (err) {
                            showToast('Gagal mengganti varietas jagung.', 'error');
                            loadAllData(); // Revert on failure
                          }
                        }
                      });
                    }}
                    className="premium-select"
                    style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, minWidth: '280px', outline: 'none' }}
                  >
                    <option value="Bisi 2">Bisi 2 (Umur Panen ~115 HST)</option>
                    <option value="NK Perkasa">NK Perkasa (Umur Panen ~110 HST)</option>
                    <option value="Pertiwi">Pertiwi (Umur Panen ~105 HST)</option>
                    <option value="Pioneer Sweet Corn">Pioneer Sweet Corn (Umur Panen ~90 HST)</option>
                  </select>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    Pilih benih mandiri untuk memperbarui seluruh kalender budidaya secara instan.
                  </span>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: RENCANA PEMUPUKAN (MANAGER ROLE ONLY) */}
        {activeTab === 'perencanaan' && lahanList.length > 0 && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {user?.role !== 'manager_user' ? (
              <div className="card" style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: 'var(--danger)' }}>
                <strong>Hak Akses Terbatas:</strong> Hanya User/Manager yang memiliki otorisasi untuk membuat, memformulasikan, dan mengirim Rencana Perintah Pemupukan ke lapangan. Anda hanya memiliki hak eksekusi.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
                {/* Panel Dosis Cerdas & Koreksi Sensor */}
                <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3>Koreksi Pemupukan Sensor (Real-time Correction)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px', marginBottom: '16px' }}>
              Membandingkan nutrisi sensor terkini dengan standar kebutuhan varietas <strong>{activeLahan?.id_varietas}</strong> pada <strong>{activePhase}</strong>:
            </p>

            {corrections.length === 0 ? (
              <div style={{ padding: '16px', background: '#f0fdf4', color: '#166534', borderRadius: '8px', fontWeight: 500 }}>
                Kandungan N, P, K, dan pH tanah berada pada rentang ideal. Tidak diperlukan koreksi dosis (Gunakan rekomendasi standar ML).
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {corrections.map((c, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderRadius: '10px', background: c.status === 'Kurang' ? '#fffbeb' : '#fef2f2', borderLeft: c.status === 'Kurang' ? '4px solid #d97706' : '4px solid #ef4444', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 700, color: c.status === 'Kurang' ? '#b45309' : '#b91c1c', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{c.parameter} — {c.status}</span>
                    </div>
                    <div style={{ marginTop: '4px', color: '#374151' }}>{c.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3>Estimasi Kebutuhan Pupuk (Model 2)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', marginBottom: '16px' }}>
              Hasil estimasi kebutuhan pupuk susulan oleh Machine Learning (kg/hektar):
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ESTIMASI UREA (N)</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-dark)', marginTop: '4px' }}>
                  {latestSensor?.dosis_urea || 140} <span style={{ fontSize: '0.85rem' }}>kg/ha</span>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ESTIMASI SP36 (P)</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-dark)', marginTop: '4px' }}>
                  {latestSensor?.dosis_sp36 || 90} <span style={{ fontSize: '0.85rem' }}>kg/ha</span>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ESTIMASI KCL (K)</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-dark)', marginTop: '4px' }}>
                  {latestSensor?.dosis_kcl || 60} <span style={{ fontSize: '0.85rem' }}>kg/ha</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '16px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                DOSIS YANG DISESUAIKAN DENGAN LUAS LAHAN ({activeLahan?.luas_lahan} m²):
              </span>
              <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '0.9rem' }}>
                <div>Urea: <strong>{Math.round((latestSensor?.dosis_urea || 140) * (activeLahan?.luas_lahan / 10000) * 10) / 10} kg</strong></div>
                <div>SP36: <strong>{Math.round((latestSensor?.dosis_sp36 || 90) * (activeLahan?.luas_lahan / 10000) * 10) / 10} kg</strong></div>
                <div>KCl: <strong>{Math.round((latestSensor?.dosis_kcl || 60) * (activeLahan?.luas_lahan / 10000) * 10) / 10} kg</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Kirim Perintah */}
        <div className="card">
          <h3>Form Instruksi Lapangan & Perawatan</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', marginBottom: '16px' }}>
            Tinjau rekomendasi ML di sebelah kiri, lalu isi formulir ini untuk mengirimkan Perintah Pemupukan atau Perawatan Khusus ke Operator.
          </p>

          <form onSubmit={handleSendOrder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>Jenis Tindakan / Perawatan</label>
              <select
                value={customOrderForm.jenis_fase}
                onChange={(e) => setCustomOrderForm({ ...customOrderForm, jenis_fase: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', background: 'white' }}
              >
                <option value="Pemupukan Susulan I">Pemupukan Susulan I (HST ~15-21)</option>
                <option value="Pemupukan Susulan II">Pemupukan Susulan II (HST ~30-40)</option>
                <option value="Pemupukan Susulan III">Pemupukan Susulan III (HST ~50-55 - Opsional)</option>
                <option value="Koreksi Kekurangan Nitrogen (N)">Koreksi Kekurangan Nitrogen (N)</option>
                <option value="Koreksi Kekurangan Fosfor (P)">Koreksi Kekurangan Fosfor (P)</option>
                <option value="Koreksi Kekurangan Kalium (K)">Koreksi Kekurangan Kalium (K)</option>
                <option value="Koreksi Keasaman Tanah (pH)">Koreksi Keasaman Tanah (pH)</option>
                <option value="Penyiraman & Pengairan">Penyiraman & Pengairan</option>
                <option value="Penyemprotan Pestisida">Penyemprotan Pestisida</option>
                <option value="Pembersihan Gulma & Penyiangan">Pembersihan Gulma & Penyiangan</option>
                <option value="Tindakan Kustom">Tindakan Kustom (Tulis Detail di Catatan)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>Rencana Target Umur (HST)</label>
              <input
                type="number"
                required
                value={customOrderForm.umur_target_hst}
                onChange={(e) => setCustomOrderForm({ ...customOrderForm, umur_target_hst: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>Pilih Operator Pelaksana</label>
              <select
                value={customOrderForm.id_operator_eksekutor}
                onChange={(e) => setCustomOrderForm({ ...customOrderForm, id_operator_eksekutor: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', background: 'white' }}
              >
                <option value="">-- Pilih Operator (Opsional) --</option>
                {operatorsList.map(op => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>Catatan / Deskripsi Instruksi Khusus</label>
              <textarea
                placeholder="Masukkan detail instruksi perawatan (misal: Sebarkan pupuk urea merata, bersihkan gulma di bedengan B, atau lakukan penyiraman ekstra)"
                value={customOrderForm.catatan}
                onChange={(e) => setCustomOrderForm({ ...customOrderForm, catatan: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '80px', fontFamily: 'inherit', fontSize: '0.875rem' }}
              />
            </div>

            <button
              type="button"
              onClick={autofillMLRecommendation}
              className="btn btn-outline"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '4px',
                borderColor: 'var(--primary-light)',
                color: 'var(--primary-light)',
                fontWeight: 600
              }}
            >
              Gunakan Dosis Rekomendasi ML
            </button>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>DOSIS AKHIR PERINTAH (KG):</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>Urea (kg)</label>
                  <input type="number" required placeholder="Urea" value={customOrderForm.dosis_urea} onChange={(e) => setCustomOrderForm({ ...customOrderForm, dosis_urea: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>SP36 (kg)</label>
                  <input type="number" required placeholder="SP36" value={customOrderForm.dosis_sp36} onChange={(e) => setCustomOrderForm({ ...customOrderForm, dosis_sp36: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>KCl (kg)</label>
                  <input type="number" required placeholder="KCl" value={customOrderForm.dosis_kcl} onChange={(e) => setCustomOrderForm({ ...customOrderForm, dosis_kcl: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ borderRadius: '8px', padding: '12px' }}>
              Kirim Perintah Pemupukan ke Lapangan
            </button>
          </form>
        </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EKSEKUSI PERINTAH LAPANGAN (OPERATOR & MANAGER) */}
        {activeTab === 'eksekusi' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* SUBSTITUSI PUPUK HELPER CALCULATOR (III.1) */}
      <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Alat Bantu Substitusi Pupuk (Warehouse Shortage)
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', marginBottom: '16px' }}>
          Jika gudang kekurangan stok pupuk yang direkomendasikan, gunakan alat ini untuk menghitung dosis substitusi setara hara kimia secara akurat:
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Pupuk Asli Kosong</label>
            <select
              value={subTool.targetFert}
              onChange={(e) => setSubTool({ ...subTool, targetFert: e.target.value, subType: e.target.value === 'NPK Phonska' ? 'Urea+SP36+KCl' : (e.target.value === 'Urea' ? 'ZA' : 'TSP') })}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', background: 'white' }}
            >
              <option value="NPK Phonska">NPK Phonska (15-15-15)</option>
              <option value="Urea">Urea (46% N)</option>
              <option value="SP36">SP36 (36% P)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Dosis Semula (kg)</label>
            <input
              type="number"
              value={subTool.targetQty}
              onChange={(e) => setSubTool({ ...subTool, targetQty: e.target.value })}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', width: '100px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Substitusi Setara</label>
            <input
              type="text"
              disabled
              value={subTool.targetFert === 'NPK Phonska' ? 'Urea + SP36 + KCl' : (subTool.targetFert === 'Urea' ? 'ZA (Amonium Sulfat)' : 'TSP (Superphosphate)')}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', background: '#eee', width: '220px' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '200px', background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>DOSIS SETARA BARU:</span>
              <strong style={{ color: 'var(--primary-light)' }}>{getSubstitutedResult()}</strong>
            </div>
            <button onClick={autofillRealization} className="btn btn-outline" style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem' }}>
              Salin ke Realisasi
            </button>
          </div>
        </div>
      </div>

      {/* Form Input Realisasi Real-time */}
      {executingOrder && (
        <div className="card" style={{ background: '#fffbeb', border: '1px solid #fef3c7', marginBottom: '24px', animation: 'fadeIn 0.25s ease' }}>
          <h4 style={{ color: '#b45309', marginBottom: '10px' }}>Realisasikan Tugas Pemupukan: ID-{executingOrder.id}</h4>
          <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
            Fase: <strong>{executingOrder.jenis_fase}</strong> | Blok Lahan: <strong>{executingOrder.nama_blok}</strong> | Dosis Rencana: <strong>Urea {executingOrder.dosis_urea} kg, SP36 {executingOrder.dosis_sp36} kg, KCl {executingOrder.dosis_kcl} kg</strong>
          </p>
          <form onSubmit={handleCompleteOrder} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              required
              placeholder="Laporkan realisasi pupuk digunakan (misal: Selesai disebar 32.6 kg Urea + 41.7 kg SP36)"
              value={realizationText}
              onChange={(e) => setRealizationText(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }}
            />
            <button type="submit" className="btn btn-primary" style={{ borderRadius: '8px', padding: '12px 24px' }}>
              Selesai & Laporkan Realisasi
            </button>
            <button type="button" onClick={() => setExecutingOrder(null)} className="btn btn-outline" style={{ borderRadius: '8px', padding: '12px 24px' }}>
              Batal
            </button>
          </form>
        </div>
      )}

      {/* List Perintah Pemupukan */}
      <div className="card" style={{ padding: '24px', overflowX: 'auto', background: '#ffffff', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--primary-dark)', fontWeight: 800 }}>
          Daftar Instruksi Perintah Pemupukan
        </h3>

        <table className="premium-table" style={{ width: '100%', minWidth: '900px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '25%', textAlign: 'left', padding: '16px' }}>Tugas & Perawatan</th>
              <th style={{ width: '15%', textAlign: 'left', padding: '16px' }}>Varietas</th>
              <th style={{ width: '25%', textAlign: 'left', padding: '16px' }}>Formula Rencana</th>
              <th style={{ width: '15%', textAlign: 'center', padding: '16px' }}>Status</th>
              <th style={{ width: '20%', textAlign: 'left', padding: '16px' }}>Pelaksana & Realisasi</th>
            </tr>
          </thead>
          <tbody>
            {pemupukanList.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Belum ada instruksi pemupukan yang diterbitkan oleh Manager.
                </td>
              </tr>
            ) : pemupukanList.map(p => {
              const hasFertilizer = parseFloat(p.dosis_urea) > 0 || parseFloat(p.dosis_sp36) > 0 || parseFloat(p.dosis_kcl) > 0;
              return (
                <tr key={p.id}>
                  <td style={{ verticalAlign: 'top', padding: '16px', fontWeight: 700, color: 'var(--primary-dark)' }}>
                    <div style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{p.jenis_fase}</div>
                    {p.catatan && (
                      <div style={{
                        fontWeight: 400,
                        fontSize: '0.75rem',
                        color: '#9a3412',
                        background: '#fff7ed',
                        border: '1px solid #ffedd5',
                        borderLeft: '4px solid #f97316',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        marginTop: '8px',
                        lineHeight: '1.4',
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'flex-start',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px', color: '#ea580c' }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div>
                          <strong style={{ color: '#ea580c' }}>Instruksi Khusus:</strong> {p.catatan}
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ verticalAlign: 'top', padding: '16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'rgba(74, 124, 74, 0.08)',
                      color: 'var(--primary-dark)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      border: '1px solid rgba(74, 124, 74, 0.18)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 8px rgba(47, 79, 47, 0.03)'
                    }}>
                      {p.id_varietas}
                    </span>
                  </td>
                  <td style={{ verticalAlign: 'top', padding: '16px' }}>
                    {!hasFertilizer ? (
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                        Tanpa Formulasi Pupuk
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {parseFloat(p.dosis_urea) > 0 && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(74, 124, 74, 0.08)',
                            color: 'var(--primary-dark)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(74, 124, 74, 0.22)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(47, 79, 47, 0.02)'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-dark)' }}></span>
                            Urea: {p.dosis_urea} kg
                          </span>
                        )}
                        {parseFloat(p.dosis_sp36) > 0 && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(42, 157, 143, 0.08)',
                            color: '#146b60',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(42, 157, 143, 0.22)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(42, 157, 143, 0.02)'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2A9D8F' }}></span>
                            SP36: {p.dosis_sp36} kg
                          </span>
                        )}
                        {parseFloat(p.dosis_kcl) > 0 && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(244, 162, 97, 0.08)',
                            color: '#a75d27',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(244, 162, 97, 0.22)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(244, 162, 97, 0.02)'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F4A261' }}></span>
                            KCl: {p.dosis_kcl} kg
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ verticalAlign: 'top', padding: '16px', textAlign: 'center' }}>
                    <span className={`status-badge ${p.status_eksekusi}`} style={{
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: 'none',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      fontSize: '0.75rem',
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      fontWeight: 700
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: p.status_eksekusi === 'pending' ? '#d97706' : p.status_eksekusi === 'taken' ? '#2563eb' : p.status_eksekusi === 'review' ? '#7c3aed' : '#10b981',
                        display: 'inline-block'
                      }}></span>
                      {p.status_eksekusi === 'pending' ? 'Menunggu' : p.status_eksekusi === 'taken' ? 'Dikerjakan' : p.status_eksekusi === 'review' ? 'Menunggu Validasi' : 'Selesai'}
                    </span>
                  </td>
                  <td style={{ verticalAlign: 'top', padding: '16px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', gap: '6px' }}>
                      {p.status_eksekusi === 'completed' && (
                        <>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(209, 250, 229, 0.45)',
                            color: '#065f46',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(4, 120, 87, 0.22)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(4, 120, 87, 0.02)'
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            {p.nama_operator || 'Sistem'}
                          </div>
                          {p.realisasi_pupuk_digunakan && (
                            <div style={{
                              color: '#475569',
                              fontSize: '0.75rem',
                              padding: '6px 10px',
                              background: '#f8fafc',
                              borderRadius: '6px',
                              borderLeft: '3px solid #cbd5e1',
                              lineHeight: '1.3',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}>
                              {p.realisasi_pupuk_digunakan}
                            </div>
                          )}
                        </>
                      )}

                      {p.status_eksekusi === 'review' && (
                        <>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(233, 213, 255, 0.45)',
                            color: '#6b21a8',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(139, 92, 246, 0.22)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(107, 33, 168, 0.02)'
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            {p.nama_operator || 'Operator'}
                          </div>
                          {p.realisasi_pupuk_digunakan && (
                            <div style={{
                              color: '#5b21b6',
                              fontSize: '0.75rem',
                              padding: '6px 10px',
                              background: '#faf5ff',
                              borderRadius: '6px',
                              borderLeft: '3px solid #d8b4fe',
                              lineHeight: '1.3',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}>
                              <strong>Laporan:</strong> "{p.realisasi_pupuk_digunakan}"
                            </div>
                          )}
                          {user?.role === 'manager_user' && (
                            <button
                              onClick={() => handleVerifyOrder(p.id)}
                              className="btn"
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                borderRadius: '6px',
                                background: '#10b981',
                                color: 'white',
                                fontWeight: 700,
                                marginTop: '4px',
                                width: '100%',
                                justifyContent: 'center',
                                border: 'none',
                                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                              }}
                            >
                              Validasi Selesai
                            </button>
                          )}
                        </>
                      )}

                      {p.status_eksekusi === 'taken' && (
                        <>
                          {user?.role !== 'manager_user' && user?.id === p.id_operator_eksekutor ? (
                            <button
                              onClick={() => setExecutingOrder(p)}
                              className="btn btn-outline"
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                borderRadius: '6px',
                                background: '#2563eb',
                                color: 'white',
                                borderColor: '#2563eb',
                                whiteSpace: 'nowrap',
                                height: 'auto',
                                fontWeight: 700
                              }}
                            >
                              Terealisasi
                            </button>
                          ) : (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(219, 234, 254, 0.45)',
                              color: '#1e40af',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid rgba(59, 130, 246, 0.22)',
                              backdropFilter: 'blur(4px)',
                              WebkitBackdropFilter: 'blur(4px)',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              boxShadow: '0 2px 8px rgba(29, 78, 216, 0.02)'
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                              {p.nama_operator || 'Operator'}
                            </div>
                          )}
                        </>
                      )}

                      {p.status_eksekusi === 'pending' && (
                        <>
                          {user?.role !== 'manager_user' ? (
                            <button
                              onClick={() => handleTakeOrder(p.id)}
                              className="btn btn-primary"
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                fontWeight: 700
                              }}
                            >
                              Ambil Perintah
                            </button>
                          ) : (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#94a3b8',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              background: '#f8fafc',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #f1f5f9'
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              Belum Diambil
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

          </div>
        )}

      </div>

      {/* --- CUSTOM TOAST NOTIFICATION --- */}
      {
  toast.isOpen && (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      background: toast.type === 'error' ? '#ef4444' : '#10b981',
      color: 'white', padding: '16px 24px', borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '12px',
      fontWeight: 600, letterSpacing: '0.3px',
      animation: 'slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }}>
      <span style={{ display: 'flex', alignItems: 'center' }}>
        {toast.type === 'error' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        )}
      </span>
      {toast.message}
    </div>
  )
}

{/* --- CUSTOM CONFIRM MODAL --- */ }
{
  confirmDialog.isOpen && (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
    }}>
      <div style={{
        background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '420px', width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center',
        animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%', background: '#fef3c7',
          color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '32px', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <h3 style={{ margin: '0 0 12px 0', color: 'var(--primary-dark)', fontSize: '1.4rem' }}>Konfirmasi Tindakan</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.95rem', lineHeight: '1.6' }}>
          {confirmDialog.message}
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => { if (confirmDialog.onCancel) confirmDialog.onCancel(); setConfirmDialog({ isOpen: false }); }}
            className="btn btn-outline"
            style={{ padding: '12px 24px', borderRadius: '12px', flex: 1, fontWeight: 700 }}
          >
            Batal
          </button>
          <button
            onClick={() => { if (confirmDialog.onConfirm) confirmDialog.onConfirm(); setConfirmDialog({ isOpen: false }); }}
            className="btn btn-primary"
            style={{ padding: '12px 24px', borderRadius: '12px', flex: 1, background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  )
}

<style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </AppLayout >
  );
}
