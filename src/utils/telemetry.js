const STORAGE_KEY = 'kelimeo_telemetry';

const getGlobal = () => (typeof globalThis !== 'undefined' && globalThis.window) ? globalThis.window : undefined;
const read = () => {
  const g = getGlobal();
  try { return JSON.parse((g && g.localStorage && g.localStorage.getItem(STORAGE_KEY)) || '{}'); } catch { return {}; }
};
const write = (data) => {
  const g = getGlobal();
  try { g && g.localStorage && g.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

export const logEvent = (name, payload = {}) => {
  try { console.debug('[telemetry]', name, payload); } catch {}
  const all = read();
  const arr = all[name] || [];
  arr.push({ ts: Date.now(), ...payload });
  all[name] = arr.slice(-200); // cap
  write(all);
};

export const incrementCounter = (name, key) => {
  const all = read();
  const counters = all['__counters__'] || {};
  const bucket = counters[name] || {};
  const newVal = (bucket[key] || 0) + 1;
  bucket[key] = newVal;
  counters[name] = bucket;
  all['__counters__'] = counters;
  write(all);
  try { console.debug('[telemetry/counter]', name, key, newVal); } catch {}
};

const Telemetry = { logEvent, incrementCounter };
export default Telemetry;
