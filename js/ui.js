/* UI-помощники: иконки, модальные окна, тосты, диаграммы. */

import { esc, fmtDate, money, num } from "./utils.js";

/* ------------------------------------------------------------------ */
/* Иконки (набор в стиле lucide)                                       */
/* ------------------------------------------------------------------ */

const ICONS = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  fuel: '<line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.8a2 2 0 0 0-.6-1.4L18 5"/>',
  wallet: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"/><path d="M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-.2-.6l-3.5-4.4A1 1 0 0 0 17.5 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  packagePlus: '<path d="M16 16h6"/><path d="M19 13v6"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/>',
  packageCheck: '<path d="m16 16 2 2 4-4"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  trendUp: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  trendDown: '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  filter: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  alertCircle: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  loader: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  arrowUpRight: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  circle: '<circle cx="12" cy="12" r="10"/>',
};

export function icon(name, cls = "size-4", strokeWidth = 1.8) {
  const body = ICONS[name] || ICONS.circle;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="ic ${cls}" aria-hidden="true">${body}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Тосты                                                               */
/* ------------------------------------------------------------------ */

export function toast(message, type = "") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === "err" ? "alertCircle" : "checkCircle", "size-4")}<span>${esc(
    message
  )}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .25s";
    setTimeout(() => el.remove(), 260);
  }, 2600);
}

/* ------------------------------------------------------------------ */
/* Модальные окна                                                      */
/* ------------------------------------------------------------------ */

const modalStack = [];

export function openModal({ title, subtitle = "", body = "", footer = "", wide = false, onClose }) {
  const root = document.getElementById("modal-root");
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" style="${wide ? "max-width:680px" : ""}">
      <div class="modal-grab"></div>
      <div class="modal-head">
        <div style="flex:1;min-width:0">
          <h2>${esc(title)}</h2>
          ${subtitle ? `<p>${esc(subtitle)}</p>` : ""}
        </div>
        <button class="icon-btn" data-close aria-label="Закрыть">${icon("x", "size-4.5")}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ""}
    </div>`;

  const entry = { wrap, onClose };
  wrap.__entry = entry;
  modalStack.push(entry);
  root.appendChild(wrap);

  const close = () => closeModal(entry);
  wrap.querySelector("[data-close]")?.addEventListener("click", close);
  wrap.addEventListener("mousedown", (e) => {
    if (e.target === wrap) close();
  });
  return { el: wrap, close };
}

export function closeModal(entry) {
  const idx = entry ? modalStack.indexOf(entry) : modalStack.length - 1;
  if (idx < 0) return false;
  const [item] = modalStack.splice(idx, 1);
  item.wrap.remove();
  item.onClose?.();
  return true;
}

export function closeTopModal() {
  if (!modalStack.length) return false;
  closeModal(modalStack[modalStack.length - 1]);
  return true;
}

export function hasModal() {
  return modalStack.length > 0;
}

export function confirmDialog({ title, message, confirmText = "Подтвердить", danger = false }) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const m = openModal({
      title,
      body: `<p class="small muted" style="line-height:1.5">${esc(message)}</p>`,
      footer: `
        <button class="btn" data-cancel>Отмена</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ok>${esc(confirmText)}</button>`,
      onClose: () => finish(false),
    });
    m.el.querySelector("[data-cancel]").addEventListener("click", () => {
      finish(false);
      closeModal(m.el.__entry);
    });
    m.el.querySelector("[data-ok]").addEventListener("click", () => {
      finish(true);
      closeModal(m.el.__entry);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Компоненты                                                          */
/* ------------------------------------------------------------------ */

const WB_STATUS = {
  draft: { label: "Черновик", cls: "badge-zinc" },
  issued: { label: "Выдан", cls: "badge-blue" },
  active: { label: "В работе", cls: "badge-teal" },
  closed: { label: "Закрыт", cls: "badge-emerald" },
};

const TRIP_STATUS = {
  planned: { label: "Запланирован", cls: "badge-zinc" },
  active: { label: "В пути", cls: "badge-teal" },
  done: { label: "Завершён", cls: "badge-blue" },
  paid: { label: "Оплачен", cls: "badge-emerald" },
};

export function waybillBadge(status) {
  const s = WB_STATUS[status] || WB_STATUS.draft;
  return `<span class="badge ${s.cls}"><i class="dot"></i>${s.label}</span>`;
}

export function tripBadge(status) {
  const s = TRIP_STATUS[status] || TRIP_STATUS.planned;
  return `<span class="badge ${s.cls}"><i class="dot"></i>${s.label}</span>`;
}

export function statusLabel(kind, status) {
  return kind === "waybill"
    ? (WB_STATUS[status] || WB_STATUS.draft).label
    : (TRIP_STATUS[status] || TRIP_STATUS.planned).label;
}

export function kpi({ label, value, foot = "", iconName = "coins", tone = "teal", delta = null }) {
  const deltaHtml =
    delta == null
      ? ""
      : `<span class="kpi-delta ${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "+" : ""}${num(
          delta
        )}%</span>`;
  return `
    <div class="kpi kpi-${tone}">
      <div class="kpi-top">
        <span class="kpi-label">${esc(label)}</span>
        <span class="kpi-icon">${icon(iconName, "size-4")}</span>
      </div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-foot">${deltaHtml}${delta != null ? " " : ""}${foot}</div>
    </div>`;
}

/** Диаграмма-столбики. data: [{date,value}] */
export function barChart(data, { height = 108 } = {}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const lastIdx = data.length - 1;
  const peakIdx = data.reduce((best, d, i, arr) => (d.value > arr[best].value ? i : best), 0);
  const cols = data
    .map((d, i) => {
      const h = Math.max(3, Math.round((d.value / max) * (height - 28)));
      const cls = i === lastIdx ? "today" : i === peakIdx ? "peak" : "";
      const day = new Date(d.date).toLocaleDateString("ru-RU", { weekday: "short" });
      return `<div class="col ${cls}">
        <span class="val">${d.value ? Math.round(d.value / 1000) + "к" : ""}</span>
        <div class="bar" style="height:${h}px" title="${esc(d.date)}: ${money(d.value)}"></div>
        <span class="cl">${day}</span>
      </div>`;
    })
    .join("");
  return `<div class="chart" style="height:${height}px">${cols}</div>`;
}

export function emptyState({ iconName = "package", title, text = "", action = "" }) {
  return `<div class="empty">
    <div class="ei">${icon(iconName, "size-5")}</div>
    <b>${esc(title)}</b>
    ${text ? `<span>${esc(text)}</span>` : ""}
    ${action}
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Markdown-лайт для ответов агента                                    */
/* ------------------------------------------------------------------ */

export function richText(text) {
  const lines = String(text).split("\n");
  const out = [];
  let list = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (list) {
        out.push(`<ul>${list.join("")}</ul>`);
        list = null;
      }
      continue;
    }
    const inline = esc(line)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
    if (/^[-•]\s+/.test(line)) {
      list = list || [];
      list.push(`<li>${inline.replace(/^[-•]\s+/, "")}</li>`);
    } else {
      if (list) {
        out.push(`<ul>${list.join("")}</ul>`);
        list = null;
      }
      out.push(`<p>${inline}</p>`);
    }
  }
  if (list) out.push(`<ul>${list.join("")}</ul>`);
  return out.join("");
}

/* ------------------------------------------------------------------ */
/* Формы                                                               */
/* ------------------------------------------------------------------ */

export function field(label, inner, hint = "") {
  return `<div class="field"><label>${esc(label)}</label>${inner}${
    hint ? `<span class="form-hint">${esc(hint)}</span>` : ""
  }</div>`;
}

export function input({
  name,
  value = "",
  type = "text",
  placeholder = "",
  required = false,
  min,
  max,
  step,
  inputmode,
  list,
}) {
  return `<input class="input" name="${name}" type="${type}" value="${esc(value)}"
    placeholder="${esc(placeholder)}" ${required ? "required" : ""}
    ${min != null ? `min="${min}"` : ""} ${max != null ? `max="${max}"` : ""}
    ${step != null ? `step="${step}"` : ""} ${inputmode ? `inputmode="${inputmode}"` : ""}
    ${list ? `list="${esc(list)}"` : ""} />`;
}

export function datalist(id, values = []) {
  return `<datalist id="${esc(id)}">${values
    .filter(Boolean)
    .map((value) => `<option value="${esc(value)}"></option>`)
    .join("")}</datalist>`;
}

export function select({ name, value = "", options = [], placeholder = "" }) {
  const opts = options
    .map((o) => {
      const val = typeof o === "string" ? o : o.value;
      const label = typeof o === "string" ? o : o.label;
      return `<option value="${esc(val)}" ${String(val) === String(value) ? "selected" : ""}>${esc(
        label
      )}</option>`;
    })
    .join("");
  return `<select class="select" name="${name}">${
    placeholder ? `<option value="">${esc(placeholder)}</option>` : ""
  }${opts}</select>`;
}

export function textarea({ name, value = "", placeholder = "", rows = 3 }) {
  return `<textarea class="textarea" name="${name}" rows="${rows}" placeholder="${esc(
    placeholder
  )}">${esc(value)}</textarea>`;
}

/** Собирает данные формы в объект; пустые строки остаются строками. */
export function formData(form) {
  const data = {};
  for (const [key, value] of new FormData(form).entries()) {
    data[key] = typeof value === "string" ? value.trim() : value;
  }
  return data;
}

export function moneyInput({ name, value = "", placeholder = "0" }) {
  return `<input class="input num" name="${name}" type="number" inputmode="decimal" step="0.01" min="0"
    value="${esc(value)}" placeholder="${esc(placeholder)}" />`;
}

export function dateInput({ name, value = "" }) {
  return `<input class="input" name="${name}" type="date" value="${esc(value)}" />`;
}

export function fmtMoneyShort(n) {
  return money(n);
}

export function fmtDay(iso) {
  return fmtDate(iso, "weekday");
}
