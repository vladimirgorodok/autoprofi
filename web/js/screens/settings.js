/* Настройки: профиль, тема, ИИ, данные, синхронизация. */

import {
  exportState,
  getState,
  importState,
  markSynced,
  resetDemo,
  setSettings,
  setTheme,
  updateDriver,
} from "../store.js";
import {
  closeModal,
  confirmDialog,
  field,
  formData,
  icon,
  input,
  openModal,
  select,
  toast,
} from "../ui.js";
import { download, esc, fmtDate, fmtTime, isoDate, money, today } from "../utils.js";

const VERSION = "1.0.0";
const REPO_URL = "https://github.com/vladimirgorodok/autoprofi";
const APK_URL = "https://github.com/vladimirgorodok/autoprofi/releases/latest";
const WEB_URL = "https://vladimirgorodok.github.io/autoprofi/";

export default {
  title: "Настройки",

  subtitle() {
    return `АвтоПрофи ${VERSION} · офлайн-режим`;
  },

  render(state) {
    const s = state.settings;
    const theme = s.theme;
    const ai = s.ai || {};

    return `
    <div class="content">
      <div class="card card-pad" style="display:flex;gap:13px;align-items:center">
        <div class="avatar" style="width:48px;height:48px;font-size:16px">${esc(
          state.driver.name
            .split(" ")
            .map((x) => x[0])
            .join("")
            .slice(0, 2)
        )}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:680;font-size:15px">${esc(state.driver.name)}</div>
          <div class="small muted">${esc(state.driver.role)} · ${esc(state.driver.company)}</div>
          <div class="tiny muted" style="margin-top:2px">${esc(state.driver.phone)}</div>
        </div>
        <button class="btn btn-sm" data-action="edit-profile">${icon("pencil", "size-3.5")}Изменить</button>
      </div>

      <div class="card">
        <div class="card-head"><h2>Внешний вид</h2></div>
        <div class="card-pad" style="padding-top:10px">
          <div class="segmented" style="display:flex">
            ${[
              { id: "light", label: "Светлая", icon: "sun" },
              { id: "dark", label: "Тёмная", icon: "moon" },
              { id: "system", label: "Системная", icon: "settings" },
            ]
              .map(
                (t) => `<button style="flex:1" class="${theme === t.id ? "active" : ""}"
                  data-action="theme" data-value="${t.id}">${icon(t.icon, "size-3.5")} ${t.label}</button>`
              )
              .join("")}
          </div>
          <p class="tiny muted" style="margin-top:8px">Тема применяется сразу и сохраняется на устройстве.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>ИИ-агент</h2><span class="sub">${ai.key ? "Подключён" : "Локальный режим"}</span></div>
        <div class="list">
          <button class="settings-row" data-action="edit-ai">
            <span class="sri">${icon("bot", "size-4")}</span>
            <span class="srmain">
              <span class="srtitle">Модель и ключ API</span>
              <span class="srsub">${ai.key ? esc(ai.model || "—") : "Работает без интернета, по вашим данным"}</span>
            </span>
            ${icon("chevronRight", "size-4", 2)}
          </button>
          <button class="settings-row" data-nav="agent">
            <span class="sri">${icon("sparkles", "size-4")}</span>
            <span class="srmain">
              <span class="srtitle">Открыть ИИ-агента</span>
              <span class="srsub">Доход, расход топлива, остаток по листу</span>
            </span>
            ${icon("chevronRight", "size-4", 2)}
          </button>
        </div>
      </div>

      <div class="card" id="data-section">
        <div class="card-head"><h2>Данные</h2><span class="sub">${state.trips.length} рейсов</span></div>
        <div class="list">
          <button class="settings-row" data-action="export-json">
            <span class="sri">${icon("download", "size-4")}</span>
            <span class="srmain">
              <span class="srtitle">Резервная копия</span>
              <span class="srsub">Скачать JSON со всеми данными</span>
            </span>
            ${icon("chevronRight", "size-4", 2)}
          </button>
          <button class="settings-row" data-action="import-json">
            <span class="sri">${icon("upload", "size-4")}</span>
            <span class="srmain">
              <span class="srtitle">Восстановить из копии</span>
              <span class="srsub">Загрузить JSON-архив</span>
            </span>
            ${icon("chevronRight", "size-4", 2)}
          </button>
          <button class="settings-row" data-action="export-csv">
            <span class="sri">${icon("share", "size-4")}</span>
            <span class="srmain">
              <span class="srtitle">Обмен данными</span>
              <span class="srsub">Выгрузить рейсы и финансы в CSV</span>
            </span>
            ${icon("chevronRight", "size-4", 2)}
          </button>
          <button class="settings-row" data-action="reset">
            <span class="sri" style="background:var(--rose-50);color:var(--rose-600)">${icon(
              "trash",
              "size-4"
            )}</span>
            <span class="srmain">
              <span class="srtitle" style="color:var(--rose-600)">Сбросить данные</span>
              <span class="srsub">Вернуть демонстрационный набор</span>
            </span>
            ${icon("chevronRight", "size-4", 2)}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Синхронизация</h2><span class="sub">Локально</span></div>
        <div class="list">
          <div class="settings-row">
            <span class="sri">${icon("cloud", "size-4")}</span>
            <span class="srmain">
              <span class="srtitle">Облачный архив</span>
              <span class="srsub">Автоматически копировать данные</span>
            </span>
            <button class="switch ${s.cloudBackup ? "on" : ""}" data-action="toggle-cloud" aria-label="Облачный архив"></button>
          </div>
          <button class="settings-row" data-action="sync">
            <span class="sri">${icon("refresh", "size-4")}</span>
            <span class="srmain">
              <span class="srtitle">Синхронизировать сейчас</span>
              <span class="srsub">Последняя: ${fmtDate(
                isoDate(new Date(s.lastSync || Date.now()))
              )}, ${fmtTime(s.lastSync || Date.now())}</span>
            </span>
            ${icon("chevronRight", "size-4", 2)}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>О приложении</h2><span class="sub">v${VERSION}</span></div>
        <div class="card-pad" style="padding-top:10px">
          <p class="small muted" style="line-height:1.55">
            АвтоПрофи — офлайн-помощник водителя: путевые листы, рейсы, заправки,
            финансы и расчёт заработка. Данные не покидают устройство.
          </p>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            <a class="btn btn-sm" href="${WEB_URL}" target="_blank" rel="noopener">${icon(
      "globe",
      "size-3.5"
    )}Веб-версия</a>
            <a class="btn btn-sm" href="${REPO_URL}" target="_blank" rel="noopener">${icon(
      "share",
      "size-3.5"
    )}GitHub</a>
            <a class="btn btn-sm" href="${APK_URL}" target="_blank" rel="noopener">${icon(
      "download",
      "size-3.5"
    )}Скачать APK</a>
            <span class="btn btn-sm" style="pointer-events:none">${icon("shield", "size-3.5")}MIT</span>
            <span class="btn btn-sm" style="pointer-events:none">${icon("database", "size-3.5")}localStorage</span>
          </div>
          <p class="tiny muted" style="margin-top:12px">Сборка ${VERSION} · PWA + Android WebView · без рекламы и трекеров</p>
        </div>
      </div>
    </div>`;
  },

  actions: {
    "edit-profile": () => openProfileModal(),
    "edit-ai": () => openAiModal(),
    theme: (el) => {
      setTheme(el.dataset.value);
      toast("Тема сохранена", "ok");
    },
    "toggle-cloud": () => {
      const next = !getState().settings.cloudBackup;
      setSettings({ cloudBackup: next });
      toast(next ? "Облачный архив включён" : "Облачный архив выключен", "ok");
    },
    sync: () => {
      markSynced();
      toast("Данные синхронизированы", "ok");
    },
    "export-json": () => {
      download(`autoprofi-backup-${today()}.json`, exportState());
      toast("Архив сохранён", "ok");
    },
    "export-csv": () => {
      const state = getState();
      const rows = [
        ...state.trips.map((t) => ({
          date: t.date,
          kind: "Рейс",
          name: `${t.from} → ${t.to}`,
          amount: t.amount,
          note: t.cargo,
        })),
        ...state.finance.map((f) => ({
          date: f.date,
          kind: f.type === "income" ? "Доход" : "Расход",
          name: f.category,
          amount: f.type === "income" ? f.amount : -f.amount,
          note: f.note,
        })),
      ].sort((a, b) => (a.date < b.date ? 1 : -1));
      const esc2 = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = `\uFEFFДата;Тип;Название;Сумма;Комментарий\n${rows
        .map((r) => [r.date, r.kind, r.name, r.amount, r.note].map(esc2).join(";"))
        .join("\n")}`;
      download(`autoprofi-obmen-${today()}.csv`, csv, "text/csv");
      toast("CSV сохранён", "ok");
    },
    "import-json": () => {
      const picker = document.createElement("input");
      picker.type = "file";
      picker.accept = "application/json,.json";
      picker.addEventListener("change", async () => {
        const file = picker.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const ok = await confirmDialog({
            title: "Восстановить данные?",
            message: "Текущие данные будут заменены содержимым архива.",
            confirmText: "Восстановить",
          });
          if (!ok) return;
          importState(text);
          toast("Данные восстановлены", "ok");
        } catch (err) {
          toast(err.message || "Не удалось прочитать файл", "err");
        }
      });
      picker.click();
    },
    reset: async () => {
      const ok = await confirmDialog({
        title: "Сбросить все данные?",
        message: "Рейсы, листы, заправки и финансы вернутся к демонстрационному набору.",
        confirmText: "Сбросить",
        danger: true,
      });
      if (!ok) return;
      resetDemo();
      toast("Данные сброшены", "ok");
    },
  },
};

/* ------------------------------------------------------------------ */

function openProfileModal() {
  const d = getState().driver;
  const m = openModal({
    title: "Профиль водителя",
    subtitle: "Данные подставляются в путевые листы",
    body: `
      <form data-profile-form style="display:flex;flex-direction:column;gap:11px">
        <div class="form-grid">
          ${field("Имя", input({ name: "name", value: d.name, required: true }))}
          ${field("Роль", input({ name: "role", value: d.role }))}
          <div class="span-2">${field("Компания", input({ name: "company", value: d.company }))}</div>
          ${field("Телефон", input({ name: "phone", value: d.phone, type: "tel" }))}
          ${field("Водительское удостоверение", input({ name: "license", value: d.license }))}
        </div>
      </form>`,
    footer: `<button class="btn" data-p-cancel>Отмена</button>
      <button class="btn btn-primary" data-p-save>Сохранить</button>`,
  });

  m.el.querySelector("[data-p-save]").addEventListener("click", () => {
    const raw = formData(m.el.querySelector("[data-profile-form]"));
    if (!raw.name) {
      toast("Укажите имя", "err");
      return;
    }
    updateDriver(raw);
    closeModal(m.el.__entry);
    toast("Профиль сохранён", "ok");
  });
  m.el.querySelector("[data-p-cancel]").addEventListener("click", () => closeModal(m.el.__entry));
}

function openAiModal() {
  const ai = getState().settings.ai || {};
  const m = openModal({
    title: "ИИ-агент",
    subtitle: "Локальный режим работает без ключа",
    body: `
      <form data-ai-form style="display:flex;flex-direction:column;gap:11px">
        <div class="notice">${icon("info", "size-4")}<span>Без ключа агент отвечает по вашим данным локально.
          С ключом — отправляет вопрос и обезличенную сводку в выбранную модель.</span></div>
        <div class="form-grid">
          <div class="span-2">${field(
            "Endpoint",
            input({ name: "endpoint", value: ai.endpoint || "", placeholder: "https://api.openai.com/v1" })
          )}</div>
          ${field("Модель", input({ name: "model", value: ai.model || "", placeholder: "gpt-4o-mini" }))}
          ${field("Ключ API", input({ name: "key", value: ai.key || "", type: "password", placeholder: "sk-…" }))}
        </div>
        <p class="form-hint">Ключ хранится только на этом устройстве. Подходит любой OpenAI-совместимый API.</p>
      </form>`,
    footer: `<button class="btn" data-ai-cancel>Отмена</button>
      <button class="btn btn-primary" data-ai-save>Сохранить</button>`,
  });

  m.el.querySelector("[data-ai-save]").addEventListener("click", () => {
    const raw = formData(m.el.querySelector("[data-ai-form]"));
    setSettings({
      ai: {
        endpoint: raw.endpoint.replace(/\/+$/, ""),
        model: raw.model,
        key: raw.key,
      },
    });
    closeModal(m.el.__entry);
    toast(raw.key ? "ИИ-агент подключён" : "Локальный режим", "ok");
  });
  m.el.querySelector("[data-ai-cancel]").addEventListener("click", () => closeModal(m.el.__entry));
}
