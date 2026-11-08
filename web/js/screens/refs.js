/* Справочники: контрагенты, грузы, адреса, статьи расходов. */

import { addRef, deleteRef, getState } from "../store.js";
import { icon, toast } from "../ui.js";
import { esc } from "../utils.js";

const TABS = [
  { id: "contractors", label: "Контрагенты", icon: "user", placeholder: "Название компании" },
  { id: "cargo", label: "Грузы", icon: "package", placeholder: "Тип груза" },
  { id: "places", label: "Адреса", icon: "pin", placeholder: "Город или адрес" },
  { id: "categories", label: "Статьи", icon: "receipt", placeholder: "Статья расходов" },
];

let tab = "contractors";

export default {
  title: "Справочники",

  subtitle(state) {
    const total = Object.values(state.refs).reduce((a, l) => a + l.length, 0);
    return `${total} записей`;
  },

  render(state) {
    const current = TABS.find((t) => t.id === tab) || TABS[0];
    const list = state.refs[tab] || [];

    return `
    <div class="content">
      <div class="chips">
        ${TABS.map(
          (t) => `<button class="chip ${tab === t.id ? "active" : ""}" data-action="tab" data-value="${t.id}">
            ${icon(t.icon, "size-3.5")}${t.label}<span class="count">${state.refs[t.id].length}</span>
          </button>`
        ).join("")}
      </div>

      <form data-form="add-ref" class="card card-pad" style="display:flex;gap:8px;align-items:flex-end">
        <div class="field" style="flex:1">
          <label>Добавить в «${esc(current.label)}»</label>
          <input class="input" name="value" placeholder="${esc(current.placeholder)}" autocomplete="off" />
        </div>
        <button class="btn btn-primary" type="submit" style="height:40px">${icon("plus", "size-4")}Добавить</button>
      </form>

      ${
        list.length
          ? `<div class="card"><div class="list">${list
              .map(
                (value, i) => `<div class="row">
                  <span class="ri teal">${icon(current.icon, "size-4")}</span>
                  <span class="rmain"><span class="rtitle">${esc(value)}</span></span>
                  <button class="icon-btn" data-action="remove" data-value="${esc(value)}" aria-label="Удалить">
                    ${icon("trash", "size-4")}
                  </button>
                </div>`
              )
              .join("")}</div></div>`
          : `<div class="card"><div class="empty">
              <div class="ei">${icon(current.icon, "size-5")}</div>
              <b>Список пуст</b>
              <span>Добавьте первую запись — она появится в подсказках при заполнении рейсов и листов.</span>
            </div></div>`
      }

      <div class="notice">
        ${icon("info", "size-4")}
        <span>Справочники используются в подсказках и фильтрах. Их можно пополнять вручную или импортировать из архива.</span>
      </div>
    </div>`;
  },

  actions: {
    tab: (el) => {
      tab = el.dataset.value;
      window.dispatchEvent(new CustomEvent("app:refresh"));
    },
    remove: async (el) => {
      const value = el.dataset.value;
      deleteRef(tab, value);
      toast("Запись удалена", "ok");
    },
  },

  forms: {
    "add-ref": (form) => {
      const input = form.querySelector('[name="value"]');
      const value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }
      addRef(tab, value);
      input.value = "";
      toast("Запись добавлена", "ok");
    },
  },
};
