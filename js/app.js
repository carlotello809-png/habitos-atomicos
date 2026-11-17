/* ==========================================================================
   Hábitos Atómicos — arranque, navegación, tema, atajos e intro
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const S = HA.store;
  const ui = HA.ui;
  const $ = ui.$;

  const ORDER = ['hoy', 'mes', 'metas', 'notas', 'progreso', 'reporte'];
  const t0 = U.todayISO();

  const app = (HA.app = {
    state: {
      view: null,
      date: t0,
      month: U.monthOf(t0),
      week: U.weekStartISO(t0),
      goalsTab: 'week',
      report: {},
    },
    root: null,
    muted: 0,
    ready: false,
  });

  let lastToday = t0;
  let lastNavIdx = null;
  let titleIO = null;
  let navToken = 0;
  let instantNext = false;

  /* ---------- silenciar re-render en cambios hechos desde la propia vista ---------- */
  app.mute = (fn) => {
    app.muted++;
    try { fn(); } finally { app.muted--; }
  };

  HA.on('change', (kind) => {
    if (app.muted || !app.ready) return;
    if (kind === 'settings') {
      syncChrome();
      return;
    }
    if (kind === 'profile') syncChrome();
    if (kind === 'all') app.applyTheme(false);
    app.rerender({ soft: false });
  });

  HA.on('storage-error', () => {
    ui.toast({
      title: 'No se pudo guardar',
      message: 'Tu navegador bloqueó el almacenamiento local. Exporta una copia desde Ajustes.',
      icon: 'warning-circle',
      tone: 'danger',
      duration: 8000,
    });
  });

  /* ---------- render ---------- */
  function viewFromHash() {
    const v = (location.hash || '').replace('#', '');
    return ORDER.includes(v) ? v : 'hoy';
  }

  function postRender(animate) {
    const root = app.root;
    if (animate) {
      root.querySelectorAll('.page-head .display').forEach((el) => ui.splitWords(el));
      ui.reveal(root);
      ui.countAll(root);
    } else {
      root.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
      root.querySelectorAll('[data-count]').forEach((el) => {
        el.textContent = `${el.dataset.count}${el.dataset.suffix || ''}`;
      });
    }
    ui.animateRings(root);
    HA.atom.settle(root);
    watchTitle();
  }

  /* Título compacto en la barra superior al hacer scroll (como iOS) */
  function watchTitle() {
    const chrome = $('#chrome');
    const label = $('#chromeTitle');
    const mod = HA.views[app.state.view];
    label.textContent = mod ? mod.title : '';
    if (titleIO) titleIO.disconnect();
    chrome.classList.remove('has-title');
    const big = app.root.querySelector('.page-head .display');
    if (!big || !('IntersectionObserver' in window)) return;
    const top = chrome.getBoundingClientRect().height;
    titleIO = new IntersectionObserver(([en]) => {
      chrome.classList.toggle('has-title', !en.isIntersecting && en.boundingClientRect.top < top);
    }, { rootMargin: `-${Math.round(top)}px 0px 0px 0px` });
    titleIO.observe(big);
  }

  function renderView(view, { defer = false, animate = true } = {}) {
    const mod = HA.views[view];
    const root = app.root;
    ui.hideTip();
    root.onclick = root.onsubmit = root.onchange = root.ondblclick = null;
    root.classList.toggle('no-anim', !animate);
    mod.render(root);
    HA.atom.primeVideos(root);
    document.title = `${mod.title} · Hábitos Atómicos`;
    if (!defer) postRender(animate);
  }

  async function navigate(view, { instant = false } = {}) {
    const prev = app.state.view;
    if (prev === view) return;
    const token = ++navToken;
    app.state.view = view;
    updateNav(view);
    const root = app.root;
    const animate = !instant && !ui.reduced() && prev != null;
    if (animate && root.firstElementChild) {
      const a = root.animate(
        [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-6px) scale(0.99)', filter: 'blur(8px)' }],
        { duration: 170, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
      );
      // nunca esperar de más: si la animación no avanza (pestaña en segundo plano), se sigue igual
      try { await Promise.race([a.finished, new Promise((r) => setTimeout(r, 240))]); } catch (e) { /* interrumpida */ }
      if (token !== navToken) return;
      a.cancel();
    }
    renderView(view, { animate: !instant });
    window.scrollTo(0, 0);
    if (instant) root.focus({ preventScroll: true });
  }

  app.rerender = ({ soft = false } = {}) => {
    const y = window.scrollY;
    renderView(app.state.view, { animate: false });
    window.scrollTo(0, y);
    if (soft && !ui.reduced()) {
      app.root.animate(
        [{ opacity: 0.3, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0)' }],
        { duration: 360, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
      );
    }
  };

  /* ---------- chrome: navegación, sonido, tema ---------- */
  function updateNav(view) {
    const nav = $('#nav');
    const idx = ORDER.indexOf(view);
    nav.style.setProperty('--idx', idx);
    // efecto líquido: el indicador se estira mientras viaja
    if (lastNavIdx != null && lastNavIdx !== idx && !ui.reduced()) {
      const stretch = 1 + Math.min(0.45, Math.abs(idx - lastNavIdx) * 0.13);
      nav.querySelector('.nav-indicator').animate(
        [{ scale: '1 1' }, { scale: `${stretch} 0.84`, offset: 0.42 }, { scale: '1 1' }],
        { duration: 520, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' }
      );
      const icon = nav.querySelector(`.nav-item[data-view="${view}"] i`);
      if (icon) {
        icon.animate(
          [{ transform: 'scale(0.7) rotate(-14deg)' }, { transform: 'scale(1.2) rotate(5deg)', offset: 0.6 }, { transform: 'none' }],
          { duration: 560, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
        );
      }
    }
    lastNavIdx = idx;
    ui.$$('.nav-item', nav).forEach((a) => {
      const on = a.dataset.view === view;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
      const i = a.querySelector('i');
      i.classList.toggle('ph-fill', on);
      i.classList.toggle('ph', !on);
    });
  }

  function syncChrome() {
    if (!S.data) return;
    const p = S.currentProfile();
    if (p) {
      const av = $('#avatarMini');
      av.textContent = (p.name || '?').trim().charAt(0) || '?';
      av.style.setProperty('--av', `var(--c-${p.color})`);
      $('#btnProfile').dataset.tip = `${p.name}|Cambiar de persona`;
    }
    const on = S.data.settings.sound;
    const btn = $('#btnSound');
    btn.innerHTML = ui.icon(on ? 'speaker-high' : 'speaker-slash');
    btn.setAttribute('aria-pressed', on);
    btn.dataset.tip = on ? 'Sonido activado|Tecla S' : 'Sonido silenciado|Tecla S';
    document.documentElement.classList.toggle('reduce-motion', !!S.data.settings.reduceMotion);
  }
  app.syncChrome = syncChrome;

  function resolvedTheme() {
    if (!S.data) return document.documentElement.dataset.theme || 'light';
    const pref = S.data.settings.theme;
    if (pref === 'light' || pref === 'dark') return pref;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  app.applyTheme = (animate, origin) => {
    const next = resolvedTheme();
    const html = document.documentElement;
    if (html.dataset.theme === next) return;
    const set = () => {
      html.dataset.theme = next;
      HA.atom.syncVideos();
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'light' ? '#f2f2f7' : '#000000');
    };
    if (animate && document.startViewTransition && !ui.reduced()) {
      const x = origin ? origin.x : window.innerWidth - 80;
      const y = origin ? origin.y : 40;
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const vt = document.startViewTransition(set);
      vt.ready
        .then(() => {
          html.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 620, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', pseudoElement: '::view-transition-new(root)' }
          );
        })
        .catch(() => {});
    } else {
      set();
    }
  };

  function toggleSound() {
    app.mute(() => S.setSetting('sound', !S.data.settings.sound));
    syncChrome();
    if (S.data.settings.sound) HA.sound.tap();
    ui.toast({
      title: S.data.settings.sound ? 'Sonido activado' : 'Sonido silenciado',
      icon: S.data.settings.sound ? 'speaker-high' : 'speaker-slash',
      tone: 'muted',
      duration: 1800,
    });
  }

  function bindChrome() {
    $('#nav').addEventListener('click', (e) => {
      const a = e.target.closest('.nav-item');
      if (a && a.dataset.view !== app.state.view) HA.sound.tab();
    });
    $('#btnSound').addEventListener('click', toggleSound);
    $('#btnTheme').addEventListener('click', (e) => {
      const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
      app.mute(() => S.setSetting('theme', next));
      const r = e.currentTarget.getBoundingClientRect();
      app.applyTheme(true, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      HA.sound.theme();
    });
    $('#btnSettings').addEventListener('click', () => HA.settings.open());
    $('#btnProfile').addEventListener('click', () => app.switchProfile());

    window.addEventListener('hashchange', () => {
      const instant = instantNext;
      instantNext = false;
      navigate(viewFromHash(), { instant });
    });

    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (S.data.settings.theme === 'system') app.applyTheme(true);
    });

    // sombra de la barra al hacer scroll (sin escuchar 'scroll')
    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    document.body.prepend(sentinel);
    new IntersectionObserver(([en]) => {
      $('#chrome').classList.toggle('is-scrolled', !en.isIntersecting);
    }).observe(sentinel);

    // cambio de día con la app abierta
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      const now = U.todayISO();
      if (now !== lastToday) {
        if (app.state.date === lastToday) app.state.date = now;
        lastToday = now;
        app.rerender();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!app.ready || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      if (document.querySelector('dialog[open]')) return;
      const k = e.key;
      if (/^[1-6]$/.test(k)) {
        const view = ORDER[+k - 1];
        if (view !== app.state.view) {
          instantNext = true;
          location.hash = `#${view}`;
        }
        e.preventDefault();
        return;
      }
      const lk = k.toLowerCase();
      if (lk === 'n') { e.preventDefault(); HA.editor.open(); return; }
      if (lk === 's') { e.preventDefault(); toggleSound(); return; }
      if (lk === 'p') { e.preventDefault(); HA.report.print(); return; }
      const mod = HA.views[app.state.view];
      if (mod && mod.onKey && mod.onKey(e)) e.preventDefault();
    });
  }

  /* ---------- inicio: ¿quién está aquí? ---------- */
  const start = { resolve: null, color: 0, managing: false };

  function initial(name) {
    const t = String(name || '?').trim();
    return U.esc(t ? t.charAt(0) : '?');
  }

  function renderWho() {
    const list = S.profiles();
    const grid = $('#whoGrid');
    grid.innerHTML =
      list
        .map((p, i) => {
          const sum = S.profileSummary(p.id);
          const name = U.esc(p.name || 'Sin nombre');
          return `
          <button type="button" class="who-card" data-pid="${p.id}" style="--av: var(--c-${p.color}); --i:${i}"
            aria-label="${start.managing ? `Eliminar a ${name}` : `Entrar como ${name}`}">
            <span class="who-del" aria-hidden="true">${ui.icon('minus', 'bold')}</span>
            <span class="who-avatar">${initial(p.name)}</span>
            <span class="who-name">${name}</span>
            <span class="who-meta">${U.fmt.plural(sum.habits, 'hábito', 'hábitos')} · ${U.fmt.num(sum.checkins)} check-ins</span>
          </button>`;
        })
        .join('') +
      `<button type="button" class="who-card who-add" data-add style="--i:${list.length}" aria-label="Agregar una persona">
        <span class="who-avatar">${ui.icon('plus', 'bold')}</span>
        <span class="who-name">Agregar persona</span>
        <span class="who-meta">Empieza desde cero</span>
      </button>`;
    const manage = $('#whoManage');
    manage.hidden = !list.length;
    manage.innerHTML = start.managing ? `${ui.icon('check', 'bold')} <span>Listo</span>` : `${ui.icon('pencil-simple')} <span>Administrar</span>`;
    $('#who').classList.toggle('is-managing', start.managing);
  }

  function showWho() {
    const intro = $('#intro');
    const who = $('#who');
    const form = $('#introForm');
    form.hidden = true;
    form.classList.remove('is-in', 'is-out');
    start.managing = false;
    who.classList.remove('is-picking');
    renderWho();
    who.hidden = false;
    intro.classList.add('has-who');
    const first = who.querySelector('.who-card');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 300);
  }

  function showForm(canCancel) {
    const intro = $('#intro');
    const who = $('#who');
    const form = $('#introForm');
    who.hidden = true;
    intro.classList.add('has-who');
    start.color = S.profiles().length % 8;
    const colors = $('#introColors');
    colors.innerHTML = HA.HABIT_COLORS.map(
      (label, i) => `<button type="button" class="swatch${i === start.color ? ' is-active' : ''}" data-color="${i}" style="--sw: var(--c-${i})" aria-pressed="${i === start.color}" aria-label="Color ${label}"></button>`
    ).join('');
    $('#introCancel').hidden = !canCancel;
    $('#introErr').hidden = true;
    const input = $('#introName');
    input.value = '';
    input.removeAttribute('aria-invalid');
    form.classList.remove('is-out', 'is-in');
    form.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => form.classList.add('is-in')));
    setTimeout(() => input.focus(), 120);
  }

  function enter(id, name, isNew) {
    const reduced = ui.reduced();
    HA.sound.unlock();
    S.selectProfile(id);
    app.state.date = U.todayISO();
    app.state.month = U.monthOf(app.state.date);
    app.state.week = U.weekStartISO(app.state.date);
    app.applyTheme(false);
    syncChrome();
    HA.sound.goal();
    // la vista se construye cuando la animación de la tarjeta ya arrancó (sin tirones)
    setTimeout(() => renderView(app.state.view, { defer: true }), reduced ? 0 : 380);
    // la tarjeta elegida se queda un instante; luego aparece el saludo centrado
    setTimeout(() => {
      $('#who').hidden = true;
      $('#introForm').hidden = true;
      const hello = $('#introHello');
      hello.classList.remove('is-in', 'is-delayed');
      void hello.offsetWidth;
      hello.innerHTML = `${isNew ? 'Bienvenido' : U.greeting()}, <span>${U.esc(name)}</span>`;
      hello.classList.add('is-in');
    }, reduced ? 0 : 520);
    setTimeout(closeStart, reduced ? 250 : 1900);
  }

  function closeStart() {
    const intro = $('#intro');
    const reduced = ui.reduced();
    intro.classList.add('is-leaving');
    document.body.classList.remove('is-intro');
    const done = start.resolve;
    start.resolve = null;
    if (done) done();
    HA.sound.voice();
    setTimeout(() => {
      intro.hidden = true;
      intro.classList.remove('is-leaving', 'has-who');
      $('#who').hidden = true;
      $('#introForm').hidden = true;
      const hello = $('#introHello');
      hello.classList.remove('is-in', 'is-delayed');
      hello.textContent = '';
    }, reduced ? 60 : 900);
  }

  function openStart({ animateIntro }) {
    const intro = $('#intro');
    const reduced = ui.reduced();
    intro.hidden = false;
    intro.classList.remove('is-leaving', 'has-who');
    intro.classList.toggle('is-reduced', reduced);
    document.body.classList.add('is-intro');
    $('#who').hidden = true;
    $('#introForm').hidden = true;
    HA.atom.syncVideos();
    HA.atom.primeVideos(intro);
    const wait = animateIntro && !reduced ? 1500 : 250;
    setTimeout(() => (S.profiles().length ? showWho() : showForm(false)), wait);
    return new Promise((resolve) => { start.resolve = resolve; });
  }

  function bindStart() {
    $('#whoGrid').addEventListener('click', async (e) => {
      const card = e.target.closest('.who-card');
      if (!card || $('#who').classList.contains('is-picking')) return;
      if (card.hasAttribute('data-add')) {
        HA.sound.open();
        showForm(true);
        return;
      }
      const id = card.dataset.pid;
      const p = S.profiles().find((x) => x.id === id);
      if (!p) return;
      if (start.managing) {
        const ok = await ui.confirm({
          title: `¿Eliminar a ${p.name}?`,
          message: 'Se borrarán sus hábitos, metas y notas de este dispositivo. No se puede deshacer.',
          confirm: 'Eliminar',
        });
        if (!ok) return;
        S.removeProfile(id);
        HA.sound.remove();
        if (!S.profiles().length) {
          start.managing = false;
          showForm(false);
        } else {
          renderWho();
        }
        return;
      }
      $('#who').classList.add('is-picking');
      card.classList.add('is-chosen');
      enter(id, p.name, false);
    });

    $('#whoManage').addEventListener('click', () => {
      start.managing = !start.managing;
      HA.sound.tap();
      renderWho();
    });

    $('#introColors').addEventListener('click', (e) => {
      const sw = e.target.closest('.swatch');
      if (!sw) return;
      start.color = +sw.dataset.color;
      ui.$$('.swatch', $('#introColors')).forEach((b) => {
        b.classList.toggle('is-active', b === sw);
        b.setAttribute('aria-pressed', b === sw);
      });
      HA.sound.tap();
    });

    $('#introCancel').addEventListener('click', () => {
      HA.sound.close();
      showWho();
    });

    $('#introName').addEventListener('input', () => {
      $('#introErr').hidden = true;
      $('#introName').removeAttribute('aria-invalid');
    });

    $('#introForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = $('#introForm');
      const input = $('#introName');
      const name = input.value.trim();
      if (!name) {
        $('#introErr').hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        if (!ui.reduced()) {
          form.animate(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
            { duration: 320 }
          );
        }
        return;
      }
      const id = S.createProfile(name, start.color);
      form.classList.add('is-out');
      enter(id, name, true);
      if (S.migrated) {
        setTimeout(() => ui.toast({
          title: 'Datos importados',
          message: 'Trajimos tus hábitos, metas y notas de la versión anterior.',
          icon: 'arrows-clockwise',
          duration: 6500,
        }), 1800);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || $('#intro').hidden || $('#introForm').hidden || $('#introCancel').hidden) return;
      if (document.querySelector('dialog[open]')) return;
      showWho();
    });
  }

  app.switchProfile = async () => {
    if (!app.ready) return;
    app.ready = false;
    for (const sel of ['#sheet', '#modal']) {
      const d = $(sel);
      if (d.open) await ui.dialog.close(d);
    }
    HA.sound.open();
    openStart({ animateIntro: false }).then(() => {
      app.ready = true;
      postRender(true);
    });
  };

  /* ---------- arranque ---------- */
  function init() {
    S.load();
    app.root = $('#view');
    // sin perfil cargado (p. ej. mientras se cambia de persona) la vista no responde
    ['click', 'submit', 'change', 'dblclick'].forEach((ev) =>
      app.root.addEventListener(ev, (e) => {
        if (!S.data) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      }, true)
    );
    ui.initTooltips();
    ui.initSpotlight();
    ui.initPress();
    ui.initPressFx();
    ['#modal', '#sheet', '#confirm'].forEach((sel) => ui.dialog.wire($(sel)));
    bindChrome();
    bindStart();

    const view = viewFromHash();
    app.state.view = view;
    updateNav(view);

    openStart({ animateIntro: true }).then(() => {
      app.ready = true;
      postRender(true);
    });

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
