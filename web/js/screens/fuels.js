/* Заправки: журнал, расход, стоимость. */

import { deleteFuel, fuelStats, getState, saveFuel } from "../store.js";
import {
  closeModal,
  confirmDialog,
  dateInput,
  emptyState,
  field,
  formData,
  icon,
  input,
  moneyInput,
  openModal,
  select,
  toast,
} from "../ui.js";
import { download, esc, fmtDate, fmtDateShort, money, num, toCSV, today } from "../utils.js";

const STATIONS = [
  "Лукойл",
  "Газпромнефть",
  "Роснефть",
  "Татнефть",
  "Shell",
  "Нефтьмагистраль",
  "Другая",
];

export default {
  title: "Заправки",

  subtitle(state) {
    const f = fuelStats();
    return `${num(f.liters)} л за месяц · ${money(f.cost)}`;
  },

  primaryAction: { label: "Заправка", action: "new" },

  render(state) {
    const f = fuelStats();
    const list = state.fuels.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const chartData = list
      .slice(0, 7)
      .reverse()
      .map((x) => ({ date: x.date, value: x.liters }));

    return `
    <div class="content">
      <div class="kpi-grid">
        <div class="kpi kpi-teal">
          <div class="kpi-top"><span class="kpi-label">За месяц</span><span class="kpi-icon">${icon(
            "fuel",
            "size-4"
          )}</span></div>
          <div class="kpi-value">${num(f.liters)} <span class="small muted" style="font-weight:600">л</span></div>
          <div class="kpi-foot">${money(f.cost)}</div>
        </div>
        <div class="kpi kpi-amber">
          <div class="kpi-top"><span class="kpi-label">Расход</span><span class="kpi-icon">${icon(
            "gauge",
            "size-4"
          )}</span></div>
          <div class="kpi-value">${num(f.consumption, 1)}</div>
          <div class="kpi-foot">л / 100 км</div>
        </div>
        <div class="kpi kpi-blue">
          <div class="kpi-top"><span class="kpi-label">Цена</span><span class="kpi-icon">${icon(
            "coins",
            "size-4"
          )}</span></div>
          <div class="kpi-value">${num(f.avgPrice, 2)} <span class="small muted" style="font-weight:600">₽</span></div>
          <div class="kpi-foot">средняя за литр</div>
        </div>
        <div class="kpi kpi-rose">
          <div class="kpi-top"><span class="kpi-label">Пробег</span><span class="kpi-icon">${icon(
            "route",
            "size-4"
          )}</span></div>
          <div class="kpi-value">${num(f.km)}</div>
          <div class="kpi-foot">км по чекам</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Последние заправки, литры</h2><span class="sub">${
          chartData.length
        } шт.</span></div>
        <div style="padding:4px 10px 12px">
          ${
            chartData.length
              ? `<div class="chart" style="height:96px">${chartData
                  .map((d, i) => {
                    const max = Math.max(...chartData.map((x) => x.value), 1);
                    const h = Math.max(4, Math.round((d.value / max) * 68));
                    return `<div class="col ${i === chartData.length - 1 ? "today" : ""}">
                      <span class="val">${num(d.value)}</span>
                      <div class="bar" style="height:${h}px"></div>
                      <span class="cl">${fmtDateShort(d.date)}</span>
                    </div>`;
                  })
                  .join("")}</div>`
              : `<p class="small muted" style="padding:12px">Добавьте первую заправку.</p>`
          }
        </div>
      </div>

      <div class="section-title">
        <h2>Журнал</h2>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" data-action="export">${icon("download", "size-3.5")}CSV</button>
          <button class="btn btn-sm btn-primary" data-action="new">${icon("plus", "size-3.5")}Добавить</button>
        </div>
      </div>

      ${
        list.length
          ? `<div class="card"><div class="list">${list.map(renderRow).join("")}</div></div>`
          : `<div class="card">${emptyState({
              iconName: "fuel",
              title: "Заправок нет",
              text: "Фиксируйте каждую заправку — приложение посчитает расход и стоимость.",
              action: `<button class="btn btn-primary btn-sm" data-action="new">${icon(
                "plus",
                "size-4"
              )}Добавить заправку</button>`,
            })}</div>`
      }
    </div>`;
  },

  actions: {
    new: () => openFuelModal(),
    open: (el) => openFuelModal(el.dataset.id),
    export: () => exportCSV(),
  },
};

function renderRow(f) {
  return `
    <button class="row" data-action="open" data-id="${f.id}">
      <span class="ri amber">${icon("fuel", "size-4")}</span>
      <span class="rmain">
        <span class="rtitle">${esc(f.station)} <span class="tiny muted" style="font-weight:500">${esc(
    f.fuelType
  )}</span></span>
        <span class="rsub">${fmtDateShort(f.date)} · ${num(f.liters)} л × ${num(f.price, 2)} ₽ · ${num(
    f.odometer
  )} км</span>
      </span>
      <span class="rside">
        <span class="ramount">${money(f.liters * f.price)}</span>
        <span class="rdate">${f.full ? "полный бак" : "частично"}</span>
      </span>
    </button>`;
}

/* ------------------------------------------------------------------ */
/* Форма                                                               */
/* ------------------------------------------------------------------ */

export function openFuelModal(id = null) {
  const state = getState();
  const item = id ? state.fuels.find((f) => f.id === id) : null;
  const isNew = !item;
  const vehicle = state.vehicles.find((v) => v.active) || state.vehicles[0];
  const data = item || {
    date: today(),
    station: "",
    fuelType: "ДТ",
    liters: "",
    price: "",
    odometer: vehicle?.odometer || "",
    vehicleId: vehicle?.id || "",
    waybillId: "",
    full: true,
  };

  const m = openModal({
    title: isNew ? "Новая заправка" : "Редактировать заправку",
    subtitle: isNew ? "Чек и показания одометра" : `${data.station} · ${fmtDate(data.date)}`,
    body: `
      <form data-fuel-form style="display:flex;flex-direction:column;gap:11px">
        <div class="form-grid">
          ${field("Дата", dateInput({ name: "date", value: data.date }))}
          ${field(
            "АЗС",
            `<input class="input" name="station" list="stations" value="${esc(data.station)}"
              placeholder="Название" required />
             <datalist id="stations">${STATIONS.map((s) => `<option value="${s}">`).join("")}</datalist>`
          )}
          ${field("Топливо", select({
            name: "fuelType",
            value: data.fuelType,
            options: ["ДТ", "АИ-92", "АИ-95", "АИ-98", "Газ"],
          }))}
          ${field("Одометр, км", moneyInput({ name: "odometer", value: data.odometer }))}
          ${field("Литров", moneyInput({ name: "liters", value: data.liters }))}
          ${field("Цена за литр, ₽", moneyInput({ name: "price", value: data.price }))}
          ${
            state.vehicles.length > 1
              ? `<div class="span-2">${field(
                  "Автомобиль",
                  select({
                    name: "vehicleId",
                    value: data.vehicleId,
                    options: state.vehicles.map((v) => ({
                      value: v.id,
                      label: `${v.brand} ${v.model} · ${v.plate}`,
                    })),
                  })
                )}</div>`
              : ""
          }
          <div class="span-2">
            <div class="notice" style="justify-content:space-between;align-items:center">
              <span>Сумма к оплате</span>
              <b id="fuel-total" style="font-size:15px">${money(0)}</b>
            </div>
          </div>
          <div class="span-2">${field(
            "Путевой лист",
            select({
              name: "waybillId",
              value: data.waybillId || "",
              placeholder: "Без листа",
              options: state.waybills.map((w) => ({
                value: w.id,
                label: `${w.series}-${w.number} · ${w.fromCity} → ${w.toCity}`,
              })),
            })
          )}</div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px">
          <input type="checkbox" name="full" ${data.full ? "checked" : ""} />
          Полный бак (для расчёта расхода)
        </label>
      </form>`,
    footer: `
      ${
        isNew
          ? ""
          : `<button class="btn btn-danger" data-fuel-delete>${icon("trash", "size-4")}</button>`
      }
      <button class="btn" data-fuel-cancel>Отмена</button>
      <button class="btn btn-primary" data-fuel-save>${isNew ? "Добавить" : "Сохранить"}</button>`,
  });

  const form = m.el.querySelector("[data-fuel-form]");
  const liters = form.querySelector('[name="liters"]');
  const price = form.querySelector('[name="price"]');
  const totalEl = m.el.querySelector("#fuel-total");
  const recalc = () => {
    totalEl.textContent = money((Number(liters.value) || 0) * (Number(price.value) || 0));
  };
  liters.addEventListener("input", recalc);
  price.addEventListener("input", recalc);
  recalc();

  const save = () => {
    const raw = formData(form);
    const payload = {
      ...raw,
      liters: Number(raw.liters) || 0,
      price: Number(raw.price) || 0,
      odometer: Number(raw.odometer) || 0,
      vehicleId: raw.vehicleId || vehicle?.id || null,
      waybillId: raw.waybillId || null,
      full: form.querySelector('[name="full"]').checked,
    };
    if (!payload.station) {
      toast("Укажите АЗС", "err");
      return;
    }
    if (payload.liters <= 0 || payload.price <= 0) {
      toast("Проверьте литры и цену", "err");
      return;
    }
    if (payload.odometer <= 0) {
      toast("Укажите показания одометра", "err");
      return;
    }
    saveFuel(isNew ? payload : { ...payload, id: item.id });
    closeModal(m.el.__entry);
    toast(isNew ? "Заправка добавлена" : "Заправка обновлена", "ok");
  };

  m.el.querySelector("[data-fuel-save]").addEventListener("click", save);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    save();
  });
  m.el.querySelector("[data-fuel-cancel]").addEventListener("click", () => closeModal(m.el.__entry));
  m.el.querySelector("[data-fuel-delete]")?.addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "Удалить заправку?",
      message: "Запись и связанный расход будут удалены.",
      confirmText: "Удалить",
      danger: true,
    });
    if (!ok) return;
    deleteFuel(item.id);
    closeModal(m.el.__entry);
    toast("Заправка удалена", "ok");
  });
}

function exportCSV() {
  const csv = toCSV(getState().fuels, [
    { label: "Дата", value: (f) => f.date },
    { label: "АЗС", value: (f) => f.station },
    { label: "Топливо", value: (f) => f.fuelType },
    { label: "Литров", value: (f) => f.liters },
    { label: "Цена", value: (f) => f.price },
    { label: "Сумма", value: (f) => Math.round(f.liters * f.price * 100) / 100 },
    { label: "Одометр", value: (f) => f.odometer },
  ]);
  download(`zapravki-${today()}.csv`, csv, "text/csv");
  toast("CSV сохранён", "ok");
}
