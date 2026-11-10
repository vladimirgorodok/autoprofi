/* Архив данных: ZIP с CSV-таблицами и полной JSON-копией.
   Формат намеренно повторяет структуру данных оригинала: 01-vehicles.csv,
   02-companies.csv и т. д. Импорт понимает и такие архивы, и JSON-копии. */

import { APP_VERSION, DATA_VERSION } from "./version.js";
import { today, uid } from "./utils.js";

const FORMAT = "autoprofi-archive";
const FORMAT_VERSION = 1;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

const TABLE_FILES = [
  ["vehicles", "01-vehicles.csv"],
  ["companies", "02-companies.csv"],
  ["cargo", "03-cargos.csv"],
  ["places", "04-places.csv"],
  ["periods", "05-periods.csv"],
  ["waybills", "06-waybills.csv"],
  ["trips", "07-trips.csv"],
  ["stops", "08-stops.csv"],
  ["stations", "09-gas-stations.csv"],
  ["fuels", "10-fuels.csv"],
  ["finance", "11-finances.csv"],
];

const DEFAULT_STATIONS = [
  "Лукойл",
  "Газпромнефть",
  "Роснефть",
  "Татнефть",
  "Shell",
  "Нефтьмагистраль",
  "Другая",
];

const DEFAULT_CATEGORIES = [
  "Топливо",
  "Ремонт",
  "Платные дороги",
  "Штрафы",
  "Стоянка",
  "Мойка",
  "Прочее",
];

/* ------------------------------------------------------------------ */
/* Мелкие помощники                                                    */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, "0");
const asText = (v) => (v == null ? "" : String(v));
const clean = (v) => asText(v).trim();

function toNumber(value, fallback = 0) {
  const raw = clean(value).replace(/\s+/g, "").replace(",", ".");
  if (!raw) return fallback;
  const n = Number(raw.replace(/[^\d.+-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback = false) {
  const raw = clean(value).toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "y", "да", "истина", "on", "+"].includes(raw);
}

function toDate(value, fallback = "") {
  const raw = clean(value);
  if (!raw) return fallback;
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return fallback || raw;
}

function normKey(value) {
  return clean(value)
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, "");
}

function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row || {})) out[normKey(key)] = value;
  return out;
}

function pick(row, aliases) {
  for (const alias of aliases) {
    const value = row[normKey(alias)];
    if (value !== undefined && value !== null && clean(value) !== "") return value;
  }
  return "";
}

function basename(path) {
  return clean(path).replace(/\\/g, "/").split("/").pop() || "";
}

function decode(bytes) {
  return decoder.decode(bytes).replace(/^\uFEFF/, "");
}

function bytesOf(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (typeof input === "string") return encoder.encode(input);
  throw new Error("Не удалось прочитать файл");
}

function looksLikeZip(bytes) {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
  );
}

function looksLikeJson(bytes) {
  for (const byte of bytes.subarray(0, 8)) {
    if (byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0xef || byte === 0xbb || byte === 0xbf) {
      continue;
    }
    return byte === 0x7b || byte === 0x5b;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

export function parseCSV(input) {
  const src = asText(input).replace(/^\uFEFF/, "");
  if (!src) return [];

  let inQuotes = false;
  const counts = { ",": 0, ";": 0, "\t": 0 };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      if (inQuotes && src[i + 1] === '"') i++;
      else inQuotes = !inQuotes;
    } else if (!inQuotes && (ch === "\n" || ch === "\r")) {
      break;
    } else if (!inQuotes && counts[ch] !== undefined) {
      counts[ch]++;
    }
  }
  const delimiter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1]
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ",";

  const rows = [];
  let row = [];
  let field = "";
  inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  while (rows.length && rows[rows.length - 1].every((cell) => clean(cell) === "")) {
    rows.pop();
  }
  return rows;
}

export function parseCSVObjects(input) {
  const rows = parseCSV(input);
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((header) => clean(header));
  const objects = rows
    .slice(1)
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] ?? "";
      });
      return item;
    })
    .filter((row) => Object.values(row).some((value) => clean(value) !== ""));
  return { headers, rows: objects };
}

function csvText(headers, rows) {
  const cell = (value) => {
    const text = asText(value);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `\uFEFF${[headers.map(cell).join(";"), ...rows.map((row) => row.map(cell).join(";"))].join(
    "\n"
  )}`;
}

/* ------------------------------------------------------------------ */
/* ZIP                                                                 */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

export function buildZip(files) {
  const chunks = [];
  const central = [];
  const stamp = dosDateTime();
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = typeof file.data === "string" ? encoder.encode(file.data) : bytesOf(file.data);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, stamp.time, true);
    lv.setUint16(12, stamp.date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);

    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, stamp.time, true);
    cv.setUint16(14, stamp.date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cd.set(name, 46);

    chunks.push(local, data);
    central.push(cd);
    offset += local.length + data.length;
  }

  const centralBytes = concatBytes(central);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralBytes.length, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return concatBytes([...chunks, centralBytes, end]);
}

async function inflateRaw(data) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Этот браузер не умеет распаковывать ZIP. Обновите WebView или сохраните архив без сжатия.");
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readZip(input) {
  const bytes = bytesOf(input);
  let eocd = -1;
  const stop = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= stop; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Не найден конец ZIP-архива");

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  const entries = [];
  let pointer = cdOffset;

  for (let index = 0; index < count; index++) {
    if (view.getUint32(pointer, true) !== 0x02014b50) break;
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const uncompressedSize = view.getUint32(pointer + 24, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength));
    pointer += 46 + nameLength + extraLength + commentLength;

    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localOffset === 0xffffffff
    ) {
      throw new Error("ZIP64 пока не поддерживается");
    }
    if (view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error("Повреждён ZIP-архив");
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);
    let data;
    if (method === 0) data = raw;
    else if (method === 8) data = await inflateRaw(raw);
    else throw new Error(`ZIP-сжатие методом ${method} не поддерживается`);

    entries.push({ name, data });
  }

  return entries;
}

/* ------------------------------------------------------------------ */
/* Экспорт                                                             */
/* ------------------------------------------------------------------ */

function cargoIdByName(state, name) {
  if (!name) return "";
  const item = (state.refs.cargo || []).find(
    (cargo) => cargo.name.toLowerCase() === String(name).toLowerCase()
  );
  return item?.id || "";
}

function firmName(state, id) {
  const item = (state.refs.contractors || []).find((firm) => firm.id === id);
  return item?.name || "";
}

function stationIdByName(state, name) {
  if (!name) return "";
  const item = (state.refs.stations || []).find(
    (station) => station.name.toLowerCase() === String(name).toLowerCase()
  );
  return item?.id || "";
}

export function buildArchive(state) {
  const files = [];
  const add = (name, data) => files.push({ name, data });
  const counts = {
    vehicles: state.vehicles.length,
    waybills: state.waybills.length,
    trips: state.trips.length,
    fuels: state.fuels.length,
    finance: state.finance.length,
    refs: Object.values(state.refs || {}).reduce(
      (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
      0
    ),
  };
  const manifest = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    app: "АвтоПрофи",
    appVersion: APP_VERSION,
    dataVersion: state.version || DATA_VERSION,
    exportedAt: new Date().toISOString(),
    delimiter: ";",
    encoding: "UTF-8",
    counts,
    files: TABLE_FILES.map(([, file]) => file),
  };

  add("manifest.json", JSON.stringify(manifest, null, 2));
  add(
    "README.txt",
    [
      "АвтоПрофи — архив данных",
      `Экспортирован: ${new Date().toLocaleString("ru-RU")}`,
      `Версия приложения: ${APP_VERSION}`,
      "",
      "Состав архива:",
      ...TABLE_FILES.map(([, file]) => `  ${file}`),
      "  autoprofi.json — полная служебная копия",
      "  manifest.json — описание архива",
      "",
      "CSV-файлы разделены точкой с запятой, кодировка UTF-8 с BOM.",
      "Импорт: Настройки → Данные → Импортировать архив. Поддерживается ZIP и JSON.",
      "",
    ].join("\n")
  );
  add("autoprofi.json", JSON.stringify(state, null, 2));

  add(
    "01-vehicles.csv",
    csvText(
      [
        "id",
        "name",
        "brand",
        "model",
        "plate",
        "vin",
        "year",
        "fuelNorm",
        "type",
        "notes",
        "trailer",
        "odometer",
        "nextService",
        "insurance",
        "consumption",
        "fuel",
        "tank",
        "color",
        "active",
      ],
      state.vehicles.map((v) => [
        v.id,
        `${v.brand || ""} ${v.model || ""}`.trim(),
        v.brand,
        v.model,
        v.plate,
        v.vin,
        v.year,
        v.consumption,
        v.type,
        v.note,
        v.trailer,
        v.odometer,
        v.nextService,
        v.insurance,
        v.consumption,
        v.fuel,
        v.tank,
        v.color,
        v.active ? 1 : 0,
      ])
    )
  );

  add(
    "02-companies.csv",
    csvText(
      [
        "id",
        "name",
        "type",
        "inn",
        "kpp",
        "ogrn",
        "legalAddress",
        "actualAddress",
        "phone",
        "email",
        "contact",
        "typicalCargoId",
        "typicalCargo",
        "notes",
      ],
      (state.refs.contractors || []).map((firm) => [
        firm.id,
        firm.name,
        firm.type,
        firm.inn,
        firm.kpp,
        firm.ogrn,
        firm.legalAddress,
        firm.actualAddress,
        firm.phone,
        firm.email,
        firm.contact,
        cargoIdByName(state, firm.defaultCargo),
        firm.defaultCargo,
        firm.note,
      ])
    )
  );

  add(
    "03-cargos.csv",
    csvText(
      ["id", "name", "notes"],
      (state.refs.cargo || []).map((cargo) => [cargo.id, cargo.name, cargo.note])
    )
  );

  add(
    "04-places.csv",
    csvText(
      [
        "id",
        "name",
        "contact",
        "coordinates",
        "address",
        "loadingType",
        "notes",
        "companyId",
        "company",
        "typicalCargoId",
        "typicalCargo",
        "phone",
      ],
      (state.refs.places || []).map((place) => [
        place.id,
        place.name,
        place.contact,
        place.coordinates,
        place.address,
        place.loadingType,
        place.note,
        place.firmId,
        firmName(state, place.firmId),
        cargoIdByName(state, place.defaultCargo),
        place.defaultCargo,
        place.phone,
      ])
    )
  );

  add(
    "05-periods.csv",
    csvText(
      ["id", "name", "startDate", "endDate", "vehicleId"],
      state.waybills.map((w) => [
        w.id,
        `${w.series || "АП"}-${w.number || ""}`,
        w.validFrom,
        w.validTo,
        w.vehicleId,
      ])
    )
  );

  add(
    "06-waybills.csv",
    csvText(
      [
        "id",
        "number",
        "series",
        "status",
        "issuedAt",
        "departureDate",
        "returnDate",
        "validFrom",
        "validTo",
        "vehicleId",
        "trailerId",
        "fromCity",
        "fromAddr",
        "toCity",
        "toAddr",
        "cargo",
        "distance",
        "kmDone",
        "odometerOut",
        "odometerIn",
        "fuelOut",
        "fuelIn",
        "fuelIssued",
        "fuelUsed",
        "notes",
      ],
      state.waybills.map((w) => [
        w.id,
        w.number,
        w.series,
        w.status,
        w.issuedAt,
        w.validFrom,
        w.validTo,
        w.validFrom,
        w.validTo,
        w.vehicleId,
        w.trailerId,
        w.fromCity,
        w.fromAddr,
        w.toCity,
        w.toAddr,
        w.cargo,
        w.distance,
        w.kmDone,
        w.odometerOut,
        w.odometerIn,
        w.fuelOut,
        w.fuelIn,
        w.fuelIssued,
        w.fuelUsed,
        w.note,
      ])
    )
  );

  add(
    "07-trips.csv",
    csvText(
      [
        "id",
        "date",
        "from",
        "to",
        "cargo",
        "weightKg",
        "loadingType",
        "distance",
        "rate",
        "accrual",
        "status",
        "waybillId",
        "notes",
      ],
      state.trips.map((trip) => [
        trip.id,
        trip.date,
        trip.from,
        trip.to,
        trip.cargo,
        trip.weightKg,
        trip.loadingType,
        trip.distance,
        trip.rate,
        trip.amount,
        trip.status,
        trip.waybillId,
        trip.note,
      ])
    )
  );

  const stopRows = [];
  for (const trip of state.trips) {
    for (const stop of trip.stops || []) {
      stopRows.push([
        stop.id,
        trip.id,
        stop.placeId,
        stop.place,
        stop.type,
        stop.address,
        stop.at,
        stop.note,
      ]);
    }
  }
  add(
    "08-stops.csv",
    csvText(
      ["id", "tripId", "placeId", "place", "type", "address", "date", "notes"],
      stopRows
    )
  );

  add(
    "09-gas-stations.csv",
    csvText(
      ["id", "name", "notes"],
      (state.refs.stations || []).map((station) => [station.id, station.name, station.note])
    )
  );

  add(
    "10-fuels.csv",
    csvText(
      [
        "id",
        "date",
        "gasStationId",
        "gasStation",
        "fuelType",
        "liters",
        "odometer",
        "vehicleId",
        "waybillId",
        "full",
      ],
      state.fuels.map((fuel) => [
        fuel.id,
        fuel.date,
        stationIdByName(state, fuel.station),
        fuel.station,
        fuel.fuelType,
        fuel.liters,
        fuel.odometer,
        fuel.vehicleId,
        fuel.waybillId,
        fuel.full ? 1 : 0,
      ])
    )
  );

  add(
    "11-finances.csv",
    csvText(
      ["id", "date", "type", "category", "amount", "method", "notes", "tripId"],
      state.finance.map((item) => [
        item.id,
        item.date,
        item.type,
        item.category,
        item.amount,
        item.method,
        item.note,
        item.tripId,
      ])
    )
  );

  return buildZip(files);
}

/* ------------------------------------------------------------------ */
/* Импорт                                                              */
/* ------------------------------------------------------------------ */

function detectTable(file, headers) {
  const name = normKey(
    basename(file)
      .replace(/\.csv$/i, "")
      .replace(/^\d+[-_. ]*/, "")
  );
  if (name.includes("vehicle") || name.includes("авто") || name.includes("машин")) return "vehicles";
  if (name.includes("compan") || name.includes("фирм") || name.includes("контрагент")) return "companies";
  if (name.includes("cargo") || name.includes("груз")) return "cargo";
  if (name.includes("place") || name.includes("мест")) return "places";
  if (name.includes("period") || name.includes("период")) return "periods";
  if (name.includes("waybill") || name.includes("путев")) return "waybills";
  if (name.includes("trip") || name.includes("рейс") || name.includes("поезд")) return "trips";
  if (name.includes("stop") || name.includes("останов")) return "stops";
  if (name.includes("gasstation") || name.includes("station") || name.includes("азс")) return "stations";
  if (name.includes("fuel") || name.includes("заправ")) return "fuels";
  if (name.includes("financ") || name.includes("финанс")) return "finance";

  const keys = new Set(headers.map(normKey));
  if (keys.has("brand") || keys.has("vin") || keys.has("plate")) return "vehicles";
  if (keys.has("inn") || keys.has("kpp") || keys.has("ogrn")) return "companies";
  if (keys.has("odometerout") || keys.has("odometerin") || keys.has("fuelout")) return "waybills";
  if (keys.has("accrual") || keys.has("weightkg")) return "trips";
  if (keys.has("gasstationid") || keys.has("liters")) return "fuels";
  if (keys.has("category") || (keys.has("amount") && keys.has("type"))) return "finance";
  if (keys.has("placeid") && keys.has("tripid")) return "stops";
  if (keys.has("coordinates") || keys.has("loadingtype")) return "places";
  if (keys.has("typicalcargoid") && keys.has("name")) return "cargo";
  return null;
}

function mapWaybillStatus(value) {
  const raw = normKey(value);
  if (["draft", "черновик", "новый"].includes(raw)) return "draft";
  if (["issued", "выдан"].includes(raw)) return "issued";
  if (["active", "вработе", "открыт", "впути"].includes(raw)) return "active";
  if (["closed", "закрыт", "завершен", "завершён", "оплачен"].includes(raw)) return "closed";
  return "";
}

function mapTripStatus(value) {
  const raw = normKey(value);
  if (["planned", "запланирован", "план", "новый"].includes(raw)) return "planned";
  if (["active", "впути", "вработе", "начат"].includes(raw)) return "active";
  if (["done", "завершен", "завершён", "выполнен"].includes(raw)) return "done";
  if (["paid", "оплачен", "оплачено"].includes(raw)) return "paid";
  return "";
}

function mapStopType(value) {
  const raw = normKey(value);
  if (["loading", "load", "погрузка", "загрузка"].includes(raw)) return "Погрузка";
  if (["unloading", "unload", "выгрузка", "разгрузка"].includes(raw)) return "Выгрузка";
  return "Остановка";
}

function mapMethod(value) {
  const raw = normKey(value);
  return ["card", "карта", "безнал", "безналичный"].includes(raw) ? "card" : "cash";
}

function makeId(raw, prefix, used) {
  let id = clean(raw) || uid(prefix);
  if (used.has(id)) id = uid(prefix);
  used.add(id);
  return id;
}

function addRef(list, byId, byName, item) {
  const key = item.name.toLowerCase();
  const existing = byName.get(key);
  if (existing) {
    byId.set(item.id, existing);
    return existing;
  }
  byId.set(item.id, item);
  byName.set(key, item);
  list.push(item);
  return item;
}

function buildStateFromTables(tables) {
  const rows = (kind) => tables[kind]?.rows || [];
  const now = new Date().toISOString();
  const state = {
    version: DATA_VERSION,
    createdAt: now,
    vehicles: [],
    waybills: [],
    trips: [],
    fuels: [],
    finance: [],
    refs: {
      contractors: [],
      places: [],
      cargo: [],
      categories: [],
      stations: [],
    },
    settings: {
      theme: "light",
      ai: { endpoint: "https://api.openai.com/v1", key: "", model: "gpt-4o-mini" },
      lastSync: Date.now(),
      cloudBackup: false,
    },
    chat: [],
  };

  /* Грузы */
  const cargoIds = new Set();
  const cargoById = new Map();
  const cargoByName = new Map();
  for (const raw of rows("cargo")) {
    const row = normalizeRow(raw);
    const name = clean(pick(row, ["name", "название", "наименование"]));
    if (!name) continue;
    const id = makeId(pick(row, ["id", "ид", "код"]), "g", cargoIds);
    addRef(
      state.refs.cargo,
      cargoById,
      cargoByName,
      { id, name, note: clean(pick(row, ["notes", "note", "примечание", "комментарий"])) }
    );
  }

  const cargoName = (idValue, nameValue) => {
    const byId = cargoById.get(clean(idValue)) || cargoById.get(clean(nameValue));
    if (byId) return byId.name;
    const byName = cargoByName.get(clean(nameValue).toLowerCase());
    return byName?.name || clean(nameValue);
  };

  /* Фирмы */
  const companyIds = new Set();
  const companyById = new Map();
  const companyByName = new Map();
  for (const raw of rows("companies")) {
    const row = normalizeRow(raw);
    const name = clean(pick(row, ["name", "название", "наименование", "фирма"]));
    if (!name) continue;
    const id = makeId(pick(row, ["id", "ид", "код"]), "c", companyIds);
    addRef(state.refs.contractors, companyById, companyByName, {
      id,
      name,
      type: clean(pick(row, ["type", "тип"])) || "ООО",
      inn: clean(pick(row, ["inn", "инн"])),
      kpp: clean(pick(row, ["kpp", "кпп"])),
      ogrn: clean(pick(row, ["ogrn", "огрн", "огрнип"])),
      legalAddress: clean(pick(row, ["legalAddress", "юридическийадрес"])),
      actualAddress: clean(pick(row, ["actualAddress", "фактическийадрес"])),
      phone: clean(pick(row, ["phone", "телефон"])),
      email: clean(pick(row, ["email", "почта"])),
      contact: clean(pick(row, ["contact", "контакт", "контактноелицо"])),
      defaultCargo: cargoName(
        pick(row, ["typicalCargoId", "типовойгрузид", "cargoid"]),
        pick(row, ["typicalCargo", "типовойгруз", "cargo", "груз"])
      ),
      note: clean(pick(row, ["notes", "note", "примечание", "комментарий"])),
    });
  }

  /* Автомобили */
  const vehicleIds = new Set();
  for (const raw of rows("vehicles")) {
    const row = normalizeRow(raw);
    const name = clean(pick(row, ["name", "название", "наименование"]));
    let brand = clean(pick(row, ["brand", "марка"]));
    let model = clean(pick(row, ["model", "модель"]));
    if (!brand && name) {
      brand = name;
      if (!model) model = "";
    }
    if (!brand && !model) continue;
    const id = makeId(pick(row, ["id", "ид", "код"]), "v", vehicleIds);
    const activeRaw = pick(row, ["active", "основной"]);
    state.vehicles.push({
      id,
      brand: brand || name,
      model,
      plate: clean(pick(row, ["plate", "госномер", "номер", "номернойзнак"])),
      trailer: clean(pick(row, ["trailer", "прицеп"])),
      vin: clean(pick(row, ["vin", "вин"])),
      year: toNumber(pick(row, ["year", "год", "годвыпуска"]), null),
      odometer: toNumber(pick(row, ["odometer", "пробег"]), 0),
      nextService: toNumber(pick(row, ["nextService", "следующеето", "то"]), 0),
      insurance: toDate(pick(row, ["insurance", "осаго", "страховка"]), ""),
      consumption: toNumber(
        pick(row, ["fuelNorm", "нормарасхода", "consumption", "расход"]),
        0
      ),
      fuel: clean(pick(row, ["fuel", "топливо"])) || "ДТ",
      tank: toNumber(pick(row, ["tank", "бак"]), 0),
      color: clean(pick(row, ["color", "цвет"])) || "teal",
      type: clean(pick(row, ["type", "тип"])),
      note: clean(pick(row, ["notes", "note", "примечание", "комментарий"])),
      active: activeRaw === "" ? state.vehicles.length === 0 : toBool(activeRaw, false),
    });
  }
  if (state.vehicles.length && !state.vehicles.some((vehicle) => vehicle.active)) {
    state.vehicles[0].active = true;
  }

  /* Места */
  const placeIds = new Set();
  const placeById = new Map();
  const placeByName = new Map();
  for (const raw of rows("places")) {
    const row = normalizeRow(raw);
    const name = clean(pick(row, ["name", "название", "место"]));
    const address = clean(pick(row, ["address", "адрес", "полныйадрес"]));
    if (!name && !address) continue;
    const id = makeId(pick(row, ["id", "ид", "код"]), "p", placeIds);
    const companyId = clean(pick(row, ["companyId", "фирмаид", "контрагентид", "firmid"]));
    const companyName = clean(pick(row, ["company", "фирма", "контрагент"]));
    let firmId = companyById.get(companyId)?.id || companyByName.get(companyName.toLowerCase())?.id || "";
    if (!firmId && companyName) {
      const cid = makeId("", "c", companyIds);
      const firm = addRef(state.refs.contractors, companyById, companyByName, {
        id: cid,
        name: companyName,
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
      });
      firmId = firm.id;
    }
    addRef(state.refs.places, placeById, placeByName, {
      id,
      name: name || address,
      firmId,
      address,
      contact: clean(pick(row, ["contact", "контакт", "контактноелицо"])),
      phone: clean(pick(row, ["phone", "телефон"])),
      coordinates: clean(pick(row, ["coordinates", "координаты", "coords"])),
      loadingType: clean(pick(row, ["loadingType", "типзагрузки"])) || "Задняя",
      defaultCargo: cargoName(
        pick(row, ["typicalCargoId", "типовойгрузид", "cargoid"]),
        pick(row, ["typicalCargo", "типовойгруз", "cargo", "груз"])
      ),
      note: clean(pick(row, ["notes", "note", "примечание", "комментарий"])),
    });
  }

  /* Периоды — используются, если в путевых листах нет дат. */
  const periodById = new Map();
  for (const raw of rows("periods")) {
    const row = normalizeRow(raw);
    const id = clean(pick(row, ["id", "ид", "код"]));
    if (!id) continue;
    periodById.set(id, {
      id,
      name: clean(pick(row, ["name", "название", "наименование"])),
      startDate: toDate(
        pick(row, ["startDate", "dateFrom", "start", "from", "датаначала"]),
        ""
      ),
      endDate: toDate(pick(row, ["endDate", "dateTo", "end", "to", "датаокончания"]), ""),
      vehicleId: clean(pick(row, ["vehicleId", "автоид", "автомобильид"])),
    });
  }

  /* Путевые листы */
  const waybillIds = new Set();
  const waybillById = new Map();
  const vehicleIdSet = new Set(state.vehicles.map((vehicle) => vehicle.id));
  for (const raw of rows("waybills")) {
    const row = normalizeRow(raw);
    const id = makeId(pick(row, ["id", "ид", "код"]), "w", waybillIds);
    const period = periodById.get(clean(pick(row, ["periodId", "периодид"])));
    let validFrom = toDate(
      pick(row, [
        "validFrom",
        "departureDate",
        "dateFrom",
        "startDate",
        "date",
        "датавыезда",
        "датаначала",
      ]),
      ""
    );
    let validTo = toDate(
      pick(row, ["validTo", "returnDate", "dateTo", "endDate", "датавозврата", "датаокончания"]),
      ""
    );
    if (!validFrom && period) validFrom = period.startDate;
    if (!validTo && period) validTo = period.endDate;
    if (!validFrom) validFrom = today();
    if (!validTo) validTo = validFrom;

    const vehicleId = clean(pick(row, ["vehicleId", "автоид", "автомобильид"]));
    const odometerOut = toNumber(pick(row, ["odometerOut", "одометрвыезд", "одометрнавыезде"]), 0);
    const odometerIn = toNumber(pick(row, ["odometerIn", "одометрвозврат", "одометрнавозврате"]), 0);
    const fuelOut = toNumber(pick(row, ["fuelOut", "топливовыезд", "топливонавыезде"]), 0);
    const fuelIn = toNumber(pick(row, ["fuelIn", "топливовозврат", "топливонавозврате"]), 0);
    let fuelUsed = toNumber(pick(row, ["fuelUsed", "топливоизрасходовано"]), 0);
    if (!fuelUsed && fuelOut > 0 && fuelIn > 0 && fuelOut >= fuelIn) fuelUsed = fuelOut - fuelIn;
    const distance = toNumber(pick(row, ["distance", "расстояние"]), 0);
    let kmDone = toNumber(pick(row, ["kmDone", "пройдено", "пробег"]), 0);
    if (!kmDone && odometerIn > odometerOut) kmDone = odometerIn - odometerOut;

    let status = mapWaybillStatus(pick(row, ["status", "статус"]));
    if (!status) {
      status = odometerIn > 0 || (validTo && validTo < today()) ? "closed" : validFrom > today() ? "draft" : "active";
    }

    const item = {
      id,
      number: clean(pick(row, ["number", "номер"])) || String(waybillById.size + 1).padStart(6, "0"),
      series: clean(pick(row, ["series", "серия"])) || "АП",
      status,
      issuedAt: toDate(pick(row, ["issuedAt", "датавыдачи"]), validFrom),
      validFrom,
      validTo,
      vehicleId: vehicleIdSet.has(vehicleId) ? vehicleId : null,
      trailerId: clean(pick(row, ["trailerId", "прицепид"])),
      fromCity: clean(pick(row, ["fromCity", "откуда", "городотправления"])),
      fromAddr: clean(pick(row, ["fromAddr", "адресзагрузки"])),
      toCity: clean(pick(row, ["toCity", "куда", "городназначения"])),
      toAddr: clean(pick(row, ["toAddr", "адресвыгрузки"])),
      cargo: cargoName(pick(row, ["cargoId", "грузид"]), pick(row, ["cargo", "груз"])),
      distance,
      kmDone,
      odometerOut,
      odometerIn: odometerIn || null,
      fuelOut,
      fuelIn,
      fuelIssued: toNumber(pick(row, ["fuelIssued", "топливовыдано"]), 0),
      fuelUsed,
      note: clean(pick(row, ["notes", "note", "примечание", "комментарий"])),
    };
    waybillById.set(id, item);
    state.waybills.push(item);
  }

  /* Остановки */
  const stopsByTrip = new Map();
  for (const raw of rows("stops")) {
    const row = normalizeRow(raw);
    const tripId = clean(pick(row, ["tripId", "рейсид"]));
    if (!tripId) continue;
    const placeId = clean(pick(row, ["placeId", "местоид"]));
    const place = placeById.get(placeId) || placeByName.get(clean(pick(row, ["place", "место", "название"])).toLowerCase());
    const stop = {
      id: clean(pick(row, ["id", "ид", "код"])) || uid("stop"),
      placeId: place?.id || placeId,
      place: place?.name || clean(pick(row, ["place", "место", "название"])),
      type: mapStopType(pick(row, ["type", "тип"])),
      address: place?.address || clean(pick(row, ["address", "адрес"])),
      at: toDate(pick(row, ["date", "дата", "time", "время"]), ""),
      note: clean(pick(row, ["notes", "note", "примечание", "комментарий"])),
    };
    if (!stopsByTrip.has(tripId)) stopsByTrip.set(tripId, []);
    stopsByTrip.get(tripId).push(stop);
  }

  /* Рейсы */
  const tripIds = new Set();
  const tripById = new Map();
  for (const raw of rows("trips")) {
    const row = normalizeRow(raw);
    const id = makeId(pick(row, ["id", "ид", "код"]), "t", tripIds);
    const waybillId = clean(pick(row, ["waybillId", "путевойлистид", "листид"]));
    const wb = waybillById.get(waybillId);
    const stops = stopsByTrip.get(id) || [];
    let from = clean(pick(row, ["from", "откуда", "fromCity", "городотправления"]));
    let to = clean(pick(row, ["to", "куда", "toCity", "городназначения"]));
    if (!from && stops.length) from = stops[0].place;
    if (!to && stops.length) to = stops[stops.length - 1].place;
    if (!from && wb) from = wb.fromCity;
    if (!to && wb) to = wb.toCity;

    const distance = toNumber(pick(row, ["distance", "расстояние"]), wb?.distance || 0);
    const rate = toNumber(pick(row, ["rate", "ставка"]), 0);
    let amount = toNumber(pick(row, ["accrual", "начисление", "amount", "сумма", "стоимость"]), 0);
    if (!amount && rate && distance) amount = Math.round(rate * distance);

    const item = {
      id,
      date: toDate(pick(row, ["date", "дата"]), wb?.validFrom || today()),
      from: from || "Не указано",
      to: to || "Не указано",
      cargo: cargoName(pick(row, ["cargoId", "грузид"]), pick(row, ["cargo", "груз"])),
      weightKg: toNumber(pick(row, ["weightKg", "вес", "вескг", "масса"]), 0),
      loadingType: clean(pick(row, ["loadingType", "типзагрузки"])),
      distance,
      rate,
      amount,
      status: mapTripStatus(pick(row, ["status", "статус"])) || "planned",
      waybillId: wb?.id || null,
      note: clean(pick(row, ["notes", "note", "примечание", "комментарий"])),
      stops,
    };
    tripById.set(id, item);
    state.trips.push(item);
  }

  /* АЗС */
  const stationIds = new Set();
  const stationById = new Map();
  const stationByName = new Map();
  for (const raw of rows("stations")) {
    const row = normalizeRow(raw);
    const name = clean(pick(row, ["name", "название", "наименование", "азс"]));
    if (!name) continue;
    const id = makeId(pick(row, ["id", "ид", "код"]), "s", stationIds);
    addRef(state.refs.stations, stationById, stationByName, {
      id,
      name,
      note: clean(pick(row, ["notes", "note", "примечание", "комментарий"])),
    });
  }

  /* Заправки */
  const fuelIds = new Set();
  for (const raw of rows("fuels")) {
    const row = normalizeRow(raw);
    const id = makeId(pick(row, ["id", "ид", "код"]), "f", fuelIds);
    const stationId = clean(pick(row, ["gasStationId", "азсид", "stationid"]));
    const station = stationById.get(stationId);
    const stationName = station?.name || clean(pick(row, ["gasStation", "азс", "station"])) || "Другая";
    const vehicleId = clean(pick(row, ["vehicleId", "автоид", "автомобильид"]));
    const waybillId = clean(pick(row, ["waybillId", "путевойлистид", "листид"]));
    state.fuels.push({
      id,
      date: toDate(pick(row, ["date", "дата"]), today()),
      station: stationName,
      fuelType: clean(pick(row, ["fuelType", "топливо", "видтоплива"])) || "ДТ",
      liters: toNumber(pick(row, ["liters", "литры", "количество", "объем"]), 0),
      odometer: toNumber(pick(row, ["odometer", "одометр", "пробег"]), 0),
      vehicleId: vehicleIdSet.has(vehicleId) ? vehicleId : null,
      waybillId: waybillById.has(waybillId) ? waybillId : null,
      full: toBool(pick(row, ["full", "полныйбак"]), false),
    });
  }

  if (!state.refs.stations.length) {
    for (const name of DEFAULT_STATIONS) {
      const id = makeId("", "s", stationIds);
      addRef(state.refs.stations, stationById, stationByName, { id, name, note: "" });
    }
  }
  for (const fuel of state.fuels) {
    if (!stationByName.has(fuel.station.toLowerCase())) {
      const id = makeId("", "s", stationIds);
      addRef(state.refs.stations, stationById, stationByName, {
        id,
        name: fuel.station,
        note: "",
      });
    }
  }

  /* Финансы */
  const financeIds = new Set();
  const categoryIds = new Set();
  const categoryById = new Map();
  const categoryByName = new Map();
  for (const raw of rows("finance")) {
    const row = normalizeRow(raw);
    const id = makeId(pick(row, ["id", "ид", "код"]), "fin", financeIds);
    const typeRaw = normKey(pick(row, ["type", "тип"]));
    const rawAmount = toNumber(pick(row, ["amount", "сумма", "начисление"]), 0);
    const type =
      ["income", "доход", "приход", "поступление", "оплата"].some((word) => typeRaw.includes(word)) ||
      (!typeRaw && rawAmount > 0 && clean(pick(row, ["tripId", "рейсид"])))
        ? "income"
        : "expense";
    const amount = Math.abs(rawAmount);
    if (!amount) continue;
    const category =
      clean(pick(row, ["category", "категория", "статья"])) || (type === "income" ? "Прочее" : "Прочее");
    const tripId = clean(pick(row, ["tripId", "рейсид"]));
    state.finance.push({
      id,
      date: toDate(pick(row, ["date", "дата"]), today()),
      type,
      category,
      amount,
      note: clean(pick(row, ["notes", "note", "примечание", "комментарий"])),
      method: mapMethod(pick(row, ["method", "способ"])),
      tripId: tripById.has(tripId) ? tripId : null,
    });
  }

  if (!state.refs.categories.length) {
    for (const name of DEFAULT_CATEGORIES) {
      const id = makeId("", "k", categoryIds);
      addRef(state.refs.categories, categoryById, categoryByName, { id, name, note: "" });
    }
  }
  for (const item of state.finance) {
    if (!categoryByName.has(item.category.toLowerCase())) {
      const id = makeId("", "k", categoryIds);
      addRef(state.refs.categories, categoryById, categoryByName, {
        id,
        name: item.category,
        note: "",
      });
    }
  }

  return state;
}

function mergeJsonCategories(state, jsonState) {
  const list = jsonState?.refs?.categories;
  if (!Array.isArray(list) || !list.length) return;
  const seen = new Set(state.refs.categories.map((item) => item.name.toLowerCase()));
  for (const item of list) {
    const name = clean(item?.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    state.refs.categories.push({
      id: clean(item.id) || uid("k"),
      name,
      note: clean(item.note),
    });
  }
}

function summarizeState(state) {
  const refs = Object.values(state.refs || {}).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0
  );
  return {
    vehicles: Array.isArray(state.vehicles) ? state.vehicles.length : 0,
    waybills: Array.isArray(state.waybills) ? state.waybills.length : 0,
    trips: Array.isArray(state.trips) ? state.trips.length : 0,
    fuels: Array.isArray(state.fuels) ? state.fuels.length : 0,
    finance: Array.isArray(state.finance) ? state.finance.length : 0,
    refs,
  };
}

export async function parseArchive(input, filename = "") {
  const bytes = bytesOf(input);
  const lowerName = clean(filename).toLowerCase();

  if (lowerName.endsWith(".json") || (!looksLikeZip(bytes) && looksLikeJson(bytes))) {
    const parsed = JSON.parse(decode(bytes));
    const state = parsed?.state && parsed.state.trips ? parsed.state : parsed;
    if (!state || typeof state !== "object") {
      throw new Error("JSON-файл не содержит данных АвтоПрофи");
    }
    if (!state.version) state.version = DATA_VERSION;
    return { state, source: "json", summary: summarizeState(state), warnings: [] };
  }

  if (!looksLikeZip(bytes)) {
    throw new Error("Файл не похож на ZIP-архив или JSON-копию");
  }

  const entries = await readZip(bytes);
  const files = new Map();
  for (const entry of entries) {
    const base = basename(entry.name);
    if (!base || base.startsWith(".") || base.startsWith("__MACOSX")) continue;
    files.set(base.toLowerCase(), entry);
  }

  let jsonState = null;
  const jsonEntry = files.get("autoprofi.json") || files.get("backup.json");
  if (jsonEntry) {
    try {
      jsonState = JSON.parse(decode(jsonEntry.data));
    } catch {
      jsonState = null;
    }
  }

  const tables = {};
  for (const [base, entry] of files) {
    if (!base.endsWith(".csv")) continue;
    const parsed = parseCSVObjects(decode(entry.data));
    if (!parsed.rows.length) continue;
    const kind = detectTable(base, parsed.headers);
    if (kind) tables[kind] = parsed;
  }

  if (Object.keys(tables).length) {
    const state = buildStateFromTables(tables);
    if (jsonState && typeof jsonState === "object") {
      if (jsonState.settings && typeof jsonState.settings === "object") {
        state.settings = { ...state.settings, ...jsonState.settings };
      }
      if (Array.isArray(jsonState.chat)) state.chat = jsonState.chat;
      if (jsonState.createdAt) state.createdAt = jsonState.createdAt;
      // Статьи расходов не выгружаются отдельной CSV-таблицей, поэтому
      // неиспользуемые статьи восстанавливаем из JSON-копии.
      mergeJsonCategories(state, jsonState);
    }
    return { state, source: "csv", summary: summarizeState(state), warnings: [] };
  }

  if (jsonState && typeof jsonState === "object") {
    if (!jsonState.version) jsonState.version = DATA_VERSION;
    return { state: jsonState, source: "json", summary: summarizeState(jsonState), warnings: [] };
  }

  throw new Error("В архиве не найдены CSV-таблицы или файл autoprofi.json");
}
