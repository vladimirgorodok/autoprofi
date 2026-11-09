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
const STATE_VERSION = 2;

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
    version: STATE_VERSION,
    createdAt: new Date().toISOString(),
    vehicles,
    waybills,
    trips,
    fuels,
    finance: [...income, ...otherExpenses],
    refs: {
      contractors: [
        {
          id: "c1",
          name: "ООО «ТрансЛогистик»",
          type: "ООО",
          inn: "7701234567",
          kpp: "770101001",
          ogrn: "1157746123456",
          legalAddress: "г. Москва, ул. Логистическая, 12, оф. 401",
          actualAddress: "г. Москва, ул. Логистическая, 12, оф. 401",
          phone: "+7 495 120-45-10",
          email: "info@translogistic.ru",
          contact: "Сергей Иванов",
          defaultCargo: "Стройматериалы",
          note: "Постоянный заказчик, оплата по счёту.",
        },
        {
          id: "c2",
          name: "ООО «Северный склад»",
          type: "ООО",
          inn: "5023456789",
          kpp: "502301001",
          ogrn: "1175023009876",
          legalAddress: "Московская обл., г. Мытищи, ул. Складская, 4",
          actualAddress: "Московская обл., г. Мытищи, ул. Складская, 4",
          phone: "+7 495 120-45-10",
          email: "sklad@sever.ru",
          contact: "Алексей Петров",
          defaultCargo: "Продукты",
          note: "Погрузка с 08:00 до 17:00.",
        },
        {
          id: "c3",
          name: "АО «Восток-Ритейл»",
          type: "АО",
          inn: "5261234567",
          kpp: "526101001",
          ogrn: "1025201234567",
          legalAddress: "г. Нижний Новгород, Московское ш., 12",
          actualAddress: "г. Нижний Новгород, Московское ш., 12",
          phone: "+7 831 240-18-90",
          email: "logistics@vostok-retail.ru",
          contact: "Мария Смирнова",
          defaultCargo: "Бытовая техника",
          note: "",
        },
        {
          id: "c4",
          name: "ИП Смирнов А. В.",
          type: "ИП",
          inn: "773456789012",
          kpp: "",
          ogrn: "321770012345678",
          legalAddress: "г. Москва, ул. Кутузова, 3",
          actualAddress: "г. Москва, ул. Кутузова, 3",
          phone: "+7 916 240-18-32",
          email: "smirnov@example.ru",
          contact: "Андрей Смирнов",
          defaultCargo: "Мебель",
          note: "",
        },
      ],
      cargo: [
        { id: "g1", name: "Стройматериалы", note: "" },
        { id: "g2", name: "Продукты", note: "" },
        { id: "g3", name: "Бытовая техника", note: "" },
        { id: "g4", name: "Мебель", note: "" },
        { id: "g5", name: "Металлопрокат", note: "" },
      ],
      places: [
        {
          id: "p1",
          name: "Москва",
          firmId: "c2",
          address: "Склад «Северный», ул. Складская, 4",
          contact: "Алексей Петров",
          phone: "+7 495 120-45-10",
          coordinates: "55.7558, 37.6173",
          loadingType: "Задняя",
          defaultCargo: "Стройматериалы",
          note: "",
        },
        {
          id: "p2",
          name: "Нижний Новгород",
          firmId: "c3",
          address: "ТЦ «Восток», Московское ш., 12",
          contact: "Мария Смирнова",
          phone: "+7 831 240-18-90",
          coordinates: "56.3269, 44.0059",
          loadingType: "Боковая",
          defaultCargo: "Стройматериалы",
          note: "",
        },
        {
          id: "p3",
          name: "Казань",
          firmId: "c1",
          address: "Логистический центр «Волга», ул. Портовая, 8",
          contact: "",
          coordinates: "55.7963, 49.1088",
          loadingType: "Задняя",
          defaultCargo: "Продукты",
          note: "",
        },
        {
          id: "p4",
          name: "Владимир",
          firmId: "c1",
          address: "Склад «Владимир», ул. Механизаторов, 3",
          contact: "",
          coordinates: "56.1290, 40.4070",
          loadingType: "Боковая",
          defaultCargo: "Продукты",
          note: "",
        },
        {
          id: "p5",
          name: "Ярославль",
          firmId: "c3",
          address: "РЦ «Волга», ул. Промышленная, 8",
          contact: "",
          coordinates: "57.6261, 39.8845",
          loadingType: "Задняя",
          defaultCargo: "Продукты",
          note: "",
        },
        {
          id: "p6",
          name: "Смоленск",
          firmId: "c4",
          address: "ТК «Гамаюн», ул. Кутузова, 3",
          contact: "",
          coordinates: "54.7818, 32.0401",
          loadingType: "Бортовая",
          defaultCargo: "Мебель",
          note: "",
        },
        {
          id: "p7",
          name: "Тула",
          firmId: "c4",
          address: "Склад «Тула», ул. Пролетарская, 15",
          contact: "",
          coordinates: "54.1961, 37.6182",
          loadingType: "Задняя",
          defaultCargo: "Металлопрокат",
          note: "",
        },
        {
          id: "p8",
          name: "Воронеж",
          firmId: "c1",
          address: "Логистический парк «Дон», ул. Дорожная, 5",
          contact: "",
          coordinates: "51.6720, 39.1843",
          loadingType: "Боковая",
          defaultCargo: "Стройматериалы",
          note: "",
        },
        {
          id: "p9",
          name: "Рязань",
          firmId: "c2",
          address: "Склад «Рязань», ул. Прижелезнодорожная, 2",
          contact: "",
          coordinates: "54.6269, 39.6916",
          loadingType: "Задняя",
          defaultCargo: "Продукты",
          note: "",
        },
        {
          id: "p10",
          name: "Тверь",
          firmId: "c3",
          address: "РЦ «Тверь», ул. Индустриальная, 11",
          contact: "",
          coordinates: "56.8587, 35.9176",
          loadingType: "Задняя",
          defaultCargo: "Мебель",
          note: "",
        },
        {
          id: "p11",
          name: "Липецк",
          firmId: "c1",
          address: "Склад «Липецк», ул. Металлургов, 7",
          contact: "",
          coordinates: "52.6088, 39.5992",
          loadingType: "Боковая",
          defaultCargo: "Металлопрокат",
          note: "",
        },
      ],
      stations: [
        { id: "s1", name: "Лукойл", note: "" },
        { id: "s2", name: "Газпромнефть", note: "" },
        { id: "s3", name: "Роснефть", note: "" },
        { id: "s4", name: "Татнефть", note: "" },
        { id: "s5", name: "Shell", note: "" },
        { id: "s6", name: "Нефтьмагистраль", note: "" },
        { id: "s7", name: "Другая", note: "" },
      ],
      categories: [
        { id: "k1", name: "Топливо", note: "" },
        { id: "k2", name: "Ремонт", note: "" },
        { id: "k3", name: "Платные дороги", note: "" },
        { id: "k4", name: "Штрафы", note: "" },
        { id: "k5", name: "Стоянка", note: "" },
        { id: "k6", name: "Мойка", note: "" },
        { id: "k7", name: "Прочее", note: "" },
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

function refDefaults(kind) {
  if (kind === "contractors") {
    return {
      type: "ООО",
      inn: "",
      kpp: "",
      ogrn: "",
      legalAddress: "",
      actualAddress: "",
      phone: "",
      email: "",
      contact: "",
      defaultCargo: "",
      note: "",
    };
  }
  if (kind === "places") {
    return {
      firmId: "",
      address: "",
      contact: "",
      phone: "",
      coordinates: "",
      loadingType: "Задняя",
      defaultCargo: "",
      note: "",
    };
  }
  return { note: "" };
}

function normalizeRefList(list, kind) {
  if (!Array.isArray(list)) return [];
  const used = new Set();
  const out = [];
  for (const raw of list) {
    const item = typeof raw === "string" ? { name: raw } : { ...(raw || {}) };
    const name = String(item.name ?? item.value ?? item.title ?? "").trim();
    if (!name) continue;
    let id = String(item.id || "");
    if (!id || used.has(id)) id = uid("ref");
    used.add(id);
    out.push({ id, ...refDefaults(kind), ...item, name });
  }
  return out;
}

function migrateRefs(refs, fuels) {
  const source = refs && typeof refs === "object" ? refs : {};
  const out = {
    contractors: normalizeRefList(source.contractors, "contractors"),
    places: normalizeRefList(source.places, "places"),
    cargo: normalizeRefList(source.cargo, "cargo"),
    categories: normalizeRefList(source.categories, "categories"),
    stations: normalizeRefList(source.stations, "stations"),
  };
  if (!Array.isArray(source.stations)) {
    const names = [...new Set((fuels || []).map((f) => f.station).filter(Boolean))];
    const defaults = [
      "Лукойл",
      "Газпромнефть",
      "Роснефть",
      "Татнефть",
      "Shell",
      "Нефтьмагистраль",
      "Другая",
    ];
    out.stations = (names.length ? names : defaults).map((name) => ({
      id: uid("ref"),
      name,
      note: "",
    }));
  }
  return out;
}

function migrate(parsed) {
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.trips)) return seed();
  const s = parsed;

  for (const key of ["vehicles", "waybills", "trips", "fuels", "finance", "chat"]) {
    if (!Array.isArray(s[key])) s[key] = [];
  }
  if (!s.settings || typeof s.settings !== "object") s.settings = seed().settings;
  s.version = STATE_VERSION;

  // Поля, которые больше не используются: водитель и цена топлива.
  delete s.driver;
  for (const w of s.waybills) delete w.driver;
  for (const f of s.fuels) delete f.price;
  // Автоматические расходы на топливо больше не нужны.
  s.finance = s.finance.filter((f) => !f.fuelId);
  s.refs = migrateRefs(s.refs, s.fuels);
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.version) return seed();
    const migrated = migrate(parsed);
    localStorage.setItem(KEY, JSON.stringify(migrated));
    return migrated;
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
  });
}

export function deleteFuel(id) {
  update((s) => {
    s.fuels = s.fuels.filter((f) => f.id !== id);
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
export function refNames(kind) {
  return (state.refs[kind] || []).map((item) => item.name).filter(Boolean);
}

export function refById(kind, id) {
  return (state.refs[kind] || []).find((item) => item.id === id) || null;
}

function renameText(value, oldName, newName) {
  if (!value) return value;
  if (value === oldName) return newName;
  if (value.startsWith(`${oldName},`)) return `${newName}${value.slice(oldName.length)}`;
  if (value.startsWith(`${oldName} `)) return `${newName}${value.slice(oldName.length)}`;
  return value;
}

function renameRefUsage(s, kind, oldName, newName) {
  if (!oldName || !newName || oldName === newName) return;
  if (kind === "categories") {
    for (const f of s.finance) if (f.category === oldName) f.category = newName;
    return;
  }
  if (kind === "stations") {
    for (const f of s.fuels) if (f.station === oldName) f.station = newName;
    return;
  }
  if (kind === "cargo") {
    for (const t of s.trips) t.cargo = renameText(t.cargo, oldName, newName);
    for (const w of s.waybills) w.cargo = renameText(w.cargo, oldName, newName);
    return;
  }
  if (kind === "places") {
    for (const t of s.trips) {
      t.from = renameText(t.from, oldName, newName);
      t.to = renameText(t.to, oldName, newName);
    }
    for (const w of s.waybills) {
      w.fromCity = renameText(w.fromCity, oldName, newName);
      w.toCity = renameText(w.toCity, oldName, newName);
    }
  }
}

export function addRef(kind, data) {
  let created = null;
  update((s) => {
    const list = s.refs[kind] || (s.refs[kind] = []);
    const payload = typeof data === "string" ? { name: data } : { ...(data || {}) };
    const name = String(payload.name || "").trim();
    if (!name) return;
    if (list.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;
    created = { id: uid("ref"), ...refDefaults(kind), ...payload, name };
    list.push(created);
  });
  return created;
}

export function updateRef(kind, id, patch) {
  let ok = false;
  update((s) => {
    const list = s.refs[kind] || [];
    const item = list.find((row) => row.id === id);
    if (!item) return;
    const next = { ...item, ...patch };
    const name = String(next.name || "").trim();
    if (!name) return;
    if (list.some((row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase())) {
      return;
    }
    const oldName = item.name;
    const oldAddress = item.address;
    Object.assign(item, next, { name });
    if (kind === "places" && oldAddress && item.address && oldAddress !== item.address) {
      for (const w of s.waybills) {
        if (w.fromAddr === oldAddress) w.fromAddr = item.address;
        if (w.toAddr === oldAddress) w.toAddr = item.address;
      }
    }
    renameRefUsage(s, kind, oldName, name);
    ok = true;
  });
  return ok;
}

export function deleteRef(kind, id) {
  update((s) => {
    s.refs[kind] = (s.refs[kind] || []).filter((item) => item.id !== id);
    if (kind === "contractors") {
      for (const place of s.refs.places || []) {
        if (place.firmId === id) place.firmId = "";
      }
    }
  });
}

export function refUsage(kind, item) {
  if (!item || !item.name) return 0;
  const name = item.name;
  if (kind === "categories") {
    return state.finance.filter((f) => f.category === name).length;
  }
  if (kind === "stations") {
    return state.fuels.filter((f) => f.station === name).length;
  }
  if (kind === "cargo") {
    return [...state.trips, ...state.waybills].filter((row) => {
      const value = String(row.cargo || "");
      return value === name || value.startsWith(`${name},`) || value.startsWith(`${name} `);
    }).length;
  }
  if (kind === "places") {
    return (
      state.trips.filter((t) => t.from === name || t.to === name).length +
      state.waybills.filter((w) => w.fromCity === name || w.toCity === name).length
    );
  }
  if (kind === "contractors") {
    return (state.refs.places || []).filter((place) => place.firmId === item.id).length;
  }
  return 0;
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
  state = migrate(parsed);
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
    count: monthList.length,
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
      заправок_за_месяц: fuel.count,
      средний_расход_л_на_100_км: Number(fuel.consumption.toFixed(1)),
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
      одометр: x.odometer,
    })),
  };
}

/* Применяем тему сразу при импорте модуля. */
applyTheme(state.settings.theme);
