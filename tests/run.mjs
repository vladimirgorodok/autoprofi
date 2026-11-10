import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const WEB = path.join(ROOT, "web");
const OUT = path.join(os.tmpdir(), `autoprofi-test-${process.pid}.js`);

await build({
  entryPoints: [path.join(WEB, "js/app.js")],
  bundle: true,
  format: "iife",
  outfile: OUT,
  logLevel: "silent",
});

const html = fs.readFileSync(path.join(WEB, "index.html"), "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
const bundle = fs.readFileSync(OUT, "utf8");

const errors = [];
const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
window.scrollTo = () => {};
window.print = () => { window.__printed = true; };
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
window.URL.createObjectURL = () => 'blob:x';
window.URL.revokeObjectURL = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.addEventListener('error', (e) => errors.push('window error: ' + e.message));
const origError = console.error;
console.error = (...a) => { errors.push('[console.error] ' + a.map(String).join(' ')); origError(...a); };
window.eval(bundle);
const doc = window.document;
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));

function state() { return JSON.parse(window.localStorage.getItem('autoprofi.state.v1')); }
function click(sel) {
  const el = typeof sel === 'string' ? doc.querySelector(sel) : sel;
  if (!el) throw new Error('no element ' + sel);
  el.click();
  return el;
}
function setVal(sel, val) {
  const el = doc.querySelector(sel);
  if (!el) throw new Error('no input ' + sel);
  el.value = val;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
  return el;
}
function route(r) {
  window.location.hash = '#/' + r;
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));
}
function check(name, cond, extra = '') {
  console.log((cond ? 'OK  ' : 'FAIL') + ' ' + name + (cond ? '' : ' — ' + extra));
  if (!cond) errors.push('check failed: ' + name + ' ' + extra);
}

(async () => {
  await tick(80);
  // ensure seed is persisted
  route('settings');
  await tick();
  click('[data-action="theme"][data-value="light"]');
  await tick();

  // --- Trips: create
  route('trips');
  await tick();
  const beforeTrips = state().trips.length;
  click('#screen-action [data-action="new"]');
  await tick();
  setVal('[data-trip-form] [name="from"]', 'Москва');
  setVal('[data-trip-form] [name="to"]', 'Тула');
  setVal('[data-trip-form] [name="distance"]', '180');
  setVal('[data-trip-form] [name="rate"]', '55');
  click('[data-trip-save]');
  await tick();
  check('trip created', state().trips.length === beforeTrips + 1, `len=${state().trips.length}`);
  check('trip amount auto', state().trips[0].amount === 9900, 'amount=' + state().trips[0].amount);
  check('trip modal closed', !doc.querySelector('.modal-backdrop'));

  // --- Trips: status to paid creates income
  const newTrip = state().trips[0];
  route('trips');
  await tick();
  click(`[data-action="open"][data-id="${newTrip.id}"]`);
  await tick();
  // status planned => start
  click('[data-trip-next="active"]');
  await tick();
  click(`[data-action="open"][data-id="${newTrip.id}"]`);
  await tick();
  click('[data-trip-next="done"]');
  await tick();
  click(`[data-action="open"][data-id="${newTrip.id}"]`);
  await tick();
  const incBefore = state().finance.filter(f => f.tripId === newTrip.id).length;
  click('[data-trip-next="paid"]');
  await tick();
  check('trip paid income', state().finance.filter(f => f.tripId === newTrip.id).length === incBefore + 1);

  // --- Fuels: create (без цены и без авто-расхода)
  route('fuels');
  await tick();
  const beforeFuels = state().fuels.length;
  const beforeFin = state().finance.length;
  click('#screen-action [data-action="new"]');
  await tick();
  setVal('[data-fuel-form] [name="station"]', 'Лукойл');
  setVal('[data-fuel-form] [name="liters"]', '200');
  setVal('[data-fuel-form] [name="odometer"]', '487000');
  click('[data-fuel-save]');
  await tick();
  check('fuel created', state().fuels.length === beforeFuels + 1);
  check('fuel has no price', state().fuels[0].price === undefined, JSON.stringify(state().fuels[0]));
  check('fuel expense not created', state().finance.length === beforeFin, `fin ${beforeFin}->${state().finance.length}`);
  check('no fuel expenses in finance', !state().finance.some(f => f.fuelId));

  // --- Finance: create expense
  route('finance');
  await tick();
  const balBefore = state().finance.length;
  click('#screen-action [data-action="new"]');
  await tick();
  setVal('[data-fin-form] [name="amount"]', '1234');
  setVal('[data-fin-form] [name="note"]', 'Тестовая операция');
  click('[data-fin-save]');
  await tick();
  check('finance created', state().finance.length === balBefore + 1);

  // --- Vehicles: create
  route('vehicles');
  await tick();
  const beforeVeh = state().vehicles.length;
  click('#screen-action [data-action="new"]');
  await tick();
  setVal('[data-veh-form] [name="brand"]', 'MAN');
  setVal('[data-veh-form] [name="model"]', 'TGX');
  setVal('[data-veh-form] [name="plate"]', 'О001ОО 99');
  click('[data-veh-save]');
  await tick();
  check('vehicle created', state().vehicles.length === beforeVeh + 1);
  check('new vehicle inactive', state().vehicles[0].active === false);
  const newVeh = state().vehicles[0];
  click(`[data-action="activate"][data-id="${newVeh.id}"]`);
  await tick();
  check('vehicle activated', state().vehicles.find(v => v.id === newVeh.id).active === true && state().vehicles.find(v => v.id === 'v1').active === false);

  // --- Fuel for the new vehicle
  route('fuels');
  await tick();
  click('#screen-action [data-action="new"]');
  await tick();
  setVal('[data-fuel-form] [name="station"]', 'Татнефть');
  setVal('[data-fuel-form] [name="liters"]', '50');
  setVal('[data-fuel-form] [name="odometer"]', '500');
  click('[data-fuel-save]');
  await tick();
  const fuelNew = state().fuels.find(f => f.station === 'Татнефть');
  check('fuel linked to vehicle', fuelNew && fuelNew.vehicleId === newVeh.id, JSON.stringify(fuelNew));
  check('new fuel has no price', fuelNew && fuelNew.price === undefined, JSON.stringify(fuelNew));
  check('new vehicle odometer updated', state().vehicles.find(v => v.id === newVeh.id).odometer === 500);
  check('old vehicle odometer intact', state().vehicles.find(v => v.id === 'v1').odometer === 487000);

  // --- Waybills: create + status + print
  route('waybills');
  await tick();
  const beforeWb = state().waybills.length;
  click('#screen-action [data-action="new"]');
  await tick();
  setVal('[data-wb-form] [name="fromCity"]', 'Москва');
  setVal('[data-wb-form] [name="toCity"]', 'Рязань');
  setVal('[data-wb-form] [name="distance"]', '190');
  setVal('[data-wb-form] [name="fuelIssued"]', '100');
  click('[data-wb-save]');
  await tick();
  check('waybill created', state().waybills.length === beforeWb + 1);
  const nw = state().waybills.find(w => w.fromCity === 'Москва' && w.toCity === 'Рязань');
  check('waybill draft', nw && nw.status === 'draft');
  check('waybill has no driver', nw && nw.driver === undefined, JSON.stringify(nw));
  route('waybills');
  await tick();
  click(`[data-action="open"][data-id="${nw.id}"]`);
  await tick();
  click('[data-wb-status="issued"]');
  await tick();
  check('waybill issued', state().waybills.find(w => w.id === nw.id).status === 'issued');
  // reopen modal is open after status change
  click('[data-wb-print]');
  await tick(30);
  check('print root present', !!doc.getElementById('print-root'));
  check('print class', doc.body.classList.contains('printing'));

  // --- Refs: add and edit via modal
  route('refs');
  await tick();
  const refsBefore = state().refs.contractors.length;
  click('#screen-action [data-action="new"]');
  await tick();
  check('refs form opens', !!doc.querySelector('[data-ref-form]'));
  check('firm form has INN', !!doc.querySelector('[data-ref-form] [name="inn"]'));
  check('firm form has legal address', !!doc.querySelector('[data-ref-form] [name="legalAddress"]'));
  check('firm form has contact', !!doc.querySelector('[data-ref-form] [name="contact"]'));
  setVal('[data-ref-form] [name="name"]', 'ООО Тест');
  click('[data-ref-save]');
  await tick();
  check('ref added', state().refs.contractors.length === refsBefore + 1, `len=${state().refs.contractors.length}`);
  const newRef = state().refs.contractors.find(r => r.name === 'ООО Тест');
  check('ref has id and name', newRef && newRef.id && newRef.name === 'ООО Тест', JSON.stringify(newRef));

  click(`[data-action="edit"][data-id="${newRef.id}"]`);
  await tick();
  setVal('[data-ref-form] [name="name"]', 'ООО Тест 2');
  setVal('[data-ref-form] [name="note"]', 'Обновлено');
  click('[data-ref-save]');
  await tick();
  const editedRef = state().refs.contractors.find(r => r.id === newRef.id);
  check('ref edited', editedRef && editedRef.name === 'ООО Тест 2' && editedRef.note === 'Обновлено', JSON.stringify(editedRef));

  // --- New data shape: no driver, no fuel prices
  check('driver removed', state().driver === undefined);
  check('all fuels have no price', state().fuels.every(f => f.price === undefined));

  // --- Settings theme
  route('settings');
  await tick();
  click('[data-action="theme"][data-value="dark"]');
  await tick();
  check('theme dark', doc.documentElement.dataset.theme === 'dark' && state().settings.theme === 'dark');
  click('[data-action="theme"][data-value="light"]');
  await tick();

  // --- Agent local answer
  route('agent');
  await tick();
  click('[data-action="ask"]');
  await tick(700);
  const chat = state().chat;
  check('agent answered', chat.length >= 2 && chat[chat.length - 1].role === 'assistant', JSON.stringify(chat).slice(0, 200));
  check('agent answer nonempty', (chat[chat.length - 1]?.text || '').length > 20);

  // --- Home quick action new trip opens form
  route('home');
  await tick();
  click('.quick-grid [data-action="new-trip"]');
  await tick();
  check('home new trip form opens', !!doc.querySelector('[data-trip-form]'));
  if (doc.querySelector('.modal-backdrop [data-close]')) click('.modal-backdrop [data-close]');

  // --- Search
  click('[data-global="search"]');
  await tick();
  setVal('#search-input', 'Москва');
  await tick();
  check('search results', doc.querySelectorAll('[data-search-go]').length > 0);
  click('.modal-backdrop [data-close]');

  // --- Archive modal
  click('[data-global="archive"]');
  await tick();
  check('archive modal', !!doc.querySelector('[data-archive-save]'));
  let savedArchive = null;
  window.AndroidFile = {
    saveFile(name, base64, mime) {
      savedArchive = { name, base64, mime };
      return true;
    },
  };
  click('[data-archive-save]');
  await tick();
  const savedBytes = savedArchive ? Buffer.from(savedArchive.base64, 'base64') : Buffer.alloc(0);
  check(
    'archive save bridge',
    !!savedArchive &&
      savedArchive.name.endsWith('.zip') &&
      savedArchive.mime === 'application/zip' &&
      savedBytes[0] === 0x50 &&
      savedBytes[1] === 0x4b
  );
  delete window.AndroidFile;
  click('.modal-backdrop [data-close]');

  // --- More sheet
  click('[data-global="more"]');
  await tick();
  check('more sheet', doc.querySelectorAll('.sheet-item').length >= 5);
  click('.modal-backdrop [data-close]');

  console.log('\n=== ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');
  fs.rmSync(OUT, { force: true });
  process.exit(errors.length ? 1 : 0);
})();
