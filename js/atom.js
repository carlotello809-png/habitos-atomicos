/* ==========================================================================
   Hábitos Atómicos — ilustración del átomo
   Cada electrón es uno de tus hábitos del día: se enciende al cumplirlo.
   El núcleo crece y brilla con el porcentaje del día.
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const RX = 150;
  const RY = 54;
  const ORBIT = `M ${-RX} 0 A ${RX} ${RY} 0 1 1 ${RX} 0 A ${RX} ${RY} 0 1 1 ${-RX} 0`;
  const ROT = [0, 60, -60];
  let counter = 0;

  function electron(h, k, j, n, done) {
    const dur = 11 + k * 3.4;
    const begin = -((dur * j) / Math.max(1, n)) - k * 1.7;
    const motion = (delay) =>
      `<animateMotion dur="${dur.toFixed(1)}s" begin="${(begin + delay).toFixed(2)}s" repeatCount="indefinite" path="${ORBIT}"/>`;
    // estela tipo cometa: círculos que siguen al electrón con un pequeño retraso
    const trail = [
      { r: 2.4, d: 0.42, c: 't4' },
      { r: 3.2, d: 0.3, c: 't3' },
      { r: 4.2, d: 0.19, c: 't2' },
      { r: 5.2, d: 0.09, c: 't1' },
    ]
      .map((t) => `<circle class="e-trail ${t.c}" r="${t.r}">${motion(t.d)}</circle>`)
      .join('');
    return `
      <g class="electron${done ? ' is-done' : ''}" data-electron="${h.id}" style="--ec: var(--c-${h.color})">
        ${trail}
        <g class="e-head">
          <circle class="e-halo" r="16"/>
          <circle class="e-core" r="6.5"/>
          ${motion(0)}
        </g>
      </g>`;
  }

  function render({ habits, done, pct, cls }) {
    const id = `atom${++counter}`;
    const groups = [[], [], []];
    habits.forEach((h, i) => groups[i % 3].push(h));
    const p = Math.max(0, Math.min(100, pct || 0)) / 100;
    return `
      <svg class="atom ${cls || ''}${p >= 1 ? ' is-perfect' : ''}" viewBox="-200 -200 400 400" style="--p:${p}" aria-hidden="true">
        <defs>
          <radialGradient id="${id}-glow">
            <stop offset="0%" style="stop-color:var(--accent);stop-opacity:.55"/>
            <stop offset="45%" style="stop-color:var(--accent);stop-opacity:.12"/>
            <stop offset="100%" style="stop-color:var(--accent);stop-opacity:0"/>
          </radialGradient>
          <radialGradient id="${id}-core" cx="38%" cy="34%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:.9"/>
            <stop offset="35%" style="stop-color:var(--accent)"/>
            <stop offset="100%" style="stop-color:var(--accent-deep)"/>
          </radialGradient>
        </defs>
        <g class="atom-field">
          <circle r="186" class="atom-ring"/>
          <circle r="118" class="atom-ring atom-ring-2"/>
        </g>
        ${groups
          .map(
            (list, k) => `
          <g transform="rotate(${ROT[k]})">
            <path class="atom-orbit" d="${ORBIT}"/>
            ${list.map((h, j) => electron(h, k, j, list.length, done.has(h.id))).join('')}
          </g>`
          )
          .join('')}
        <g class="nucleus">
          <circle class="n-glow" r="96" fill="url(#${id}-glow)"/>
          <circle class="n-shell" r="32"/>
          <circle class="n-core" r="19" fill="url(#${id}-core)"/>
        </g>
      </svg>`;
  }

  function update(svg, pct, doneSet) {
    if (!svg) return;
    const p = Math.max(0, Math.min(100, pct)) / 100;
    svg.style.setProperty('--p', p);
    svg.classList.toggle('is-perfect', p >= 1);
    svg.querySelectorAll('[data-electron]').forEach((g) => {
      const now = doneSet.has(g.dataset.electron);
      const was = g.classList.contains('is-done');
      g.classList.toggle('is-done', now);
      if (now && !was) {
        g.classList.remove('just-done');
        void g.getBoundingClientRect();
        g.classList.add('just-done');
        setTimeout(() => g.classList.remove('just-done'), 900);
      }
    });
  }

  function settle(root) {
    if (!HA.ui.reduced()) return;
    root.querySelectorAll('svg.atom').forEach((s) => s.pauseAnimations && s.pauseAnimations());
  }

  /** Marca para fondos claros (reporte impreso). */
  function markInline(stroke, nucleus) {
    return `<svg viewBox="-50 -50 100 100" class="rp-mark" aria-hidden="true">
      <g fill="none" stroke="${stroke}" stroke-width="5">
        <ellipse rx="42" ry="15"/><ellipse rx="42" ry="15" transform="rotate(60)"/><ellipse rx="42" ry="15" transform="rotate(-60)"/>
      </g>
      <circle r="9" fill="${nucleus}"/>
    </svg>`;
  }

  /* ---------- átomo 3D en video (HyperFrames) ---------- */
  const videoBase = () =>
    document.documentElement.dataset.theme === 'dark' ? 'assets/video/atom-dark' : 'assets/video/atom-light';

  function video(pct) {
    const base = videoBase();
    const p = Math.max(0, Math.min(100, pct || 0)) / 100;
    return `
      <div class="atom-3d${p >= 1 ? ' is-perfect' : ''}" style="--p:${p}" aria-hidden="true">
        <video class="atom-video" src="${base}.mp4" autoplay muted loop playsinline webkit-playsinline preload="auto" disablepictureinpicture disableremoteplayback x-webkit-airplay="deny" tabindex="-1"></video>
      </div>`;
  }

  /** Cambia los videos al tema activo (claro/oscuro). */
  function syncVideos() {
    const base = videoBase();
    document.querySelectorAll('video.atom-video, video.intro-video').forEach((v) => {
      const want = `${base}.mp4`;
      if ((v.getAttribute('src') || '') !== want) {
        v.setAttribute('src', want);
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      }
    });
  }

  /** El átomo 3D se llena de color con el progreso y late al marcar un hábito. */
  function updateVideo(el, pct, pulse) {
    if (!el) return;
    const p = Math.max(0, Math.min(100, pct)) / 100;
    el.style.setProperty('--p', p);
    el.classList.toggle('is-perfect', p >= 1);
    const v = el.querySelector('video');
    if (v) v.playbackRate = p >= 1 ? 1.6 : 1;
    if (pulse && !HA.ui.reduced()) {
      el.animate([{ scale: '1' }, { scale: '1.08' }, { scale: '1' }], { duration: 650, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
    }
  }

  // El video solo se muestra cuando de verdad se está reproduciendo. Si el
  // navegador bloquea la reproducción automática (p. ej. Modo de bajo consumo
  // en iPhone) se queda el átomo animado y nunca aparece el botón de "play".
  document.addEventListener(
    'playing',
    (e) => {
      const t = e.target;
      if (!t || !t.matches || !t.matches('video.atom-video, video.intro-video')) return;
      const host = t.closest('.hero-art, .intro-media, .empty-art');
      if (!host) return;
      host.classList.add('has-video');
      // el átomo dibujado deja de animarse para ahorrar batería
      const svg = host.querySelector('svg.atom, svg.intro-atom');
      if (svg && svg.pauseAnimations) setTimeout(() => svg.pauseAnimations(), 700);
    },
    true
  );

  /** Prepara los videos recién insertados (propiedades que iOS exige además de los atributos). */
  function primeVideos(root) {
    (root || document).querySelectorAll('video.atom-video, video.intro-video').forEach((v) => {
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.setAttribute('webkit-playsinline', '');
      v.disableRemotePlayback = true;
      if (v.getAttribute('src') && v.paused) {
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      }
    });
  }

  HA.atom = { render, update, settle, markInline, video, syncVideos, updateVideo, primeVideos };
})();
