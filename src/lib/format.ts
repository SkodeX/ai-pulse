// Datum und Zahlen über Intl (Europe/Berlin), keine Datums-Bibliothek.

const TZ = 'Europe/Berlin';
const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto', style: 'short' });
const abs = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
const usdFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD' });

export function relTime(iso: string, now = Date.now()): string {
  const diff = (Date.parse(iso) - now) / 1000;
  const a = Math.abs(diff);
  if (a < 3600) return rtf.format(Math.round(diff / 60) || -1, 'minute');
  if (a < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

export const absTime = (iso: string) => abs.format(new Date(iso));
export const dateDe = (isoDate: string) => dayFmt.format(new Date(isoDate.length === 10 ? `${isoDate}T12:00:00Z` : isoDate));
export const berlinDay = (d: Date | string) => isoDay.format(typeof d === 'string' ? new Date(d) : d);
export const usd = (n: number) => usdFmt.format(n);
export const score = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export function daysUntil(isoDate: string, now = new Date()): number {
  const a = Date.parse(`${isoDate}T00:00:00Z`);
  const b = Date.parse(`${berlinDay(now)}T00:00:00Z`);
  return Math.round((a - b) / 86400000);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function safeHref(url: string): string | undefined {
  return /^https?:\/\//i.test(url) ? url : undefined;
}
