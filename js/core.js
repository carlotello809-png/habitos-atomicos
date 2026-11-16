/* ==========================================================================
   Hábitos Atómicos — utilidades base (fechas, formato, helpers)
   ========================================================================== */
(function () {
  'use strict';

  const HA = (window.HA = window.HA || {});
  HA.views = HA.views || {};

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  // Índices con la semana empezando en lunes (0 = lunes ... 6 = domingo)
  const DOW_LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const DOW_SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  const DOW_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d || 1);
  };
  const addDays = (d, n) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  };
  const addDaysISO = (s, n) => iso(addDays(parse(s), n));
  const today = () => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  };
  const todayISO = () => iso(today());
  const wd = (d) => (d.getDay() + 6) % 7;
  const wdISO = (s) => wd(parse(s));
  const weekStart = (d) => addDays(d, -wd(d));
  const weekStartISO = (s) => iso(weekStart(parse(s)));
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const monthKey = (y, m) => `${y}-${pad(m + 1)}`;
  const monthOf = (s) => {
    const d = parse(s);
    return { y: d.getFullYear(), m: d.getMonth() };
  };
  const shiftMonth = ({ y, m }, delta) => {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  };
  const monthDates = (y, m) => {
    const out = [];
    const n = daysInMonth(y, m);
    for (let i = 1; i <= n; i++) out.push(iso(new Date(y, m, i)));
    return out;
  };
  const rangeDates = (from, to) => {
    const out = [];
    if (!from || !to || from > to) return out;
    let d = parse(from);
    const end = parse(to);
    let guard = 0;
    while (d <= end && guard < 3700) {
      out.push(iso(d));
      d = addDays(d, 1);
      guard++;
    }
    return out;
  };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const isFuture = (s) => s > todayISO();

  /* ---------- formato ---------- */
  const fmt = {
    long(s) {
      const d = parse(s);
      return `${DOW_LONG[wd(d)]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
    },
    longYear(s) {
      const d = parse(s);
      return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
    },
    short(s) {
      const d = parse(s);
      return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
    },
    dayShort(s) {
      const d = parse(s);
      return `${cap(DOW_SHORT[wd(d)])} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
    },
    month(y, m) {
      return `${cap(MONTHS[m])} ${y}`;
    },
    weekRange(mondayISO) {
      const a = parse(mondayISO);
      const b = addDays(a, 6);
      if (a.getMonth() === b.getMonth()) {
        return `${a.getDate()} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
      }
      if (a.getFullYear() === b.getFullYear()) {
        return `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
      }
      return `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
    },
    range(from, to) {
      const a = parse(from);
      const b = parse(to);
      const left = a.getFullYear() === b.getFullYear() ? `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]}` : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} ${a.getFullYear()}`;
      return `${left} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
    },
    num(n) {
      return new Intl.NumberFormat('es').format(n);
    },
    plural(n, one, many) {
      return `${n} ${n === 1 ? one : many}`;
    },
  };

  const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const esc = (str) =>
    String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 5) return 'Buenas noches';
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };
  const dayOfYear = (d) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);

  HA.util = {
    MONTHS, MONTHS_SHORT, DOW_LETTER, DOW_SHORT, DOW_LONG,
    cap, pad, iso, parse, addDays, addDaysISO, today, todayISO, wd, wdISO,
    weekStart, weekStartISO, daysInMonth, monthKey, monthOf, shiftMonth, monthDates,
    rangeDates, diffDays, isFuture, fmt, pct, clamp, uid, esc, debounce, greeting, dayOfYear,
  };

  /* ---------- bus de eventos mínimo ---------- */
  const listeners = {};
  HA.on = (type, fn) => {
    (listeners[type] = listeners[type] || []).push(fn);
  };
  HA.emit = (type, payload) => {
    (listeners[type] || []).forEach((fn) => {
      try { fn(payload); } catch (e) { console.error(e); }
    });
  };

  /* ---------- catálogos ---------- */
  HA.HABIT_COLORS = ['Azul', 'Naranja', 'Turquesa', 'Amarillo', 'Rosa', 'Verde', 'Índigo', 'Rojo'];

  HA.HABIT_ICONS = [
    'book-open-text', 'barbell', 'drop', 'moon-stars', 'flower-lotus', 'person-simple-run',
    'person-simple-walk', 'bicycle', 'heartbeat', 'brain', 'pencil-simple-line', 'notebook',
    'carrot', 'bowl-food', 'coffee', 'sun', 'bed', 'pill', 'tooth', 'device-mobile-slash',
    'music-notes', 'guitar', 'code', 'translate', 'piggy-bank', 'wallet', 'broom', 'plant',
    'leaf', 'hands-praying', 'smiley', 'alarm', 'timer', 'graduation-cap', 'briefcase',
    'paint-brush', 'camera', 'cigarette-slash', 'shower', 'heart', 'lightning', 'target',
    'star', 'paw-print', 'sparkle', 'fire',
  ];

  HA.QUOTES = [
    'Cada check es un voto por la persona que quieres ser.',
    'Tus metas marcan el rumbo; tus sistemas deciden hasta dónde llegas.',
    'Un hábito pequeño y constante vence a un gran esfuerzo esporádico.',
    'Nunca falles dos veces. Un día malo es un accidente; dos, el inicio de otro hábito.',
    'Hazlo tan fácil que no puedas decir que no: empieza con la versión de dos minutos.',
    'Mejorar un 1% cada día se convierte en casi 38 veces mejor al cabo de un año.',
    'La disciplina supera a la motivación: no esperes tener ganas, solo empieza.',
    'El entorno manda. Ordena tu espacio para que el buen hábito sea el camino obvio.',
    'Une un hábito nuevo a uno que ya tienes: “después de ___, haré ___”.',
    'Celebra los avances pequeños; lo que se recompensa, se repite.',
    'No busques perfección, busca repetición.',
    'El progreso no es lineal. Una racha rota no borra lo que ya construiste.',
    'Elimina una fricción hoy antes de agregar una tarea nueva.',
    'La primera hora del día define el ritmo de las siguientes ocho.',
    'Lo que mides, mejora. Lo que registras, se vuelve visible.',
    'Las metas definen la dirección; los sistemas, el progreso.',
    'Haz que el mal hábito sea invisible, poco atractivo, difícil e insatisfactorio.',
    'Descansar también es productivo: protege tu sueño como una meta más.',
    'Escribe tus tres prioridades del día apenas despiertes.',
    'Un “no” a tiempo protege tu foco mejor que cien “sí”.',
    'Revisa tus notas del mes pasado: ahí está tu siguiente paso.',
    'Los resultados son el interés compuesto de tus hábitos.',
  ];
})();
