/* ==========================================================================
   Hábitos Atómicos — almacenamiento local, migración y operaciones de datos
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const KEY = 'habitos-atomicos:v1';

  const DEFAULT_REPORT = {
    type: 'month',
    paper: 'a4',
    orientation: 'auto',
    sections: { matrix: true, stats: true, goals: true, notes: true, reflection: true },
  };

  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

  function blank() {
    return {
      version: 1,
      createdAt: U.todayISO(),
      profile: { name: '' },
      settings: { theme: 'light', sound: true, intro: true, reduceMotion: false },
      habits: [],
      log: {},
      goals: { week: {}, month: {}, short: [], medium: [], long: [] },
      notes: {},
      report: JSON.parse(JSON.stringify(DEFAULT_REPORT)),
    };
  }

  function normalize(d) {
    const b = blank();
    const out = Object.assign(b, d || {});
    out.profile = Object.assign(blank().profile, d && d.profile);
    out.settings = Object.assign(blank().settings, d && d.settings);
    out.goals = Object.assign(blank().goals, d && d.goals);
    out.report = Object.assign(JSON.parse(JSON.stringify(DEFAULT_REPORT)), d && d.report);
    out.report.sections = Object.assign({}, DEFAULT_REPORT.sections, d && d.report && d.report.sections);
    out.log = out.log && typeof out.log === 'object' ? out.log : {};
    out.notes = out.notes && typeof out.notes === 'object' ? out.notes : {};
    out.habits = Array.isArray(out.habits) ? out.habits.map(normalizeHabit) : [];
    return out;
  }

  function normalizeHabit(h, i) {
    return {
      id: h.id || U.uid('h'),
      name: String(h.name || 'Hábito').slice(0, 40),
      icon: h.icon || 'sparkle',
      color: Number.isInteger(h.color) ? h.color % 8 : i % 8,
      days: Array.isArray(h.days) && h.days.length ? h.days.filter((x) => x >= 0 && x <= 6) : ALL_DAYS.slice(),
      identity: h.identity || '',
      cue: h.cue || '',
      mini: h.mini || '',
      start: h.start || U.todayISO(),
      archived: !!h.archived,
      order: Number.isFinite(h.order) ? h.order : i,
      createdAt: h.createdAt || U.todayISO(),
    };
  }

  /* ---------- semillas para la primera vez ---------- */
  const SEED = [
    { name: 'Meditar', icon: 'flower-lotus', color: 2, identity: 'Soy una persona serena', cue: 'Después de despertar', mini: 'Dos minutos de respiración' },
    { name: 'Beber agua', icon: 'drop', color: 0, identity: 'Cuido mi cuerpo', cue: 'Al sentarme a trabajar', mini: 'Un vaso lleno' },
    { name: 'Leer', icon: 'book-open-text', color: 3, identity: 'Soy lector', cue: 'Después de cenar', mini: 'Una página' },
    { name: 'Entrenar', icon: 'barbell', color: 1, identity: 'Soy una persona activa', cue: 'Al salir del trabajo', mini: 'Ponerme los tenis', days: [0, 1, 2, 3, 4] },
    { name: 'Dormir bien', icon: 'moon-stars', color: 6, identity: 'Respeto mi descanso', cue: 'A las 10:30 p. m.', mini: 'Dejar el teléfono fuera del cuarto' },
  ];

  function seed(d) {
    const start = U.todayISO();
    d.habits = SEED.map((s, i) => normalizeHabit(Object.assign({ id: U.uid('h'), start, order: i }, s), i));
  }

  /* ---------- migración desde la versión anterior (habit-tracker) ---------- */
  const LEGACY_ICON = {
    '🧘': 'flower-lotus', '💧': 'drop', '📖': 'book-open-text', '🏋️': 'barbell', '🌙': 'moon-stars',
    '☀️': 'sun', '🔥': 'fire', '🦋': 'sparkle', '🐝': 'lightning',
  };

  function readLegacy(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function migrateLegacy(d) {
    const habits = readLegacy('manada_habits_v1');
    if (!Array.isArray(habits) || !habits.length) return false;

    const earliest = {};
    let keys = [];
    try {
      keys = Object.keys(localStorage);
    } catch (e) { /* sin acceso */ }

    keys.forEach((k) => {
      let m = k.match(/^manada_checks_v1_(\d{4})-(\d{1,2})$/);
      if (m) {
        const y = +m[1];
        const mo = +m[2]; // en la versión anterior el mes empezaba en 0
        const checks = readLegacy(k) || {};
        Object.keys(checks).forEach((hid) => {
          Object.keys(checks[hid] || {}).forEach((day) => {
            if (!checks[hid][day]) return;
            const date = U.iso(new Date(y, mo, +day));
            (d.log[date] = d.log[date] || {})[hid] = 1;
            if (!earliest[hid] || date < earliest[hid]) earliest[hid] = date;
          });
        });
        return;
      }
      m = k.match(/^manada_goals_v1_(\d{4})-(\d{1,2})$/);
      if (m) {
        const list = readLegacy(k);
        if (Array.isArray(list) && list.length) d.goals.month[U.monthKey(+m[1], +m[2])] = list.map(mapGoal);
        return;
      }
      m = k.match(/^manada_notes_v1_(\d{4})-(\d{1,2})$/);
      if (m) {
        const note = readLegacy(k);
        if (note) d.notes[U.monthKey(+m[1], +m[2])] = String(note);
        return;
      }
      m = k.match(/^manada_weekly_v1_(\d{4}-\d{2}-\d{2})$/);
      if (m) {
        const list = readLegacy(k);
        if (Array.isArray(list) && list.length) d.goals.week[m[1]] = list.map(mapGoal);
      }
    });

    ['short', 'medium', 'long'].forEach((kind) => {
      const list = readLegacy(`manada_goals_${kind}_v1`);
      if (Array.isArray(list)) d.goals[kind] = list.map(mapGoal);
    });

    const monthStart = U.iso(new Date(U.today().getFullYear(), U.today().getMonth(), 1));
    d.habits = habits.map((h, i) =>
      normalizeHabit({
        id: h.id,
        name: h.name,
        icon: LEGACY_ICON[h.icon] || 'sparkle',
        color: i % 8,
        start: earliest[h.id] && earliest[h.id] < monthStart ? earliest[h.id] : monthStart,
        order: i,
      }, i)
    );

    const sound = (() => { try { return localStorage.getItem('manada_sound_v1'); } catch (e) { return null; } })();
    if (sound !== null) d.settings.sound = sound === '1';
    return true;
  }

  function mapGoal(g) {
    return { id: g.id || U.uid('g'), text: String(g.text || ''), done: !!g.done, createdAt: U.todayISO() };
  }

  /* ---------- estado: varias personas en el mismo dispositivo ---------- */
  // Índice de perfiles + un documento de datos por persona.
  const INDEX_KEY = 'habitos-atomicos:perfiles';
  const pkey = (id) => `habitos-atomicos:perfil:${id}`;

  let data = null;
  let current = null;
  let index = { profiles: [], last: null };
  let storageWarned = false;
  let lastMigrated = false;

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function writeJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      if (!storageWarned) {
        storageWarned = true;
        HA.emit('storage-error', e);
      }
    }
  }
  function saveIndex() { writeJSON(INDEX_KEY, index); }

  /** Carga solo la lista de personas (los datos se cargan al elegir una). */
  function load() {
    const saved = readJSON(INDEX_KEY);
    if (saved && Array.isArray(saved.profiles)) index = { profiles: saved.profiles, last: saved.last || null };
    // Datos de una versión de un solo usuario: se convierten en la primera persona
    if (!index.profiles.length) {
      const single = readJSON(KEY);
      if (single && Array.isArray(single.habits)) {
        const d = normalize(single);
        const id = U.uid('p');
        index.profiles.push({ id, name: d.profile.name || 'Yo', color: 0, createdAt: U.todayISO() });
        index.last = id;
        writeJSON(pkey(id), d);
        saveIndex();
      }
    }
    return { profiles: index.profiles.length };
  }

  function profiles() {
    return index.profiles.slice();
  }
  function lastProfile() {
    return index.last;
  }
  function currentProfile() {
    return index.profiles.find((p) => p.id === current) || null;
  }

  function hasLegacy() {
    try { return !!localStorage.getItem('manada_habits_v1'); } catch (e) { return false; }
  }

  function createProfile(name, color) {
    const id = U.uid('p');
    const d = blank();
    // la primera persona hereda los datos de la versión anterior (habit-tracker), si existen
    lastMigrated = !index.profiles.length && hasLegacy() ? migrateLegacy(d) : false;
    if (!lastMigrated) seed(d);
    d.profile.name = String(name || '').trim().slice(0, 30);
    index.profiles.push({ id, name: d.profile.name, color: Number.isInteger(color) ? color % 8 : index.profiles.length % 8, createdAt: U.todayISO() });
    writeJSON(pkey(id), d);
    saveIndex();
    return id;
  }

  function selectProfile(id) {
    const p = index.profiles.find((x) => x.id === id);
    if (!p) return false;
    const saved = readJSON(pkey(id));
    data = saved ? normalize(saved) : (() => { const d = blank(); seed(d); return d; })();
    data.profile.name = p.name;
    current = id;
    index.last = id;
    saveIndex();
    save();
    return true;
  }

  function removeProfile(id) {
    index.profiles = index.profiles.filter((p) => p.id !== id);
    if (index.last === id) index.last = index.profiles[0] ? index.profiles[0].id : null;
    try { localStorage.removeItem(pkey(id)); } catch (e) { /* nada */ }
    saveIndex();
    if (current === id) {
      current = null;
      data = null;
    }
  }

  /** Resumen rápido de una persona para la pantalla de inicio. */
  function profileSummary(id) {
    const d = readJSON(pkey(id));
    if (!d) return { habits: 0, checkins: 0 };
    const habits = (d.habits || []).filter((h) => !h.archived).length;
    let checkins = 0;
    Object.keys(d.log || {}).forEach((k) => { checkins += Object.keys(d.log[k] || {}).length; });
    return { habits, checkins, theme: d.settings && d.settings.theme };
  }

  function save() {
    if (!current || !data) return;
    writeJSON(pkey(current), data);
  }

  function changed(kind) {
    save();
    HA.emit('change', kind);
  }

  /* ---------- hábitos ---------- */
  function habits(includeArchived) {
    return data.habits
      .filter((h) => includeArchived || !h.archived)
      .sort((a, b) => a.order - b.order);
  }
  function habit(id) {
    return data.habits.find((h) => h.id === id) || null;
  }
  function addHabit(fields) {
    const order = data.habits.reduce((m, h) => Math.max(m, h.order), -1) + 1;
    const h = normalizeHabit(Object.assign({ id: U.uid('h'), start: U.todayISO(), order }, fields), data.habits.length);
    data.habits.push(h);
    changed('habits');
    return h;
  }
  function updateHabit(id, patch) {
    const h = habit(id);
    if (!h) return null;
    Object.assign(h, patch);
    changed('habits');
    return h;
  }
  function removeHabit(id) {
    const index = data.habits.findIndex((h) => h.id === id);
    if (index < 0) return null;
    const [h] = data.habits.splice(index, 1);
    const logs = {};
    Object.keys(data.log).forEach((date) => {
      if (data.log[date][id]) {
        logs[date] = 1;
        delete data.log[date][id];
        if (!Object.keys(data.log[date]).length) delete data.log[date];
      }
    });
    changed('habits');
    return { habit: h, index, logs };
  }
  function restoreHabit(snap) {
    if (!snap) return;
    data.habits.splice(Math.min(snap.index, data.habits.length), 0, snap.habit);
    Object.keys(snap.logs).forEach((date) => {
      (data.log[date] = data.log[date] || {})[snap.habit.id] = 1;
    });
    changed('habits');
  }
  function moveHabit(id, dir) {
    const list = habits(true);
    const i = list.findIndex((h) => h.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((h, k) => { h.order = k; });
    changed('habits');
  }

  /* ---------- registro diario ---------- */
  function isDone(hid, date) {
    return !!(data.log[date] && data.log[date][hid]);
  }
  function setDone(hid, date, val) {
    if (val) {
      (data.log[date] = data.log[date] || {})[hid] = 1;
      const h = habit(hid);
      if (h && date < h.start) h.start = date;
    } else if (data.log[date]) {
      delete data.log[date][hid];
      if (!Object.keys(data.log[date]).length) delete data.log[date];
    }
    changed('log');
    return !!val;
  }
  function toggle(hid, date) {
    return setDone(hid, date, !isDone(hid, date));
  }

  /* ---------- metas ---------- */
  // kind: 'week' (key = lunes ISO) | 'month' (key = YYYY-MM) | 'short' | 'medium' | 'long'
  function goalList(kind, key) {
    if (kind === 'week' || kind === 'month') return (data.goals[kind][key] || []);
    return data.goals[kind] || [];
  }
  function ensureList(kind, key) {
    if (kind === 'week' || kind === 'month') {
      data.goals[kind][key] = data.goals[kind][key] || [];
      return data.goals[kind][key];
    }
    data.goals[kind] = data.goals[kind] || [];
    return data.goals[kind];
  }
  function cleanup(kind, key) {
    if ((kind === 'week' || kind === 'month') && data.goals[kind][key] && !data.goals[kind][key].length) {
      delete data.goals[kind][key];
    }
  }
  function addGoal(kind, key, text) {
    const g = { id: U.uid('g'), text: String(text).slice(0, 140), done: false, createdAt: U.todayISO() };
    ensureList(kind, key).push(g);
    changed('goals');
    return g;
  }
  function toggleGoal(kind, key, id) {
    const g = goalList(kind, key).find((x) => x.id === id);
    if (!g) return null;
    g.done = !g.done;
    g.doneAt = g.done ? U.todayISO() : null;
    changed('goals');
    return g;
  }
  function editGoal(kind, key, id, text) {
    const g = goalList(kind, key).find((x) => x.id === id);
    if (!g) return;
    g.text = String(text).slice(0, 140);
    changed('goals');
  }
  function removeGoal(kind, key, id) {
    const list = goalList(kind, key);
    const index = list.findIndex((x) => x.id === id);
    if (index < 0) return null;
    const [goal] = list.splice(index, 1);
    cleanup(kind, key);
    changed('goals');
    return { kind, key, index, goal };
  }
  function restoreGoal(snap) {
    if (!snap) return;
    const list = ensureList(snap.kind, snap.key);
    list.splice(Math.min(snap.index, list.length), 0, snap.goal);
    changed('goals');
  }
  function clearDoneGoals(kind, key) {
    const list = ensureList(kind, key);
    const removed = list.map((g, index) => ({ g, index })).filter((x) => x.g.done);
    const keep = list.filter((g) => !g.done);
    list.length = 0;
    keep.forEach((g) => list.push(g));
    cleanup(kind, key);
    changed('goals');
    return { kind, key, removed };
  }
  function restoreCleared(snap) {
    if (!snap) return;
    const list = ensureList(snap.kind, snap.key);
    snap.removed.forEach(({ g, index }) => list.splice(Math.min(index, list.length), 0, g));
    changed('goals');
  }

  /* ---------- notas ---------- */
  function note(mk) {
    return data.notes[mk] || '';
  }
  function setNote(mk, text) {
    if (text && text.trim()) data.notes[mk] = text;
    else delete data.notes[mk];
    save();
  }

  /* ---------- ajustes / perfil ---------- */
  function setSetting(k, v) {
    data.settings[k] = v;
    changed('settings');
  }
  function setName(name) {
    data.profile.name = String(name || '').trim().slice(0, 30);
    const p = currentProfile();
    if (p) {
      p.name = data.profile.name;
      saveIndex();
    }
    changed('profile');
  }
  function setProfileColor(color) {
    const p = currentProfile();
    if (!p) return;
    p.color = color % 8;
    saveIndex();
    changed('profile');
  }
  function setReport(patch) {
    Object.assign(data.report, patch);
    save();
  }

  /* ---------- copia de seguridad ---------- */
  function exportJSON() {
    return JSON.stringify(Object.assign({ app: 'habitos-atomicos', exportedAt: new Date().toISOString() }, data), null, 2);
  }
  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.habits)) {
      throw new Error('El archivo no parece una copia de Hábitos Atómicos.');
    }
    delete parsed.app;
    delete parsed.exportedAt;
    const keepName = data.profile.name;
    data = normalize(parsed);
    data.profile.name = keepName;
    changed('all');
  }
  function resetAll() {
    const keepName = data.profile.name;
    data = blank();
    seed(data);
    data.profile.name = keepName;
    changed('all');
  }

  /* ---------- datos de ejemplo (para explorar la app) ---------- */
  function loadDemo() {
    const keepName = data.profile.name;
    const keepSettings = Object.assign({}, data.settings);
    data = blank();
    data.profile.name = keepName;
    data.settings = keepSettings;
    seed(data);
    const today = U.today();
    const start = U.addDays(today, -150);
    const startISO = U.iso(start);
    data.habits.forEach((h) => { h.start = startISO; });
    const rates = [0.86, 0.93, 0.72, 0.68, 0.79];
    // pseudoaleatorio determinista para que el ejemplo sea estable
    let seedN = 7;
    const rand = () => {
      seedN = (seedN * 16807) % 2147483647;
      return (seedN - 1) / 2147483646;
    };
    for (let d = new Date(start); d <= today; d = U.addDays(d, 1)) {
      const date = U.iso(d);
      const progress = U.diffDays(startISO, date) / 150; // mejora gradual
      data.habits.forEach((h, i) => {
        if (!h.days.includes(U.wd(d))) return;
        if (date === U.todayISO() && i > 1) return;
        const p = Math.min(0.97, rates[i] * (0.78 + progress * 0.3));
        if (rand() < p) (data.log[date] = data.log[date] || {})[h.id] = 1;
      });
    }
    const mk = U.monthKey(today.getFullYear(), today.getMonth());
    const wk = U.weekStartISO(U.todayISO());
    data.goals.month[mk] = [
      { id: U.uid('g'), text: 'Terminar el libro que empecé', done: true },
      { id: U.uid('g'), text: 'Correr 5 km sin parar', done: false },
      { id: U.uid('g'), text: 'Ahorrar el 15% del ingreso', done: true },
      { id: U.uid('g'), text: 'Ordenar el escritorio y el correo', done: false },
    ].map((g) => Object.assign({ createdAt: U.todayISO() }, g));
    data.goals.week[wk] = [
      { id: U.uid('g'), text: 'Preparar comidas del lunes al miércoles', done: true },
      { id: U.uid('g'), text: 'Llamar a mamá', done: false },
      { id: U.uid('g'), text: '3 entrenamientos de fuerza', done: false },
    ].map((g) => Object.assign({ createdAt: U.todayISO() }, g));
    data.goals.short = [
      { id: U.uid('g'), text: 'Dormir 7 horas promedio durante un mes', done: false },
      { id: U.uid('g'), text: 'Leer 4 libros este trimestre', done: true },
    ].map((g) => Object.assign({ createdAt: U.todayISO() }, g));
    data.goals.medium = [
      { id: U.uid('g'), text: 'Correr un medio maratón', done: false },
      { id: U.uid('g'), text: 'Fondo de emergencia de 3 meses', done: false },
    ].map((g) => Object.assign({ createdAt: U.todayISO() }, g));
    data.goals.long = [
      { id: U.uid('g'), text: 'Hablar inglés con fluidez', done: false },
    ].map((g) => Object.assign({ createdAt: U.todayISO() }, g));
    data.notes[mk] = 'Este mes noté que leer después de cenar funciona mucho mejor que en la mañana.\n\nLo que me frenó: los días de viaje. La próxima vez dejo lista la versión de dos minutos.\n\nAjuste para el próximo mes: entrenar a primera hora los lunes.';
    changed('all');
  }

  HA.store = {
    KEY,
    get data() { return data; },
    load, save,
    profiles, lastProfile, currentProfile, createProfile, selectProfile, removeProfile, profileSummary, setProfileColor,
    get migrated() { return lastMigrated; },
    habits, habit, addHabit, updateHabit, removeHabit, restoreHabit, moveHabit,
    isDone, setDone, toggle,
    goalList, addGoal, toggleGoal, editGoal, removeGoal, restoreGoal, clearDoneGoals, restoreCleared,
    note, setNote,
    setSetting, setName, setReport,
    exportJSON, importJSON, resetAll, loadDemo,
    ALL_DAYS,
  };
})();
