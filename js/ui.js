/* ==========================================================================
   Hábitos Atómicos — kit de interfaz: íconos, anillos, diálogos, toasts,
   tooltips, revelado al hacer scroll y efectos (partículas, confeti, onda)
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const ui = (HA.ui = {});

  ui.$ = (s, r) => (r || document).querySelector(s);
  ui.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  ui.reduced = () =>
    !!(HA.store && HA.store.data && HA.store.data.settings.reduceMotion) ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  ui.icon = (name, weight, cls) => {
    const w = weight || 'regular';
    return `<i class="${w === 'regular' ? 'ph' : 'ph-' + w} ph-${name}${cls ? ' ' + cls : ''}" aria-hidden="true"></i>`;
  };

  ui.cssVar = (name, el) => getComputedStyle(el || document.documentElement).getPropertyValue(name).trim();

  /* ---------- anillos de progreso ---------- */
  let ringSeq = 0;
  ui.ring = ({ size = 120, stroke = 10, pct = 0, cls = '', label = '' } = {}) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const half = size / 2;
    const id = `rg${++ringSeq}`;
    return `<svg class="ring ${cls}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${U.esc(label || pct + '% completado')}">
      <defs>
        <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style="stop-color:var(--ring-a)"/>
          <stop offset="1" style="stop-color:var(--ring-b)"/>
        </linearGradient>
      </defs>
      <circle class="ring-track" cx="${half}" cy="${half}" r="${r}" stroke-width="${stroke}"/>
      <circle class="ring-bar" cx="${half}" cy="${half}" r="${r}" stroke-width="${stroke}" style="stroke:url(#${id})"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${c.toFixed(2)}" data-c="${c.toFixed(2)}" data-pct="${pct}"
        transform="rotate(-90 ${half} ${half})"/>
    </svg>`;
  };

  /** Divide un título en palabras para animarlas una por una. */
  ui.splitWords = (el) => {
    if (!el || el.dataset.split) return;
    el.dataset.split = '1';
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) {
              frag.appendChild(document.createTextNode(p));
              return;
            }
            const w = document.createElement('span');
            w.className = 'w';
            w.style.setProperty('--wi', i++);
            w.textContent = p;
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
    el.classList.add('is-split');
  };

  /** Onda expansiva (al completar un hábito). */
  ui.shockwave = (x, y, color) => {
    if (ui.reduced()) return;
    const layer = ui.$('#fxLayer');
    const s = document.createElement('span');
    s.className = 'shock';
    s.style.cssText = `left:${x - 22}px;top:${y - 22}px;border-color:${color};`;
    layer.appendChild(s);
    s.animate(
      [{ transform: 'scale(0.45)', opacity: 0.85, borderWidth: '3px' }, { transform: 'scale(2.4)', opacity: 0, borderWidth: '1px' }],
      { duration: 700, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    ).onfinish = () => s.remove();
  };
  ui.setRing = (svgOrBar, pct) => {
    const bar = svgOrBar.classList.contains('ring-bar') ? svgOrBar : svgOrBar.querySelector('.ring-bar');
    if (!bar) return;
    const c = parseFloat(bar.dataset.c);
    bar.dataset.pct = pct;
    bar.style.strokeDashoffset = String(c - (c * U.clamp(pct, 0, 100)) / 100);
    bar.classList.toggle('is-full', pct >= 100);
  };
  ui.animateRings = (root) => {
    const bars = ui.$$('.ring-bar', root);
    requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach((b) => ui.setRing(b, +b.dataset.pct))));
  };

  /* ---------- contadores ---------- */
  ui.countUp = (el, to, opts) => {
    const o = Object.assign({ duration: 900, decimals: 0, suffix: '', from: 0 }, opts || {});
    const render = (v) => {
      el.textContent = (o.decimals ? v.toFixed(o.decimals) : Math.round(v)) + o.suffix;
    };
    if (ui.reduced()) return render(to);
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const frame = (now) => {
      const t = Math.min(1, (now - t0) / o.duration);
      render(o.from + (to - o.from) * ease(t));
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  ui.countAll = (root) => {
    ui.$$('[data-count]', root).forEach((el) => {
      ui.countUp(el, parseFloat(el.dataset.count) || 0, {
        suffix: el.dataset.suffix || '',
        decimals: +(el.dataset.decimals || 0),
      });
    });
  };
  /** Cambia un número con un pequeño "tick" vertical. */
  ui.tick = (el, value) => {
    if (!el) return;
    const v = String(value);
    if (el.textContent === v) return;
    el.textContent = v;
    if (ui.reduced()) return;
    el.animate(
      [{ transform: 'translateY(40%)', opacity: 0, filter: 'blur(2px)' }, { transform: 'none', opacity: 1, filter: 'blur(0)' }],
      { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    );
  };

  /* ---------- revelado al entrar en pantalla ---------- */
  let io = null;
  ui.reveal = (root) => {
    const els = ui.$$('.reveal', root);
    if (ui.reduced() || !('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('is-in'));
      return;
    }
    if (!io) {
      io = new IntersectionObserver(
        (entries) => {
          const vis = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
          vis.forEach((en, i) => {
            en.target.style.setProperty('--d', `${Math.min(i, 9) * 65}ms`);
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          });
        },
        { rootMargin: '0px 0px -4% 0px', threshold: 0.01 }
      );
    }
    els.forEach((e) => io.observe(e));
  };

  /* ---------- control segmentado con indicador deslizante ---------- */
  ui.seg = ({ name, options, value, cls = '', label = '' }) => {
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    return `<div class="seg ${cls}" role="tablist" aria-label="${U.esc(label)}" data-seg="${name}" style="--n:${options.length};--idx:${idx}">
      <span class="seg-thumb" aria-hidden="true"></span>
      ${options
        .map(
          (o, i) => `<button type="button" role="tab" class="seg-btn${i === idx ? ' is-active' : ''}" data-value="${o.value}" aria-selected="${i === idx}">${o.icon ? ui.icon(o.icon) : ''}<span>${U.esc(o.label)}</span></button>`
        )
        .join('')}
    </div>`;
  };
  ui.setSeg = (seg, value) => {
    const btns = ui.$$('.seg-btn', seg);
    const idx = btns.findIndex((b) => b.dataset.value === value);
    if (idx < 0) return;
    seg.style.setProperty('--idx', idx);
    btns.forEach((b, i) => {
      b.classList.toggle('is-active', i === idx);
      b.setAttribute('aria-selected', i === idx);
    });
  };

  /* ---------- toasts ---------- */
  const toastBox = () => ui.$('#toasts');
  ui.toast = ({ title, message = '', icon = 'check-circle', tone = 'default', action = null, duration = 4200 }) => {
    const box = toastBox();
    const el = document.createElement('div');
    el.className = `toast tone-${tone}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <span class="toast-icon">${ui.icon(icon, 'fill')}</span>
      <div class="toast-text"><strong>${U.esc(title)}</strong>${message ? `<span>${U.esc(message)}</span>` : ''}</div>
      ${action ? `<button type="button" class="toast-action">${U.esc(action.label)}</button>` : ''}
      <button type="button" class="toast-close" aria-label="Cerrar aviso">${ui.icon('x', 'bold')}</button>`;
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();

    let remaining = duration;
    let started = performance.now();
    let timer = null;
    const dismiss = () => {
      clearTimeout(timer);
      el.classList.remove('is-in');
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 260);
    };
    const run = () => {
      started = performance.now();
      timer = setTimeout(dismiss, remaining);
    };
    const pause = () => {
      clearTimeout(timer);
      remaining -= performance.now() - started;
    };
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', run);
    el.querySelector('.toast-close').addEventListener('click', dismiss);
    if (action) {
      el.querySelector('.toast-action').addEventListener('click', () => {
        action.onClick();
        dismiss();
      });
    }
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    run();
    return { dismiss };
  };

  /* ---------- diálogos (modal / panel lateral) ---------- */
  ui.dialog = {
    open(dlg, html) {
      if (html != null) dlg.innerHTML = html;
      dlg.classList.remove('is-closing', 'is-open');
      if (!dlg.open) dlg.showModal();
      void dlg.offsetWidth;
      dlg.classList.add('is-open');
    },
    close(dlg) {
      return new Promise((resolve) => {
        if (!dlg.open) return resolve();
        dlg.classList.remove('is-open');
        dlg.classList.add('is-closing');
        const done = () => {
          dlg.classList.remove('is-closing');
          if (dlg.open) dlg.close();
          dlg._dismiss = null;
          resolve();
        };
        if (ui.reduced()) return done();
        setTimeout(done, dlg.classList.contains('sheet') ? 260 : 190);
      });
    },
    wire(dlg) {
      dlg.addEventListener('cancel', (e) => {
        e.preventDefault();
        if (dlg._dismiss) dlg._dismiss();
        else { HA.sound.close(); ui.dialog.close(dlg); }
      });
      dlg.addEventListener('mousedown', (e) => {
        if (e.target === dlg) {
          if (dlg._dismiss) dlg._dismiss();
          else { HA.sound.close(); ui.dialog.close(dlg); }
        }
      });
      dlg.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) {
          HA.sound.close();
          if (dlg._dismiss) dlg._dismiss();
          else ui.dialog.close(dlg);
        }
      });
    },
  };

  ui.confirm = ({ title, message = '', confirm = 'Confirmar', cancel = 'Cancelar', tone = 'danger', icon = 'warning' }) =>
    new Promise((resolve) => {
      const dlg = ui.$('#confirm');
      const html = `
        <div class="dlg-panel confirm-panel">
          <span class="confirm-icon tone-${tone}">${ui.icon(icon, 'fill')}</span>
          <h2 id="confirmTitle">${U.esc(title)}</h2>
          ${message ? `<p>${U.esc(message)}</p>` : ''}
          <div class="dlg-actions">
            <button type="button" class="btn btn-ghost" data-r="0">${U.esc(cancel)}</button>
            <button type="button" class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}" data-r="1">${U.esc(confirm)}</button>
          </div>
        </div>`;
      let settled = false;
      const finish = (v) => {
        if (settled) return;
        settled = true;
        ui.dialog.close(dlg);
        resolve(v);
      };
      dlg._dismiss = () => finish(false);
      dlg.onclick = (e) => {
        const b = e.target.closest('[data-r]');
        if (b) finish(b.dataset.r === '1');
      };
      ui.dialog.open(dlg, html);
      const focusBtn = dlg.querySelector(tone === 'danger' ? '[data-r="0"]' : '[data-r="1"]');
      if (focusBtn) focusBtn.focus();
    });

  /* ---------- tooltip global (data-tip="Título|detalle") ---------- */
  const tip = { el: null, target: null, timer: null, lastHide: 0 };
  function placeTip(target) {
    const r = target.getBoundingClientRect();
    const el = tip.el;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    let y = r.top - h - 10;
    x = U.clamp(x, 8, window.innerWidth - w - 8);
    if (y < 8) y = r.bottom + 10;
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }
  function showTip(target, instant) {
    const raw = target.dataset.tip;
    if (!raw) return;
    const [head, ...rest] = raw.split('|');
    tip.el.innerHTML = `<strong>${U.esc(head)}</strong>${rest.map((l) => `<span>${U.esc(l)}</span>`).join('')}`;
    tip.el.classList.toggle('is-instant', !!instant);
    placeTip(target);
    tip.el.classList.add('is-on');
  }
  function hideTip() {
    clearTimeout(tip.timer);
    if (tip.el.classList.contains('is-on')) tip.lastHide = performance.now();
    tip.el.classList.remove('is-on');
    tip.target = null;
  }
  ui.hideTip = () => tip.el && hideTip();
  ui.initTooltips = () => {
    tip.el = ui.$('#tooltip');
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const t = e.target.closest('[data-tip]');
      if (t === tip.target) return;
      if (!t) return hideTip();
      clearTimeout(tip.timer);
      tip.target = t;
      const warm = tip.el.classList.contains('is-on') || performance.now() - tip.lastHide < 450;
      if (warm) showTip(t, true);
      else tip.timer = setTimeout(() => tip.target === t && showTip(t, false), 380);
    });
    document.addEventListener('pointerleave', hideTip);
    document.addEventListener('focusin', (e) => {
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (t && t.matches(':focus-visible')) {
        tip.target = t;
        showTip(t, true);
      }
    });
    document.addEventListener('focusout', hideTip);
    window.addEventListener('scroll', hideTip, { passive: true, capture: true });
    document.addEventListener('pointerdown', hideTip);
  };

  /* ---------- brillo que nace del dedo/cursor al presionar cualquier botón ---------- */
  const PRESSABLE = '.btn, .chip, .icon-btn, .seg-btn, .nav-item, .toast-action, .wk-day, .ov-row, .archive-item, .day-opt, .icon-opt, .who-card, .streak-row, .quote-card, .kpi';
  ui.initPress = () => {
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (ui.reduced()) return;
        const el = e.target.closest ? e.target.closest(PRESSABLE) : null;
        if (!el || el.disabled) return;
        const r = el.getBoundingClientRect();
        const size = Math.max(r.width, r.height) * 2.4;
        const s = document.createElement('span');
        s.className = 'press-glow';
        s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px;`;
        el.appendChild(s);
        s.animate(
          [{ transform: 'scale(0.08)', opacity: 0.3 }, { transform: 'scale(1)', opacity: 0 }],
          { duration: 720, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
        ).onfinish = () => s.remove();
      },
      { passive: true }
    );
  };

  /* ---------- animaciones distintas al presionar según el elemento ---------- */
  const FX = {
    shake: {
      k: [
        { transform: 'translateX(0) rotate(0)' },
        { transform: 'translateX(-6px) rotate(-1.6deg)' },
        { transform: 'translateX(5px) rotate(1.4deg)' },
        { transform: 'translateX(-4px) rotate(-0.8deg)' },
        { transform: 'translateX(2px) rotate(0.4deg)' },
        { transform: 'translateX(0) rotate(0)' },
      ],
      t: 520,
      e: 'ease-out',
    },
    jelly: {
      k: [
        { transform: 'scale(1, 1)' },
        { transform: 'scale(1.06, 0.93)' },
        { transform: 'scale(0.96, 1.05)' },
        { transform: 'scale(1.02, 0.98)' },
        { transform: 'scale(1, 1)' },
      ],
      t: 620,
      e: 'ease-out',
    },
    spin: { k: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], t: 760, e: 'cubic-bezier(0.65, 0, 0.35, 1)' },
    bounce: {
      k: [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-9px)' },
        { transform: 'translateY(0)' },
        { transform: 'translateY(-3px)' },
        { transform: 'translateY(0)' },
      ],
      t: 640,
      e: 'ease-out',
    },
    pop: { k: [{ transform: 'scale(1)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }], t: 420, e: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    ignite: {
      k: [
        { transform: 'scale(1) rotate(0)' },
        { transform: 'scale(1.55) rotate(-14deg)' },
        { transform: 'scale(0.9) rotate(8deg)' },
        { transform: 'scale(1.1) rotate(-4deg)' },
        { transform: 'scale(1) rotate(0)' },
      ],
      t: 700,
      e: 'ease-out',
    },
    flip: {
      k: [{ transform: 'perspective(700px) rotateX(0)' }, { transform: 'perspective(700px) rotateX(14deg) scale(0.98)' }, { transform: 'perspective(700px) rotateX(0)' }],
      t: 520,
      e: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  };
  ui.fx = (el, type) => {
    if (!el || ui.reduced() || !FX[type]) return;
    const f = FX[type];
    el.animate(f.k, { duration: f.t, easing: f.e });
  };

  /** Pasa a otro pensamiento con un fundido difuminado. */
  ui.nextQuote = (card) => {
    const text = card.querySelector('.quote-text');
    if (!text) return;
    const next = (Number(card.dataset.qi || 0) + 1) % HA.QUOTES.length;
    card.dataset.qi = next;
    if (ui.reduced()) {
      text.textContent = HA.QUOTES[next];
      return;
    }
    const out = text.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(8px)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
    setTimeout(() => {
      out.cancel();
      text.textContent = HA.QUOTES[next];
      text.animate(
        [{ opacity: 0, filter: 'blur(8px)', transform: 'translateY(8px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }],
        { duration: 420, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
      );
    }, 180);
  };

  // Qué animación lleva cada cosa al tocarla
  const PRESS_FX = [
    ['.streak-row', 'shake', (el) => ui.fx(el.querySelector('.streak-val i'), 'ignite')],
    ['.banner', 'shake'],
    ['.kpi', 'jelly', (el) => ui.fx(el.querySelector('.kpi-label i'), 'spin')],
    ['.mini-kpi', 'jelly'],
    ['.hero-ring', 'jelly'],
    ['.gs-ring', 'jelly'],
    ['.quote-card', 'flip', (el) => ui.nextQuote(el)],
    ['.pearl', 'pop'],
    ['.count', 'pop'],
    ['.tag', 'pop'],
    ['.brand', null, (el) => ui.fx(el.querySelector('.brand-mark'), 'spin')],
    ['#btnProfile', null, (el) => ui.fx(el.querySelector('.avatar-mini'), 'spin')],
    ['.swatch', 'pop'],
    ['.day-opt', 'bounce'],
    ['.icon-opt', 'pop'],
    ['.hb-row', null, (el) => ui.fx(el.querySelector('.habit-tile'), 'bounce')],
    ['.advice-item', null, (el) => ui.fx(el.querySelector('.advice-icon'), 'ignite')],
    ['.context-list li', 'shake'],
    ['.legend li', 'pop'],
  ];
  ui.initPressFx = () => {
    const run = (target) => {
      for (const [sel, type, extra] of PRESS_FX) {
        const el = target.closest ? target.closest(sel) : null;
        if (!el) continue;
        if (type) ui.fx(el, type);
        if (extra) extra(el);
        return;
      }
    };
    document.addEventListener('click', (e) => run(e.target));
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.quote-card')) {
        e.preventDefault();
        run(e.target);
      }
    });
  };

  /* ---------- borde iluminado que sigue al cursor ---------- */
  ui.initSpotlight = () => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0;
    let last = null;
    let ev = null;
    document.addEventListener(
      'pointermove',
      (e) => {
        ev = e;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const b = ev.target && ev.target.closest ? ev.target.closest('.bezel, .kpi, .quote-card, .habit-list') : null;
          if (last && last !== b) {
            last.style.removeProperty('--mx');
            last.style.removeProperty('--my');
            last.style.removeProperty('transform');
            last.classList.remove('is-tilting');
          }
          last = b;
          if (b) {
            const r = b.getBoundingClientRect();
            const x = ev.clientX - r.left;
            const y = ev.clientY - r.top;
            b.style.setProperty('--mx', `${x}px`);
            b.style.setProperty('--my', `${y}px`);
            // inclinación 3D sutil en tarjetas pequeñas
            if (b.matches('.kpi, .quote-card, .side-card') && !ui.reduced()) {
              const rx = ((y / r.height) - 0.5) * -5;
              const ry = ((x / r.width) - 0.5) * 5;
              b.classList.add('is-tilting');
              b.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-2px)`;
            }
          }
        });
      },
      { passive: true }
    );
  };

  /* ---------- efectos ---------- */
  ui.ripple = (el, x, y, color) => {
    if (ui.reduced()) return;
    const r = el.getBoundingClientRect();
    const cx = x == null || (x === 0 && y === 0) ? r.width / 2 : x - r.left;
    const cy = x == null || (x === 0 && y === 0) ? r.height / 2 : y - r.top;
    const size = Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy)) * 2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;${color ? `background:${color};` : ''}`;
    el.appendChild(s);
    s.animate(
      [{ transform: 'scale(0.04)', opacity: 0.38 }, { transform: 'scale(1)', opacity: 0 }],
      { duration: 720, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    ).onfinish = () => s.remove();
  };

  ui.burst = (x, y, color, count) => {
    if (ui.reduced()) return;
    const layer = ui.$('#fxLayer');
    const n = count || 12;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      const size = 3 + Math.random() * 4;
      const angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.5;
      const dist = 26 + Math.random() * 34;
      p.className = 'spark';
      p.style.cssText = `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;background:${color};`;
      layer.appendChild(p);
      p.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0.2)`, opacity: 0 },
        ],
        { duration: 560 + Math.random() * 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
      ).onfinish = () => p.remove();
    }
  };

  let confettiRunning = false;
  ui.confetti = (ox, oy) => {
    if (ui.reduced() || confettiRunning) return;
    const canvas = ui.$('#fxCanvas');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const palette = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ui.cssVar(`--c-${i}`)).concat([ui.cssVar('--accent'), ui.cssVar('--accent')]);
    const x0 = ox == null ? W / 2 : ox;
    const y0 = oy == null ? H / 3 : oy;
    const parts = Array.from({ length: 140 }, () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const v = 7 + Math.random() * 9;
      return {
        x: x0, y: y0,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: 5 + Math.random() * 6, h: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        color: palette[(Math.random() * palette.length) | 0],
        shape: Math.random() < 0.3 ? 'circle' : 'rect',
      };
    });
    confettiRunning = true;
    canvas.classList.add('is-on');
    const t0 = performance.now();
    const life = 2600;
    const frame = (now) => {
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      const fade = t > life - 700 ? Math.max(0, (life - t) / 700) : 1;
      parts.forEach((p) => {
        p.vy += 0.24;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.h / 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1);
        }
        ctx.restore();
      });
      if (t < life) requestAnimationFrame(frame);
      else {
        ctx.clearRect(0, 0, W, H);
        canvas.classList.remove('is-on');
        confettiRunning = false;
      }
    };
    requestAnimationFrame(frame);
  };

  /* ---------- utilidades varias ---------- */
  ui.download = (filename, text, type) => {
    const blob = new Blob([text], { type: type || 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  };

  /** Barra de navegación de período (‹ etiqueta ›). */
  ui.periodNav = ({ label, prevLabel, nextLabel, nextDisabled = false, picker = '', todayBtn = '' }) => `
    <div class="period-nav">
      <button type="button" class="icon-btn" data-act="prev" aria-label="${U.esc(prevLabel)}">${ui.icon('caret-left', 'bold')}</button>
      <span class="period-label">${picker || U.esc(label)}</span>
      <button type="button" class="icon-btn" data-act="next" aria-label="${U.esc(nextLabel)}" ${nextDisabled ? 'disabled' : ''}>${ui.icon('caret-right', 'bold')}</button>
      ${todayBtn}
    </div>`;

  /** Ícono de hábito (con soporte para emoji heredado). */
  ui.habitIcon = (h, weight) => ui.icon(h.icon, weight || 'fill');

  ui.emptyState = ({ icon = 'sparkle', title, text, action = '' }) => `
    <div class="empty">
      <span class="empty-icon">${ui.icon(icon, 'fill')}</span>
      <p class="empty-title">${U.esc(title)}</p>
      ${text ? `<p class="empty-text">${U.esc(text)}</p>` : ''}
      ${action}
    </div>`;
})();
