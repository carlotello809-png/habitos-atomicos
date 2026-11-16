/* ==========================================================================
   Vista: HOY — tu día, el átomo, las tarjetas de hábito y la semana
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const S = HA.store;
  const St = HA.stats;
  const ui = HA.ui;

  const state = () => HA.app.state;

  function subline(h) {
    const parts = [];
    if (h.cue) parts.push(h.cue);
    if (h.mini) parts.push(h.mini);
    if (!parts.length) parts.push(h.identity || HA.editor.daysLabel(h.days));
    return parts.join(' · ');
  }

  function dotClass(h, d, sel) {
    const fut = d > U.todayISO();
    const done = S.isDone(h.id, d);
    const sch = St.scheduled(h, d);
    return `wdot ${fut ? 'is-future' : done ? 'is-done' : sch ? 'is-miss' : 'is-off'}${d === sel ? ' is-sel' : ''}`;
  }

  function weekDots(h, date) {
    let out = '';
    for (let i = 6; i >= 0; i--) {
      const d = U.addDaysISO(date, -i);
      out += `<li class="${dotClass(h, d, date)}" data-date="${d}"><span class="wdot-mark"></span><span class="wdot-l">${U.DOW_LETTER[U.wdISO(d)]}</span></li>`;
    }
    return out;
  }

  function card(h, date, opts) {
    const done = S.isDone(h.id, date);
    const warn = opts.isToday && !opts.rest && St.missedYesterday(h, date);
    const upTo = date <= U.todayISO() ? date : U.todayISO();
    const streak = St.currentStreak(h, upTo);
    const name = U.esc(h.name);
    return `
      <article class="habit-card reveal${done ? ' is-done' : ''}${warn ? ' is-warn' : ''}${opts.rest ? ' is-rest' : ''}" data-hid="${h.id}" style="--hc: var(--c-${h.color})">
        <button type="button" class="habit-toggle" data-act="toggle" aria-pressed="${done}" aria-label="${name}: ${done ? 'cumplido, toca para desmarcar' : 'pendiente, toca para marcar'}" ${opts.future ? 'disabled' : ''}></button>
        <span class="habit-tile">${ui.icon(h.icon, 'fill')}</span>
        <div class="habit-main">
          <div class="habit-title">
            <h3>${name}</h3>
            ${warn ? `<span class="tag tag-warn">${ui.icon('lightning', 'fill')} No falles dos veces</span>` : ''}
            ${opts.rest ? `<span class="tag">Opcional hoy</span>` : ''}
          </div>
          <p class="habit-sub">${U.esc(subline(h))}</p>
        </div>
        <ol class="habit-week" aria-hidden="true">${weekDots(h, date)}</ol>
        <span class="habit-streak${streak ? ' is-hot' : ''}" aria-label="Racha de ${streak} días">${ui.icon('flame', 'fill')}<span data-streak>${streak}</span></span>
        <span class="habit-check" aria-hidden="true">
          <svg viewBox="0 0 32 32"><circle class="hc-ring" cx="16" cy="16" r="14"/><circle class="hc-fill" cx="16" cy="16" r="14"/><path class="hc-tick" d="M10 16.5l4.2 4.2L22.5 11.5"/></svg>
        </span>
        <button type="button" class="habit-more icon-btn sm" data-act="detail" aria-label="Ver detalles de ${name}">${ui.icon('dots-three-vertical', 'bold')}</button>
      </article>`;
  }

  /** Auras y partículas flotando dentro de la tarjeta principal. */
  function heroFx() {
    const rnd = (i, k) => {
      const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    const pts = Array.from({ length: 16 }, (_, i) => {
      const x = (6 + rnd(i, 1) * 88).toFixed(1);
      const y = (30 + rnd(i, 2) * 65).toFixed(1);
      const s = (2 + rnd(i, 3) * 3.5).toFixed(1);
      const t = (6 + rnd(i, 4) * 7).toFixed(1);
      const d = (rnd(i, 5) * 8).toFixed(1);
      return `<i class="pt" style="--x:${x}%;--y:${y}%;--s:${s}px;--t:${t}s;--dl:-${d}s"></i>`;
    }).join('');
    return `<div class="hero-fx" aria-hidden="true"><span class="hb hb-1"></span><span class="hb hb-2"></span><span class="hb hb-3"></span>${pts}</div>`;
  }

  function heroMessage(s, date, isToday) {
    if (!s.scheduled) return isToday ? 'Hoy no tienes hábitos programados. Descansa con intención.' : 'Ese día no tenías hábitos programados.';
    if (!isToday) {
      if (s.perfect) return `Día perfecto el ${U.fmt.dayShort(date).toLowerCase()}.`;
      return `Registro del ${U.fmt.dayShort(date).toLowerCase()}: puedes completarlo si lo olvidaste.`;
    }
    const left = s.scheduled - s.done;
    if (s.perfect) return 'Día perfecto. Cada check fue un voto por la persona que quieres ser.';
    if (s.done === 0) return 'Empieza por el más fácil: la versión de dos minutos también cuenta.';
    return `Te ${left === 1 ? 'falta' : 'faltan'} ${left} para un día perfecto. Vas bien.`;
  }

  function weekPct(date) {
    const monday = U.weekStartISO(date);
    const end = date < U.todayISO() ? U.addDaysISO(monday, 6) : U.todayISO();
    return St.range(U.rangeDates(monday, end)).pct;
  }

  function topStreak() {
    let best = null;
    S.habits().forEach((h) => {
      const s = St.currentStreak(h);
      if (!best || s > best.s) best = { h, s };
    });
    return best;
  }

  function heroKpis() {
    const ts = topStreak();
    return `
      <div class="hero-kpi"><dt>Días perfectos seguidos</dt><dd data-k="perfect">${St.perfectStreak()}</dd></div>
      <div class="hero-kpi"><dt>Esta semana</dt><dd data-k="week">${weekPct(state().date)}%</dd></div>
      <div class="hero-kpi"><dt>Racha más larga hoy</dt><dd data-k="top">${ts && ts.s ? `${ts.s} <small>${U.esc(ts.h.name)}</small>` : '—'}</dd></div>`;
  }

  function weekCard(date) {
    const monday = U.weekStartISO(date);
    const t = U.todayISO();
    let days = '';
    for (let i = 0; i < 7; i++) {
      const d = U.addDaysISO(monday, i);
      const fut = d > t;
      const s = St.day(d);
      days += `
        <button type="button" class="wk-day${d === date ? ' is-sel' : ''}${d === t ? ' is-today' : ''}${fut ? ' is-future' : ''}${s.perfect ? ' is-perfect' : ''}" data-act="goto" data-date="${d}" ${fut ? 'disabled' : ''}
          aria-label="${U.fmt.long(d)}: ${fut ? 'aún no llega' : `${s.done} de ${s.scheduled}`}">
          ${ui.ring({ size: 44, stroke: 4, pct: fut ? 0 : s.pct, cls: 'ring-xs', label: `${s.pct}%` })}
          <span class="wk-letter">${U.DOW_LETTER[i]}</span>
          <span class="wk-num">${U.parse(d).getDate()}</span>
        </button>`;
    }
    return `
      <article class="bezel side-card reveal" data-card="week">
        <div class="core">
          <div class="card-head">
            <h2 class="card-title">Tu semana</h2>
            <span class="card-meta">${U.fmt.weekRange(monday)}</span>
          </div>
          <div class="wk-row">${days}</div>
        </div>
      </article>`;
  }

  function streaksCard() {
    const list = S.habits()
      .map((h) => ({ h, s: St.currentStreak(h), b: St.bestStreak(h) }))
      .sort((a, b) => b.s - a.s || b.b - a.b)
      .slice(0, 5);
    const rows = list.length
      ? list
          .map(
            ({ h, s, b }) => `
        <li class="streak-row" style="--hc: var(--c-${h.color})">
          <span class="habit-tile tile-sm">${ui.icon(h.icon, 'fill')}</span>
          <span class="streak-name"><span>${U.esc(h.name)}</span><small>Mejor: ${b}</small></span>
          <span class="streak-val${s ? ' is-hot' : ''}">${ui.icon('flame', 'fill')}${s}</span>
        </li>`
          )
          .join('')
      : '<li class="muted small">Crea un hábito para empezar tu primera racha.</li>';
    return `
      <article class="bezel side-card reveal" data-card="streaks">
        <div class="core">
          <div class="card-head">
            <h2 class="card-title">Rachas activas</h2>
            <span class="card-meta">${ui.icon('flame', 'fill')} días</span>
          </div>
          <ul class="streak-list">${rows}</ul>
        </div>
      </article>`;
  }

  function goalsCard(date) {
    const key = U.weekStartISO(date);
    const list = S.goalList('week', key);
    const items = list.length
      ? list
          .map(
            (g) => `
        <li class="mini-goal${g.done ? ' is-done' : ''}" data-gid="${g.id}">
          <button type="button" class="goal-check" data-act="goal" aria-pressed="${g.done}" aria-label="${g.done ? 'Desmarcar' : 'Completar'} meta: ${U.esc(g.text)}"><svg viewBox="0 0 24 24"><use href="#tick"/></svg></button>
          <span class="goal-text">${U.esc(g.text)}</span>
        </li>`
          )
          .join('')
      : '<li class="muted small">Sin metas para esta semana todavía.</li>';
    const done = list.filter((g) => g.done).length;
    return `
      <article class="bezel side-card reveal" data-card="goals">
        <div class="core">
          <div class="card-head">
            <h2 class="card-title">Metas de la semana</h2>
            <span class="card-meta">${done}/${list.length}</span>
          </div>
          <ul class="mini-goals">${items}</ul>
          <form class="quick-add" data-form="goal">
            <input class="input input-sm" name="text" maxlength="140" placeholder="Añadir meta semanal…" autocomplete="off" aria-label="Nueva meta semanal">
            <button type="submit" class="icon-btn sm accent" aria-label="Añadir meta">${ui.icon('plus', 'bold')}</button>
          </form>
          <a class="link-arrow" href="#metas" data-act="all-goals">Ver todas tus metas ${ui.icon('arrow-right')}</a>
        </div>
      </article>`;
  }

  function quoteCard() {
    const q = HA.QUOTES[U.dayOfYear(U.today()) % HA.QUOTES.length];
    return `
      <article class="quote-card reveal">
        <span class="quote-mark" aria-hidden="true">“</span>
        <p class="quote-text">${U.esc(q)}</p>
        <p class="quote-label">${ui.icon('sparkle', 'fill')} Pensamiento del día</p>
      </article>`;
  }

  function render(root) {
    const st = state();
    const t = U.todayISO();
    if (st.date > t) st.date = t;
    const date = st.date;
    const isToday = date === t;
    const habits = S.habits();
    const name = S.data.profile.name;
    const main = habits.filter((h) => h.days.includes(U.wdISO(date)));
    const rest = habits.filter((h) => !h.days.includes(U.wdISO(date)));
    const s = St.day(date);
    const doneSet = new Set(habits.filter((h) => S.isDone(h.id, date)).map((h) => h.id));
    const warns = isToday ? main.filter((h) => St.missedYesterday(h, date)) : [];

    const headline = isToday
      ? `${U.greeting()}${name ? `, <em>${U.esc(name)}</em>` : ''}.`
      : `${U.cap(U.DOW_LONG[U.wdISO(date)])} <em>${U.parse(date).getDate()}</em>`;

    const lede = isToday
      ? 'Cada check es un voto por la persona que quieres ser.'
      : `Estás viendo el ${U.fmt.longYear(date)}. Puedes corregir lo que olvidaste marcar.`;

    root.innerHTML = `
      <section class="page page-today">
        <header class="page-head reveal">
          <div class="page-head-main">
            <p class="eyebrow"><span class="eyebrow-dot"></span>${U.cap(U.fmt.long(date))}</p>
            <h1 class="display">${headline}</h1>
            <p class="lede">${lede}</p>
          </div>
          <div class="day-nav" role="group" aria-label="Cambiar de día">
            <button type="button" class="icon-btn" data-act="prev-day" aria-label="Día anterior" data-tip="Día anterior|Tecla ←">${ui.icon('caret-left', 'bold')}</button>
            <button type="button" class="chip${isToday ? ' is-active' : ''}" data-act="go-today">${isToday ? `${ui.icon('sun-horizon', 'fill')} Hoy` : `${ui.icon('arrow-u-up-left', 'bold')} Volver a hoy`}</button>
            <button type="button" class="icon-btn" data-act="next-day" aria-label="Día siguiente" ${isToday ? 'disabled' : ''} data-tip="Día siguiente|Tecla →">${ui.icon('caret-right', 'bold')}</button>
          </div>
        </header>

        ${habits.length ? `
        <div class="today-grid">
          <div class="today-main">
            <article class="bezel hero reveal${s.perfect ? ' is-perfect' : ''}" data-hero>
              <div class="core hero-core">
                ${heroFx()}
                <div class="hero-left">
                  <div class="hero-ring">
                    ${ui.ring({ size: 188, stroke: 16, pct: s.pct, cls: 'ring-hero', label: `${s.pct}% del día` })}
                    <div class="hero-ring-label">
                      <span class="hero-pct"><span data-hero="pct" data-count="${s.pct}">0</span><small>%</small></span>
                      <span class="hero-of"><span data-hero="done">${s.done}</span> de <span data-hero="total">${s.scheduled}</span></span>
                    </div>
                  </div>
                  <div class="hero-copy">
                    <p class="kicker">${isToday ? 'Progreso de hoy' : 'Progreso del día'}</p>
                    <p class="hero-msg" data-hero="msg">${U.esc(heroMessage(s, date, isToday))}</p>
                  </div>
                </div>
                <div class="hero-art">${HA.atom.render({ habits: main, done: doneSet, pct: s.pct })}${HA.atom.video(s.pct)}</div>
                <dl class="hero-kpis">${heroKpis()}</dl>
              </div>
            </article>

            ${warns.length ? `
            <div class="banner banner-warn reveal" data-banner>
              <span class="banner-icon">${ui.icon('lightning', 'fill')}</span>
              <p><strong>Nunca falles dos veces.</strong> Ayer se te ${warns.length === 1 ? 'pasó' : 'pasaron'} ${U.esc(warns.map((h) => h.name).join(', ').replace(/, ([^,]*)$/, ' y $1'))}. Hoy es el día que importa.</p>
            </div>` : ''}

            <section class="habit-section" aria-label="Hábitos del día">
              <div class="section-head">
                <h2 class="section-title">Hábitos <span class="count">${main.length}</span></h2>
                <button type="button" class="btn btn-ghost btn-sm" data-act="new-habit">${ui.icon('plus', 'bold')} Nuevo hábito</button>
              </div>
              <div class="habit-list">
                ${main.length ? main.map((h) => card(h, date, { isToday })).join('') : `<p class="muted small">Ningún hábito programado para este día.</p>`}
              </div>
            </section>

            ${rest.length ? `
            <section class="habit-section rest" aria-label="Hábitos en descanso">
              <div class="section-head">
                <h2 class="section-title is-sub">Descanso programado <span class="count">${rest.length}</span></h2>
              </div>
              <div class="habit-list">${rest.map((h) => card(h, date, { isToday, rest: true })).join('')}</div>
            </section>` : ''}
          </div>

          <aside class="today-side" aria-label="Resumen">
            ${weekCard(date)}
            ${streaksCard()}
            ${goalsCard(date)}
            ${quoteCard()}
          </aside>
        </div>` : `
        <article class="bezel reveal">
          <div class="core empty-hero">
            <div class="empty-art">${HA.atom.render({ habits: [], done: new Set(), pct: 0 })}${HA.atom.video(60)}</div>
            <h2 class="display-sm">Empieza con algo <em>tan pequeño</em> que no puedas decir que no.</h2>
            <p class="lede">Un hábito de dos minutos, repetido, vale más que un plan perfecto que nunca empieza.</p>
            <button type="button" class="btn btn-primary" data-act="new-habit"><span>Crear mi primer hábito</span><span class="btn-orb">${ui.icon('plus', 'bold')}</span></button>
          </div>
        </article>`}
      </section>`;

    bind(root);
  }

  /* ---------- actualizaciones en vivo (sin re-render) ---------- */
  function updateHero(root, date) {
    const s = St.day(date);
    const isToday = date === U.todayISO();
    const hero = root.querySelector('[data-hero]');
    if (!hero) return s;
    ui.setRing(hero.querySelector('.ring'), s.pct);
    ui.tick(hero.querySelector('[data-hero="pct"]'), s.pct);
    ui.tick(hero.querySelector('[data-hero="done"]'), s.done);
    hero.querySelector('[data-hero="total"]').textContent = s.scheduled;
    hero.querySelector('[data-hero="msg"]').textContent = heroMessage(s, date, isToday);
    hero.querySelector('.hero-kpis').innerHTML = heroKpis();
    hero.classList.toggle('is-perfect', s.perfect);
    const doneSet = new Set(S.habits().filter((h) => S.isDone(h.id, date)).map((h) => h.id));
    HA.atom.update(hero.querySelector('svg.atom'), s.pct, doneSet);
    HA.atom.updateVideo(hero.querySelector('.atom-3d'), s.pct, true);
    return s;
  }

  function updateSide(root, date) {
    const week = root.querySelector('[data-card="week"]');
    if (week) {
      const fresh = document.createElement('div');
      fresh.innerHTML = weekCard(date);
      const next = fresh.firstElementChild;
      next.classList.remove('reveal');
      week.replaceWith(next);
      ui.animateRings(next);
    }
    const streaks = root.querySelector('[data-card="streaks"]');
    if (streaks) {
      const fresh = document.createElement('div');
      fresh.innerHTML = streaksCard();
      const next = fresh.firstElementChild;
      next.classList.remove('reveal');
      streaks.replaceWith(next);
    }
  }

  function refreshGoals(root, date) {
    const el = root.querySelector('[data-card="goals"]');
    if (!el) return;
    const fresh = document.createElement('div');
    fresh.innerHTML = goalsCard(date);
    const next = fresh.firstElementChild;
    next.classList.remove('reveal');
    el.replaceWith(next);
    return next;
  }

  function toggleHabit(root, cardEl, e) {
    const hid = cardEl.dataset.hid;
    const date = state().date;
    const h = S.habit(hid);
    if (!h) return;
    const before = St.day(date);
    let val;
    HA.app.mute(() => { val = S.toggle(hid, date); });
    HA.sound[val ? 'check' : 'uncheck']();

    cardEl.classList.remove('is-pulse');
    void cardEl.offsetWidth;
    cardEl.classList.add('is-pulse');
    setTimeout(() => cardEl.classList.remove('is-pulse'), 450);
    cardEl.classList.toggle('is-done', val);
    const btn = cardEl.querySelector('.habit-toggle');
    btn.setAttribute('aria-pressed', val);
    btn.setAttribute('aria-label', `${h.name}: ${val ? 'cumplido, toca para desmarcar' : 'pendiente, toca para marcar'}`);

    const color = getComputedStyle(cardEl).getPropertyValue('--hc').trim();
    if (val) {
      ui.ripple(cardEl, e.clientX, e.clientY, `color-mix(in oklab, ${color} 28%, transparent)`);
      const chk = cardEl.querySelector('.habit-check').getBoundingClientRect();
      ui.burst(chk.left + chk.width / 2, chk.top + chk.height / 2, color);
      ui.shockwave(chk.left + chk.width / 2, chk.top + chk.height / 2, color);
      const tile = cardEl.querySelector('.habit-tile');
      if (tile && !ui.reduced()) {
        tile.animate(
          [{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.18) rotate(-8deg)', offset: 0.4 }, { transform: 'scale(1) rotate(0)' }],
          { duration: 520, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
        );
      }
      cardEl.classList.remove('is-warn');
      const tag = cardEl.querySelector('.tag-warn');
      if (tag) tag.remove();
    }
    const upTo = date <= U.todayISO() ? date : U.todayISO();
    const streakEl = cardEl.querySelector('[data-streak]');
    const streak = St.currentStreak(h, upTo);
    ui.tick(streakEl, streak);
    cardEl.querySelector('.habit-streak').classList.toggle('is-hot', streak > 0);
    const dot = cardEl.querySelector(`.wdot[data-date="${date}"]`);
    if (dot) dot.className = dotClass(h, date, date);

    const after = updateHero(root, date);
    updateSide(root, date);

    const banner = root.querySelector('[data-banner]');
    if (banner && !root.querySelector('.habit-card.is-warn')) {
      banner.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 220, easing: 'ease-out' }).onfinish = () => banner.remove();
    }

    if (after.perfect && !before.perfect) {
      const ring = root.querySelector('.ring-hero');
      const r = ring ? ring.getBoundingClientRect() : null;
      setTimeout(() => {
        ui.confetti(r ? r.left + r.width / 2 : null, r ? r.top + r.height / 2 : null);
        HA.sound.perfect();
        const ps = St.perfectStreak();
        ui.toast({
          title: 'Día perfecto',
          message: `${after.done} de ${after.scheduled} hábitos${ps > 1 ? ` · ${ps} días perfectos seguidos` : ''}`,
          icon: 'star',
          tone: 'accent',
        });
      }, 260);
    }
  }

  function bind(root) {
    root.onclick = (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'toggle') return toggleHabit(root, act.closest('.habit-card'), e);
      if (a === 'detail') return HA.editor.detail(act.closest('.habit-card').dataset.hid);
      if (a === 'new-habit') return HA.editor.open();
      if (a === 'prev-day') return go(-1);
      if (a === 'next-day') return go(1);
      if (a === 'go-today') return goTo(U.todayISO());
      if (a === 'goto') return goTo(act.dataset.date);
      if (a === 'all-goals') {
        HA.app.state.goalsTab = 'week';
        HA.app.state.week = U.weekStartISO(state().date);
        return;
      }
      if (a === 'goal') {
        const li = act.closest('[data-gid]');
        const key = U.weekStartISO(state().date);
        let g;
        HA.app.mute(() => { g = S.toggleGoal('week', key, li.dataset.gid); });
        if (!g) return;
        HA.sound[g.done ? 'goal' : 'uncheck']();
        li.classList.toggle('is-done', g.done);
        act.setAttribute('aria-pressed', g.done);
        const meta = root.querySelector('[data-card="goals"] .card-meta');
        const list = S.goalList('week', key);
        if (meta) meta.textContent = `${list.filter((x) => x.done).length}/${list.length}`;
      }
    };
    root.onsubmit = (e) => {
      const form = e.target.closest('[data-form="goal"]');
      if (!form) return;
      e.preventDefault();
      const text = form.elements.text.value.trim();
      if (!text) return;
      const key = U.weekStartISO(state().date);
      HA.app.mute(() => S.addGoal('week', key, text));
      HA.sound.add();
      const card = refreshGoals(root, state().date);
      const input = card && card.querySelector('input[name="text"]');
      if (input) input.focus();
    };
  }

  function go(delta) {
    const next = U.addDaysISO(state().date, delta);
    if (next > U.todayISO()) return;
    goTo(next);
  }
  function goTo(date) {
    if (date === state().date) return;
    state().date = date;
    HA.sound.tap();
    HA.app.rerender({ soft: true });
  }

  function onKey(e) {
    if (e.key === 'ArrowLeft') { go(-1); return true; }
    if (e.key === 'ArrowRight') { go(1); return true; }
    if (e.key.toLowerCase() === 't') { goTo(U.todayISO()); return true; }
    return false;
  }

  HA.views.hoy = { render, onKey, title: 'Hoy' };
})();
