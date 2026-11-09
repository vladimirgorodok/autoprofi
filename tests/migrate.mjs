import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const WEB = path.join(ROOT, "web");
const OUT = path.join(os.tmpdir(), `autoprofi-migrate-${process.pid}.mjs`);

await build({
  entryPoints: [path.join(WEB, "js/store.js")],
  bundle: true,
  format: "esm",
  outfile: OUT,
  logLevel: "silent",
});

const dom = new JSDOM('<meta name="theme-color" content="#fff">', {
  url: "http://localhost/",
});
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] ?? null;
  },
  setItem(key, value) {
    this.data[key] = String(value);
  },
  removeItem(key) {
    delete this.data[key];
  },
};

const oldState = {
  version: 1,
  createdAt: new Date().toISOString(),
  driver: { name: "Иван Петров", role: "Водитель" },
  vehicles: [
    { id: "v1", brand: "Volvo", model: "FH", plate: "А1", odometer: 1000, active: true },
  ],
  waybills: [
    {
      id: "w1",
      number: "1",
      series: "АП",
      driver: "Иван Петров",
      vehicleId: "v1",
      fromCity: "Москва",
      toCity: "Тула",
      cargo: "Продукты",
      validFrom: "2026-01-01",
      validTo: "2026-01-02",
    },
  ],
  trips: [
    {
      id: "t1",
      date: "2026-01-01",
      from: "Москва",
      to: "Тула",
      cargo: "Продукты, 10 т",
      amount: 1000,
      status: "done",
    },
  ],
  fuels: [
    {
      id: "f1",
      date: "2026-01-01",
      station: "Лукойл",
      fuelType: "ДТ",
      liters: 100,
      price: 70,
      odometer: 1000,
      vehicleId: "v1",
    },
  ],
  finance: [
    {
      id: "fin1",
      date: "2026-01-01",
      type: "expense",
      category: "Топливо",
      amount: 7000,
      fuelId: "f1",
    },
    {
      id: "fin2",
      date: "2026-01-01",
      type: "expense",
      category: "Ремонт",
      amount: 5000,
    },
  ],
  refs: {
    contractors: ["ООО Ромашка"],
    cargo: ["Продукты"],
    places: ["Москва", "Тула"],
    categories: ["Топливо", "Ремонт"],
  },
  settings: { theme: "light" },
  chat: [],
};

global.localStorage.setItem("autoprofi.state.v1", JSON.stringify(oldState));
const store = await import(`${OUT}?v=${Date.now()}`);

const errors = [];
const check = (name, condition, detail = "") => {
  if (condition) {
    console.log(`OK   ${name}`);
  } else {
    errors.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

let s = store.getState();
check("version migrated", s.version === 2, `version=${s.version}`);
check("driver removed", s.driver === undefined);
check("waybill driver removed", s.waybills[0].driver === undefined);
check("fuel price removed", s.fuels[0].price === undefined);
check(
  "fuel expense removed",
  s.finance.length === 1 && s.finance[0].category === "Ремонт",
  JSON.stringify(s.finance)
);
check(
  "contractors became objects",
  s.refs.contractors[0].id && s.refs.contractors[0].name === "ООО Ромашка",
  JSON.stringify(s.refs.contractors)
);
check(
  "places became objects",
  s.refs.places[0].id && s.refs.places[0].name === "Москва",
  JSON.stringify(s.refs.places)
);
check(
  "stations built from fuels",
  s.refs.stations.length === 1 && s.refs.stations[0].name === "Лукойл",
  JSON.stringify(s.refs.stations)
);

const place = s.refs.places.find((item) => item.name === "Москва");
store.updateRef("places", place.id, { name: "Москва-Сити" });
s = store.getState();
check("place rename updates trip", s.trips[0].from === "Москва-Сити", s.trips[0].from);
check("place rename updates waybill", s.waybills[0].fromCity === "Москва-Сити", s.waybills[0].fromCity);

const cargo = s.refs.cargo.find((item) => item.name === "Продукты");
store.updateRef("cargo", cargo.id, { name: "Еда" });
s = store.getState();
check("cargo rename keeps weight", s.trips[0].cargo === "Еда, 10 т", s.trips[0].cargo);

const category = s.refs.categories.find((item) => item.name === "Ремонт");
store.updateRef("categories", category.id, { name: "Сервис" });
s = store.getState();
check("category rename updates finance", s.finance[0].category === "Сервис", s.finance[0].category);

const station = s.refs.stations.find((item) => item.name === "Лукойл");
store.updateRef("stations", station.id, { name: "Лукойл-2" });
s = store.getState();
check("station rename updates fuel", s.fuels[0].station === "Лукойл-2", s.fuels[0].station);

const created = store.addRef("cargo", { name: "Тестовый груз" });
check("addRef returns record", created && created.id && created.name === "Тестовый груз");
check(
  "addRef prevents duplicates",
  store.addRef("cargo", { name: "Еда" }) === null
);
store.deleteRef("cargo", created.id);
check(
  "deleteRef removes record",
  !store.getState().refs.cargo.some((item) => item.id === created.id)
);

fs.rmSync(OUT, { force: true });

console.log("\n=== MIGRATION ERRORS ===");
console.log(errors.length ? errors.join("\n") : "none");
process.exit(errors.length ? 1 : 0);
