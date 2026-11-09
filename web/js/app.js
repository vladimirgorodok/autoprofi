/* Точка входа: каркас приложения, маршрутизация, глобальные действия. */

import { applyTheme, getState, setTheme, subscribe } from "./store.js";
import {
  closeTopModal,
  hasModal,
  icon,
  openModal,
  closeModal,
  richText,
  toast,
} from "./ui.js";
import { esc, fmtDate, fmtTime, isoDate, money, today } from "./utils.js";

import home from "./screens/home.js";
import waybills from "./screens/waybills.js";
import trips from "./screens/trips.js";
import agent from "./screens/agent.js";
import fuels from "./screens/fuels.js";
import finance from "./screens/finance.js";
import vehicles from "./screens/vehicles.js";
import refs from "./screens/refs.js";
import settings from "./screens/settings.js";

const screens = { home, waybills, trips, agent, fuels, finance, vehicles, refs, settings };

const NAV = [
  { id: "home", label: "Главная", icon: "home" },
  { id: "waybills", label: "Путевые листы", icon: "file", short: "Листы" },
  { id: "trips", label: "Поездки", icon: "route" },
  { id: "agent", label: "ИИ-агент", icon: "bot", accent: true },
  { id: "fuels", label: "Заправки", icon: "fuel" },
  { id: "finance", label: "Финансы", icon: "wallet" },
  { id: "vehicles", label: "Автомобили", icon: "truck" },
  { id: "refs", label: "Справочники", icon: "book" },
  { id: "settings", label: "Настройки", icon: "settings" },
];

const MORE = [
  { id: "fuels", label: "Заправки", icon: "fuel" },
  { id: "finance", label: "Финансы", icon: "wallet" },
  { id: "vehicles", label: "Автомобили", icon: "truck" },
  { id: "refs", label: "Справочники", icon: "book" },
  { id: "settings", label: "Настройки", icon: "settings" },
];

let current = "home";
let view = null;

/* ------------------------------------------------------------------ */
/* Маршрутизация                                                       */
/* ------------------------------------------------------------------ */

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  const name = raw.split("/")[0];
  return screens[name] ? name : "home";
}

function go(id) {
  if (!screens[id]) id = "home";
  if (location.hash === `#/${id}`) {
    renderScreen();
  } else {
    location.hash = `#/${id}`;
  }
}

/* ------------------------------------------------------------------ */
/* Каркас                                                              */
/* ------------------------------------------------------------------ */

function shell() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <img class="brand-logo" src="icons/icon.svg" alt="" />
        <div style="min-width:0">
          <div class="brand-name">АвтоПрофи</div>
          <div class="brand-role">Офлайн-помощник</div>
        </div>
      </div>
      <nav class="side-nav" id="side-nav"></nav>
      <div class="side-foot">
        <button class="sync-chip" data-nav="settings">
          <span class="sync-dot"></span>
          <span id="sync-label">Синхронизировано</span>
        </button>
      </div>
    </aside>

    <main class="main">
      <header class="appbar">
        <div class="appbar-inner">
          <div class="appbar-title">
            <h1 id="screen-title">Главная</h1>
            <p id="screen-sub"></p>
          </div>
          <div class="appbar-actions">
            <button class="icon-btn" data-global="search" aria-label="Поиск">${icon("search", "size-4.5")}</button>
            <button class="icon-btn" data-global="theme" aria-label="Тема">${icon("sun", "size-4.5")}</button>
            <span id="screen-action"></span>
          </div>
        </div>
      </header>
      <div id="view"></div>
    </main>

    <nav class="bottom-nav" id="bottom-nav"></nav>
    <div id="more-host"></div>
  `;
  view = document.getElementById("view");
  renderNav();
  document.getElementById("sync-label").textContent = "Синхронизировано";
}

function renderNav() {
  const side = document.getElementById("side-nav");
  side.innerHTML =
    NAV.map(
      (n) => `
      <button class="side-item ${current === n.id ? "active" : ""}" data-nav="${n.id}">
        <span class="tile">${icon(n.icon, "size-4.5")}</span>${n.label}
      </button>`
    ).join("") +
    `<div class="side-sep"></div>
     <button class="side-item" data-global="archive"><span class="tile">${icon(
       "archive",
       "size-4.5"
     )}</span>Облачный архив</button>
     <button class="side-item" data-global="exchange"><span class="tile">${icon(
       "share",
       "size-4.5"
     )}</span>Обмен данными</button>`;

  const bottom = document.getElementById("bottom-nav");
  const items = [
    { id: "home", label: "Главная", icon: "home" },
    { id: "waybills", label: "Листы", icon: "file" },
    { id: "trips", label: "Поездки", icon: "route" },
    { id: "agent", label: "ИИ-агент", icon: "bot", accent: true },
    { id: "__more", label: "Ещё", icon: "more" },
  ];
  bottom.innerHTML = items
    .map(
      (n) => `
      <button class="nav-item ${current === n.id ? "active" : ""} ${n.accent ? "accent" : ""}"
        data-${n.id === "__more" ? 'global="more"' : `nav="${n.id}"`}>
        <span class="ni">${icon(n.icon, "size-5")}</span>${n.label}
      </button>`
    )
    .join("");
}

function renderScreen({ keepScroll = false } = {}) {
  current = parseRoute();
  const screen = screens[current];
  const state = getState();

  document.getElementById("screen-title").textContent = screen.title;
  document.getElementById("screen-sub").textContent =
    typeof screen.subtitle === "function" ? screen.subtitle(state) : screen.subtitle || "";

  const action = document.getElementById("screen-action");
  if (screen.primaryAction) {
    action.innerHTML = `<button class="btn btn-primary btn-sm" data-action="${screen.primaryAction.action}">
      ${icon("plus", "size-4")}<span>${esc(screen.primaryAction.label)}</span></button>`;
  } else {
    action.innerHTML = "";
  }

  const themeBtn = document.querySelector('[data-global="theme"]');
  if (themeBtn) {
    themeBtn.innerHTML = icon(
      document.documentElement.dataset.theme === "dark" ? "moon" : "sun",
      "size-4.5"
    );
  }

  view.innerHTML = screen.render(state);
  renderNav();
  if (!keepScroll) window.scrollTo({ top: 0, behavior: "instant" });
  screen.mount?.(view);
}

/* ------------------------------------------------------------------ */
/* Делегирование событий                                               */
/* ------------------------------------------------------------------ */

document.addEventListener("click", async (e) => {
  const navEl = e.target.closest("[data-nav]");
  if (navEl) {
    e.preventDefault();
    go(navEl.dataset.nav);
    return;
  }

  const globalEl = e.target.closest("[data-global]");
  if (globalEl) {
    e.preventDefault();
    globalAction(globalEl.dataset.global);
    return;
  }

  const actionEl = e.target.closest("[data-action]");
  if (actionEl) {
    const screen = screens[current];
    const fn = screen.actions?.[actionEl.dataset.action];
    if (fn) {
      e.preventDefault();
      await fn(actionEl, e);
      return;
    }
  }
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("form[data-form]");
  if (!form) return;
  e.preventDefault();
  const screen = screens[current];
  const fn = screen.forms?.[form.dataset.form];
  if (!fn) return;
  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    await fn(form, e);
  } catch (err) {
    console.error(err);
    toast(err.message || "Не удалось сохранить", "err");
  } finally {
    if (submit) submit.disabled = false;
  }
});

document.addEventListener("input", (e) => {
  const screen = screens[current];
  screen.onInput?.(e.target, e);
});

document.addEventListener("change", (e) => {
  const screen = screens[current];
  screen.onChange?.(e.target, e);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (hasModal()) closeTopModal();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openSearch();
  }
});

/* ------------------------------------------------------------------ */
/* Глобальные действия                                                 */
/* ------------------------------------------------------------------ */

function globalAction(name) {
  if (name === "more") openMore();
  if (name === "search") openSearch();
  if (name === "theme") toggleTheme();
  if (name === "archive") openArchive();
  if (name === "exchange") {
    go("settings");
    setTimeout(() => {
      document.getElementById("data-section")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  }
}

function toggleTheme() {
  const state = getState();
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(next);
  toast(next === "dark" ? "Тёмная тема" : "Светлая тема");
  document.querySelector('[data-global="theme"]').innerHTML =
    icon(next === "dark" ? "moon" : "sun", "size-4.5");
}

function openMore() {
  const m = openModal({
    title: "Ещё",
    subtitle: "Заправки, финансы и настройки",
    body: `<div>
      ${MORE.map(
        (n) => `<button class="sheet-item" data-nav="${n.id}">
          <span class="tile">${icon(n.icon, "size-4.5")}</span>
          <span style="flex:1">${n.label}</span>
          ${icon("chevronRight", "size-4")}
        </button>`
      ).join("")}
      <button class="sheet-item" data-global="archive">
        <span class="tile">${icon("cloud", "size-4.5")}</span>
        <span style="flex:1">Облачный архив</span>${icon("chevronRight", "size-4")}
      </button>
    </div>`,
  });
  m.el.querySelectorAll("[data-nav]").forEach((b) =>
    b.addEventListener("click", () => {
      closeModal(m.el.__entry);
      go(b.dataset.nav);
    })
  );
  m.el.querySelector('[data-global="archive"]').addEventListener("click", () => {
    closeModal(m.el.__entry);
    openArchive();
  });
}


function openSearch() {
  const state = getState();
  const m = openModal({
    title: "Поиск",
    body: `
      <div class="search" style="margin-bottom:12px">
        ${icon("search", "size-4")}
        <input class="input" id="search-input" placeholder="Рейс, путевой лист, АЗС, расход…" autocomplete="off" />
      </div>
      <div id="search-results"></div>`,
  });

  const input = m.el.querySelector("#search-input");
  const results = m.el.querySelector("#search-results");

  const draw = (q) => {
    const query = q.trim().toLowerCase();
    if (!query) {
      results.innerHTML = `<p class="small muted" style="padding:8px 2px">Начните вводить запрос. Поиск работает по всем данным приложения.</p>`;
      return;
    }
    const hits = [];

    for (const t of state.trips) {
      const hay = `${t.from} ${t.to} ${t.cargo} ${t.note}`.toLowerCase();
      if (hay.includes(query)) {
        hits.push({
          screen: "trips",
          icon: "route",
          title: `${t.from} → ${t.to}`,
          sub: `${fmtDate(t.date)} · ${t.distance} км · ${money(t.amount)}`,
        });
      }
    }
    for (const w of state.waybills) {
      const hay = `${w.number} ${w.fromCity} ${w.toCity} ${w.cargo}`.toLowerCase();
      if (hay.includes(query)) {
        hits.push({
          screen: "waybills",
          icon: "file",
          title: `Путевой лист ${w.series}-${w.number}`,
          sub: `${w.fromCity} → ${w.toCity} · ${fmtDate(w.validFrom)}`,
        });
      }
    }
    for (const f of state.fuels) {
      const hay = `${f.station} ${f.fuelType}`.toLowerCase();
      if (hay.includes(query)) {
        hits.push({
          screen: "fuels",
          icon: "fuel",
          title: `${f.station} · ${f.liters} л`,
          sub: `${fmtDate(f.date)} · ${f.fuelType}`,
        });
      }
    }
    for (const f of state.finance) {
      const hay = `${f.category} ${f.note}`.toLowerCase();
      if (hay.includes(query)) {
        hits.push({
          screen: "finance",
          icon: "wallet",
          title: f.category,
          sub: `${fmtDate(f.date)} · ${money(f.amount)}`,
        });
      }
    }

    if (!hits.length) {
      results.innerHTML = `<p class="small muted" style="padding:12px 2px">Ничего не найдено</p>`;
      return;
    }
    results.innerHTML = `<div class="list card">${hits
      .slice(0, 12)
      .map(
        (h) => `<button class="row" data-search-go="${h.screen}">
          <span class="ri">${icon(h.icon, "size-4")}</span>
          <span class="rmain"><span class="rtitle">${esc(h.title)}</span>
          <span class="rsub">${esc(h.sub)}</span></span>
          ${icon("chevronRight", "size-4", 2)}</button>`
      )
      .join("")}</div>`;
    results.querySelectorAll("[data-search-go]").forEach((b) =>
      b.addEventListener("click", () => {
        closeModal(m.el.__entry);
        go(b.dataset.searchGo);
      })
    );
  };

  input.addEventListener("input", () => draw(input.value));
  draw("");
  setTimeout(() => input.focus(), 50);
}

function openArchive() {
  const state = getState();
  const m = openModal({
    title: "Облачный архив",
    subtitle: "Резервная копия данных",
    body: `
      <div class="notice" style="margin-bottom:12px">
        ${icon("info", "size-4")}
        <span>Данные хранятся на устройстве. Архив — это JSON-файл со всеми рейсами,
        листами, заправками и финансами. Его можно сохранить в облако или отправить себе.</span>
      </div>
      <div class="kv" style="margin-bottom:14px">
        <div><div class="k">Рейсов</div><div class="v">${state.trips.length}</div></div>
        <div><div class="k">Путевых листов</div><div class="v">${state.waybills.length}</div></div>
        <div><div class="k">Заправок</div><div class="v">${state.fuels.length}</div></div>
        <div><div class="k">Операций</div><div class="v">${state.finance.length}</div></div>
      </div>
      <button class="btn btn-primary btn-block" data-archive-save>${icon(
        "download",
        "size-4"
      )}Сохранить архив</button>
      <p class="small muted" style="margin-top:10px;text-align:center">Последняя синхронизация: ${fmtDate(
        isoDate(new Date(state.settings.lastSync || Date.now()))
      )}, ${fmtTime(state.settings.lastSync || Date.now())}</p>`,
  });

  m.el.querySelector("[data-archive-save]").addEventListener("click", async () => {
    const { exportState, markSynced } = await import("./store.js");
    const { download } = await import("./utils.js");
    download(`autoprofi-backup-${today()}.json`, exportState());
    markSynced();
    toast("Архив сохранён", "ok");
  });
}

/* ------------------------------------------------------------------ */
/* Старт                                                               */
/* ------------------------------------------------------------------ */

function boot() {
  applyTheme(getState().settings.theme);
  shell();
  if (!location.hash) location.hash = "#/home";
  renderScreen();
  window.addEventListener("hashchange", renderScreen);
  window.addEventListener("app:refresh", () => renderScreen({ keepScroll: true }));

  subscribe(() => {
    // Перерисовываем текущий экран; модалки живут отдельно и не страдают.
    renderScreen({ keepScroll: true });
  });

  // Заставка
  const splash = document.getElementById("splash");
  const hide = () => splash?.classList.add("gone");
  setTimeout(hide, 420);
  window.addEventListener("load", () => setTimeout(hide, 150));

  // Кнопка «Назад» в Android WebView
  window.__appBack = () => {
    if (hasModal()) {
      closeTopModal();
      return true;
    }
    if (current !== "home") {
      go("home");
      return true;
    }
    return false;
  };

  // Service worker (только на http(s), не мешает WebView)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", boot);
