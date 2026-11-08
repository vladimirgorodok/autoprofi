/* Главная: текущая смена, показатели, быстрые действия. */

import {
  activeVehicle,
  activeWaybill,
  financeStats,
  fuelStats,
  incomeByDay,
  monthTrips,
  prevMonthStats,
  reminders,
  tripSummary,
  vehicleName,
} from "../store.js";
import { barChart, emptyState, icon, kpi, tripBadge, waybillBadge } from "../ui.js";
import { esc, fmtDate, fmtDateShort, money, num, relDate, today } from "../utils.js";
import { openTripModal, openTripModalForm } from "./trips.js";
import { openWaybillModal } from "./waybills.js";
import { openFuelModal } from "./fuels.js";
import { openFinanceModal } from "./finance.js";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

function pctDelta(current, prev) {
  if (!prev) return null;
  return Math.round(((current - prev) / prev) * 100);
}

export default {
  title: "Главная",

  subtitle(state) {
    const active = activeWaybill();
    const v = activeVehicle();
    return `${v ? vehicleName(v) + " · " + v.plate : "Нет автомобиля"}${
      active ? " · смена открыта" : ""
    }`;
  },

  primaryAction: { label: "Заправка", action: "new-fuel" },

  render(state) {
    const wb = activeWaybill();
    const vehicle = activeVehicle();
    const month = financeStats("month");
    const prev = prevMonthStats();
    const trips = monthTrips();
    const tripStat = tripSummary(trips);
    const fuel = fuelStats();
    const days = incomeByDay(7);
    const weekIncome = days.reduce((a, d) => a + d.value, 0);
    const rem = reminders().slice(0, 3);
    const recent = [...state.trips]
      .filter((t) => t.status !== "planned")
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 3);

    const hero = wb ? renderHero(wb) : renderNoWaybill();

    return `
    <div class="content">
      <div class="greeting">
        <div style="flex:1;min-width:0">
          <h2>${greeting()}, ${esc(state.driver.name.split(" ")[0])}</h2>
          <p>${esc(state.driver.role)} · ${esc(state.driver.company)}</p>
        </div>
        <div class="avatar">${esc(
          state.driver.name
            .split(" ")
            .map((x) => x[0])
            .join("")
            .slice(0, 2)
        )}</div>
      </div>

      ${hero}

      <div class="kpi-grid">
        ${kpi({
          label: "Пробег за месяц",
          value: `${num(tripStat.distance)} <span class="small muted" style="font-weight:600">км</span>`,
          foot: `${tripStat.count} ${tripStat.count === 1 ? "рейс" : "рейсов"}`,
          iconName: "gauge",
          tone: "teal",
        })}
        ${kpi({
          label: "Топливо",
          value: `${num(fuel.liters)} <span class="small muted" style="font-weight:600">л</span>`,
          foot: `${money(fuel.cost)} · ${num(fuel.consumption, 1)} л/100 км`,
          iconName: "fuel",
          tone: "amber",
        })}
        ${kpi({
          label: "Доход",
          value: money(month.income),
          foot: "за текущий месяц",
          iconName: "trendUp",
          tone: "blue",
          delta: pctDelta(month.income, prev.income),
        })}
        ${kpi({
          label: "Расход",
          value: money(month.expense),
          foot: "топливо и прочее",
          iconName: "trendDown",
          tone: "rose",
          delta: pctDelta(month.expense, prev.expense),
        })}
      </div>

      <div class="quick-grid">
        <button class="quick" data-action="new-fuel">
          <span class="qi">${icon("fuel", "size-4.5")}</span>Заправка
        </button>
        <button class="quick" data-action="new-trip">
          <span class="qi">${icon("route", "size-4.5")}</span>Рейс
        </button>
        <button class="quick" data-action="new-expense">
          <span class="qi">${icon("receipt", "size-4.5")}</span>Расход
        </button>
        <button class="quick" data-nav="agent">
          <span class="qi">${icon("sparkles", "size-4.5")}</span>ИИ-агент
        </button>
      </div>

      <div class="card">
        <div class="card-head">
          <h2>Доход за 7 дней</h2>
          <span class="sub">${money(weekIncome)}</span>
        </div>
        <div style="padding:4px 10px 12px">
          ${barChart(days)}
        </div>
      </div>

      ${
        rem.length
          ? `<div class="card">
              <div class="card-head"><h2>Напоминания</h2><span class="sub">${rem.length}</span></div>
              <div class="list">
                ${rem
                  .map(
                    (r) => `<button class="row" data-nav="${
                      r.kind === "insurance" ? "vehicles" : "vehicles"
                    }">
                      <span class="ri ${r.tone === "rose" ? "rose" : "amber"}">${icon(
                      r.kind === "insurance" ? "shield" : "wrench",
                      "size-4"
                    )}</span>
                      <span class="rmain">
                        <span class="rtitle">${esc(r.title)}</span>
                        <span class="rsub">${esc(r.text)}</span>
                      </span>
                      ${icon("chevronRight", "size-4", 2)}
                    </button>`
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }

      <div>
        <div class="section-title" style="margin-bottom:8px">
          <h2>Последние рейсы</h2>
          <button class="link" data-nav="trips">Все рейсы ${icon("chevronRight", "size-3.5", 2)}</button>
        </div>
        <div class="card">
          ${
            recent.length
              ? `<div class="list">${recent
                  .map(
                    (t) => `<button class="row" data-action="open-trip" data-id="${t.id}">
                      <span class="ri teal">${icon("route", "size-4")}</span>
                      <span class="rmain">
                        <span class="rtitle">${esc(t.from)} → ${esc(t.to)}</span>
                        <span class="rsub">${fmtDateShort(t.date)} · ${num(t.distance)} км · ${esc(
                      t.cargo
                    )}</span>
                      </span>
                      <span class="rside">
                        <span class="ramount">${money(t.amount)}</span>
                        <span class="rdate">${tripBadge(t.status)}</span>
                      </span>
                    </button>`
                  )
                  .join("")}</div>`
              : emptyState({
                  iconName: "route",
                  title: "Пока нет рейсов",
                  text: "Добавьте первый рейс — он появится здесь.",
                })
          }
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;padding:2px 4px 6px">
        <span class="tiny muted">Данные на ${fmtDate(today())}, ${new Date().toLocaleTimeString(
      "ru-RU",
      { hour: "2-digit", minute: "2-digit" }
    )}</span>
        <button class="tiny muted" data-nav="settings" style="font-weight:600">О приложении</button>
      </div>
    </div>`;
  },

  actions: {
    "new-fuel": () => openFuelModal(),
    "new-trip": () => openTripModalForm(),
    "new-expense": () => openFinanceModal({ type: "expense" }),
    "open-trip": (el) => openTripModal(el.dataset.id),
    "open-waybill": () => {
      const wb = activeWaybill();
      if (wb) openWaybillModal(wb.id);
    },
    "add-trip": () => openTripModalForm(),
  },
};

function renderHero(wb) {
  const pct = Math.min(96, Math.max(3, (wb.kmDone / (wb.distance || 1)) * 100));
  const left = Math.max(0, wb.distance - wb.kmDone);
  const fuelLeft = Math.max(0, (wb.fuelIssued || 0) - (wb.fuelUsed || 0));
  return `
    <div class="card hero">
      <div class="hero-top">
        <span class="label">Путевой лист ${esc(wb.series)}-${esc(wb.number)}</span>
        ${waybillBadge(wb.status)}
        <span class="spacer"></span>
        <button class="icon-btn" data-action="open-waybill" aria-label="Открыть лист">
          ${icon("chevronRight", "size-4.5")}
        </button>
      </div>

      <div class="route-points">
        <div class="route-point from">
          <span class="rp-label">${icon("packagePlus", "size-3.5")}Погрузка</span>
          <div class="rp-city">${esc(wb.fromCity)}</div>
          <div class="rp-addr">${esc(wb.fromAddr)}</div>
        </div>
        <div class="route-arrow">${icon("arrowRight", "size-4")}</div>
        <div class="route-point to">
          <span class="rp-label">Выгрузка${icon("packageCheck", "size-3.5")}</span>
          <div class="rp-city">${esc(wb.toCity)}</div>
          <div class="rp-addr">${esc(wb.toAddr)}</div>
        </div>
      </div>

      <div class="route-track">
        <div class="route-line"></div>
        <div class="route-fill" style="width:${pct}%"></div>
        <div class="route-truck" style="left:${pct}%">${icon("truck", "size-4.5")}</div>
        <div class="route-marks">
          <span class="done">${num(wb.kmDone)} км</span>
          <span>${num(wb.distance)} км · ${num(wb.fuelUsed)} л</span>
        </div>
      </div>

      <div class="hero-stats">
        <div class="hero-stat">
          <div class="k">Пройдено</div>
          <div class="v">${num(wb.kmDone)} км</div>
        </div>
        <div class="hero-stat">
          <div class="k">Осталось</div>
          <div class="v">${num(left)} км</div>
        </div>
        <div class="hero-stat">
          <div class="k">Топливо</div>
          <div class="v">${num(fuelLeft)} л</div>
        </div>
      </div>

      <div class="hero-actions">
        <button class="btn btn-primary" data-action="open-waybill">
          ${icon("file", "size-4")}Открыть лист
        </button>
        <button class="btn btn-soft" data-action="new-fuel">
          ${icon("fuel", "size-4")}Заправка
        </button>
      </div>
    </div>`;
}

function renderNoWaybill() {
  return `
    <div class="card">
      <div class="card-pad" style="display:flex;gap:12px;align-items:center">
        <span class="ri amber" style="width:42px;height:42px;border-radius:11px;display:grid;place-items:center">
          ${icon("file", "size-5")}
        </span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:650;font-size:14px">Смена не открыта</div>
          <div class="small muted">Создайте путевой лист, чтобы отслеживать маршрут и топливо.</div>
        </div>
        <button class="btn btn-primary btn-sm" data-nav="waybills">Создать</button>
      </div>
    </div>`;
}
