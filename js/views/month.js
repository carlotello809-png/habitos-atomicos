/* ==========================================================================
   Vista: MES — matriz de seguimiento mensual
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const S = HA.store;
  const St = HA.stats;
  const ui = HA.ui;

  const state = () => HA.app.state;

  function cellState(h, d, t) {
    const w = U.wdISO(d);
    if (d > t) return 'is-future';
    if (S.isDone(h.id, d)) return h.days.includes(w) ? 'is-done' : 'is-done is-bonus';
    if (!h.days.includes(w)) return 'is-off';
    if (d < h.start) return 'is-pre';
    if (d === t) return 'is-open';
    return 'is-miss';
  }
  const STATE_LABEL = {
    'is-future': 'aún no llega', 'is-done': 'cumplido', 'is-done is-bonus': 'cumplido (extra)', 'is-off': 'sin programar',
    'is-pre': 'antes de empezar', 'is-open': 'pendiente hoy', 'is-miss': 'no cumplido',
  };

  function cell(h, d, i, t) {
    const st = cellState(h, d, t);
    const day = U.parse(d).getDate();
    return `<button type="button" class="mc ${st}${d === t ? ' is-today' : ''}${U.wdISO(d) === 0 && i > 0 ? ' wk' : ''}" data-act="cell" data-date="${d}" data-col="${i}" style="--c:${i}"
      aria-label="${U.esc(h.name)}, ${day}: ${STATE_LABEL[st]}" ${st === 'is-future' ? 'disabled' : ''}><svg viewBox="0 0 24 24"><use href="#tick"/></svg></button>`;
  }

  function rowInner(h, dates, t) {
    const r = St.habitRange(h, dates);
    const streak = St.currentStreak(h);
    return `
      <button type="button" class="mname" data-act="detail" aria-label="Ver ${U.esc(h.name)}">
        <span class="habit-tile tile-sm">${ui.icon(h.icon, 'fill')}</span>
        <span class="mname-text">${U.esc(h.name)}</span>
      </button>
      ${dates.map((d, i) => cell(h, d, i, t)).join('')}
      <div class="mstat">
        <span class="mstreak${streak ? ' is-hot' : ''}">${ui.icon('flame', 'fill')}${streak}</span>
        <span class="mpct">${r.scheduled ? r.pct + '%' : '—'}</span>
      </div>`;
  }

  function footCell(d, i, t) {
    const s = St.day(d);
    const fut = d > t;
    const tip = fut ? `${U.fmt.dayShort(d)}|Aún no llega` : `${U.fmt.dayShort(d)}|${s.done} de ${s.scheduled} hábitos · ${s.pct}%`;
    return `<div class="mfoot-c${fut ? ' is-future' : ''}${s.perfect ? ' is-perfect' : ''}${U.wdISO(d) === 0 && i > 0 ? ' wk' : ''}" data-col="${i}" data-date="${d}" data-tip="${tip}">
      <span class="mbar" style="--v:${fut ? 0 : s.pct / 100}"></span></div>`;
  }

  function kpis(sum) {
    const best = sum.best;
    return `
      <div class="kpi reveal">
        <p class="kpi-label">${ui.icon('chart-donut', 'fill')} Cumplimiento</p>
        <p class="kpi-value"><span data-count="${sum.pct}">0</span><small>%</small></p>
        <p class="kpi-sub">de lo programado hasta hoy</p>
      </div>
      <div class="kpi reveal">
        <p class="kpi-label">${ui.icon('check-circle', 'fill')} Check-ins</p>
        <p class="kpi-value"><span data-count="${sum.done}">0</span></p>
        <p class="kpi-sub">de ${sum.scheduled} programados</p>
      </div>
      <div class="kpi reveal">
        <p class="kpi-label">${ui.icon('star', 'fill')} Días perfectos</p>
        <p class="kpi-value"><span data-count="${sum.perfect}">0</span></p>
        <p class="kpi-sub">de ${sum.activeDays} ${sum.activeDays === 1 ? 'día' : 'días'} con hábitos</p>
      </div>
      <div class="kpi reveal">
        <p class="kpi-label">${ui.icon('trophy', 'fill')} Mejor día</p>
        <p class="kpi-value kpi-text">${best && best.done ? U.fmt.short(best.date) : '—'}</p>
        <p class="kpi-sub">${best && best.done ? `${best.done} de ${best.scheduled} hábitos` : 'Aún sin registros'}</p>
      </div>`;
  }

  function render(root) {
    const { y, m } = state().month;
    const t = U.todayISO();
    const dates = U.monthDates(y, m);
    const habits = S.habits();
    const sum = St.range(dates);
    const now = U.monthOf(t);
    const isCur = now.y === y && now.m === m;

    const head = dates
      .map((d, i) => {
        const w = U.wdISO(d);
        return `<div class="mday-h${d === t ? ' is-today' : ''}${w === 0 && i > 0 ? ' wk' : ''}${w >= 5 ? ' we' : ''}" data-col="${i}"><span>${U.DOW_LETTER[w]}</span><b>${i + 1}</b></div>`;
      })
      .join('');

    const rows = habits
      .map((h, ri) => `<div class="mrow" data-hid="${h.id}" style="--hc: var(--c-${h.color}); --r:${ri}">${rowInner(h, dates, t)}</div>`)
      .join('');

    root.innerHTML = `
      <section class="page page-month">
        <header class="page-head reveal">
          <div class="page-head-main">
            <p class="eyebrow"><span class="eyebrow-dot"></span>Seguimiento mensual</p>
            <h1 class="display">${U.cap(U.MONTHS[m])} <em>${y}</em></h1>
            <p class="lede">Toca cualquier día para marcarlo. La cadena visual es el mejor recordatorio.</p>
          </div>
          <div class="head-tools">
            ${ui.periodNav({
              prevLabel: 'Mes anterior',
              nextLabel: 'Mes siguiente',
              picker: `<label class="chip chip-picker" data-tip="Elegir mes">${ui.icon('calendar-blank')} <span>${U.fmt.month(y, m)}</span><input type="month" class="month-input" value="${U.monthKey(y, m)}" aria-label="Elegir mes"></label>`,
              todayBtn: isCur ? '' : `<button type="button" class="chip" data-act="this-month">${ui.icon('arrow-u-up-left', 'bold')} Mes actual</button>`,
            })}
          </div>
        </header>

        <div class="kpi-row">${kpis(sum)}</div>

        <article class="bezel reveal">
          <div class="core matrix-core">
            <div class="card-head">
              <div>
                <h2 class="card-title">Matriz de hábitos</h2>
                <p class="card-sub">${dates.length} días · ${habits.length} ${habits.length === 1 ? 'hábito' : 'hábitos'}</p>
              </div>
              <div class="card-actions">
                <button type="button" class="btn btn-ghost btn-sm" data-act="new-habit">${ui.icon('plus', 'bold')} Nuevo hábito</button>
                <button type="button" class="btn btn-ghost btn-sm" data-act="print">${ui.icon('printer')} Imprimir mes</button>
              </div>
            </div>
            ${habits.length ? `
            <div class="matrix-scroll">
              <div class="matrix" style="--days:${dates.length}" role="table" aria-label="Matriz de ${U.fmt.month(y, m)}">
                <div class="mrow mhead"><div class="mname mname-head">Hábito</div>${head}<div class="mstat mstat-head">Racha · %</div></div>
                ${rows}
                <div class="mrow mfoot"><div class="mname mname-foot">Por día</div>${dates.map((d, i) => footCell(d, i, t)).join('')}<div class="mstat mstat-foot" data-total>${sum.pct}%</div></div>
              </div>
            </div>
            <ul class="legend">
              <li><span class="lg lg-done"></span>Cumplido</li>
              <li><span class="lg lg-miss"></span>No cumplido</li>
              <li><span class="lg lg-off"></span>Sin programar</li>
              <li><span class="lg lg-today"></span>Hoy</li>
            </ul>` : ui.emptyState({
              icon: 'calendar-dots',
              title: 'Aún no tienes hábitos',
              text: 'Crea tu primer hábito para empezar la cadena.',
              action: `<button type="button" class="btn btn-primary" data-act="new-habit"><span>Crear hábito</span><span class="btn-orb">${ui.icon('plus', 'bold')}</span></button>`,
            })}
          </div>
        </article>
      </section>`;

    bind(root);
    requestAnimationFrame(() => scrollToToday(root));
  }

  function scrollToToday(root) {
    const sc = root.querySelector('.matrix-scroll');
    const tc = root.querySelector('.mday-h.is-today');
    if (!sc || !tc || sc.scrollWidth <= sc.clientWidth) return;
    sc.scrollLeft = Math.max(0, tc.offsetLeft - sc.clientWidth * 0.6);
  }

  function refreshNumbers(root) {
    const { y, m } = state().month;
    const dates = U.monthDates(y, m);
    const sum = St.range(dates);
    const row = root.querySelector('.kpi-row');
    if (row) {
      row.innerHTML = kpis(sum);
      row.querySelectorAll('.reveal').forEach((k) => k.classList.remove('reveal'));
      row.querySelectorAll('[data-count]').forEach((el) => { el.textContent = el.dataset.count; });
    }
    const total = root.querySelector('[data-total]');
    if (total) total.textContent = `${sum.pct}%`;
  }

  function toggleCell(root, btn) {
    const row = btn.closest('.mrow');
    const hid = row.dataset.hid;
    const d = btn.dataset.date;
    const h = S.habit(hid);
    if (!h || d > U.todayISO()) return;
    let val;
    HA.app.mute(() => { val = S.toggle(hid, d); });
    HA.sound[val ? 'check' : 'uncheck']();

    const { y, m } = state().month;
    const dates = U.monthDates(y, m);
    const t = U.todayISO();
    row.classList.add('no-cascade');
    row.innerHTML = rowInner(h, dates, t);
    const fresh = row.querySelector(`.mc[data-date="${d}"]`);
    if (fresh) {
      fresh.classList.add('pop');
      fresh.focus({ preventScroll: true });
      if (val) {
        const r = fresh.getBoundingClientRect();
        ui.burst(r.left + r.width / 2, r.top + r.height / 2, getComputedStyle(row).getPropertyValue('--hc').trim(), 8);
      }
    }
    const foot = root.querySelector(`.mfoot-c[data-date="${d}"]`);
    if (foot) {
      const i = +foot.dataset.col;
      const tmp = document.createElement('div');
      tmp.innerHTML = footCell(d, i, t);
      foot.replaceWith(tmp.firstElementChild);
    }
    refreshNumbers(root);
  }

  function bind(root) {
    const matrix = root.querySelector('.matrix');
    if (matrix) {
      let col = null;
      matrix.addEventListener('pointerover', (e) => {
        const c = e.target.closest('[data-col]');
        const next = c ? c.dataset.col : null;
        if (next === col) return;
        if (col != null) matrix.querySelectorAll(`.mday-h[data-col="${col}"]`).forEach((x) => x.classList.remove('is-hover'));
        col = next;
        if (col != null) matrix.querySelectorAll(`.mday-h[data-col="${col}"]`).forEach((x) => x.classList.add('is-hover'));
      });
      matrix.addEventListener('pointerleave', () => {
        matrix.querySelectorAll('.mday-h.is-hover').forEach((x) => x.classList.remove('is-hover'));
        col = null;
      });
    }

    const input = root.querySelector('.month-input');
    if (input) {
      input.addEventListener('change', () => {
        const [yy, mm] = input.value.split('-').map(Number);
        if (!yy || !mm) return;
        state().month = { y: yy, m: mm - 1 };
        HA.sound.tap();
        HA.app.rerender({ soft: true });
      });
      input.closest('.chip-picker').addEventListener('click', (e) => {
        if (e.target === input) return;
        if (input.showPicker) {
          e.preventDefault();
          try { input.showPicker(); } catch (err) { input.focus(); }
        }
      });
    }

    root.onclick = (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      switch (act.dataset.act) {
        case 'cell': return toggleCell(root, act);
        case 'detail': return HA.editor.detail(act.closest('.mrow').dataset.hid);
        case 'new-habit': return HA.editor.open();
        case 'prev': return shift(-1);
        case 'next': return shift(1);
        case 'this-month': return goCurrent();
        case 'print': {
          const { y, m } = state().month;
          HA.app.state.report = Object.assign(HA.app.state.report, { month: { y, m } });
          S.setReport({ type: 'month' });
          location.hash = '#reporte';
          return;
        }
        default:
      }
    };
  }

  function shift(delta) {
    state().month = U.shiftMonth(state().month, delta);
    HA.sound.tap();
    HA.app.rerender({ soft: true });
  }
  function goCurrent() {
    state().month = U.monthOf(U.todayISO());
    HA.sound.tap();
    HA.app.rerender({ soft: true });
  }

  function onKey(e) {
    if (e.key === 'ArrowLeft') { shift(-1); return true; }
    if (e.key === 'ArrowRight') { shift(1); return true; }
    if (e.key.toLowerCase() === 't') { goCurrent(); return true; }
    return false;
  }

  HA.views.mes = { render, onKey, title: 'Mes', shift };
})();
