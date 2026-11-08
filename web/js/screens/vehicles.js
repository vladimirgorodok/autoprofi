/* Автомобили: пробег, ТО, страховка, расход. */

import { deleteVehicle, getState, saveVehicle, setActiveVehicle, vehicleConsumption } from "../store.js";
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
import { esc, fmtDate, money, num } from "../utils.js";

export default {
  title: "Автомобили",

  subtitle(state) {
    return `${state.vehicles.length} в гараже`;
  },

  primaryAction: { label: "Авто", action: "new" },

  render(state) {
    const list = state.vehicles;
    return `
    <div class="content">
      ${
        list.length
          ? `<div style="display:flex;flex-direction:column;gap:10px">${list.map(renderCard).join("")}</div>`
          : `<div class="card">${emptyState({
              iconName: "truck",
              title: "Гараж пуст",
              text: "Добавьте автомобиль, чтобы отслеживать пробег и ТО.",
              action: `<button class="btn btn-primary btn-sm" data-action="new">${icon(
                "plus",
                "size-4"
              )}Добавить авто</button>`,
            })}</div>`
      }

      <div class="notice">
        ${icon("info", "size-4")}
        <span>Пробег обновляется автоматически при закрытии путевого листа и добавлении заправки с одометром.</span>
      </div>
    </div>`;
  },

  actions: {
    new: () => openVehicleModal(),
    open: (el) => openVehicleModal(el.dataset.id),
    activate: (el) => {
      setActiveVehicle(el.dataset.id);
      toast("Основной автомобиль изменён", "ok");
    },
  },
};

function renderCard(v) {
  const left = Math.max(0, v.nextService - v.odometer);
  const servicePct = Math.min(100, Math.round((v.odometer / v.nextService) * 100));
  const consumption = vehicleConsumption(v.id) || v.consumption;
  return `
    <div class="card" style="overflow:hidden">
      <div style="padding:14px;display:flex;gap:12px;align-items:flex-start">
        <span class="ri ${v.color === "amber" ? "amber" : "teal"}"
          style="width:44px;height:44px;border-radius:11px;display:grid;place-items:center">
          ${icon("truck", "size-5")}
        </span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px">
            <b style="font-size:14.5px;letter-spacing:-.01em">${esc(v.brand)} ${esc(v.model)}</b>
            ${v.active ? `<span class="badge badge-teal">Основной</span>` : ""}
          </div>
          <div class="small muted" style="margin-top:2px">
            ${esc(v.plate)}${v.trailer ? " · прицеп " + esc(v.trailer) : ""} · ${v.year}
          </div>
        </div>
        <button class="icon-btn" data-action="open" data-id="${v.id}" aria-label="Изменить">
          ${icon("pencil", "size-4")}
        </button>
      </div>

      <div class="kv" style="margin:0 14px 12px">
        <div><div class="k">Пробег</div><div class="v">${num(v.odometer)} км</div></div>
        <div><div class="k">Расход</div><div class="v">${num(consumption, 1)} л/100</div></div>
        <div><div class="k">До ТО</div><div class="v">${num(left)} км</div></div>
        <div><div class="k">ОСАГО до</div><div class="v">${fmtDate(v.insurance, "short")}</div></div>
      </div>

      <div style="padding:0 14px 14px">
        <div class="progress ${left < 1000 ? "rose" : left < 3000 ? "amber" : ""}">
          <i style="width:${servicePct}%"></i>
        </div>
        <div class="tiny muted" style="display:flex;justify-content:space-between;margin-top:4px">
          <span>${left <= 0 ? "ТО просрочено" : `ТО через ${num(left)} км`}</span>
          <span>${num(v.nextService)} км</span>
        </div>
      </div>

      ${
        v.active
          ? ""
          : `<div style="padding:0 14px 14px">
              <button class="btn btn-sm btn-block" data-action="activate" data-id="${v.id}">
                ${icon("check", "size-3.5")}Сделать основным
              </button>
            </div>`
      }
    </div>`;
}

export function openVehicleModal(id = null) {
  const state = getState();
  const v = id ? state.vehicles.find((x) => x.id === id) : null;
  const isNew = !v;
  const data = v || {
    brand: "",
    model: "",
    plate: "",
    trailer: "",
    year: new Date().getFullYear(),
    odometer: 0,
    nextService: 0,
    insurance: "",
    consumption: 32,
    fuel: "ДТ",
    tank: 500,
    color: "teal",
    active: state.vehicles.length === 0,
  };

  const m = openModal({
    title: isNew ? "Новый автомобиль" : `${data.brand} ${data.model}`,
    subtitle: isNew ? "Данные тягача" : data.plate,
    body: `
      <form data-veh-form style="display:flex;flex-direction:column;gap:11px">
        <div class="form-grid">
          ${field("Марка", input({ name: "brand", value: data.brand, placeholder: "Volvo", required: true }))}
          ${field("Модель", input({ name: "model", value: data.model, placeholder: "FH 460" }))}
          ${field("Госномер", input({ name: "plate", value: data.plate, placeholder: "А123ВС 77" }))}
          ${field("Прицеп", input({ name: "trailer", value: data.trailer, placeholder: "АП 4821 77" }))}
          ${field("Год", moneyInput({ name: "year", value: data.year }))}
          ${field("Пробег, км", moneyInput({ name: "odometer", value: data.odometer }))}
          ${field("Следующее ТО, км", moneyInput({ name: "nextService", value: data.nextService }))}
          ${field("ОСАГО до", dateInput({ name: "insurance", value: data.insurance }))}
          ${field("Расход, л/100", moneyInput({ name: "consumption", value: data.consumption }))}
          ${field(
            "Топливо",
            select({ name: "fuel", value: data.fuel, options: ["ДТ", "АИ-92", "АИ-95", "Газ"] })
          )}
          ${field("Бак, л", moneyInput({ name: "tank", value: data.tank }))}
          ${field(
            "Цвет метки",
            select({
              name: "color",
              value: data.color,
              options: [
                { value: "teal", label: "Бирюзовый" },
                { value: "amber", label: "Янтарный" },
              ],
            })
          )}
        </div>
      </form>`,
    footer: `
      ${
        isNew
          ? ""
          : `<button class="btn btn-danger" data-veh-delete>${icon("trash", "size-4")}</button>`
      }
      <button class="btn" data-veh-cancel>Отмена</button>
      <button class="btn btn-primary" data-veh-save>${isNew ? "Добавить" : "Сохранить"}</button>`,
  });

  const form = m.el.querySelector("[data-veh-form]");
  const save = () => {
    const raw = formData(form);
    const payload = {
      ...raw,
      year: Number(raw.year) || null,
      odometer: Number(raw.odometer) || 0,
      nextService: Number(raw.nextService) || 0,
      consumption: Number(raw.consumption) || 0,
      tank: Number(raw.tank) || 0,
      active: isNew ? data.active : v.active,
    };
    if (!payload.brand) {
      toast("Укажите марку", "err");
      return;
    }
    saveVehicle(isNew ? payload : { ...payload, id: v.id });
    closeModal(m.el.__entry);
    toast(isNew ? "Автомобиль добавлен" : "Изменения сохранены", "ok");
  };

  m.el.querySelector("[data-veh-save]").addEventListener("click", save);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    save();
  });
  m.el.querySelector("[data-veh-cancel]").addEventListener("click", () => closeModal(m.el.__entry));
  m.el.querySelector("[data-veh-delete]")?.addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "Удалить автомобиль?",
      message: "Путевые листы и заправки останутся, но потеряют привязку к авто.",
      confirmText: "Удалить",
      danger: true,
    });
    if (!ok) return;
    deleteVehicle(v.id);
    closeModal(m.el.__entry);
    toast("Автомобиль удалён", "ok");
  });
}
