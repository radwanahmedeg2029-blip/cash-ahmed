export function getLocalTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getOffsetDateISO(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatCurrency(value: number): string {
  return `${formatNumber(value)} ج.م`;
}

export function formatArabicDateLabel(isoDate: string): string {
  const today = getLocalTodayISO();
  const yesterday = getOffsetDateISO(1);
  const displayDate = isoDate.replace(/-/g, '/');

  if (isoDate === today) {
    return `اليوم · ${displayDate}`;
  }
  if (isoDate === yesterday) {
    return `أمس · ${displayDate}`;
  }
  return displayDate;
}
