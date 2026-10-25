/* Namespace and persistence. Loaded in <head>. All storage access is wrapped in try/catch with an in-memory fallback. */
window.Atlas = window.Atlas || {};
(function (A) {
  const PREFIX = 'atlas.';
  const memory = {};
  const listeners = [];

  function read(key, fallback) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) { /* storage blocked or corrupt: fall through to memory */ }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : fallback;
  }

  function write(key, value) {
    memory[key] = value;
    try { window.localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* keep memory copy */ }
  }

  A.store = {
    get: read,
    set(key, value, silent) {
      write(key, value);
      if (!silent) listeners.forEach(fn => fn(key, value));
    },
    has(key, id) { return read(key, []).indexOf(id) !== -1; },
    toggle(key, id) {
      const list = read(key, []);
      const at = list.indexOf(id);
      if (at === -1) list.push(id); else list.splice(at, 1);
      A.store.set(key, list);
      return at === -1;
    },
    pushRecent(id) {
      const list = read('recent', []).filter(x => x !== id);
      list.unshift(id);
      write('recent', list.slice(0, 6));
    },
    onChange(fn) { listeners.push(fn); },
  };
})(window.Atlas);
