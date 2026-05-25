import React from 'react';

// ─── Stat Card ─────────────────────────────────────────────────────────────
export function StatCard({ label, value, unit, status, statusColor, barPercent, barColor }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
          {label}
        </div>
        {status && (
          <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, background: `${statusColor}22`, color: statusColor }}>
            {status}
          </span>
        )}
      </div>
      <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary-dark)', lineHeight: 1 }}>
        {value} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>{unit}</span>
      </div>
      {barPercent !== undefined && (
        <div style={{ height: '6px', background: '#e0e0e0', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${barPercent}%`, background: barColor || 'var(--success)', borderRadius: '99px', transition: 'width 1s ease' }} />
        </div>
      )}
    </div>
  );
}

// ─── Info Card ─────────────────────────────────────────────────────────────
export function InfoCard({ title, value, sub, accent = 'var(--primary-dark)' }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-dark)', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--primary-dark)' }}>{title}</h2>
      {subtitle && <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>{subtitle}</p>}
    </div>
  );
}

// ─── Status Banner ──────────────────────────────────────────────────────────
export function StatusBanner({ message, variant = 'optimal' }) {
  const styles = {
    optimal: { bg: 'linear-gradient(135deg, #2F4F2F, #4A7C4A)', color: 'white' },
    warning: { bg: 'linear-gradient(135deg, #b8620a, #F4A261)', color: 'white' },
    danger:  { bg: 'linear-gradient(135deg, #9b1c2a, #E63946)', color: 'white' },
  };
  const s = styles[variant] || styles.optimal;
  return (
    <div style={{
      background: s.bg, color: s.color, padding: '16px 24px',
      borderRadius: '14px', marginBottom: '24px', display: 'flex',
      alignItems: 'center', gap: '12px', boxShadow: 'var(--shadow-md)',
    }}>
      <p style={{ margin: 0, fontWeight: 500 }}>{message}</p>
    </div>
  );
}

// ─── Pulse Dot ──────────────────────────────────────────────────────────────
export function PulseDot({ color = '#2A9D8F' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.4, animation: 'ping 1.5s ease-in-out infinite' }} />
      <span style={{ position: 'relative', display: 'block', width: 10, height: 10, borderRadius: '50%', background: color }} />
    </span>
  );
}
