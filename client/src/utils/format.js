export function fmtPrice(n) {
  if (n == null || isNaN(n)) return '—';
  return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function fmtChange(n) {
  if (n == null || isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return sign + Number(n).toFixed(2);
}

export function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return sign + Number(n).toFixed(2) + '%';
}

export function fmtNum(n, decimals = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function fmtVolume(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function fmtTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function fmtDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

export function colorForValue(n) {
  if (n == null || isNaN(n)) return 'text-text-muted';
  return n >= 0 ? 'text-signal' : 'text-loss';
}

export function colorForAction(action) {
  switch (action) {
    case 'BUY': return 'text-signal';
    case 'SELL': return 'text-loss';
    default: return 'text-warn';
  }
}

export function bgForAction(action) {
  switch (action) {
    case 'BUY': return 'bg-signal/10 text-signal border border-signal/20';
    case 'SELL': return 'bg-loss/10 text-loss border border-loss/20';
    default: return 'bg-surface text-text-muted border border-border';
  }
}
