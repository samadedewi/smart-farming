import React from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

function fmt(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', fontSize: '0.875rem', fontWeight: 600, color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const LoadingChart = ({ title }) => (
  <div className="card" style={{ height: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
    <h3 style={{ fontSize: '1rem', alignSelf: 'flex-start', marginBottom: 'auto' }}>{title}</h3>
    <div style={{ marginBottom: 'auto', textAlign: 'center' }}>
      <p style={{ fontSize: '0.875rem' }}>Memuat data chart...</p>
    </div>
  </div>
);

// ─── pH Line Chart ──────────────────────────────────────────────────────────
export function PhChart({ data = [] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <LoadingChart title="Tren pH Tanah" />;
  }

  const chartData = data.map(d => ({ 
    time: fmt(d?.timestamp), 
    pH: d?.ph || 0 
  }));

  return (
    <div className="card">
      <h3 style={{ fontSize: '1rem', marginBottom: '20px' }}>Tren pH Tanah</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="phGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2F4F2F" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#2F4F2F" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={[4, 9]} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="pH" stroke="#2F4F2F" strokeWidth={2} fill="url(#phGrad)" name="pH" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── NPK Line Chart ─────────────────────────────────────────────────────────
export function NPKChart({ data = [] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <LoadingChart title="Tren NPK (mg/kg)" />;
  }

  const chartData = data.map(d => ({
    time: fmt(d?.timestamp),
    Nitrogen: d?.nitrogen || 0,
    Fosfor: d?.phosphorus || 0,
    Kalium: d?.kalium || 0,
  }));

  return (
    <div className="card">
      <h3 style={{ fontSize: '1rem', marginBottom: '20px' }}>Tren NPK (mg/kg)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
          <Line type="monotone" dataKey="Nitrogen" stroke="#2F4F2F" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Fosfor" stroke="#F4A261" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Kalium" stroke="#2A9D8F" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Combined Detail Chart (for Monitoring page) ────────────────────────────
export function DetailChart({ data = [], dataKey, color, label, unit, domain }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <LoadingChart title={`Tren ${label}`} />;
  }

  const chartData = data.map(d => ({ 
    time: fmt(d?.timestamp), 
    [label]: d?.[dataKey] || 0 
  }));

  return (
    <div className="card">
      <h3 style={{ fontSize: '1rem', marginBottom: '20px' }}>Tren {label} {unit ? `(${unit})` : ''}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={domain} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey={label} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

