/* Путевые листы: список, карточка, создание и закрытие смены. */

import {
  deleteWaybill,
  getState,
  nextWaybillNumber,
  saveWaybill,
  setWaybillStatus,
  closeWaybill,
  vehicleById,
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
  waybillBadge,
} from "../ui.js";
import { download, esc, fmtDate, num, relDate, toCSV, today } from "../utils.js";

let filter = "all";

const FILTERS = [
  { id: "all", label: "Все" },
  { id: "active", label: "В работе" },
  { id: "issued", label: "Выдан" },
  { id: "draft", label: "Черновик" },
  { id: "closed", label: "Закрыт" },
];

export default {
  title: "Путевые листы",

  subtitle(state) {
    const active = state.waybills.filter((w) => w.status === "active").length;
    return `${state.waybills.length} листов${active ? ` · ${active} в работе` : ""}`;
  },

  primaryAction: { label: "Новый", action: "new" },

  render(state) {
    const list = state.waybills
      .slice()
      .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))
      .filter((w) => filter === "all" || w.status === filter);

    const counts = Object.fromEntries(
      FILTERS.map((f) => [f.id, state.waybills.filter((w) => f.id === "all" || w.status === f.id).length])
    );

    return `
    <div class="content">
      <div class="chips">
        ${FILTERS.map(
          (f) => `<button class="chip ${filter === f.id ? "active" : ""}" data-action="filter" data-value="${f.id}">
            ${f.label}<span class="count">${counts[f.id]}</span>
          </button>`
        ).join("")}
      </div>

      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" data-action="export">${icon("download", "size-3.5")}CSV</button>
        <button class="btn btn-sm" data-action="new">${icon("plus", "size-3.5")}Новый лист</button>
        <span style="flex:1"></span>
        <span class="tiny muted" style="align-self:center">${list.length} из ${state.waybills.length}</span>
      </div>

      ${
        list.length
          ? `<div style="display:flex;flex-direction:column;gap:9px">${list.map(renderCard).join("")}</div>`
          : `<div class="card">${emptyState({
              iconName: "file",
              title: "Листов нет",
              text: "Создайте путевой лист — он появится в этом списке.",
              action: `<button class="btn btn-primary btn-sm" data-action="new">${icon(
                "plus",
                "size-4"
              )}Новый лист</button>`,
            })}</div>`
      }
    </div>`;
  },

  actions: {
    filter: (el) => {
      filter = el.dataset.value;
      window.dispatchEvent(new CustomEvent("app:refresh"));
    },
    new: () => openWaybillForm(),
    open: (el) => openWaybillModal(el.dataset.id),
    export: () => exportCSV(),
  },
};

function renderCard(w) {
  const v = vehicleById(w.vehicleId);
  const pct = Math.min(100, Math.round((w.kmDone / (w.distance || 1)) * 100));
  return `
    <button class="card" data-action="open" data-id="${w.id}" style="text-align:left;width:100%;overflow:hidden">
      <div style="padding:12px 14px;display:flex;gap:11px;align-items:flex-start">
        <span class="ri ${w.status === "active" ? "teal" : w.status === "closed" ? "emerald" : "blue"}"
          style="width:38px;height:38px;border-radius:9px;display:grid;place-items:center">
          ${icon("file", "size-4")}
        </span>
        <span style="flex:1;min-width:0">
          <span style="display:flex;align-items:center;gap:7px">
            <b style="font-size:13.5px;letter-spacing:-.01em">${esc(w.series)}-${esc(w.number)}</b>
            ${waybillBadge(w.status)}
          </span>
          <span class="small" style="display:block;margin-top:3px;color:var(--text-2)">
            ${esc(w.fromCity)} → ${esc(w.toCity)}
          </span>
          <span class="tiny muted" style="display:block;margin-top:2px">
            ${fmtDate(w.validFrom, "short")}–${fmtDate(w.validTo, "short")} · ${num(w.distance)} км ·
            ${esc(v ? `${v.brand} ${v.model}` : "авто не указано")}
          </span>
        </span>
        <span style="color:var(--muted-2);margin-top:9px">${icon("chevronRight", "size-4", 2)}</span>
      </div>
      ${
        w.status === "active"
          ? `<div style="padding:0 14px 12px">
              <div class="progress"><i style="width:${pct}%"></i></div>
              <div class="tiny muted" style="display:flex;justify-content:space-between;margin-top:4px">
                <span>${num(w.kmDone)} из ${num(w.distance)} км</span><span>${pct}%</span>
              </div>
            </div>`
          : ""
      }
    </button>`;
}

/* ------------------------------------------------------------------ */
/* Карточка листа                                                      */
/* ------------------------------------------------------------------ */

export function openWaybillModal(id) {
  const wb = waybillById(id);
  if (!wb) return;
  const v = vehicleById(wb.vehicleId);
  const fuelLeft = Math.max(0, (wb.fuelIssued || 0) - (wb.fuelUsed || 0));

  const m = openModal({
    title: `Путевой лист ${wb.series}-${wb.number}`,
    subtitle: `${fmtDate(wb.validFrom)} — ${fmtDate(wb.validTo)}`,
    body: `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        ${waybillBadge(wb.status)}
        <span style="flex:1"></span>
        <span class="tiny muted">${esc(v ? `${v.brand} ${v.model} · ${v.plate}` : "—")}</span>
      </div>

      <div class="route-points" style="padding:0 0 10px">
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

      <div class="kv" style="margin-bottom:12px">
        <div><div class="k">Груз</div><div class="v">${esc(wb.cargo || "—")}</div></div>
        <div><div class="k">Расстояние</div><div class="v">${num(wb.distance)} км</div></div>
        <div><div class="k">Одометр на выезде</div><div class="v">${wb.odometerOut ? num(wb.odometerOut) : "—"}</div></div>
        <div><div class="k">Одометр на возврате</div><div class="v">${wb.odometerIn ? num(wb.odometerIn) : "—"}</div></div>
        <div><div class="k">Топливо выдано</div><div class="v">${num(wb.fuelIssued)} л</div></div>
        <div><div class="k">Израсходовано</div><div class="v">${num(wb.fuelUsed)} л</div></div>
        ${
          wb.fuelOut > 0
            ? `<div><div class="k">На выезде</div><div class="v">${num(wb.fuelOut)} л</div></div>`
            : ""
        }
        ${
          wb.fuelIn > 0
            ? `<div><div class="k">На возврате</div><div class="v">${num(wb.fuelIn)} л</div></div>`
            : ""
        }
        <div><div class="k">Остаток топлива</div><div class="v big">${num(fuelLeft)} л</div></div>
        <div><div class="k">Пройдено</div><div class="v">${num(wb.kmDone)} км</div></div>
      </div>

      ${
        wb.note
          ? `<div class="notice" style="margin-bottom:12px">${icon("info", "size-4")}<span>${esc(
              wb.note
            )}</span></div>`
          : ""
      }

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${
          wb.status === "draft"
            ? `<button class="btn btn-primary btn-sm" data-wb-status="issued">${icon(
                "check",
                "size-3.5"
              )}Выдать лист</button>`
            : ""
        }
        ${
          wb.status === "issued"
            ? `<button class="btn btn-primary btn-sm" data-wb-status="active">${icon(
                "truck",
                "size-3.5"
              )}Начать рейс</button>`
            : ""
        }
        ${
          wb.status === "active"
            ? `<button class="btn btn-primary btn-sm" data-wb-close>${icon(
                "checkCircle",
                "size-3.5"
              )}Закрыть лист</button>`
            : ""
        }
        <button class="btn btn-sm" data-wb-edit>${icon("pencil", "size-3.5")}Изменить</button>
        <button class="btn btn-sm" data-wb-print>${icon("printer", "size-3.5")}Печать</button>
      </div>`,
    footer: `
      <button class="btn btn-danger" data-wb-delete>${icon("trash", "size-4")}Удалить</button>
      <button class="btn btn-primary" data-wb-ok>Готово</button>`,
  });

  m.el.querySelector("[data-wb-ok]").addEventListener("click", () => closeModal(m.el.__entry));
  m.el.querySelector("[data-wb-edit]").addEventListener("click", () => {
    closeModal(m.el.__entry);
    openWaybillForm(wb);
  });
  m.el.querySelector("[data-wb-print]").addEventListener("click", () => printWaybill(wb));
  m.el.querySelector("[data-wb-delete]").addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "Удалить путевой лист?",
      message: `Лист ${wb.series}-${wb.number} будет удалён без возможности восстановления.`,
      confirmText: "Удалить",
      danger: true,
    });
    if (!ok) return;
    deleteWaybill(wb.id);
    closeModal(m.el.__entry);
    toast("Путевой лист удалён", "ok");
  });

  m.el.querySelectorAll("[data-wb-status]").forEach((b) =>
    b.addEventListener("click", () => {
      const status = b.dataset.wbStatus;
      setWaybillStatus(wb.id, status);
      closeModal(m.el.__entry);
      toast(status === "active" ? "Рейс начат" : "Лист выдан", "ok");
      openWaybillModal(wb.id);
    })
  );

  m.el.querySelector("[data-wb-close]")?.addEventListener("click", () => {
    closeModal(m.el.__entry);
    openCloseForm(wb);
  });
}

/* ------------------------------------------------------------------ */
/* Создание / редактирование                                           */
/* ------------------------------------------------------------------ */

function openWaybillForm(wb = null) {
  const state = getState();
  const isNew = !wb;
  const data = wb || {
    number: nextWaybillNumber(),
    series: "АП",
    status: "draft",
    validFrom: today(),
    validTo: today(),
    vehicleId: state.vehicles.find((v) => v.active)?.id || state.vehicles[0]?.id || "",
    fromCity: "",
    fromAddr: "",
    toCity: "",
    toAddr: "",
    cargo: "",
    distance: "",
    kmDone: 0,
    odometerOut: state.vehicles.find((v) => v.active)?.odometer || "",
    odometerIn: "",
    fuelIssued: "",
    fuelUsed: 0,
    fuelOut: "",
    fuelIn: "",
    note: "",
  };

  const places = state.refs.places || [];
  const placeNames = places.map((place) => place.name);
  const addresses = [...new Set(places.map((place) => place.address).filter(Boolean))];
  const cargoNames = (state.refs.cargo || []).map((cargo) => cargo.name);

  const m = openModal({
    title: isNew ? "Новый путевой лист" : `Лист ${data.series}-${data.number}`,
    subtitle: isNew ? "Заполните данные смены" : "Редактирование",
    body: `
      <form data-wb-form style="display:flex;flex-direction:column;gap:11px">
        ${datalist("wb-places", placeNames)}
        ${datalist("wb-addresses", addresses)}
        ${datalist("wb-cargo", cargoNames)}
        <div class="form-grid">
          ${field(
            "Номер",
            `<div style="display:flex;gap:6px">
              ${input({ name: "series", value: data.series, placeholder: "АП" })}
              ${input({ name: "number", value: data.number, required: true })}
            </div>`
          )}
          ${field("Статус", select({
            name: "status",
            value: data.status,
            options: [
              { value: "draft", label: "Черновик" },
              { value: "issued", label: "Выдан" },
              { value: "active", label: "В работе" },
              { value: "closed", label: "Закрыт" },
            ],
          }))}
          ${field("Действует с", dateInput({ name: "validFrom", value: data.validFrom }))}
          ${field("Действует по", dateInput({ name: "validTo", value: data.validTo }))}
          ${field(
            "Автомобиль",
            select({
              name: "vehicleId",
              value: data.vehicleId,
              options: state.vehicles.map((v) => ({ value: v.id, label: `${v.brand} ${v.model} · ${v.plate}` })),
              placeholder: "Не выбран",
            }),
            "",
            true
          )}
          <div class="span-2">${field(
            "Откуда",
            `<div style="display:flex;gap:6px">
              ${input({ name: "fromCity", value: data.fromCity, placeholder: "Город", list: "wb-places" })}
              ${input({ name: "fromAddr", value: data.fromAddr, placeholder: "Адрес", list: "wb-addresses" })}
            </div>`
          )}</div>
          <div class="span-2">${field(
            "Куда",
            `<div style="display:flex;gap:6px">
              ${input({ name: "toCity", value: data.toCity, placeholder: "Город", list: "wb-places" })}
              ${input({ name: "toAddr", value: data.toAddr, placeholder: "Адрес", list: "wb-addresses" })}
            </div>`
          )}</div>
          <div class="span-2">${field(
            "Груз",
            input({
              name: "cargo",
              value: data.cargo,
              placeholder: "Например: Стройматериалы, 18 т",
              list: "wb-cargo",
            })
          )}</div>
          ${field("Расстояние, км", moneyInput({ name: "distance", value: data.distance }))}
          ${field("Топливо выдано, л", moneyInput({ name: "fuelIssued", value: data.fuelIssued }))}
          ${field("Топливо на выезде, л", moneyInput({ name: "fuelOut", value: data.fuelOut }))}
          ${field("Топливо на возврате, л", moneyInput({ name: "fuelIn", value: data.fuelIn }))}
          ${field("Одометр на выезде", moneyInput({ name: "odometerOut", value: data.odometerOut }))}
          ${field("Одометр на возврате", moneyInput({ name: "odometerIn", value: data.odometerIn }))}
          <div class="span-2">${field(
            "Примечание",
            textarea({ name: "note", value: data.note, placeholder: "Пропуск, время загрузки, особенности" })
          )}</div>
        </div>
        <p class="form-hint">Поля «Одометр на возврате» и «Израсходовано» заполняются при закрытии листа.</p>
      </form>`,
    footer: `
      <button class="btn" data-wb-cancel>Отмена</button>
      <button class="btn btn-primary" data-wb-save>${isNew ? "Создать" : "Сохранить"}</button>`,
  });

  const form = m.el.querySelector("[data-wb-form]");
  const fillAddress = (cityName, addrName) => {
    const cityEl = form.querySelector(`[name="${cityName}"]`);
    const addrEl = form.querySelector(`[name="${addrName}"]`);
    if (!cityEl || !addrEl || addrEl.value.trim()) return;
    const place = places.find(
      (row) => row.name.toLowerCase() === cityEl.value.trim().toLowerCase()
    );
    if (place?.address) addrEl.value = place.address;
  };
  form.querySelector('[name="fromCity"]')?.addEventListener("change", () =>
    fillAddress("fromCity", "fromAddr")
  );
  form.querySelector('[name="toCity"]')?.addEventListener("change", () =>
    fillAddress("toCity", "toAddr")
  );

  const save = () => {
    const raw = formData(form);
    const payload = {
      ...raw,
      number: raw.number,
      distance: Number(raw.distance) || 0,
      kmDone: Number(wb?.kmDone) || 0,
      fuelIssued: Number(raw.fuelIssued) || 0,
      fuelUsed: Number(wb?.fuelUsed) || 0,
      fuelOut: Number(raw.fuelOut) || 0,
      fuelIn: Number(raw.fuelIn) || 0,
      odometerOut: raw.odometerOut ? Number(raw.odometerOut) : null,
      odometerIn: raw.odometerIn ? Number(raw.odometerIn) : null,
      issuedAt: raw.status === "draft" ? null : wb?.issuedAt || today(),
    };
    if (!payload.fromCity || !payload.toCity) {
      toast("Укажите города отправления и назначения", "err");
      return;
    }
    saveWaybill(isNew ? payload : { ...payload, id: wb.id });
    closeModal(m.el.__entry);
    toast(isNew ? "Путевой лист создан" : "Изменения сохранены", "ok");
  };

  m.el.querySelector("[data-wb-save]").addEventListener("click", save);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    save();
  });
  m.el.querySelector("[data-wb-cancel]").addEventListener("click", () => closeModal(m.el.__entry));
}

/* ------------------------------------------------------------------ */
/* Закрытие смены                                                      */
/* ------------------------------------------------------------------ */

function openCloseForm(wb) {
  const suggested = (wb.odometerOut || 0) + (wb.distance || 0);
  const m = openModal({
    title: "Закрыть путевой лист",
    subtitle: `${wb.series}-${wb.number} · ${wb.fromCity} → ${wb.toCity}`,
    body: `
      <form data-close-form style="display:flex;flex-direction:column;gap:11px">
        <div class="form-grid">
          ${field("Пройдено, км", moneyInput({ name: "kmDone", value: wb.distance }))}
          ${field("Израсходовано, л", moneyInput({ name: "fuelUsed", value: wb.fuelUsed || "" }))}
          <div class="span-2">${field(
            "Одометр на возврате",
            moneyInput({ name: "odometerIn", value: suggested }),
            `На выезде: ${num(wb.odometerOut || 0)} км`
          )}</div>
        </div>
        <div class="notice">${icon("info", "size-4")}<span>После закрытия лист попадёт в архив, а пробег автомобиля обновится.</span></div>
      </form>`,
    footer: `
      <button class="btn" data-close-cancel>Отмена</button>
      <button class="btn btn-primary" data-close-save>Закрыть лист</button>`,
  });

  const form = m.el.querySelector("[data-close-form]");
  const doClose = () => {
    const raw = formData(form);
    closeWaybill(wb.id, {
      kmDone: Number(raw.kmDone) || wb.distance,
      fuelUsed: Number(raw.fuelUsed) || 0,
      odometerIn: Number(raw.odometerIn) || 0,
    });
    closeModal(m.el.__entry);
    toast("Путевой лист закрыт", "ok");
  };

  m.el.querySelector("[data-close-save]").addEventListener("click", doClose);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    doClose();
  });
  m.el.querySelector("[data-close-cancel]").addEventListener("click", () => closeModal(m.el.__entry));
}

/* ------------------------------------------------------------------ */
/* Печать и экспорт                                                    */
/* ------------------------------------------------------------------ */

function printWaybill(wb) {
  const v = vehicleById(wb.vehicleId);
  const root = document.getElementById("print-root");
  if (!root) {
    toast("Печать недоступна в этом окружении", "err");
    return;
  }
  root.innerHTML = `
    <div style="font-family:Arial,sans-serif;color:#000;padding:24px;max-width:760px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:16px">
        <div>
          <div style="font-size:20px;font-weight:700">Путевой лист ${esc(wb.series)}-${esc(wb.number)}</div>
          <div style="font-size:12px;color:#555;margin-top:2px">${esc(
    v ? `${v.brand} ${v.model} ${v.plate}` : "—"
  )}</div>
        </div>
        <div style="font-size:12px;color:#555">${fmtDate(wb.validFrom)} — ${fmtDate(wb.validTo)}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${[
          ["Откуда", `${wb.fromCity}, ${wb.fromAddr}`],
          ["Куда", `${wb.toCity}, ${wb.toAddr}`],
          ["Груз", wb.cargo],
          ["Расстояние", `${num(wb.distance)} км`],
          ["Одометр на выезде", wb.odometerOut ? `${num(wb.odometerOut)} км` : "—"],
          ["Одометр на возврате", wb.odometerIn ? `${num(wb.odometerIn)} км` : "—"],
          ["Топливо выдано", `${num(wb.fuelIssued)} л`],
          ["Топливо израсходовано", `${num(wb.fuelUsed)} л`],
          ["Примечание", wb.note || "—"],
        ]
          .map(
            ([k, val]) =>
              `<tr><td style="border:1px solid #ddd;padding:7px 9px;width:38%;color:#555">${k}</td>
               <td style="border:1px solid #ddd;padding:7px 9px">${esc(val || "—")}</td></tr>`
          )
          .join("")}
      </table>
      <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:12px;color:#555">
        <div>Водитель: ____________________</div>
        <div>Диспетчер: ____________________</div>
      </div>
    </div>`;
  document.body.classList.add("printing");
  window.print();
  setTimeout(() => {
    document.body.classList.remove("printing");
    root.innerHTML = "";
  }, 500);
}

function exportCSV() {
  const state = getState();
  const rows = state.waybills.map((w) => ({
    ...w,
    vehicle: vehicleById(w.vehicleId),
  }));
  const csv = toCSV(rows, [
    { label: "Серия", value: (r) => r.series },
    { label: "Номер", value: (r) => r.number },
    { label: "Статус", value: (r) => r.status },
    { label: "С", value: (r) => r.validFrom },
    { label: "По", value: (r) => r.validTo },
    { label: "Автомобиль", value: (r) => (r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : "") },
    { label: "Откуда", value: (r) => r.fromCity },
    { label: "Куда", value: (r) => r.toCity },
    { label: "Груз", value: (r) => r.cargo },
    { label: "Км", value: (r) => r.distance },
    { label: "Топливо, л", value: (r) => r.fuelIssued },
  ]);
  download(`putevye-listy-${today()}.csv`, csv, "text/csv");
  toast("CSV сохранён", "ok");
}
