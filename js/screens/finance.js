/* Финансы: доходы, расходы, структура затрат и расчёт водителя. */

import {
  deleteFinance,
  financeStats,
  getState,
  periodLabel,
  saveFinance,
} from "../store.js";
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
  textarea,
  toast,
} from "../ui.js";
import { download, esc, fmtDate, fmtDateShort, money, num, toCSV, today } from "../utils.js";

const INCOME_CATEGORIES = ["Оплата рейса", "Доплата", "Прочее"];
const PERIODS = [
  { id: "month", label: "Месяц" },
  { id: "week", label: "7 дней" },
  { id: "30", label: "30 дней" },
  { id: "all", label: "Всё" },
];

let period = "month";
let typeFilter = "all";

export default {
  title: "Финансы",

  subtitle(state) {
    const s = financeStats(period);
    return `${periodLabel(period)} · баланс ${money(s.balance)}`;
  },

  primaryAction: { label: "Операция", action: "new" },

  render(state) {
    const stats = financeStats(period);
    const items = stats.items
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .filter((f) => typeFilter === "all" || f.type === typeFilter);
    const expenseShare = stats.income ? Math.min(100, (stats.expense / stats.income) * 100) : 0;
    const maxCat = Math.max(1, ...stats.categories.map((c) => c.value));

    return `
    <div class="content">
      <div class="segmented" style="align-self:flex-start">
        ${PERIODS.map(
          (p) => `<button class="${period === p.id ? "active" : ""}" data-action="period" data-value="${p.id}">
            ${p.label}</button>`
        ).join("")}
      </div>

      <div class="card card-pad" style="background:
        radial-gradient(120% 150% at 100% 0%, rgba(13,148,136,.12), transparent 60%), var(--surface)">
        <div class="tiny muted">Баланс · ${periodLabel(period).toLowerCase()}</div>
        <div style="font-size:30px;font-weight:760;letter-spacing:-.03em;margin-top:2px;color:${
          stats.balance >= 0 ? "var(--text)" : "var(--rose-600)"
        }">
          ${stats.balance >= 0 ? "+" : ""}${money(stats.balance)}
        </div>
        <div style="display:flex;gap:22px;margin-top:12px">
          <div>
            <div class="tiny muted">Доход</div>
            <div style="font-weight:700;font-size:15px;color:var(--emerald-600)">${money(
              stats.income
            )}</div>
          </div>
          <div>
            <div class="tiny muted">Расход</div>
            <div style="font-weight:700;font-size:15px;color:var(--rose-600)">${money(
              stats.expense
            )}</div>
          </div>
          <div style="flex:1"></div>
          <div style="text-align:right">
            <div class="tiny muted">Операций</div>
            <div style="font-weight:700;font-size:15px">${stats.items.length}</div>
          </div>
        </div>
        <div class="progress ${expenseShare > 85 ? "rose" : expenseShare > 65 ? "amber" : ""}" style="margin-top:12px">
          <i style="width:${expenseShare}%"></i>
        </div>
        <div class="tiny muted" style="margin-top:5px">Расходы — ${num(expenseShare)}% от дохода</div>
      </div>

      ${
        stats.categories.length
          ? `<div class="card">
              <div class="card-head"><h2>Структура расходов</h2><span class="sub">${money(
                stats.expense
              )}</span></div>
              <div style="padding:10px 14px 14px;display:flex;flex-direction:column;gap:9px">
                ${stats.categories
                  .slice(0, 6)
                  .map(
                    (c) => `<div>
                      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                        <span style="font-weight:600">${esc(c.name)}</span>
                        <span class="muted num">${money(c.value)}</span>
                      </div>
                      <div class="progress ${catTone(c.name)}">
                        <i style="width:${Math.max(3, (c.value / maxCat) * 100)}%"></i>
                      </div>
                    </div>`
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }

      <div class="section-title">
        <h2>Операции</h2>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" data-action="export">${icon("download", "size-3.5")}CSV</button>
          <button class="btn btn-sm btn-primary" data-action="new">${icon("plus", "size-3.5")}Добавить</button>
        </div>
      </div>

      <div class="chips">
        ${[
          { id: "all", label: "Все" },
          { id: "income", label: "Доходы" },
          { id: "expense", label: "Расходы" },
        ]
          .map(
            (f) => `<button class="chip ${typeFilter === f.id ? "active" : ""}" data-action="type" data-value="${
              f.id
            }">${f.label}</button>`
          )
          .join("")}
      </div>

      ${
        items.length
          ? `<div class="card"><div class="list">${items.map(renderRow).join("")}</div></div>`
          : `<div class="card">${emptyState({
              iconName: "wallet",
              title: "Операций нет",
              text: "Добавьте доход или расход за выбранный период.",
              action: `<button class="btn btn-primary btn-sm" data-action="new">${icon(
                "plus",
                "size-4"
              )}Добавить операцию</button>`,
            })}</div>`
      }

      <div class="card">
        <div class="card-head"><h2>Мой расчёт</h2><span class="sub">${periodLabel(period)}</span></div>
        <div class="card-pad" style="padding-top:10px">
          <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px">
            <span class="muted">Доход</span><b class="num">${money(stats.income)}</b>
          </div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px">
            <span class="muted">Расходы</span><b class="num" style="color:var(--rose-600)">−${money(
              stats.expense
            )}</b>
          </div>
          <div class="divider" style="margin:7px 0"></div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:14px">
            <span style="font-weight:650">К получению</span>
            <b class="num" style="font-size:17px">${money(stats.balance)}</b>
          </div>
          <p class="tiny muted" style="margin-top:8px">Расчёт учитывает все доходы и расходы за период. Выплаты фиксируйте отдельной операцией «Прочее».</p>
        </div>
      </div>
    </div>`;
  },

  actions: {
    period: (el) => {
      period = el.dataset.value;
      window.dispatchEvent(new CustomEvent("app:refresh"));
    },
    type: (el) => {
      typeFilter = el.dataset.value;
      window.dispatchEvent(new CustomEvent("app:refresh"));
    },
    new: () => openFinanceModal({ type: "expense" }),
    open: (el) => openFinanceModal({ id: el.dataset.id }),
    export: () => exportCSV(),
  },
};

function catTone(name) {
  if (name === "Топливо") return "amber";
  if (name === "Штрафы") return "rose";
  if (name === "Ремонт") return "";
  return "";
}

function renderRow(f) {
  const isIncome = f.type === "income";
  return `
    <button class="row" data-action="open" data-id="${f.id}">
      <span class="ri ${isIncome ? "emerald" : f.category === "Топливо" ? "amber" : "rose"}">
        ${icon(isIncome ? "trendUp" : f.category === "Топливо" ? "fuel" : "receipt", "size-4")}
      </span>
      <span class="rmain">
        <span class="rtitle">${esc(f.category)}</span>
        <span class="rsub">${fmtDateShort(f.date)}${f.note ? " · " + esc(f.note) : ""}</span>
      </span>
      <span class="rside">
        <span class="ramount ${isIncome ? "plus" : "minus"}">${isIncome ? "+" : "−"}${money(
    f.amount
  )}</span>
        <span class="rdate">${f.method === "card" ? "карта" : "наличные"}</span>
      </span>
    </button>`;
}

/* ------------------------------------------------------------------ */
/* Форма операции                                                      */
/* ------------------------------------------------------------------ */

export function openFinanceModal({ id = null, type = "expense" } = {}) {
  const state = getState();
  const item = id ? state.finance.find((f) => f.id === id) : null;
  const isNew = !item;

  if (item && item.tripId) {
    const info = openModal({
      title: item.category,
      subtitle: `${fmtDate(item.date)} · ${money(item.amount)}`,
      body: `<div class="notice">${icon("info", "size-4")}<span>Эта операция создана автоматически из рейса. Изменяйте её в разделе «Поездки».</span></div>`,
      footer: `<button class="btn btn-primary" data-ok>Понятно</button>`,
    });
    info.el.querySelector("[data-ok]").addEventListener("click", () => closeModal(info.el.__entry));
    return;
  }

  const data = item || {
    date: today(),
    type,
    category: type === "income" ? "Прочее" : "Прочее",
    amount: "",
    note: "",
    method: "cash",
  };
  let currentType = data.type;
  const expenseCategories = (state.refs.categories || []).map((category) => category.name);

  const m = openModal({
    title: isNew ? "Новая операция" : "Редактировать операцию",
    subtitle: isNew ? "Доход или расход" : `${fmtDate(data.date)} · ${money(data.amount)}`,
    body: `
      <form data-fin-form style="display:flex;flex-direction:column;gap:11px">
        <div class="segmented" style="align-self:stretch;display:flex">
          <button type="button" data-fin-type="expense" class="${currentType === "expense" ? "active" : ""}" style="flex:1">
            Расход</button>
          <button type="button" data-fin-type="income" class="${currentType === "income" ? "active" : ""}" style="flex:1">
            Доход</button>
        </div>
        <div class="form-grid">
          ${field("Дата", dateInput({ name: "date", value: data.date }))}
          ${field(
            "Категория",
            `<select class="select" name="category" id="fin-category">${(currentType === "income"
              ? INCOME_CATEGORIES
              : expenseCategories
            )
              .map(
                (c) =>
                  `<option value="${esc(c)}" ${
                    c === data.category ? "selected" : ""
                  }>${esc(c)}</option>`
              )
              .join("")}</select>`
          )}
          ${field("Сумма, ₽", moneyInput({ name: "amount", value: data.amount }))}
          ${field(
            "Способ",
            select({
              name: "method",
              value: data.method,
              options: [
                { value: "cash", label: "Наличные" },
                { value: "card", label: "Карта" },
              ],
            })
          )}
          <div class="span-2">${field(
            "Комментарий",
            textarea({ name: "note", value: data.note, placeholder: "Например: платная дорога М-12" })
          )}</div>
        </div>
      </form>`,
    footer: `
      ${
        isNew
          ? ""
          : `<button class="btn btn-danger" data-fin-delete>${icon("trash", "size-4")}</button>`
      }
      <button class="btn" data-fin-cancel>Отмена</button>
      <button class="btn btn-primary" data-fin-save>${isNew ? "Добавить" : "Сохранить"}</button>`,
  });

  const form = m.el.querySelector("[data-fin-form]");
  const categorySelect = form.querySelector("#fin-category");

  m.el.querySelectorAll("[data-fin-type]").forEach((b) =>
    b.addEventListener("click", () => {
      currentType = b.dataset.finType;
      m.el
        .querySelectorAll("[data-fin-type]")
        .forEach((x) => x.classList.toggle("active", x === b));
      const list = currentType === "income" ? INCOME_CATEGORIES : expenseCategories;
      categorySelect.innerHTML = list
        .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
        .join("");
    })
  );

  const save = () => {
    const raw = formData(form);
    const payload = {
      ...raw,
      type: currentType,
      amount: Number(raw.amount) || 0,
    };
    if (payload.amount <= 0) {
      toast("Укажите сумму больше нуля", "err");
      return;
    }
    saveFinance(isNew ? payload : { ...payload, id: item.id });
    closeModal(m.el.__entry);
    toast(isNew ? "Операция добавлена" : "Операция обновлена", "ok");
  };

  m.el.querySelector("[data-fin-save]").addEventListener("click", save);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    save();
  });
  m.el.querySelector("[data-fin-cancel]").addEventListener("click", () => closeModal(m.el.__entry));
  m.el.querySelector("[data-fin-delete]")?.addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "Удалить операцию?",
      message: "Запись будет удалена из финансов.",
      confirmText: "Удалить",
      danger: true,
    });
    if (!ok) return;
    deleteFinance(item.id);
    closeModal(m.el.__entry);
    toast("Операция удалена", "ok");
  });
}

function exportCSV() {
  const csv = toCSV(financeStats(period).items, [
    { label: "Дата", value: (f) => f.date },
    { label: "Тип", value: (f) => (f.type === "income" ? "Доход" : "Расход") },
    { label: "Категория", value: (f) => f.category },
    { label: "Сумма", value: (f) => f.amount },
    { label: "Способ", value: (f) => (f.method === "card" ? "Карта" : "Наличные") },
    { label: "Комментарий", value: (f) => f.note },
  ]);
  download(`finansy-${today()}.csv`, csv, "text/csv");
  toast("CSV сохранён", "ok");
}
