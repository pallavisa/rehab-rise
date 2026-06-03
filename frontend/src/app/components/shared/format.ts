// Date + format helpers ported from dash-shell.jsx
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WD_S = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MO_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toDate(v: string | Date | null): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  // Accept "YYYY-MM-DD HH:MM:SS" or ISO
  const norm = v.includes('T') ? v : v.replace(' ', 'T');
  const d = new Date(norm);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDay(v: string | Date): string {
  const d = toDate(v); if (!d) return '';
  return `${WD_S[d.getDay()]} ${d.getDate()} ${MO_S[d.getMonth()]}`;
}
export function fmtTime(v: string | Date): string {
  const d = toDate(v); if (!d) return '';
  let h = d.getHours(); const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')}${ap}`;
}
export function relDay(v: string | Date): string {
  const d = toDate(v); if (!d) return '';
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const diff = Math.round((x.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return fmtDay(d);
}
export { WD };
