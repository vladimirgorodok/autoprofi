/* Утилиты: даты, форматирование, мелкие помощники. */

export const DAY = 86_400_000;

export const LOADING_TYPES = [
  "Задняя",
  "Боковая",
  "Верхняя",
  "Бортовая",
  "Комбинированная",
];

const pad = (n) => String(n).padStart(2, "0");

/** Локальная дата в формате YYYY-MM-DD (без сдвига часового пояса). */
export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today() {
  return isoDate(new Date());
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return isoDate(dt);
}

export function daysAgo(n) {
  return addDays(today(), -n);
}

export function parseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfMonth(iso = today()) {
  return iso.slice(0, 8) + "01";
}

export function diffDays(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / DAY);
}

export function fmtDate(iso, style = "short") {
  if (!iso) return "—";
  const d = parseDate(iso);
  if (style === "long") {
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }
  if (style === "month") {
    return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  }
  if (style === "weekday") {
    return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" });
  }
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDateShort(iso) {
  if (!iso) return "—";
  return parseDate(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function relDate(iso) {
  const n = diffDays(iso, today());
  if (n === 0) return "сегодня";
  if (n === 1) return "вчера";
  if (n === -1) return "завтра";
  if (n > 1 && n < 7) return `${n} дн. назад`;
  if (n < -1 && n > -7) return `через ${-n} дн.`;
  return fmtDateShort(iso);
}

const moneyFmt = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const moneyFmt2 = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(n, cents = false) {
  const v = Number(n) || 0;
  return (cents ? moneyFmt2 : moneyFmt).format(v);
}

export function num(n, digits = 0) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(n) || 0);
}

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function sum(arr, pick = (x) => x) {
  return arr.reduce((acc, item) => acc + (Number(pick(item)) || 0), 0);
}

export function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export function pluralize(n, [one, few, many]) {
  return `${num(n)} ${plural(n, one, few, many)}`;
}

function toBase64(content) {
  let bytes;
  if (content instanceof Uint8Array) bytes = content;
  else if (content instanceof ArrayBuffer) bytes = new Uint8Array(content);
  else if (ArrayBuffer.isView(content)) {
    bytes = new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
  } else {
    bytes = new TextEncoder().encode(String(content ?? ""));
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function download(filename, content, type = "application/json") {
  // В Android-обёртке blob-скачивание не работает: сохраняем через нативный
  // диалог «Создать документ», чтобы архив можно было положить в Downloads.
  const android = typeof window !== "undefined" ? window.AndroidFile : null;
  if (android?.saveFile) {
    try {
      const mime = type.split(";")[0];
      if (android.saveFile(filename, toBase64(content), mime)) return;
    } catch {
      /* fall through to the browser download */
    }
  }

  const mime = /^text\/|application\/(json|xml|javascript)/.test(type)
    ? `${type};charset=utf-8`
    : type;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCSV(rows, headers) {
  const escCell = (v) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.map((h) => escCell(h.label)).join(";");
  const body = rows.map((r) => headers.map((h) => escCell(h.value(r))).join(";")).join("\n");
  return `\uFEFF${head}\n${body}`;
}

/** Простое склонение числительных для «км», «л», «рейс» и т. п. */
export function km(n) {
  return pluralize(Math.round(n), ["км", "км", "км"]);
}

export function liters(n) {
  return pluralize(Math.round(n), ["литр", "литра", "литров"]);
}
