import { deflateRawSync } from "node:zlib";
import { buildArchive, buildZip, parseArchive, parseCSV } from "../web/js/archive.js";

const errors = [];
let checks = 0;

function check(name, condition, extra = "") {
  checks++;
  if (condition) {
    console.log(`OK   ${name}`);
  } else {
    errors.push(`${name}${extra ? ` — ${extra}` : ""}`);
    console.log(`FAIL ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

const sampleState = {
  version: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
  vehicles: [
    {
      id: "v1",
      brand: "Volvo",
      model: "FH 460",
      plate: "А123ВС 77",
      trailer: "АП 4821 77",
      vin: "YV2RT40A8MB123456",
      year: 2021,
      odometer: 486320,
      nextService: 490500,
      insurance: "2027-03-12",
      consumption: 31.4,
      fuel: "ДТ",
      tank: 600,
      color: "teal",
      type: "Тягач",
      note: "Основной",
      active: true,
    },
  ],
  waybills: [
    {
      id: "w1",
      number: "000001",
      series: "АП",
      status: "closed",
      issuedAt: "2026-01-01",
      validFrom: "2026-01-01",
      validTo: "2026-01-02",
      vehicleId: "v1",
      trailerId: "tr1",
      fromCity: "Москва",
      fromAddr: "Склад 1",
      toCity: "Тула",
      toAddr: "Склад 2",
      cargo: "Продукты",
      distance: 180,
      kmDone: 180,
      odometerOut: 1000,
      odometerIn: 1180,
      fuelOut: 300,
      fuelIn: 180,
      fuelIssued: 300,
      fuelUsed: 120,
      note: "Закрыт",
    },
  ],
  trips: [
    {
      id: "t1",
      date: "2026-01-01",
      from: "Москва",
      to: "Тула",
      cargo: "Продукты",
      weightKg: 18000,
      loadingType: "Задняя",
      distance: 180,
      rate: 100,
      amount: 18000,
      status: "paid",
      waybillId: "w1",
      note: "Рейс",
      stops: [
        {
          id: "stop1",
          placeId: "p1",
          place: "Москва",
          type: "Погрузка",
          address: "Склад 1",
          at: "2026-01-01",
          note: "",
        },
        {
          id: "stop2",
          placeId: "p2",
          place: "Тула",
          type: "Выгрузка",
          address: "Склад 2",
          at: "2026-01-02",
          note: "",
        },
      ],
    },
  ],
  fuels: [
    {
      id: "f1",
      date: "2026-01-01",
      station: "Лукойл",
      fuelType: "ДТ",
      liters: 100,
      odometer: 1000,
      vehicleId: "v1",
      waybillId: "w1",
      full: true,
    },
  ],
  finance: [
    {
      id: "fin1",
      date: "2026-01-01",
      type: "income",
      category: "Доставка",
      amount: 18000,
      note: "Оплата",
      method: "card",
      tripId: "t1",
    },
  ],
  refs: {
    contractors: [
      {
        id: "c1",
        name: "ООО «Ромашка»",
        type: "ООО",
        inn: "7700000000",
        kpp: "770001001",
        ogrn: "1027700000000",
        legalAddress: "Москва",
        actualAddress: "Москва",
        phone: "+7 999 000-00-00",
        email: "test@example.com",
        contact: "Иван",
        defaultCargo: "Продукты",
        note: "",
      },
    ],
    places: [
      {
        id: "p1",
        name: "Москва",
        firmId: "c1",
        address: "Склад 1",
        contact: "Пётр",
        phone: "",
        coordinates: "55.75, 37.61",
        loadingType: "Задняя",
        defaultCargo: "Продукты",
        note: "",
      },
      {
        id: "p2",
        name: "Тула",
        firmId: "c1",
        address: "Склад 2",
        contact: "",
        phone: "",
        coordinates: "",
        loadingType: "Бортовая",
        defaultCargo: "",
        note: "",
      },
    ],
    cargo: [{ id: "g1", name: "Продукты", note: "" }],
    categories: [
      { id: "k1", name: "Доставка", note: "" },
      { id: "k2", name: "Платные дороги", note: "Не используется в демо" },
    ],
    stations: [{ id: "s1", name: "Лукойл", note: "" }],
  },
  settings: {
    theme: "dark",
    ai: { endpoint: "https://api.openai.com/v1", key: "", model: "gpt-4o-mini" },
    lastSync: 1,
    cloudBackup: false,
  },
  chat: [{ role: "user", text: "привет" }],
};

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

const parsedCsv = parseCSV(
  'id;name;note\n1;"ООО ""Ромашка""";"строка 1\nстрока 2"\n2;Тест;'
);
check("csv rows", parsedCsv.length === 3, `got ${parsedCsv.length}`);
check("csv quotes", parsedCsv[1][1] === 'ООО "Ромашка"');
check("csv newline in quotes", parsedCsv[1][2] === "строка 1\nстрока 2");
check("csv comma delimiter", parseCSV("id,name\n1,Тест")[1][1] === "Тест");

/* ------------------------------------------------------------------ */
/* Наш архив: ZIP → CSV → состояние                                    */
/* ------------------------------------------------------------------ */

const zip = buildArchive(sampleState);
check("archive is zip", zip[0] === 0x50 && zip[1] === 0x4b);

const roundTrip = await parseArchive(zip, "autoprofi-archive.zip");
check("round-trip source csv", roundTrip.source === "csv", roundTrip.source);
check("round-trip vehicles", roundTrip.state.vehicles.length === 1);
check("round-trip vin", roundTrip.state.vehicles[0].vin === "YV2RT40A8MB123456");
check("round-trip vehicle type", roundTrip.state.vehicles[0].type === "Тягач");
check("round-trip waybill fuelOut", roundTrip.state.waybills[0].fuelOut === 300);
check("round-trip waybill fuelIn", roundTrip.state.waybills[0].fuelIn === 180);
check("round-trip trip weight", roundTrip.state.trips[0].weightKg === 18000);
check("round-trip trip loading", roundTrip.state.trips[0].loadingType === "Задняя");
check("round-trip trip stops", roundTrip.state.trips[0].stops.length === 2);
check("round-trip stop place", roundTrip.state.trips[0].stops[0].place === "Москва");
check("round-trip firm inn", roundTrip.state.refs.contractors[0].inn === "7700000000");
check("round-trip place firm", roundTrip.state.refs.places[0].firmId === "c1");
check("round-trip station", roundTrip.state.fuels[0].station === "Лукойл");
check("round-trip finance", roundTrip.state.finance[0].type === "income");
check(
  "round-trip unused category",
  roundTrip.state.refs.categories.some((item) => item.name === "Платные дороги")
);
check("round-trip settings from json", roundTrip.state.settings.theme === "dark");
check("round-trip chat from json", roundTrip.state.chat.length === 1);

/* ------------------------------------------------------------------ */
/* JSON-копия                                                          */
/* ------------------------------------------------------------------ */

const jsonCopy = await parseArchive(JSON.stringify(sampleState), "backup.json");
check("json source", jsonCopy.source === "json");
check("json trips", jsonCopy.summary.trips === 1);

/* ------------------------------------------------------------------ */
/* Архив в стиле оригинала: английские поля и запятая                  */
/* ------------------------------------------------------------------ */

const originalFiles = {
  "01-vehicles.csv":
    "id,name,brand,model,plate,vin,year,fuelNorm,type,notes\n" +
    "v1,Volvo FH 460,Volvo,FH 460,А123ВС77,YV2RT40A8MB123456,2021,31.4,Тягач,Основной",
  "02-companies.csv":
    "id,name,typicalCargoId,inn\n" +
    "c1,ООО Ромашка,g1,7700000000",
  "03-cargos.csv": "id,name\n" + "g1,Продукты",
  "04-places.csv":
    "id,name,companyId,typicalCargoId,loadingType,address,coordinates\n" +
    "p1,Москва,c1,g1,Задняя,Склад 1,55.75; 37.61\n" +
    "p2,Тула,c1,,Бортовая,Склад 2,",
  "06-waybills.csv":
    "id,number,departureDate,returnDate,vehicleId,odometerOut,odometerIn,fuelOut,fuelIn\n" +
    "w1,000001,2026-01-01,2026-01-02,v1,1000,1180,300,180",
  "07-trips.csv":
    "id,cargo,weightKg,loadingType,accrual,waybillId\n" +
    "t1,g1,18000,Задняя,18000,w1",
  "08-stops.csv":
    "id,tripId,placeId,type,date\n" +
    "stop1,t1,p1,loading,2026-01-01\n" +
    "stop2,t1,p2,unloading,2026-01-02",
  "09-gas-stations.csv": "id,name\n" + "s1,Лукойл",
  "10-fuels.csv":
    "id,date,gasStationId,fuelType,liters,odometer,vehicleId,waybillId\n" +
    "f1,2026-01-01,s1,ДТ,100,1000,v1,w1",
  "11-finances.csv":
    "id,date,type,category,amount,notes,tripId\n" +
    "fin1,2026-01-01,income,Доставка,18000,Оплата,t1",
};

const originalZip = buildZip(
  Object.entries(originalFiles).map(([name, data]) => ({ name, data }))
);
const original = await parseArchive(originalZip, "original.zip");
check("original source", original.source === "csv");
check("original vehicle", original.state.vehicles[0].brand === "Volvo");
check("original company cargo", original.state.refs.contractors[0].defaultCargo === "Продукты");
check("original place firm", original.state.refs.places[0].firmId === "c1");
check("original trip cargo by id", original.state.trips[0].cargo === "Продукты");
check("original trip from stop", original.state.trips[0].from === "Москва");
check("original trip to stop", original.state.trips[0].to === "Тула");
check("original waybill dates", original.state.waybills[0].validFrom === "2026-01-01");
check("original waybill fuelUsed", original.state.waybills[0].fuelUsed === 120);
check("original fuel station", original.state.fuels[0].station === "Лукойл");
check("original finance type", original.state.finance[0].type === "income");
check("original finance category", original.state.finance[0].category === "Доставка");

/* ------------------------------------------------------------------ */
/* CSV важнее JSON для таблиц, JSON — для настроек                     */
/* ------------------------------------------------------------------ */

const mergedZip = buildZip([
  {
    name: "01-vehicles.csv",
    data:
      "id,name,brand,model,plate,vin,year,fuelNorm,type,notes\n" +
      "v1,Volvo FH 460,Volvo,FH 460,ИЗМЕНЁН,YV2RT40A8MB123456,2021,31.4,Тягач,",
  },
  { name: "autoprofi.json", data: JSON.stringify({ ...sampleState, settings: { ...sampleState.settings, theme: "dark" } }) },
]);
const merged = await parseArchive(mergedZip, "merged.zip");
check("csv wins for tables", merged.state.vehicles[0].plate === "ИЗМЕНЁН");
check("json supplies settings", merged.state.settings.theme === "dark");
check(
  "json supplies unused categories",
  merged.state.refs.categories.some((item) => item.name === "Платные дороги")
);

/* ------------------------------------------------------------------ */
/* Deflate ZIP (как у большинства архиваторов)                         */
/* ------------------------------------------------------------------ */

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function deflatedZip(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBytes = enc.encode(name);
    const raw = enc.encode(text);
    const data = deflateRawSync(raw);
    const crc = crc32(raw);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 8, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x21, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 8, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    chunks.push(local, data);
    central.push(cd);
    offset += local.length + data.length;
  }
  const centralBytes = Buffer.concat(central);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, central.length, true);
  ev.setUint16(10, central.length, true);
  ev.setUint32(12, centralBytes.length, true);
  ev.setUint32(16, offset, true);
  return Buffer.concat([...chunks, centralBytes, end]);
}

const deflated = await parseArchive(
  deflatedZip({
    "01-vehicles.csv":
      "id,name,brand,model,plate,vin,year,fuelNorm,type,notes\n" +
      "v1,Volvo FH 460,Volvo,FH 460,А123ВС77,,2021,31.4,Тягач,",
  }),
  "deflated.zip"
);
check("deflated zip read", deflated.state.vehicles.length === 1);
check("deflated zip data", deflated.state.vehicles[0].plate === "А123ВС77");

/* ------------------------------------------------------------------ */

console.log("\n=== ARCHIVE ERRORS ===");
console.log(errors.length ? errors.join("\n") : "none");
process.exit(errors.length ? 1 : 0);
