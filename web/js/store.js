/* Хранилище: состояние приложения, демо-данные и производные показатели.
   Всё лежит в localStorage — приложение работает без сервера и без сети. */

import {
  addDays,
  daysAgo,
  isoDate,
  startOfMonth,
  sum,
  today,
  uid,
  diffDays,
  parseDate,
} from "./utils.js";

const KEY = "autoprofi.state.v1";

/* ------------------------------------------------------------------ */
/* Демо-данные                                                         */
/* ------------------------------------------------------------------ */

function seed() {
  const d = (n) => daysAgo(n);

  const vehicles = [
    {
      id: "v1",
      brand: "Volvo",
      model: "FH 460",
      plate: "А123ВС 77",
      trailer: "АП 4821 77",
      year: 2021,
      odometer: 486_320,
      nextService: 490_500,
      insurance: "2027-03-12",
      consumption: 31.4,
      fuel: "ДТ",
      tank: 600,
      color: "teal",
      active: true,
    },
    {
      id: "v2",
      brand: "КАМАЗ",
      model: "5490",
      plate: "М774ТК 50",
      trailer: "ЕК 1093 50",
      year: 2019,
      odometer: 212_840,
      nextService: 218_000,
      insurance: "2026-12-01",
      consumption: 34.8,
      fuel: "ДТ",
      tank: 500,
      color: "amber",
      active: false,
    },
  ];

  const waybills = [
    {
      id: "w1",
      number: "000124",
      series: "АП",
      status: "active",
      issuedAt: d(2),
      validFrom: d(2),
      validTo: addDays(today(), 1),
      driver: "Иван Петров",
      vehicleId: "v1",
      fromCity: "Москва",
      fromAddr: "Склад «Северный», ул. Складская, 4",
      toCity: "Нижний Новгород",
      toAddr: "ТЦ «Восток», Московское ш., 12",
      cargo: "Стройматериалы, 18 т",
      distance: 412,
      kmDone: 168,
      odometerOut: 485_908,
      odometerIn: null,
      fuelIssued: 350,
      fuelUsed: 96,
      note: "Пропуск на склад заказан на 08:00.",
    },
    {
      id: "w2",
      number: "000123",
      series: "АП",
      status: "closed",
      issuedAt: d(11),
      validFrom: d(10),
      validTo: d(7),
      driver: "Иван Петров",
      vehicleId: "v1",
      fromCity: "Москва",
      fromAddr: "Хладокомбинат № 4",
      toCity: "Ярославль",
      toAddr: "РЦ «Волга», ул. Промышленная, 8",
      cargo: "Продукты, 12 т",
      distance: 265,
      kmDone: 265,
      odometerOut: 485_310,
      odometerIn: 485_575,
      fuelIssued: 300,
      fuelUsed: 82,
      note: "",
    },
    {
      id: "w3",
      number: "000122",
      series: "АП",
      status: "closed",
      issuedAt: d(18),
      validFrom: d(17),
      validTo: d(14),
      driver: "Иван Петров",
      vehicleId: "v1",
      fromCity: "Москва",
      fromAddr: "Мебельная фабрика «Ладья»",
      toCity: "Смоленск",
      toAddr: "ТК «Гамаюн», ул. Кутузова, 3",
      cargo: "Мебель, 15 т",
      distance: 400,
      kmDone: 400,
      odometerOut: 484_820,
      odometerIn: 485_310,
      fuelIssued: 420,
      fuelUsed: 128,
      note: "",
    },
    {
      id: "w4",
      number: "000125",
      series: "АП",
      status: "draft",
      issuedAt: null,
      validFrom: addDays(today(), 1),
      validTo: addDays(today(), 4),
      driver: "Иван Петров",
      vehicleId: "v1",
      fromCity: "Москва",
      fromAddr: "Склад «Северный», ул. Складская, 4",
      toCity: "Казань",
      toAddr: "Логистический парк «Биектау»",
      cargo: "Бытовая техника, 14 т",
      distance: 795,
      kmDone: 0,
      odometerOut: null,
      odometerIn: null,
      fuelIssued: 600,
      fuelUsed: 0,
      note: "Черновик: ждём подтверждения заявки.",
    },
  ];

  const trips = [
    {
      id: "t1",
      date: d(0),
      from: "Москва",
      to: "Владимир",
      cargo: "Бытовая техника, 12 т",
      distance: 185,
      rate: 34,
      amount: 6_290,
      status: "active",
      waybillId: "w1",
      note: "Промежуточная точка по маршруту.",
    },
    {
      id: "t2",
      date: d(2),
      from: "Москва",
      to: "Нижний Новгород",
      cargo: "Стройматериалы, 18 т",
      distance: 412,
      rate: 92,
      amount: 38_000,
      status: "paid",
      waybillId: "w1",
      note: "",
    },
    {
      id: "t3",
      date: d(5),
      from: "Нижний Новгород",
      to: "Москва",
      cargo: "Продукты, 16 т",
      distance: 400,
      rate: 89,
      amount: 35_500,
      status: "paid",
      waybillId: null,
      note: "",
    },
    {
      id: "t4",
      date: d(9),
      from: "Москва",
      to: "Ярославль",
      cargo: "Продукты, 12 т",
      distance: 265,
      rate: 83,
      amount: 22_000,
      status: "paid",
      waybillId: "w2",
      note: "",
    },
    {
      id: "t5",
      date: d(13),
      from: "Москва",
      to: "Тула",
      cargo: "Металлопрокат, 20 т",
      distance: 180,
      rate: 92,
      amount: 16_500,
      status: "paid",
      waybillId: null,
      note: "",
    },
    {
      id: "t6",
      date: d(16),
      from: "Москва",
      to: "Смоленск",
      cargo: "Мебель, 15 т",
      distance: 400,
      rate: 83,
      amount: 33_000,
      status: "paid",
      waybillId: "w3",
      note: "",
    },
    {
      id: "t7",
      date: addDays(today(), 1),
      from: "Москва",
      to: "Казань",
      cargo: "Бытовая техника, 14 т",
      distance: 795,
      rate: 53,
      amount: 42_000,
      status: "planned",
      waybillId: "w4",
      note: "Загрузка в 07:30.",
    },
    {
      id: "t8",
      date: d(23),
      from: "Москва",
      to: "Воронеж",
      cargo: "Стройматериалы, 18 т",
      distance: 470,
      rate: 83,
      amount: 39_000,
      status: "paid",
      waybillId: null,
      note: "",
    },
    {
      id: "t9",
      date: d(27),
      from: "Москва",
      to: "Рязань",
      cargo: "Продукты, 10 т",
      distance: 190,
      rate: 89,
      amount: 17_000,
      status: "paid",
      waybillId: null,
      note: "",
    },
    {
      id: "t10",
      date: d(32),
      from: "Москва",
      to: "Тверь",
      cargo: "Мебель, 8 т",
      distance: 170,
      rate: 88,
      amount: 15_000,
      status: "paid",
      waybillId: null,
      note: "",
    },
    {
      id: "t11",
      date: d(36),
      from: "Москва",
      to: "Липецк",
      cargo: "Металлопрокат, 20 т",
      distance: 450,
      rate: 82,
      amount: 37_000,
      status: "paid",
      waybillId: null,
      note: "",
    },
  ];

  const fuels = [
    {
      id: "f1",
      date: d(18),
      station: "Роснефть",
      fuelType: "ДТ",
      liters: 160,
      price: 68.9,
      odometer: 484_900,
      vehicleId: "v1",
      waybillId: null,
      full: true,
    },
    {
      id: "f2",
      date: d(14),
      station: "Газпромнефть",
      fuelType: "ДТ",
      liters: 95,
      price: 67.2,
      odometer: 485_310,
      vehicleId: "v1",
      waybillId: "w3",
      full: true,
    },
    {
      id: "f3",
      date: d(10),
      station: "Лукойл",
      fuelType: "ДТ",
      liters: 115,
      price: 67.5,
      odometer: 485_575,
      vehicleId: "v1",
      waybillId: "w2",
      full: true,
    },
    {
      id: "f4",
      date: d(6),
      station: "Татнефть",
      fuelType: "ДТ",
      liters: 105,
      price: 68.1,
      odometer: 485_908,
      vehicleId: "v1",
      waybillId: null,
      full: true,
    },
    {
      id: "f5",
      date: d(3),
      station: "Газпромнефть",
      fuelType: "ДТ",
      liters: 95,
      price: 67.9,
      odometer: 486_076,
      vehicleId: "v1",
      waybillId: "w1",
      full: true,
    },
    {
      id: "f6",
      date: d(0),
      station: "Лукойл",
      fuelType: "ДТ",
      liters: 75,
      price: 68.4,
      odometer: 486_320,
      vehicleId: "v1",
      waybillId: "w1",
      full: true,
    },
  ];

  /* Доходы по оплаченным рейсам */
  const income = trips
    .filter((t) => t.status === "paid")
    .map((t) => ({
      id: uid("fin"),
      date: t.date,
      type: "income",
      category: "Оплата рейса",
      amount: t.amount,
      note: `${t.from} → ${t.to}`,
      tripId: t.id,
      method: "card",
    }));

  /* Расходы на топливо */
  const fuelExpenses = fuels.map((f) => ({
    id: uid("fin"),
    date: f.date,
    type: "expense",
    category: "Топливо",
    amount: Math.round(f.liters * f.price * 100) / 100,
    note: `${f.station} · ${f.liters} л`,
    fuelId: f.id,
    method: "card",
  }));

  const otherExpenses = [
    { date: d(4), category: "Платные дороги", amount: 1_850, note: "М-12, участок 3" },
    { date: d(8), category: "Ремонт", amount: 12_500, note: "Замена фильтров и масла" },
    { date: d(11), category: "Штрафы", amount: 5_000, note: "Превышение скорости" },
    { date: d(15), category: "Стоянка", amount: 900, note: "Парковка у РЦ «Волга»" },
    { date: d(19), category: "Мойка", amount: 700, note: "Мойка тягача" },
    { date: d(25), category: "Ремонт", amount: 8_400, note: "Тормозные колодки" },
    { date: d(30), category: "Платные дороги", amount: 2_400, note: "М-4 «Дон»" },
    { date: d(33), category: "Штрафы", amount: 2_500, note: "Стоянка под знаком" },
  ].map((e) => ({
    id: uid("fin"),
    type: "expense",
    method: "cash",
    ...e,
  }));

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    driver: {
      name: "Иван Петров",
      role: "Водитель",
      phone: "+7 916 240-18-32",
      license: "77 24 918374",
      company: "ИП Петров И. С.",
      percent: 12,
      salary: 45_000,
    },
    vehicles,
    waybills,
    trips,
    fuels,
    finance: [...income, ...fuelExpenses, ...otherExpenses],
    refs: {
      contractors: [
        "ООО «ТрансЛогистик»",
        "ООО «Северный склад»",
        "АО «Восток-Ритейл»",
        "ИП Смирнов А. В.",
      ],
      cargo: ["Стройматериалы", "Продукты", "Бытовая техника", "Мебель", "Металлопрокат"],
      places: [
        "Москва",
        "Нижний Новгород",
        "Казань",
        "Владимир",
        "Ярославль",
        "Смоленск",
        "Тула",
        "Воронеж",
        "Рязань",
        "Тверь",
        "Липецк",
      ],
      categories: [
        "Топливо",
        "Ремонт",
        "Платные дороги",
        "Штрафы",
        "Стоянка",
        "Мойка",
        "Прочее",
      ],
    },
    settings: {
      theme: "light",
      ai: { endpoint: "https://api.openai.com/v1", key: "", model: "gpt-4o-mini" },
      lastSync: Date.now(),
      cloudBackup: false,
    },
    chat: [],
  };
}

/* ------------------------------------------------------------------ */
/* Состояние                                                           */
/* ------------------------------------------------------------------ */

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.version) return seed();
    return parsed;
  } catch (err) {
    console.warn("Не удалось прочитать сохранённые данные", err);
    return seed();
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Не удалось сохранить данные", err);
  }
}

function commit() {
  persist();
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function update(mutator) {
  mutator(state);
  commit();
}

/* ------------------------------------------------------------------ */
/* Мутации                                                             */
/* ------------------------------------------------------------------ */

export function updateDriver(patch) {
  update((s) => Object.assign(s.driver, patch));
}

export function setSettings(patch) {
  update((s) => Object.assign(s.settings, patch));
}

export function setTheme(theme) {
  update((s) => {
    s.settings.theme = theme;
  });
  applyTheme(theme);
}

export function applyTheme(theme) {
  const value =
    theme === "system"
      ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = value;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", value === "dark" ? "#0c1211" : "#0f766e");
}

/* --- Автомобили --- */
export function saveVehicle(data) {
  update((s) => {
    if (data.id) {
      const i = s.vehicles.findIndex((v) => v.id === data.id);
      if (i >= 0) s.vehicles[i] = { ...s.vehicles[i], ...data };
    } else {
      s.vehicles.unshift({ ...data, id: uid("v") });
    }
  });
}

export function setActiveVehicle(id) {
  update((s) => {
    for (const v of s.vehicles) v.active = v.id === id;
  });
}

export function deleteVehicle(id) {
  update((s) => {
    const wasActive = s.vehicles.some((v) => v.id === id && v.active);
    s.vehicles = s.vehicles.filter((v) => v.id !== id);
    if (wasActive && s.vehicles.length) s.vehicles[0].active = true;
    for (const t of s.trips) if (t.vehicleId === id) t.vehicleId = null;
    for (const w of s.waybills) if (w.vehicleId === id) w.vehicleId = null;
    for (const f of s.fuels) if (f.vehicleId === id) f.vehicleId = null;
  });
}

/* --- Путевые листы --- */
export function nextWaybillNumber() {
  const max = state.waybills.reduce((acc, w) => Math.max(acc, Number(w.number) || 0), 0);
  return String(max + 1).padStart(6, "0");
}

export function saveWaybill(data) {
  update((s) => {
    if (data.id) {
      const i = s.waybills.findIndex((w) => w.id === data.id);
      if (i >= 0) s.waybills[i] = { ...s.waybills[i], ...data };
    } else {
      s.waybills.unshift({
        id: uid("w"),
        series: "АП",
        driver: s.driver.name,
        ...data,
      });
    }
  });
}

export function deleteWaybill(id) {
  update((s) => {
    s.waybills = s.waybills.filter((w) => w.id !== id);
    for (const t of s.trips) if (t.waybillId === id) t.waybillId = null;
    for (const f of s.fuels) if (f.waybillId === id) f.waybillId = null;
  });
}

export function setWaybillStatus(id, status) {
  update((s) => {
    const w = s.waybills.find((x) => x.id === id);
    if (!w) return;
    w.status = status;
    if (status === "issued" && !w.issuedAt) w.issuedAt = today();
    if (status === "closed") {
      w.kmDone = w.distance;
      if (w.odometerIn == null && w.odometerOut != null) {
        w.odometerIn = w.odometerOut + w.distance;
      }
    }
  });
}

export function closeWaybill(id, { odometerIn, fuelUsed, kmDone }) {
  update((s) => {
    const w = s.waybills.find((x) => x.id === id);
    if (!w) return;
    w.status = "closed";
    w.odometerIn = Number(odometerIn) || (w.odometerOut || 0) + w.distance;
    w.fuelUsed = Number(fuelUsed) || w.fuelUsed || 0;
    w.kmDone = Number(kmDone) || w.distance;
    const vehicle = s.vehicles.find((v) => v.id === w.vehicleId);
    if (vehicle && w.odometerIn > vehicle.odometer) vehicle.odometer = w.odometerIn;
  });
}

/* --- Рейсы --- */
export function saveTrip(data) {
  const id = data.id || uid("t");
  update((s) => {
    const i = s.trips.findIndex((t) => t.id === id);
    if (i >= 0) {
      s.trips[i] = { ...s.trips[i], ...data, id };
    } else {
      s.trips.unshift({ status: "planned", ...data, id });
    }

    // Оплаченный рейс добавляет доход, если его ещё нет; при правке — обновляет
    const trip = s.trips.find((t) => t.id === id);
    if (trip && trip.status === "paid") {
      const linked = s.finance.find((f) => f.tripId === trip.id);
      if (linked) {
        linked.amount = trip.amount;
        linked.note = `${trip.from} → ${trip.to}`;
        linked.date = trip.date;
      } else {
        s.finance.unshift({
          id: uid("fin"),
          date: trip.date || today(),
          type: "income",
          category: "Оплата рейса",
          amount: trip.amount,
          note: `${trip.from} → ${trip.to}`,
          tripId: trip.id,
          method: "card",
        });
      }
    }
  });
  return id;
}

export function setTripStatus(id, status) {
  update((s) => {
    const trip = s.trips.find((t) => t.id === id);
    if (!trip) return;
    trip.status = status;
    if (status === "paid") {
      const exists = s.finance.some((f) => f.tripId === trip.id);
      if (!exists) {
        s.finance.unshift({
          id: uid("fin"),
          date: trip.date || today(),
          type: "income",
          category: "Оплата рейса",
          amount: trip.amount,
          note: `${trip.from} → ${trip.to}`,
          tripId: trip.id,
          method: "card",
        });
      }
    }
  });
}

export function deleteTrip(id) {
  update((s) => {
    s.trips = s.trips.filter((t) => t.id !== id);
    s.finance = s.finance.filter((f) => f.tripId !== id);
  });
}

/* --- Заправки --- */
export function saveFuel(data) {
  update((s) => {
    let fuel;
    if (data.id) {
      const i = s.fuels.findIndex((f) => f.id === data.id);
      if (i >= 0) {
        fuel = { ...s.fuels[i], ...data };
        s.fuels[i] = fuel;
      }
    } else {
      fuel = { ...data, id: uid("f") };
      s.fuels.unshift(fuel);
    }
    if (!fuel) return;

    const vehicle =
      s.vehicles.find((v) => v.id === fuel.vehicleId) ||
      s.vehicles.find((v) => v.active) ||
      s.vehicles[0];
    if (vehicle && fuel.odometer > vehicle.odometer) vehicle.odometer = fuel.odometer;

    // Синхронизируем расход в финансах
    const amount = Math.round(fuel.liters * fuel.price * 100) / 100;
    const existing = s.finance.find((f) => f.fuelId === fuel.id);
    if (existing) {
      existing.amount = amount;
      existing.date = fuel.date;
      existing.note = `${fuel.station} · ${fuel.liters} л`;
    } else {
      s.finance.unshift({
        id: uid("fin"),
        date: fuel.date,
        type: "expense",
        category: "Топливо",
        amount,
        note: `${fuel.station} · ${fuel.liters} л`,
        fuelId: fuel.id,
        method: "card",
      });
    }
  });
}

export function deleteFuel(id) {
  update((s) => {
    s.fuels = s.fuels.filter((f) => f.id !== id);
    s.finance = s.finance.filter((f) => f.fuelId !== id);
  });
}

/* --- Финансы --- */
export function saveFinance(data) {
  update((s) => {
    if (data.id) {
      const i = s.finance.findIndex((f) => f.id === data.id);
      if (i >= 0) s.finance[i] = { ...s.finance[i], ...data };
    } else {
      s.finance.unshift({ id: uid("fin"), method: "cash", ...data });
    }
  });
}

export function deleteFinance(id) {
  update((s) => {
    s.finance = s.finance.filter((f) => f.id !== id);
  });
}

/* --- Справочники --- */
export function addRef(kind, value) {
  update((s) => {
    const list = s.refs[kind];
    if (list && !list.includes(value)) list.push(value);
  });
}

export function deleteRef(kind, value) {
  update((s) => {
    s.refs[kind] = s.refs[kind].filter((v) => v !== value);
  });
}

/* --- Чат --- */
export function pushMessage(message) {
  update((s) => {
    s.chat.push({ id: uid("m"), at: Date.now(), ...message });
    if (s.chat.length > 200) s.chat = s.chat.slice(-200);
  });
}

export function clearChat() {
  update((s) => {
    s.chat = [];
  });
}

/* --- Данные --- */
export function resetDemo() {
  state = seed();
  commit();
  applyTheme(state.settings.theme);
}

export function importState(json) {
  const parsed = JSON.parse(json);
  if (!parsed || !parsed.version || !Array.isArray(parsed.trips)) {
    throw new Error("Файл не похож на резервную копию АвтоПрофи");
  }
  state = parsed;
  commit();
  applyTheme(state.settings.theme);
}

export function exportState() {
  return JSON.stringify(state, null, 2);
}

export function markSynced() {
  update((s) => {
    s.settings.lastSync = Date.now();
  });
}

/* ------------------------------------------------------------------ */
/* Производные показатели                                              */
/* ------------------------------------------------------------------ */

export function periodStart(period = "month") {
  if (period === "all") return "2000-01-01";
  if (period === "30") return daysAgo(29);
  if (period === "week") return daysAgo(6);
  if (period === "year") return `${new Date().getFullYear()}-01-01`;
  return startOfMonth();
}

export function periodLabel(period) {
  return { month: "С начала месяца", week: "7 дней", "30": "30 дней", year: "Год", all: "Всё время" }[
    period
  ];
}

export function financeStats(period = "month") {
  const from = periodStart(period);
  const items = state.finance.filter((f) => f.date >= from);
  const income = sum(items.filter((f) => f.type === "income"), (f) => f.amount);
  const expense = sum(items.filter((f) => f.type === "expense"), (f) => f.amount);
  const byCategory = {};
  for (const f of items) {
    if (f.type !== "expense") continue;
    byCategory[f.category] = (byCategory[f.category] || 0) + f.amount;
  }
  const categories = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  return { income, expense, balance: income - expense, items, categories };
}

export function prevMonthStats() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const from = isoDate(start);
  const to = isoDate(end);
  const items = state.finance.filter((f) => f.date >= from && f.date <= to);
  return {
    income: sum(items.filter((f) => f.type === "income"), (f) => f.amount),
    expense: sum(items.filter((f) => f.type === "expense"), (f) => f.amount),
  };
}

export function monthTrips() {
  const from = startOfMonth();
  return state.trips.filter((t) => t.date >= from);
}

export function fuelStats(vehicleId = null) {
  const vid = vehicleId || activeVehicle()?.id || null;
  const list = [...state.fuels]
    .filter((f) => !vid || !f.vehicleId || f.vehicleId === vid)
    .sort((a, b) => a.odometer - b.odometer);
  const monthList = list.filter((f) => f.date >= startOfMonth());
  const liters = sum(monthList, (f) => f.liters);
  const cost = sum(monthList, (f) => f.liters * f.price);
  const avgPrice = liters ? cost / liters : 0;

  let km = 0;
  let used = 0;
  for (let i = 1; i < list.length; i++) {
    const delta = list[i].odometer - list[i - 1].odometer;
    if (delta > 0 && delta < 5000) {
      km += delta;
      used += list[i].liters;
    }
  }
  const consumption = km > 0 ? (used / km) * 100 : 0;
  return {
    liters,
    cost,
    avgPrice,
    consumption,
    km,
    totalLiters: sum(list, (f) => f.liters),
    last: list[list.length - 1] || null,
  };
}

export function activeWaybill() {
  return (
    state.waybills.find((w) => w.status === "active") ||
    state.waybills.find((w) => w.status === "issued") ||
    state.waybills.find((w) => w.status === "draft") ||
    null
  );
}

export function vehicleById(id) {
  return state.vehicles.find((v) => v.id === id) || null;
}

export function activeVehicle() {
  return state.vehicles.find((v) => v.active) || state.vehicles[0] || null;
}

export function vehicleName(v) {
  return v ? `${v.brand} ${v.model}` : "Автомобиль не выбран";
}

export function waybillById(id) {
  return state.waybills.find((w) => w.id === id) || null;
}

export function tripById(id) {
  return state.trips.find((t) => t.id === id) || null;
}

/** Доход по дням за последние n дней — для мини-диаграммы. */
export function incomeByDay(days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i);
    const value = sum(
      state.finance.filter((f) => f.type === "income" && f.date === date),
      (f) => f.amount
    );
    out.push({ date, value });
  }
  return out;
}

/** Напоминания: ТО, страховка, документы. */
export function reminders() {
  const out = [];
  for (const v of state.vehicles) {
    const left = v.nextService - v.odometer;
    if (left <= 5000) {
      out.push({
        kind: "service",
        tone: left <= 1000 ? "rose" : "amber",
        title: `ТО ${v.brand} ${v.model}`,
        text:
          left <= 0
            ? `Просрочено на ${Math.abs(left).toLocaleString("ru-RU")} км`
            : `Через ${left.toLocaleString("ru-RU")} км`,
      });
    }
    if (v.insurance) {
      const leftDays = diffDays(today(), v.insurance);
      if (leftDays >= 0 && leftDays <= 60) {
        out.push({
          kind: "insurance",
          tone: leftDays <= 14 ? "rose" : "amber",
          title: `ОСАГО ${v.brand} ${v.model}`,
          text: leftDays === 0 ? "Истекает сегодня" : `Истекает через ${leftDays} дн.`,
        });
      }
    }
  }
  return out;
}

/** Статистика по маршрутам: самый прибыльный. */
export function routeStats() {
  const map = new Map();
  for (const t of state.trips) {
    if (t.status !== "paid") continue;
    const key = `${t.from} → ${t.to}`;
    const cur = map.get(key) || { route: key, count: 0, amount: 0, distance: 0 };
    cur.count += 1;
    cur.amount += t.amount;
    cur.distance += t.distance;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function tripSummary(list = state.trips) {
  return {
    count: list.length,
    distance: sum(list, (t) => t.distance),
    amount: sum(list, (t) => t.amount),
    paid: sum(list.filter((t) => t.status === "paid"), (t) => t.amount),
  };
}

export function vehicleConsumption(vehicleId) {
  const list = state.fuels
    .filter((f) => !vehicleId || !f.vehicleId || f.vehicleId === vehicleId)
    .slice()
    .sort((a, b) => a.odometer - b.odometer);
  let km = 0;
  let used = 0;
  for (let i = 1; i < list.length; i++) {
    const delta = list[i].odometer - list[i - 1].odometer;
    if (delta > 0 && delta < 5000) {
      km += delta;
      used += list[i].liters;
    }
  }
  return km > 0 ? (used / km) * 100 : 0;
}

/** Снимок данных для ИИ-агента. */
export function dataSnapshot() {
  const f = financeStats("month");
  const fuel = fuelStats();
  const active = activeWaybill();
  const vehicle = activeVehicle();
  return {
    сегодня: today(),
    водитель: state.driver,
    автомобиль: vehicle
      ? {
          модель: `${vehicle.brand} ${vehicle.model}`,
          номер: vehicle.plate,
          пробег: vehicle.odometer,
          следующее_ТО: vehicle.nextService,
        }
      : null,
    месяц: { доход: f.income, расход: f.expense, баланс: f.balance },
    топливо: {
      литров_за_месяц: Math.round(fuel.liters),
      средний_расход_л_на_100_км: Number(fuel.consumption.toFixed(1)),
      средняя_цена: Number(fuel.avgPrice.toFixed(2)),
    },
    активный_путевой_лист: active
      ? {
          номер: `${active.series}-${active.number}`,
          откуда: active.fromCity,
          куда: active.toCity,
          пройдено_км: active.kmDone,
          всего_км: active.distance,
          топливо_выдано_л: active.fuelIssued,
          топливо_израсходовано_л: active.fuelUsed,
        }
      : null,
    рейсы_за_месяц: tripSummary(monthTrips()),
    последние_заправки: state.fuels.slice(0, 5).map((x) => ({
      дата: x.date,
      азс: x.station,
      литров: x.liters,
      цена: x.price,
      одометр: x.odometer,
    })),
  };
}

/* Применяем тему сразу при импорте модуля. */
applyTheme(state.settings.theme);
