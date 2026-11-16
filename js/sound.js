/* ==========================================================================
   Hábitos Atómicos — efectos de sonido
   Usa los archivos de assets/sfx (tu colección), precargados en memoria con
   Web Audio para que suenen al instante. Si un archivo aún no carga, se usa
   un clic sintetizado como respaldo.
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  let ctx = null;
  let master = null;
  const buffers = {};
  let loading = null;

  // volumen relativo de cada efecto (0–1)
  const SFX = {
    check: 0.55,
    uncheck: 0.4,
    tap: 0.32,
    tab: 0.38,
    open: 0.32,
    close: 0.3,
    add: 0.4,
    remove: 0.42,
    goal: 0.5,
    perfect: 0.55,
    theme: 0.3,
    welcome: 0.45,
    voice: 1,
  };

  const enabled = () => {
    const d = HA.store && HA.store.data;
    return d ? !!d.settings.sound : true;
  };

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function preload() {
    if (loading) return loading;
    const c = audio();
    if (!c || !window.fetch) return Promise.resolve();
    loading = Promise.all(
      Object.keys(SFX).map((name) =>
        fetch(`assets/sfx/${name}.mp3`)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
          .then((ab) => new Promise((res, rej) => c.decodeAudioData(ab, res, rej)))
          .then((buf) => { buffers[name] = buf; })
          .catch(() => { /* se usará el respaldo sintetizado */ })
      )
    );
    return loading;
  }

  function sample(name, opts) {
    const c = audio();
    const buf = buffers[name];
    if (!c || !buf) return false;
    const src = c.createBufferSource();
    src.buffer = buf;
    if (opts && opts.rate) src.playbackRate.value = opts.rate;
    const g = c.createGain();
    g.gain.value = SFX[name] * ((opts && opts.gain) || 1);
    src.connect(g).connect(master);
    src.start(c.currentTime + ((opts && opts.delay) || 0));
    return true;
  }

  /* ---------- respaldo sintetizado ---------- */
  function click(pitch, peak) {
    const c = audio();
    if (!c) return;
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, t0);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.6, t0 + 0.06);
    const g = c.createGain();
    g.gain.setValueAtTime(peak || 0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.1);
  }

  function play(name, fallbackPitch, opts) {
    if (!enabled()) return;
    try {
      if (!sample(name, opts)) click(fallbackPitch);
    } catch (e) { /* audio no disponible */ }
  }

  // Desbloquea el audio con el primer gesto (requisito de los navegadores)
  function unlock() {
    try {
      audio();
      preload();
    } catch (e) { /* nada */ }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, unlock, { once: true, passive: true, capture: true })
  );
  // Precarga temprana (el contexto queda suspendido hasta el primer gesto)
  window.addEventListener('load', () => { try { preload(); } catch (e) {} });

  HA.sound = {
    unlock,
    check: () => play('check', 1400),
    uncheck: () => play('uncheck', 600),
    add: () => play('add', 1300),
    remove: () => play('remove', 480),
    tap: () => play('tap', 1000),
    open: () => play('open', 900),
    close: () => play('close', 800),
    tab: () => play('tab', 1100),
    goal: () => play('goal', 1500),
    theme: () => play('theme', 700),
    perfect: () => play('perfect', 1600),
    /** Voz de bienvenida al entrar a la app. */
    voice: () => {
      if (!enabled()) return;
      if (buffers.voice) return play('voice', 900);
      preload().then(() => play('voice', 900));
    },
    welcome: () => {
      if (!enabled()) return;
      // si el archivo aún no está listo, espera un instante a que cargue
      if (buffers.welcome) return play('welcome', 900);
      preload().then(() => play('welcome', 900));
    },
  };
})();
