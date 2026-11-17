/* ==========================================================================
   Hábitos Atómicos — efectos de sonido y voz
   Usa los archivos de assets/sfx precargados en memoria con Web Audio para que
   suenen al instante.

   iPhone / iPad (Safari):
   - El audio solo se desbloquea al SOLTAR el dedo (touchend / click), no al
     tocar. Se reintenta en cada gesto hasta que el audio quede activo.
   - El interruptor de silencio apaga Web Audio. Con la sesión de audio en modo
     "playback" los sonidos se escuchan aunque el iPhone esté en silencio
     (se puede desactivar en Ajustes).
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
    check: 0.6,
    uncheck: 0.45,
    tap: 0.35,
    tab: 0.42,
    open: 0.36,
    close: 0.34,
    add: 0.45,
    remove: 0.46,
    goal: 0.55,
    perfect: 0.6,
    theme: 0.34,
    voice: 1,
  };

  const settings = () => (HA.store && HA.store.data ? HA.store.data.settings : null);
  const enabled = () => {
    const s = settings();
    return s ? !!s.sound : true;
  };

  /** Sesión de audio de Safari: 'playback' suena aunque el iPhone esté en silencio. */
  function applySession() {
    if (!('audioSession' in navigator)) return;
    const s = settings();
    const loud = s ? s.silentOverride !== false : true;
    try {
      navigator.audioSession.type = loud ? 'playback' : 'ambient';
    } catch (e) { /* no soportado */ }
  }

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC({ latencyHint: 'interactive' });
      } catch (e) {
        ctx = new AC();
      }
      master = ctx.createGain();
      master.gain.value = 0.95;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  const running = () => !!ctx && ctx.state === 'running';

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

  /**
   * Desbloqueo: debe llamarse DENTRO de un gesto (touchend / click / keydown).
   * Reanuda el contexto y reproduce un búfer silencioso (truco necesario en iOS).
   */
  function unlock() {
    const c = audio();
    if (!c) return;
    applySession();
    try {
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch (e) { /* nada */ }
    if (c.state !== 'running') c.resume().catch(() => {});
    preload();
    // los videos del átomo también necesitan un gesto en "Modo de bajo consumo"
    document.querySelectorAll('video.atom-video, video.intro-video').forEach((v) => {
      if (v.paused && v.getAttribute('src')) {
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      }
    });
  }

  // Cada gesto real intenta desbloquear hasta lograrlo (no solo el primero)
  const onGesture = () => { if (!running()) unlock(); };
  ['touchend', 'pointerup', 'click', 'keydown'].forEach((ev) =>
    document.addEventListener(ev, onGesture, { passive: true, capture: true })
  );
  // Al volver a la app (iOS suspende el audio en segundo plano)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  });
  // Precarga temprana: los archivos se decodifican aunque el audio siga en pausa
  window.addEventListener('load', () => {
    if ('requestIdleCallback' in window) requestIdleCallback(() => preload(), { timeout: 2500 });
    else setTimeout(preload, 800);
  });

  function sample(name) {
    const buf = buffers[name];
    if (!ctx || !buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = SFX[name];
    src.connect(g).connect(master);
    src.start(0);
    return true;
  }

  function click(pitch) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, t0);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.6, t0 + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.1);
  }

  /** Reproduce un efecto; si el audio aún se está activando, espera un instante. */
  function play(name, fallbackPitch) {
    if (!enabled()) return;
    const c = audio();
    if (!c) return;
    const go = () => {
      try {
        if (!sample(name)) click(fallbackPitch);
      } catch (e) { /* audio no disponible */ }
    };
    if (c.state === 'running') return go();
    // se está reanudando dentro de este mismo gesto: suena en cuanto esté listo
    c.resume().then(() => { if (c.state === 'running') go(); }).catch(() => {});
  }

  /** Para archivos largos (voz): espera la carga si todavía no terminó. */
  function playLoaded(name, fallbackPitch) {
    if (!enabled()) return;
    if (buffers[name]) return play(name, fallbackPitch);
    preload().then(() => play(name, fallbackPitch));
  }

  HA.sound = {
    unlock,
    applySession,
    /** Estado del audio (diagnóstico): 'running', 'suspended', etc. */
    state: () => (ctx ? ctx.state : 'none'),
    loaded: () => Object.keys(buffers).length,
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
    perfect: () => playLoaded('perfect', 1600),
    /** Voz de bienvenida al entrar a la app. */
    voice: () => playLoaded('voice', 900),
  };
})();
