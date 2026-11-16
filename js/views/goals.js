/* ==========================================================================
   Vista: METAS — semana, mes, corto, mediano y largo plazo
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const S = HA.store;
  const ui = HA.ui;

  const state = () => HA.app.state;

  const TABS = [
    { value: 'week', label: 'Semana', icon: 'calendar-check', desc: 'Lo que vas a cerrar antes del domingo.', placeholder: 'Nueva meta para esta semana…' },
    { value: 'month', label: 'Mes', icon: 'calendar-dots', desc: 'Tus prioridades para este mes.', placeholder: 'Nueva meta para este mes…' },
    { value: 'short', label: 'Corto plazo', icon: 'arrow-right', desc: 'Próximas semanas, hasta unos 3 meses.', placeholder: 'Nueva meta a corto plazo…' },
    { value: 'medium', label: 'Mediano plazo', icon: 'arrow-line-up-right', desc: 'De 3 a 12 meses. Lo que estás construyendo.', placeholder: 'Nueva meta a mediano plazo…' },
    { value: 'long', label: 'Largo plazo', icon: 'mountains', desc: 'Más de un año. La persona en la que te estás convirtiendo.', placeholder: 'Nueva meta a largo plazo…' },
  ];
  const tabOf = (v) => TABS.find((t) => t.value === v) || TABS[0];

  function keyFor(kind) {
    if (kind === 'week') return state().week;
    if (kind === 'month') return U.monthKey(state().month.y, state().month.m);
    return null;
  }

  function periodLabel(kind) {
    if (kind === 'week') return U.fmt.weekRange(state().week);
    if (kind === 'month') return U.fmt.month(state().month.y, state().month.m);
    return 'Sin fecha límite';
  }

  function goalItem(g) {
    return `
      <li class="goal${g.done ? ' is-done' : ''}" data-gid="${g.id}">
        <button type="button" class="goal-check" data-act="toggle" aria-pressed="${g.done}" aria-label="${g.done ? 'Desmarcar' : 'Completar'}: ${U.esc(g.text)}"><svg viewBox="0 0 24 24"><use href="#tick"/></svg></button>
        <span class="goal-text" data-act="edit" title="Doble clic para editar">${U.esc(g.text)}</span>
        <button type="button" class="icon-btn xs goal-edit" data-act="edit-btn" aria-label="Editar meta">${ui.icon('pencil-simple')}</button>
        <button type="button" class="icon-btn xs goal-del" data-act="remove" aria-label="Eliminar meta">${ui.icon('x', 'bold')}</button>
      </li>`;
  }

  function stats(list) {
    const done = list.filter((g) => g.done).length;
    return { done, total: list.length, pct: U.pct(done, list.length) };
  }

  function overview() {
    return TABS.map((t) => {
      const list = S.goalList(t.value, keyFor(t.value));
      const s = stats(list);
      return `
        <button type="button" class="ov-row${t.value === state().goalsTab ? ' is-active' : ''}" data-act="tab" data-value="${t.value}">
          <span class="ov-label">${ui.icon(t.icon)} ${t.label}</span>
          <span class="ov-bar"><span style="--v:${s.total ? s.pct / 100 : 0}"></span></span>
          <span class="ov-val">${s.done}/${s.total}</span>
        </button>`;
    }).join('');
  }

  function panel() {
    const kind = state().goalsTab;
    const tab = tabOf(kind);
    const key = keyFor(kind);
    const list = S.goalList(kind, key);
    const s = stats(list);
    const nav = kind === 'week' || kind === 'month'
      ? ui.periodNav({
          label: periodLabel(kind),
          prevLabel: kind === 'week' ? 'Semana anterior' : 'Mes anterior',
          nextLabel: kind === 'week' ? 'Semana siguiente' : 'Mes siguiente',
        })
      : `<span class="period-label muted">${ui.icon('infinity')} Sin fecha límite</span>`;

    return `
      <div class="goals-grid" data-panel>
        <article class="bezel reveal">
          <div class="core goals-core">
            <div class="card-head">
              <div>
                <h2 class="card-title">${tab.label}</h2>
                <p class="card-sub">${tab.desc}</p>
              </div>
              ${nav}
            </div>
            <form class="goal-form" data-form="goal">
              <span class="goal-form-icon">${ui.icon('plus', 'bold')}</span>
              <input class="input" name="text" maxlength="140" placeholder="${tab.placeholder}" autocomplete="off" aria-label="${tab.placeholder}">
              <button type="submit" class="btn btn-primary btn-sm"><span>Añadir</span></button>
            </form>
            <ul class="goal-list" data-list>
              ${list.length ? list.map(goalItem).join('') : `<li class="goal-empty">${ui.emptyState({ icon: 'target', title: 'Sin metas aquí todavía', text: 'Escribe una meta concreta y medible. Pequeña es mejor que perfecta.' })}</li>`}
            </ul>
            <div class="goals-foot">
              <span class="muted small" data-sum>${s.done} de ${s.total} completadas</span>
              <button type="button" class="btn btn-quiet btn-sm" data-act="clear" ${s.done ? '' : 'hidden'}>${ui.icon('broom')} Limpiar completadas</button>
            </div>
          </div>
        </article>

        <aside class="goals-side">
          <article class="bezel reveal">
            <div class="core goals-summary">
              <div class="gs-ring">
                ${ui.ring({ size: 150, stroke: 11, pct: s.pct, cls: 'ring-goals', label: `${s.pct}% completado` })}
                <div class="gs-ring-label"><span class="gs-pct" data-gs="pct">${s.pct}</span><small>%</small></div>
              </div>
              <p class="gs-title"><span data-gs="done">${s.done}</span> de <span data-gs="total">${s.total}</span> metas</p>
              <p class="muted small">${U.esc(periodLabel(kind))}</p>
              <div class="pearls" data-pearls>${pearls(list)}</div>
            </div>
          </article>
          <article class="bezel reveal">
            <div class="core">
              <div class="card-head"><h2 class="card-title">Todas tus metas</h2></div>
              <div class="overview" data-overview>${overview()}</div>
            </div>
          </article>
        </aside>
      </div>`;
  }

  function pearls(list) {
    if (!list.length) return '<span class="muted small">Tus metas aparecerán aquí como perlas.</span>';
    return list.map((g) => `<span class="pearl${g.done ? ' is-done' : ''}" data-tip="${U.esc(g.text)}|${g.done ? 'Completada' : 'Pendiente'}"></span>`).join('');
  }

  function render(root) {
    if (!state().goalsTab) state().goalsTab = 'week';
    root.innerHTML = `
      <section class="page page-goals">
        <header class="page-head reveal">
          <div class="page-head-main">
            <p class="eyebrow"><span class="eyebrow-dot"></span>Metas</p>
            <h1 class="display">Lo que estás <em>construyendo</em></h1>
            <p class="lede">Las metas marcan la dirección; tus hábitos hacen el trabajo diario.</p>
          </div>
        </header>
        <div class="tabs-wrap reveal">
          ${ui.seg({ name: 'goals', value: state().goalsTab, options: TABS.map(({ value, label }) => ({ value, label })), cls: 'seg-tabs', label: 'Tipo de meta' })}
        </div>
        <div data-panel-host>${panel()}</div>
      </section>`;
    bind(root);
  }

  function refreshSummary(root) {
    const kind = state().goalsTab;
    const list = S.goalList(kind, keyFor(kind));
    const s = stats(list);
    const ring = root.querySelector('.ring-goals');
    if (ring) ui.setRing(ring, s.pct);
    ui.tick(root.querySelector('[data-gs="pct"]'), s.pct);
    ui.tick(root.querySelector('[data-gs="done"]'), s.done);
    const total = root.querySelector('[data-gs="total"]');
    if (total) total.textContent = s.total;
    const sum = root.querySelector('[data-sum]');
    if (sum) sum.textContent = `${s.done} de ${s.total} completadas`;
    const clear = root.querySelector('[data-act="clear"]');
    if (clear) clear.hidden = !s.done;
    const pe = root.querySelector('[data-pearls]');
    if (pe) pe.innerHTML = pearls(list);
    const ov = root.querySelector('[data-overview]');
    if (ov) ov.innerHTML = overview();
    const ul = root.querySelector('[data-list]');
    if (ul && !list.length && !ul.querySelector('.goal-empty')) {
      ul.innerHTML = `<li class="goal-empty">${ui.emptyState({ icon: 'target', title: 'Sin metas aquí todavía', text: 'Escribe una meta concreta y medible. Pequeña es mejor que perfecta.' })}</li>`;
    }
  }

  function swapPanel(root, animate) {
    const host = root.querySelector('[data-panel-host]');
    const draw = () => {
      host.innerHTML = panel();
      host.querySelectorAll('.reveal').forEach((el) => el.classList.remove('reveal'));
      ui.animateRings(host);
      if (!ui.reduced() && animate) {
        host.animate(
          [{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
          { duration: 420, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
        );
      }
    };
    draw();
  }

  function startEdit(li) {
    if (li.classList.contains('is-editing')) return;
    const kind = state().goalsTab;
    const key = keyFor(kind);
    const id = li.dataset.gid;
    const g = S.goalList(kind, key).find((x) => x.id === id);
    if (!g) return;
    const span = li.querySelector('.goal-text');
    li.classList.add('is-editing');
    const input = document.createElement('input');
    input.className = 'input input-inline';
    input.value = g.text;
    input.maxLength = 140;
    input.setAttribute('aria-label', 'Editar meta');
    span.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const text = input.value.trim();
      if (save && text && text !== g.text) {
        HA.app.mute(() => S.editGoal(kind, key, id, text));
        HA.sound.tap();
      }
      li.classList.remove('is-editing');
      const s = document.createElement('span');
      s.className = 'goal-text';
      s.dataset.act = 'edit';
      s.textContent = save && text ? text : g.text;
      input.replaceWith(s);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  function bind(root) {
    const seg = root.querySelector('[data-seg="goals"]');
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('.seg-btn');
      if (!b || b.dataset.value === state().goalsTab) return;
      setTab(root, b.dataset.value);
    });

    root.ondblclick = (e) => {
      const t = e.target.closest('.goal-text');
      if (t) startEdit(t.closest('.goal'));
    };

    root.onclick = async (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const kind = state().goalsTab;
      const key = keyFor(kind);
      const li = act.closest('.goal');
      switch (act.dataset.act) {
        case 'tab':
          if (act.dataset.value !== kind) setTab(root, act.dataset.value);
          return;
        case 'edit-btn':
          return startEdit(li);
        case 'toggle': {
          let g;
          HA.app.mute(() => { g = S.toggleGoal(kind, key, li.dataset.gid); });
          if (!g) return;
          HA.sound[g.done ? 'goal' : 'uncheck']();
          li.classList.toggle('is-done', g.done);
          act.setAttribute('aria-pressed', g.done);
          if (g.done) {
            const r = act.getBoundingClientRect();
            ui.burst(r.left + r.width / 2, r.top + r.height / 2, ui.cssVar('--accent'), 10);
          }
          refreshSummary(root);
          const list = S.goalList(kind, key);
          if (g.done && list.length > 1 && list.every((x) => x.done)) {
            ui.confetti();
            HA.sound.perfect();
            ui.toast({ title: 'Todas completadas', message: `${tabOf(kind).label} · ${list.length} de ${list.length}`, icon: 'trophy', tone: 'accent' });
          }
          return;
        }
        case 'remove': {
          let snap;
          HA.app.mute(() => { snap = S.removeGoal(kind, key, li.dataset.gid); });
          HA.sound.remove();
          const finish = () => {
            li.remove();
            refreshSummary(root);
          };
          if (ui.reduced()) finish();
          else {
            li.style.height = `${li.offsetHeight}px`;
            li.animate(
              [{ opacity: 1, height: `${li.offsetHeight}px` }, { opacity: 0, height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px' }],
              { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
            ).onfinish = finish;
          }
          ui.toast({
            title: 'Meta eliminada',
            message: snap ? snap.goal.text : '',
            icon: 'trash',
            tone: 'muted',
            action: { label: 'Deshacer', onClick: () => { S.restoreGoal(snap); HA.sound.add(); } },
          });
          return;
        }
        case 'clear': {
          let snap;
          HA.app.mute(() => { snap = S.clearDoneGoals(kind, key); });
          HA.sound.remove();
          swapPanel(root, false);
          ui.toast({
            title: `${snap.removed.length} ${snap.removed.length === 1 ? 'meta archivada' : 'metas archivadas'}`,
            icon: 'broom',
            tone: 'muted',
            action: { label: 'Deshacer', onClick: () => S.restoreCleared(snap) },
          });
          return;
        }
        case 'prev':
        case 'next':
          shiftPeriod(root, act.dataset.act === 'prev' ? -1 : 1);
          return;
        default:
      }
    };

    root.onsubmit = (e) => {
      const form = e.target.closest('[data-form="goal"]');
      if (!form) return;
      e.preventDefault();
      const input = form.elements.text;
      const text = input.value.trim();
      if (!text) {
        input.focus();
        return;
      }
      const kind = state().goalsTab;
      const key = keyFor(kind);
      let g;
      HA.app.mute(() => { g = S.addGoal(kind, key, text); });
      HA.sound.add();
      const ul = root.querySelector('[data-list]');
      const empty = ul.querySelector('.goal-empty');
      if (empty) empty.remove();
      const tmp = document.createElement('ul');
      tmp.innerHTML = goalItem(g);
      const li = tmp.firstElementChild;
      ul.appendChild(li);
      if (!ui.reduced()) {
        li.animate([{ opacity: 0, transform: 'translateY(-6px) scale(0.98)' }, { opacity: 1, transform: 'none' }], {
          duration: 300,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        });
      }
      input.value = '';
      input.focus();
      refreshSummary(root);
    };
  }

  function setTab(root, value) {
    state().goalsTab = value;
    ui.setSeg(root.querySelector('[data-seg="goals"]'), value);
    HA.sound.tab();
    swapPanel(root, true);
  }

  function shiftPeriod(root, delta) {
    const kind = state().goalsTab;
    if (kind === 'week') state().week = U.addDaysISO(state().week, delta * 7);
    else if (kind === 'month') state().month = U.shiftMonth(state().month, delta);
    else return;
    HA.sound.tap();
    swapPanel(root, true);
  }

  function onKey(e) {
    const root = HA.app.root;
    if (e.key === 'ArrowLeft') { shiftPeriod(root, -1); return true; }
    if (e.key === 'ArrowRight') { shiftPeriod(root, 1); return true; }
    if (e.key.toLowerCase() === 't') {
      state().week = U.weekStartISO(U.todayISO());
      state().month = U.monthOf(U.todayISO());
      swapPanel(root, false);
      return true;
    }
    return false;
  }

  HA.views.metas = { render, onKey, title: 'Metas' };
})();
