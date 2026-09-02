/** "3일 4시간 5분" / "4시간 5분" / "5분" */
export function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}일 ${h}시간 ${m}분`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

/** "HH:MM:SS" */
export function formatCooldown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Whole kilometres with thousands separators, e.g. "12,345". */
export function formatKm(km: number): string {
  return Math.floor(km).toLocaleString();
}

/** "23:00~07:00" */
export function formatSleepWindow(startHour: number, endHour: number): string {
  const pad = (h: number) => String(h).padStart(2, '0');
  return `${pad(startHour)}:00~${pad(endHour)}:00`;
}
