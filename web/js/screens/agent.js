/* ИИ-агент: локальный анализ данных и опциональная LLM. */

import {
  activeVehicle,
  activeWaybill,
  clearChat,
  dataSnapshot,
  financeStats,
  fuelStats,
  getState,
  monthTrips,
  pushMessage,
  reminders,
  routeStats,
  tripSummary,
  vehicleById,
} from "../store.js";
import { icon, richText, toast } from "../ui.js";
import { esc, fmtDate, fmtTime, money, num, pluralize } from "../utils.js";

const SUGGESTIONS = [
  "Сколько я заработал за месяц?",
  "Какой расход топлива?",
  "Что с путевым листом?",
  "Когда следующее ТО?",
  "Самый выгодный маршрут",
  "Куда уходят деньги?",
];

let pending = false;

export default {
  title: "ИИ-агент",

  subtitle(state) {
    const ai = state.settings.ai || {};
    return ai.key ? `Модель: ${ai.model || "подключена"}` : "Локальный режим · без интернета";
  },

  render(state) {
    const messages = state.chat || [];
    const ai = state.settings.ai || {};
    const intro = messages.length
      ? ""
      : `<div class="msg">
          <div class="mavatar">${icon("bot", "size-4")}</div>
          <div>
            <div class="bubble">
              <p>Здравствуйте, ${esc(state.driver.name.split(" ")[0])}! Я знаю ваши рейсы, листы,
              заправки и финансы. Спросите — посчитаю.</p>
              <p class="tiny muted">Например: «сколько я заработал за месяц» или «когда следующее ТО».</p>
            </div>
          </div>
        </div>`;

    return `
    <div class="content" style="padding-bottom:8px">
      <div class="card card-pad" style="display:flex;gap:11px;align-items:center">
        <div class="mavatar" style="width:38px;height:38px;border-radius:11px;background:var(--teal-50);color:var(--teal-700);display:grid;place-items:center">
          ${icon("sparkles", "size-5")}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:680;font-size:14px">Агент АвтоПрофи</div>
          <div class="tiny muted">${
            ai.key ? `Подключён · ${esc(ai.model || "модель")}` : "Локальный режим · данные не покидают устройство"
          }</div>
        </div>
        ${
          messages.length
            ? `<button class="icon-btn" data-action="clear" aria-label="Очистить чат">${icon(
                "trash",
                "size-4"
              )}</button>`
            : ""
        }
      </div>

      <div class="chat" id="chat">
        ${intro}
        ${messages.map(renderMessage).join("")}
        ${
          pending
            ? `<div class="msg"><div class="mavatar">${icon(
                "bot",
                "size-4"
              )}</div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div></div>`
            : ""
        }
      </div>

      <div class="suggestions">
        ${SUGGESTIONS.map(
          (s) => `<button class="chip" data-action="ask" data-q="${esc(s)}">${esc(s)}</button>`
        ).join("")}
      </div>

      <form class="chat-composer" data-form="send">
        <input class="input" name="q" placeholder="Спросите про доход, топливо, лист…"
          autocomplete="off" enterkeyhint="send" />
        <button class="send" type="submit" aria-label="Отправить">${icon("send", "size-4.5")}</button>
      </form>

      <p class="tiny muted" style="text-align:center;padding:2px 8px 8px">
        Ответы формируются по вашим данным. Проверяйте суммы перед отчётом.
      </p>
    </div>`;
  },

  mount(view) {
    const chat = view.querySelector("#chat");
    if (chat) chat.scrollIntoView({ block: "end" });
    const input = view.querySelector(".chat-composer .input");
    if (input) input.focus({ preventScroll: true });
  },

  actions: {
    ask: (el) => ask(el.dataset.q),
    clear: async () => {
      clearChat();
      toast("История очищена", "ok");
    },
  },

  forms: {
    send: (form) => {
      const input = form.querySelector('[name="q"]');
      const q = input.value.trim();
      if (!q) return;
      input.value = "";
      ask(q);
    },
  },
};

function renderMessage(m) {
  const isUser = m.role === "user";
  return `<div class="msg ${isUser ? "user" : ""}">
    <div class="mavatar">${icon(isUser ? "user" : "bot", "size-4")}</div>
    <div>
      <div class="bubble">${isUser ? `<p>${esc(m.text)}</p>` : richText(m.text)}</div>
      <div class="mtime">${fmtTime(m.at || Date.now())}</div>
    </div>
  </div>`;
}

async function ask(question) {
  if (pending) return;
  const state = getState();
  pushMessage({ role: "user", text: question });

  pending = true;
  window.dispatchEvent(new CustomEvent("app:refresh"));

  const ai = state.settings.ai || {};
  let answer;
  try {
    if (ai.key && ai.endpoint) {
      answer = await remoteAnswer(question);
    } else {
      await new Promise((r) => setTimeout(r, 420));
      answer = localAnswer(question);
    }
  } catch (err) {
    console.warn(err);
    answer = `Не удалось получить ответ от модели (${esc(err.message || "ошибка сети")}).
      Отвечаю локально:\n\n${localAnswer(question)}`;
  }

  pending = false;
  pushMessage({ role: "assistant", text: answer });
}

/* ------------------------------------------------------------------ */
/* Локальный «движок» ответов                                          */
/* ------------------------------------------------------------------ */

function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s.,]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function localAnswer(question) {
  const q = normalize(question);
  const state = getState();
  const month = financeStats("month");
  const fuel = fuelStats();
  const trips = monthTrips();
  const ts = tripSummary(trips);
  const wb = activeWaybill();
  const vehicle = activeVehicle();

  if (/^(привет|здравств|добрый|хай|hello)/.test(q)) {
    return `Здравствуйте, ${state.driver.name.split(" ")[0]}! Готов помочь.\n\nМогу посчитать доход и расходы, рассказать про топливо, открытый путевой лист, ТО и лучшие маршруты.`;
  }

  if (/доход|зарабо|выручк|прибыл|получ|баланс|остал|на руках/.test(q) && !/топлив|расход/.test(q)) {
    const best = routeStats()[0];
    return `За текущий месяц:
- **Доход:** ${money(month.income)}
- **Расход:** ${money(month.expense)}
- **Баланс:** **${money(month.balance)}**

Оплачено ${pluralize(ts.count, ["рейс", "рейса", "рейсов"])} на ${num(ts.distance)} км.
${best ? `Самый прибыльный маршрут: **${best.route}** — ${money(best.amount)}.` : ""}`;
  }

  if (/расход|потрат|трат|затрат|куда уход|деньг/.test(q)) {
    const cats = month.categories.slice(0, 5);
    return `Расходы за месяц: **${money(month.expense)}**.
${cats.map((c) => `- ${c.name}: ${money(c.value)}`).join("\n")}

Доля расходов — ${num((month.expense / (month.income || 1)) * 100)}% от дохода.`;
  }

  if (/топлив|соляр|заправ|бензин|литр|расход.*100|средний расход/.test(q)) {
    const last = state.fuels[0];
    return `Топливо за месяц:
- Израсходовано: **${num(fuel.liters)} л** на ${money(fuel.cost)}
- Средняя цена: ${num(fuel.avgPrice, 2)} ₽/л
- Расход: **${num(fuel.consumption, 1)} л/100 км**

${last ? `Последняя заправка: ${last.station}, ${num(last.liters)} л по ${num(last.price, 2)} ₽ (${fmtDate(last.date)}).` : ""}`;
  }

  if (/путев|лист|смена/.test(q)) {
    if (!wb) {
      return "Сейчас нет открытого путевого листа. Создать новый можно в разделе «Путевые листы».";
    }
    const left = Math.max(0, wb.distance - wb.kmDone);
    const fuelLeft = Math.max(0, (wb.fuelIssued || 0) - (wb.fuelUsed || 0));
    return `Открыт путевой лист **${wb.series}-${wb.number}**:
- Маршрут: ${wb.fromCity} → ${wb.toCity}
- Пройдено: ${num(wb.kmDone)} из ${num(wb.distance)} км (осталось ${num(left)} км)
- Топливо: израсходовано ${num(wb.fuelUsed)} л, остаток **${num(fuelLeft)} л**

Закрыть лист можно в разделе «Путевые листы».`;
  }

  if (/поездк|рейс|маршрут/.test(q)) {
    const routes = routeStats();
    if (/выгодн|лучш|прибыл|топ маршрут/.test(q)) {
      if (!routes.length) return "Пока нет оплаченных рейсов — нечего сравнивать.";
      return `Самые прибыльные маршруты:
${routes
  .slice(0, 3)
  .map((r, i) => `${i + 1}. **${r.route}** — ${money(r.amount)} за ${pluralize(r.count, ["рейс", "рейса", "рейсов"])}`)
  .join("\n")}`;
    }
    return `В этом месяце **${ts.count}** ${pluralize(ts.count, ["рейс", "рейса", "рейсов"])}:
- Пробег: ${num(ts.distance)} км
- Сумма: ${money(ts.amount)}
- Оплачено: ${money(ts.paid)}

В пути сейчас: ${state.trips.filter((t) => t.status === "active").length}.`;
  }

  if (/^то\b|техобслуж|сервис|ремонт|обслужив/.test(q)) {
    if (!vehicle) return "Автомобиль не добавлен. Добавьте его в разделе «Автомобили».";
    const left = vehicle.nextService - vehicle.odometer;
    return `**${vehicle.brand} ${vehicle.model}** (${vehicle.plate}):
- Пробег: ${num(vehicle.odometer)} км
- Следующее ТО: ${num(vehicle.nextService)} км
- ${
      left <= 0
        ? `**Просрочено на ${num(Math.abs(left))} км** — пора записываться на сервис.`
        : `До ТО осталось **${num(left)} км**.`
    }`;
  }

  if (/осаго|страхов/.test(q)) {
    return `Страховка:
${state.vehicles
  .map((v) => `- ${v.brand} ${v.model} (${v.plate}) — до ${fmtDate(v.insurance, "long")}`)
  .join("\n")}`;
  }

  if (/напомин|что важн|дел|задач/.test(q)) {
    const list = reminders();
    if (!list.length) return "Срочных напоминаний нет. Можно спокойно работать.";
    return `Напоминания:\n${list.map((r) => `- **${r.title}** — ${r.text}`).join("\n")}`;
  }

  if (/сколько.*(км|пробег)|пробег/.test(q)) {
    return `Пробег за месяц: **${num(ts.distance)} км** по ${pluralize(ts.count, [
      "рейсу",
      "рейсам",
      "рейсам",
    ])}.\nОбщий пробег автомобиля: ${vehicle ? num(vehicle.odometer) + " км" : "—"}.`;
  }

  return `Пока не понял вопрос. Я умею считать:
- доход, расходы и баланс за месяц
- расход топлива и среднюю цену
- остаток по открытому путевому листу
- когда следующее ТО и страховка
- самый выгодный маршрут

Спросите, например: «сколько я заработал за месяц?»`;
}

/* ------------------------------------------------------------------ */
/* Внешняя модель (OpenAI-совместимый API)                             */
/* ------------------------------------------------------------------ */

async function remoteAnswer(question) {
  const state = getState();
  const ai = state.settings.ai;
  const snapshot = dataSnapshot();
  const system = `Ты — ИИ-агент приложения «АвтоПрофи» для водителя грузовика.
Отвечай кратко, по-русски, только по данным ниже. Считай суммы аккуратно.
Если данных не хватает — скажи об этом. Не выдумывай цифры.

Данные приложения:
${JSON.stringify(snapshot, null, 1)}`;

  const history = state.chat
    .slice(-8)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.text }));

  const res = await fetch(`${ai.endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ai.key}`,
    },
    body: JSON.stringify({
      model: ai.model || "gpt-4o-mini",
      temperature: 0.2,
      messages: [{ role: "system", content: system }, ...history, { role: "user", content: question }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? ": " + text.slice(0, 120) : ""}`);
  }
  const data = await res.json();
  const answer = data?.choices?.[0]?.message?.content;
  if (!answer) throw new Error("Пустой ответ модели");
  return answer;
}
