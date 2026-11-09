/* Справочники: фирмы, места, грузы, АЗС и статьи расходов. */

import {
  addRef,
  deleteRef,
  getState,
  refUsage,
  updateRef,
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
  textarea,
  toast,
} from "../ui.js";
import { esc } from "../utils.js";

const TABS = [
  {
    id: "contractors",
    label: "Фирмы",
    one: "фирму",
    icon: "user",
    placeholder: "ООО «ТрансЛогистик»",
    empty: "Добавьте фирму — она понадобится для мест и документов.",
  },
  {
    id: "places",
    label: "Места",
    one: "место",
    icon: "pin",
    placeholder: "Город, склад или терминал",
    empty: "Добавьте место погрузки или выгрузки.",
  },
  {
    id: "cargo",
    label: "Грузы",
    one: "груз",
    icon: "package",
    placeholder: "Например: Стройматериалы",
    empty: "Добавьте типовой груз, чтобы быстрее заполнять рейсы.",
  },
  {
    id: "stations",
    label: "АЗС",
    one: "АЗС",
    icon: "fuel",
    placeholder: "Например: Лукойл",
    empty: "Добавьте сеть АЗС, где вы заправляетесь.",
  },
  {
    id: "categories",
    label: "Статьи",
    one: "статью",
    icon: "receipt",
    placeholder: "Например: Платные дороги",
    empty: "Добавьте статью расходов для финансов.",
  },
];

const LOADING_TYPES = ["Задняя", "Боковая", "Верхняя", "Бортовая", "Комбинированная"];

let tab = "contractors";
let query = "";

function currentTab() {
  return TABS.find((t) => t.id === tab) || TABS[0];
}

function listOf(state, kind = tab) {
  return state.refs[kind] || [];
}

function firmName(state, id) {
  const firm = listOf(state, "contractors").find((item) => item.id === id);
  return firm ? firm.name : "";
}

function itemHay(state, kind, item) {
  return [
    item.name,
    item.defaultCargo,
    item.address,
    item.contact,
    item.coordinates,
    item.loadingType,
    item.note,
    kind === "places" ? firmName(state, item.firmId) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function rowSub(state, kind, item) {
  if (kind === "contractors") {
    return [
      item.type,
      item.inn && `ИНН ${item.inn}`,
      item.phone,
      item.contact,
      item.defaultCargo && `Типовой груз: ${item.defaultCargo}`,
      item.note,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (kind === "places") {
    return [firmName(state, item.firmId), item.address, item.contact, item.phone]
      .filter(Boolean)
      .join(" · ");
  }
  return item.note || "";
}

function renderRow(state, kind, current, item) {
  const sub = rowSub(state, kind, item);
  return `<div class="row">
    <span class="ri teal">${icon(current.icon, "size-4")}</span>
    <span class="rmain">
      <span class="rtitle">${esc(item.name)}</span>
      ${sub ? `<span class="rsub">${esc(sub)}</span>` : ""}
    </span>
    <button class="icon-btn" data-action="edit" data-id="${esc(item.id)}" aria-label="Редактировать">
      ${icon("pencil", "size-4")}
    </button>
    <button class="icon-btn" data-action="remove" data-id="${esc(item.id)}" aria-label="Удалить">
      ${icon("trash", "size-4")}
    </button>
  </div>`;
}

function renderList(state) {
  const current = currentTab();
  const q = query.trim().toLowerCase();
  const list = listOf(state).filter((item) => !q || itemHay(state, tab, item).includes(q));

  if (!list.length) {
    return `<div class="card"><div class="empty">
      <div class="ei">${icon(current.icon, "size-5")}</div>
      <b>${q ? "Ничего не найдено" : "Список пуст"}</b>
      <span>${q ? "Попробуйте другой запрос." : current.empty}</span>
    </div></div>`;
  }

  return `<div class="card"><div class="list">${list
    .map((item) => renderRow(state, tab, current, item))
    .join("")}</div></div>`;
}

export default {
  title: "Справочники",

  subtitle(state) {
    const total = Object.values(state.refs).reduce(
      (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
      0
    );
    return `${total} записей`;
  },

  primaryAction: { label: "Добавить", action: "new" },

  render(state) {
    const current = currentTab();

    return `
    <div class="content">
      <div class="chips">
        ${TABS.map(
          (t) => `<button class="chip ${tab === t.id ? "active" : ""}" data-action="tab" data-value="${t.id}">
            ${icon(t.icon, "size-3.5")}${t.label}<span class="count">${listOf(state, t.id).length}</span>
          </button>`
        ).join("")}
      </div>

      <div class="card card-pad" style="display:flex;gap:8px;align-items:flex-end">
        <div class="field" style="flex:1">
          <label>Поиск в «${esc(current.label)}»</label>
          <input class="input" data-ref-search value="${esc(query)}"
            placeholder="Название, адрес, контакт" autocomplete="off" />
        </div>
        <button class="btn btn-primary" data-action="new" style="height:40px">
          ${icon("plus", "size-4")}Добавить
        </button>
      </div>

      <div id="refs-list">${renderList(state)}</div>

      <div class="notice">
        ${icon("info", "size-4")}
        <span>Справочники используются в подсказках при заполнении рейсов, листов,
        заправок и финансов. Записи можно редактировать и удалять.</span>
      </div>
    </div>`;
  },

  onInput(target) {
    if (!target.matches?.("[data-ref-search]")) return;
    query = target.value;
    const host = document.getElementById("refs-list");
    if (host) host.innerHTML = renderList(getState());
  },

  actions: {
    tab: (el) => {
      tab = el.dataset.value;
      query = "";
      window.dispatchEvent(new CustomEvent("app:refresh"));
    },
    new: () => openRefModal(),
    edit: (el) => openRefModal(el.dataset.id),
    remove: async (el) => {
      const state = getState();
      const item = listOf(state).find((row) => row.id === el.dataset.id);
      if (!item) return;
      const used = refUsage(tab, item);
      const ok = await confirmDialog({
        title: "Удалить запись?",
        message: used
          ? `«${item.name}» используется в ${used} записях. Удалить из справочника? В старых документах текст останется.`
          : `«${item.name}» будет удалена из справочника.`,
        confirmText: "Удалить",
        danger: true,
      });
      if (!ok) return;
      deleteRef(tab, item.id);
      toast("Запись удалена", "ok");
    },
  },
};

/* ------------------------------------------------------------------ */
/* Карточка записи                                                     */
/* ------------------------------------------------------------------ */

function cargoOptions(state, value) {
  const names = listOf(state, "cargo").map((item) => item.name);
  if (value && !names.includes(value)) names.unshift(value);
  return names;
}

function openRefModal(id = null, forcedKind = null, preset = {}) {
  const state = getState();
  const kind = forcedKind || tab;
  const current = TABS.find((t) => t.id === kind) || TABS[0];
  const item = id ? listOf(state, kind).find((row) => row.id === id) : null;
  const isNew = !item;
  const data = { name: "", note: "", defaultCargo: "", ...preset, ...(item || {}) };
  const firms = listOf(state, "contractors");
  const cargos = cargoOptions(state, data.defaultCargo);

  let fields = "";

  if (kind === "contractors") {
    const places = item
      ? listOf(state, "places").filter((place) => place.firmId === item.id)
      : [];
    fields = `
      <div class="form-grid">
        <div class="span-2">${field(
          "Название фирмы",
          input({
            name: "name",
            value: data.name,
            required: true,
            placeholder: current.placeholder,
          })
        )}</div>
        ${field(
          "Тип",
          select({
            name: "type",
            value: data.type || "ООО",
            options: ["ООО", "АО", "ПАО", "ИП", "Физлицо", "Другое"],
          })
        )}
        ${field(
          "Типовой груз",
          select({
            name: "defaultCargo",
            value: data.defaultCargo,
            options: cargos,
            placeholder: "Не выбран",
          })
        )}
        ${field("ИНН", input({ name: "inn", value: data.inn, placeholder: "10 или 12 цифр" }))}
        ${field("КПП", input({ name: "kpp", value: data.kpp, placeholder: "9 цифр" }))}
        ${field("ОГРН / ОГРНИП", input({ name: "ogrn", value: data.ogrn }))}
        ${field("Телефон", input({ name: "phone", value: data.phone, type: "tel" }))}
        <div class="span-2">${field(
          "Юридический адрес",
          input({ name: "legalAddress", value: data.legalAddress, placeholder: "Город, улица, дом" })
        )}</div>
        <div class="span-2">${field(
          "Фактический адрес",
          input({ name: "actualAddress", value: data.actualAddress, placeholder: "Склад или офис" })
        )}</div>
        ${field("Контактное лицо", input({ name: "contact", value: data.contact }))}
        ${field("Email", input({ name: "email", value: data.email, type: "email" }))}
        <div class="span-2">${field(
          "Комментарий",
          textarea({ name: "note", value: data.note, placeholder: "Условия работы, оплата, пропуск" })
        )}</div>
        ${
          item
            ? `<div class="span-2">
                <div class="tiny muted" style="margin-bottom:6px">Места фирмы</div>
                ${
                  places.length
                    ? places
                        .map(
                          (place) =>
                            `<span class="badge badge-zinc" style="margin:0 6px 6px 0">${esc(
                              place.name
                            )}</span>`
                        )
                        .join("")
                    : `<span class="tiny muted">Пока нет привязанных мест.</span>`
                }
                <div style="margin-top:8px">
                  <button type="button" class="btn btn-sm" data-firm-add-place>
                    ${icon("plus", "size-3.5")}Добавить место
                  </button>
                </div>
              </div>`
            : ""
        }
      </div>`;
  } else if (kind === "places") {
    fields = `
      <div class="form-grid">
        <div class="span-2">${field(
          "Название места",
          input({
            name: "name",
            value: data.name,
            required: true,
            placeholder: current.placeholder,
          })
        )}</div>
        ${field(
          "Фирма",
          select({
            name: "firmId",
            value: data.firmId || "",
            options: firms.map((firm) => ({ value: firm.id, label: firm.name })),
            placeholder: "Не выбрана",
          })
        )}
        ${field(
          "Тип загрузки",
          select({
            name: "loadingType",
            value: data.loadingType || "Задняя",
            options: LOADING_TYPES,
          })
        )}
        <div class="span-2">${field(
          "Полный адрес",
          input({
            name: "address",
            value: data.address,
            placeholder: "Улица, дом, склад, терминал",
          })
        )}</div>
        ${field(
          "Контактное лицо",
          input({
            name: "contact",
            value: data.contact,
            placeholder: "Имя",
          })
        )}
        ${field(
          "Телефон",
          input({
            name: "phone",
            value: data.phone,
            type: "tel",
            placeholder: "+7 ...",
          })
        )}
        ${field(
          "Координаты",
          input({
            name: "coordinates",
            value: data.coordinates,
            placeholder: "55.7558, 37.6173",
          })
        )}
        ${field(
          "Типовой груз",
          select({
            name: "defaultCargo",
            value: data.defaultCargo,
            options: cargos,
            placeholder: "Не выбран",
          })
        )}
        <div class="span-2">${field(
          "Примечание",
          textarea({
            name: "note",
            value: data.note,
            placeholder: "Пропуск, время работы, особенности",
          })
        )}</div>
      </div>`;
  } else {
    fields = `
      <div class="form-grid">
        <div class="span-2">${field(
          "Название",
          input({
            name: "name",
            value: data.name,
            required: true,
            placeholder: current.placeholder,
          })
        )}</div>
        <div class="span-2">${field(
          "Примечание",
          textarea({
            name: "note",
            value: data.note,
            placeholder: "Необязательно",
          })
        )}</div>
      </div>`;
  }

  const m = openModal({
    title: isNew ? `Добавить ${current.one}` : `Изменить ${current.one}`,
    subtitle: isNew ? "Новая запись справочника" : item.name,
    body: `<form data-ref-form style="display:flex;flex-direction:column;gap:11px">${fields}</form>`,
    footer: `
      <button class="btn" data-ref-cancel>Отмена</button>
      <button class="btn btn-primary" data-ref-save>${isNew ? "Добавить" : "Сохранить"}</button>`,
  });

  const form = m.el.querySelector("[data-ref-form]");
  const save = () => {
    const raw = formData(form);
    if (!raw.name) {
      toast("Укажите название", "err");
      return;
    }
    const ok = isNew
      ? Boolean(addRef(kind, raw))
      : updateRef(kind, item.id, raw);
    if (!ok) {
      toast("Такая запись уже есть", "err");
      return;
    }
    closeModal(m.el.__entry);
    toast(isNew ? "Запись добавлена" : "Запись сохранена", "ok");
  };

  m.el.querySelector("[data-ref-save]").addEventListener("click", save);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    save();
  });
  m.el.querySelector("[data-ref-cancel]").addEventListener("click", () => closeModal(m.el.__entry));

  m.el.querySelector("[data-firm-add-place]")?.addEventListener("click", () => {
    closeModal(m.el.__entry);
    openRefModal(null, "places", { firmId: item.id });
  });
}
