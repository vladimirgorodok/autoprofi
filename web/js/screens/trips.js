/* Поездки: список, карточка рейса, статусы и оплата. */

import {
  deleteTrip,
  getState,
  saveTrip,
  setTripStatus,
  tripById,
  tripSummary,
  waybillById,
} from "../store.js";
import {
  closeModal,
  confirmDialog,
  datalist,
  dateInput,
  emptyState,
  field,
  formData,
  icon,
  input,
  moneyInput,
  openModal,
  select,
  textarea,
  toast,
  tripBadge,
} from "../ui.js";
import { download, esc, fmtDate, fmtDateShort, money, num, relDate, toCSV, today } from "../utils.js";
import { openWaybillModal } from "./waybills.js";

let filter = "all";

const FILTERS = [
  { id: "all", label: "Все" },
  { id: "planned", label: "Планируются" },
  { id: "active", label: "В пути" },
  { id: "done", label: "Завершены" },
  { id: "paid", label: "Оплачены" },
];

export default {
  title: "Поездки",

  subtitle(state) {
    const s = tripSummary(state.trips);
    return `${s.count} рейсов · ${num(s.distance)} км`;
  },

  primaryAction: { label: "Рейс", action: "new" },

  render(state) {
    const list = state.trips
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .filter((t) => filter === "all" || t.status === filter);
    const summary = tripSummary(state.trips);
    const counts = Object.fromEntries(
      FILTERS.map((f) => [f.id, state.trips.filter((t) => f.id === "all" || t.status === f.id).length])
    );

    return `
    <div class="content">
      <div class="kpi-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="kpi kpi-teal">
          <div class="kpi-label">Рейсов</div>
          <div class="kpi-value">${summary.count}</div>
          <div class="kpi-foot">всего</div>
        </div>
        <div class="kpi kpi-blue">
          <div class="kpi-label">Пробег</div>
          <div class="kpi-value">${num(summary.distance)}</div>
          <div class="kpi-foot">километров</div>
        </div>
        <div class="kpi kpi-amber">
          <div class="kpi-label">Оплачено</div>
          <div class="kpi-value" style="font-size:16px">${money(summary.paid)}</div>
          <div class="kpi-foot">из ${money(summary.amount)}</div>
        </div>
      </div>

      <div class="chips">
        ${FILTERS.map(
          (f) => `<button class="chip ${filter === f.id ? "active" : ""}" data-action="filter" data-value="${f.id}">
            ${f.label}<span class="count">${counts[f.id]}</span>
          </button>`
        ).join("")}
      </div>

      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" data-action="export">${icon("download", "size-3.5")}CSV</button>
        <button class="btn btn-sm" data-action="new">${icon("plus", "size-3.5")}Новый рейс</button>
        <span style="flex:1"></span>
        <span class="tiny muted" style="align-self:center">${list.length} из ${state.trips.length}</span>
      </div>

      ${
        list.length
          ? `<div class="card"><div class="list">${list.map(renderRow).join("")}</div></div>`
          : `<div class="card">${emptyState({
              iconName: "route",
              title: "Рейсов нет",
              text: "Добавьте рейс, чтобы учитывать пробег и доход.",
              action: `<button class="btn btn-primary btn-sm" data-action="new">${icon(
                "plus",
                "size-4"
              )}Новый рейс</button>`,
            })}</div>`
      }
    </div>`;
  },

  actions: {
    filter: (el) => {
      filter = el.dataset.value;
      window.dispatchEvent(new CustomEvent("app:refresh"));
    },
    new: () => openTripModalForm(),
    open: (el) => openTripModal(el.dataset.id),
    export: () => exportCSV(),
  },
};

function renderRow(t) {
  return `
    <button class="row" data-action="open" data-id="${t.id}">
      <span class="ri ${t.status === "paid" ? "emerald" : t.status === "active" ? "teal" : "blue"}">
        ${icon("route", "size-4")}
      </span>
      <span class="rmain">
        <span class="rtitle">${esc(t.from)} → ${esc(t.to)}</span>
        <span class="rsub">${fmtDateShort(t.date)} · ${num(t.distance)} км · ${esc(t.cargo || "—")}</span>
      </span>
      <span class="rside">
        <span class="ramount">${money(t.amount)}</span>
        <span class="rdate">${tripBadge(t.status)}</span>
      </span>
    </button>`;
}

/* ------------------------------------------------------------------ */
/* Карточка рейса                                                      */
/* ------------------------------------------------------------------ */

export function openTripModal(id) {
  const t = tripById(id);
  if (!t) return;
  const wb = t.waybillId ? waybillById(t.waybillId) : null;

  const m = openModal({
    title: `${t.from} → ${t.to}`,
    subtitle: `${fmtDate(t.date, "long")} · ${tripBadge(t.status).replace(/<[^>]+>/g, "")}`,
    body: `
      <div class="kv" style="margin-bottom:12px">
        <div><div class="k">Дата</div><div class="v">${fmtDate(t.date)}</div></div>
        <div><div class="k">Расстояние</div><div class="v">${num(t.distance)} км</div></div>
        <div><div class="k">Груз</div><div class="v">${esc(t.cargo || "—")}</div></div>
        <div><div class="k">Ставка</div><div class="v">${t.rate ? `${num(t.rate)} ₽/км` : "—"}</div></div>
        <div><div class="k">Сумма</div><div class="v big">${money(t.amount)}</div></div>
        <div><div class="k">Статус</div><div class="v">${tripBadge(t.status)}</div></div>
        ${
          wb
            ? `<div class="span-2"><div class="k">Путевой лист</div><div class="v">
                <button class="link" data-open-wb style="font-weight:650;color:var(--primary)">
                  ${esc(wb.series)}-${esc(wb.number)} · ${esc(wb.fromCity)} → ${esc(wb.toCity)}
                </button></div></div>`
            : ""
        }
        ${
          t.note
            ? `<div class="span-2"><div class="k">Примечание</div><div class="v" style="font-weight:500">${esc(
                t.note
              )}</div></div>`
            : ""
        }
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${
          t.status === "planned"
            ? `<button class="btn btn-primary btn-sm" data-trip-next="active">${icon(
                "truck",
                "size-3.5"
              )}Начать рейс</button>`
            : ""
        }
        ${
          t.status === "active"
            ? `<button class="btn btn-primary btn-sm" data-trip-next="done">${icon(
                "checkCircle",
                "size-3.5"
              )}Завершить</button>`
            : ""
        }
        ${
          t.status === "done"
            ? `<button class="btn btn-primary btn-sm" data-trip-next="paid">${icon(
                "coins",
                "size-3.5"
              )}Отметить оплату</button>`
            : ""
        }
        <button class="btn btn-sm" data-trip-edit>${icon("pencil", "size-3.5")}Изменить</button>
      </div>`,
    footer: `
      <button class="btn btn-danger" data-trip-delete>${icon("trash", "size-4")}Удалить</button>
      <button class="btn btn-primary" data-trip-ok>Готово</button>`,
  });

  m.el.querySelector("[data-trip-ok]").addEventListener("click", () => closeModal(m.el.__entry));
  m.el.querySelector("[data-trip-edit]").addEventListener("click", () => {
    closeModal(m.el.__entry);
    openTripModalForm(t);
  });
  m.el.querySelector("[data-open-wb]")?.addEventListener("click", () => {
    closeModal(m.el.__entry);
    openWaybillModal(wb.id);
  });
  m.el.querySelector("[data-trip-delete]").addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "Удалить рейс?",
      message: `${t.from} → ${t.to} будет удалён вместе со связанным доходом.`,
      confirmText: "Удалить",
      danger: true,
    });
    if (!ok) return;
    deleteTrip(t.id);
    closeModal(m.el.__entry);
    toast("Рейс удалён", "ok");
  });
  m.el.querySelectorAll("[data-trip-next]").forEach((b) =>
    b.addEventListener("click", () => {
      const status = b.dataset.tripNext;
      setTripStatus(t.id, status);
      closeModal(m.el.__entry);
      toast(
        status === "active" ? "Рейс начат" : status === "done" ? "Рейс завершён" : "Оплата отмечена",
        "ok"
      );
      openTripModal(t.id);
    })
  );
}

/* ------------------------------------------------------------------ */
/* Форма                                                               */
/* ------------------------------------------------------------------ */

export function openTripModalForm(trip = null) {
  const state = getState();
  const t = trip || {
    date: today(),
    from: "",
    to: "",
    cargo: "",
    distance: "",
    rate: "",
    amount: "",
    status: "planned",
    waybillId: "",
    note: "",
  };
  const isNew = !trip;
  const placeNames = (state.refs.places || []).map((place) => place.name);
  const cargoNames = (state.refs.cargo || []).map((cargo) => cargo.name);

  const m = openModal({
    title: isNew ? "Новый рейс" : "Редактировать рейс",
    subtitle: isNew ? "Данные о поездке" : `${t.from} → ${t.to}`,
    body: `
      <form data-trip-form style="display:flex;flex-direction:column;gap:11px">
        ${datalist("trip-places", placeNames)}
        ${datalist("trip-cargo", cargoNames)}
        <div class="form-grid">
          ${field("Дата", dateInput({ name: "date", value: t.date }))}
          ${field("Статус", select({
            name: "status",
            value: t.status,
            options: [
              { value: "planned", label: "Запланирован" },
              { value: "active", label: "В пути" },
              { value: "done", label: "Завершён" },
              { value: "paid", label: "Оплачен" },
            ],
          }))}
          ${field(
            "Откуда",
            input({
              name: "from",
              value: t.from,
              placeholder: "Город",
              required: true,
              list: "trip-places",
            })
          )}
          ${field(
            "Куда",
            input({
              name: "to",
              value: t.to,
              placeholder: "Город",
              required: true,
              list: "trip-places",
            })
          )}
          <div class="span-2">${field(
            "Груз",
            input({
              name: "cargo",
              value: t.cargo,
              placeholder: "Например: Продукты, 12 т",
              list: "trip-cargo",
            })
          )}</div>
          ${field("Расстояние, км", moneyInput({ name: "distance", value: t.distance }))}
          ${field("Ставка, ₽/км", moneyInput({ name: "rate", value: t.rate }))}
          ${field("Сумма, ₽", moneyInput({ name: "amount", value: t.amount }))}
          ${field(
            "Путевой лист",
            select({
              name: "waybillId",
              value: t.waybillId || "",
              placeholder: "Без листа",
              options: state.waybills.map((w) => ({
                value: w.id,
                label: `${w.series}-${w.number} · ${w.fromCity} → ${w.toCity}`,
              })),
            })
          )}
          <div class="span-2">${field(
            "Примечание",
            textarea({ name: "note", value: t.note, placeholder: "Время загрузки, контакт, особенности" })
          )}</div>
        </div>
        <p class="form-hint">Сумма посчитается автоматически по расстоянию и ставке, если оставить поле пустым.</p>
      </form>`,
    footer: `
      <button class="btn" data-trip-cancel>Отмена</button>
      <button class="btn btn-primary" data-trip-save>${isNew ? "Добавить" : "Сохранить"}</button>`,
  });

  const form = m.el.querySelector("[data-trip-form]");
  const dist = form.querySelector('[name="distance"]');
  const rate = form.querySelector('[name="rate"]');
  const amount = form.querySelector('[name="amount"]');
  const recalc = () => {
    const d = Number(dist.value) || 0;
    const r = Number(rate.value) || 0;
    if (d && r && !amount.dataset.touched) amount.value = String(Math.round(d * r));
  };
  dist.addEventListener("input", recalc);
  rate.addEventListener("input", recalc);
  amount.addEventListener("input", () => {
    amount.dataset.touched = "1";
  });

  const save = () => {
    const raw = formData(form);
    const payload = {
      ...raw,
      distance: Number(raw.distance) || 0,
      rate: Number(raw.rate) || 0,
      amount: Number(raw.amount) || Math.round((Number(raw.distance) || 0) * (Number(raw.rate) || 0)),
      waybillId: raw.waybillId || null,
    };
    if (!payload.from || !payload.to) {
      toast("Укажите откуда и куда", "err");
      return;
    }
    if (!payload.amount) {
      toast("Укажите сумму или ставку", "err");
      return;
    }
    saveTrip(isNew ? payload : { ...payload, id: t.id });
    closeModal(m.el.__entry);
    toast(isNew ? "Рейс добавлен" : "Рейс обновлён", "ok");
  };

  m.el.querySelector("[data-trip-save]").addEventListener("click", save);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    save();
  });
  m.el.querySelector("[data-trip-cancel]").addEventListener("click", () => closeModal(m.el.__entry));
}

/* ------------------------------------------------------------------ */
/* Экспорт                                                             */
/* ------------------------------------------------------------------ */

function exportCSV() {
  const csv = toCSV(getState().trips, [
    { label: "Дата", value: (t) => t.date },
    { label: "Откуда", value: (t) => t.from },
    { label: "Куда", value: (t) => t.to },
    { label: "Груз", value: (t) => t.cargo },
    { label: "Км", value: (t) => t.distance },
    { label: "Ставка", value: (t) => t.rate },
    { label: "Сумма", value: (t) => t.amount },
    { label: "Статус", value: (t) => t.status },
  ]);
  download(`rejsy-${today()}.csv`, csv, "text/csv");
  toast("CSV сохранён", "ok");
}
