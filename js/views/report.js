/* ==========================================================================
   Vista: REPORTE — vista previa en papel e impresión / PDF
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const S = HA.store;
  const St = HA.stats;
  const ui = HA.ui;

  const state = () => HA.app.state;
  const cfg = () => S.data.report;

  const TYPES = [
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' },
    { value: 'range', label: 'Rango' },
  ];
  const SECTIONS = [
    { key: 'matrix', label: 'Registro diario', hint: 'La cuadrícula día por día' },
    { key: 'stats', label: 'Estadísticas', hint: 'Por hábito y por día de la semana' },
    { key: 'goals', label: 'Metas', hint: 'Completadas y pendientes' },
    { key: 'notes', label: 'Notas', hint: 'Tus reflexiones del período' },
    { key: 'reflection', label: 'Espacio para escribir', hint: 'Líneas para completar a mano' },
  ];
  const PAPER = {
    a4: { name: 'A4', w: 210, h: 297, css: 'A4' },
    letter: { name: 'Carta', w: 215.9, h: 279.4, css: 'letter' },
  };

  /* ---------- período ---------- */
  function cursor() {
    const st = state();
    if (!st.report) st.report = {};
    const r = st.report;
    const t = U.todayISO();
    if (!r.month) r.month = U.monthOf(t);
    if (!r.week) r.week = U.weekStartISO(t);
    if (!r.year) r.year = U.today().getFullYear();
    if (!r.from) r.from = U.addDaysISO(t, -29);
    if (!r.to) r.to = t;
    return r;
  }

  function period() {
    const c = cursor();
    const type = cfg().type;
    if (type === 'week') {
      return { type, dates: U.rangeDates(c.week, U.addDaysISO(c.week, 6)), label: U.fmt.weekRange(c.week), typeLabel: 'semanal' };
    }
    if (type === 'year') {
      return { type, dates: U.rangeDates(`${c.year}-01-01`, `${c.year}-12-31`), label: String(c.year), typeLabel: 'anual' };
    }
    if (type === 'range') {
      let from = c.from;
      let to = c.to;
      if (from > to) [from, to] = [to, from];
      if (U.diffDays(from, to) > 366) to = U.addDaysISO(from, 366);
      return { type, dates: U.rangeDates(from, to), label: U.fmt.range(from, to), typeLabel: 'personalizado' };
    }
    return { type: 'month', dates: U.monthDates(c.month.y, c.month.m), label: U.fmt.month(c.month.y, c.month.m), typeLabel: 'mensual' };
  }

  function orientation(p) {
    const o = cfg().orientation;
    if (o === 'portrait' || o === 'landscape') return o;
    if (p.type === 'month') return 'landscape';
    if (p.type === 'range') return p.dates.length > 14 ? 'landscape' : 'portrait';
    return 'portrait';
  }

  /* ---------- cálculos del período ---------- */
  function bestRunIn(h, dates) {
    const t = U.todayISO();
    let best = 0;
    let run = 0;
    dates.forEach((d) => {
      if (!St.tracked(h, d, t)) return;
      if (S.isDone(h.id, d)) {
        run++;
        best = Math.max(best, run);
      } else if (d !== t) run = 0;
    });
    return best;
  }

  function monthsIn(dates) {
    const seen = [];
    dates.forEach((d) => {
      const k = d.slice(0, 7);
      if (!seen.includes(k)) seen.push(k);
    });
    return seen;
  }

  /* ---------- piezas del papel ---------- */
  function matrixTable(habits, dates, caption) {
    const t = U.todayISO();
    const head = dates
      .map((d) => {
        const w = U.wdISO(d);
        return `<th class="${w >= 5 ? 'we' : ''}${w === 0 ? ' wk' : ''}" scope="col"><span>${U.DOW_LETTER[w]}</span>${U.parse(d).getDate()}</th>`;
      })
      .join('');
    const rows = habits
      .map((h) => {
        const r = St.habitRange(h, dates);
        const cells = dates
          .map((d) => {
            const w = U.wdISO(d);
            let c = '';
            if (S.isDone(h.id, d)) c = '<span class="rc rc-done">✓</span>';
            else if (d > t || d < h.start) c = '';
            else if (!h.days.includes(w)) c = '<span class="rc rc-off"></span>';
            else c = '<span class="rc rc-miss"></span>';
            return `<td class="${w === 0 ? 'wk' : ''}">${c}</td>`;
          })
          .join('');
        return `<tr style="--hc: var(--c-${h.color})"><th scope="row"><span class="rp-dot"></span>${U.esc(h.name)}</th>${cells}<td class="num">${r.done}/${r.scheduled}</td><td class="num strong">${r.scheduled ? r.pct + '%' : '—'}</td></tr>`;
      })
      .join('');
    const foot = dates
      .map((d) => {
        const s = St.day(d);
        return `<td class="${U.wdISO(d) === 0 ? 'wk' : ''}">${d > t || !s.scheduled ? '' : `<span class="rp-dbar" style="--v:${s.pct / 100}"></span>`}</td>`;
      })
      .join('');
    const sum = St.range(dates, habits);
    return `
      <div class="rp-matrix-wrap">
        ${caption ? `<p class="rp-caption">${caption}</p>` : ''}
        <table class="rp-matrix${dates.length > 20 ? ' is-dense' : ''}">
          <thead><tr><th scope="col" class="rp-hcol">Hábito</th>${head}<th scope="col" class="num">Hechos</th><th scope="col" class="num">%</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><th scope="row">Por día</th>${foot}<td class="num">${sum.done}/${sum.scheduled}</td><td class="num strong">${sum.pct}%</td></tr></tfoot>
        </table>
      </div>`;
  }

  function yearTable(habits, year) {
    const months = Array.from({ length: 12 }, (_, m) => U.monthDates(year, m));
    const shade = (pct, sched) => (sched ? `style="--v:${pct / 100}"` : '');
    const rows = habits
      .map((h) => {
        const cells = months
          .map((dates) => {
            const r = St.habitRange(h, dates);
            return `<td class="heat ${r.scheduled ? '' : 'is-empty'}" ${shade(r.pct, r.scheduled)}>${r.scheduled ? r.pct + '%' : ''}</td>`;
          })
          .join('');
        const tot = St.habitRange(h, months.flat());
        return `<tr style="--hc: var(--c-${h.color})"><th scope="row"><span class="rp-dot"></span>${U.esc(h.name)}</th>${cells}<td class="num strong">${tot.scheduled ? tot.pct + '%' : '—'}</td></tr>`;
      })
      .join('');
    const totals = months
      .map((dates) => {
        const s = St.range(dates, habits);
        return `<td class="num">${s.scheduled ? s.pct + '%' : ''}</td>`;
      })
      .join('');
    const perfect = months.map((dates) => `<td class="num">${St.range(dates, habits).perfect || ''}</td>`).join('');
    const all = St.range(months.flat(), habits);
    return `
      <table class="rp-matrix rp-year">
        <thead><tr><th scope="col" class="rp-hcol">Hábito</th>${U.MONTHS_SHORT.map((m) => `<th scope="col">${U.cap(m)}</th>`).join('')}<th scope="col" class="num">Año</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><th scope="row">Cumplimiento</th>${totals}<td class="num strong">${all.pct}%</td></tr>
          <tr><th scope="row">Días perfectos</th>${perfect}<td class="num strong">${all.perfect}</td></tr>
        </tfoot>
      </table>`;
  }

  function statsBlock(sum, dates, habits) {
    const rows = sum.perHabit
      .map((x) => `
        <tr style="--hc: var(--c-${x.habit.color})">
          <th scope="row"><span class="rp-dot"></span>${U.esc(x.habit.name)}</th>
          <td class="num">${x.scheduled}</td>
          <td class="num">${x.done}</td>
          <td class="num">${bestRunIn(x.habit, dates)}</td>
          <td class="rp-barcell"><span class="rp-bar"><span style="--v:${x.pct / 100}"></span></span></td>
          <td class="num strong">${x.scheduled ? x.pct + '%' : '—'}</td>
        </tr>`)
      .join('');
    const prof = St.weekdayProfile(dates, habits);
    const wd = prof
      .map((p, i) => `
        <div class="rp-wd">
          <span class="rp-wd-val">${p.scheduled ? p.pct + '%' : '—'}</span>
          <span class="rp-wd-track"><span style="--v:${p.pct / 100}"></span></span>
          <span class="rp-wd-x">${U.DOW_SHORT[i]}</span>
        </div>`)
      .join('');
    return `
      <section class="rp-section rp-cols">
        <div class="rp-col-wide">
          <h2>Rendimiento por hábito</h2>
          <table class="rp-table">
            <thead><tr><th scope="col">Hábito</th><th scope="col" class="num">Programados</th><th scope="col" class="num">Hechos</th><th scope="col" class="num">Mejor racha</th><th scope="col"></th><th scope="col" class="num">%</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6">Sin hábitos.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="rp-col-narrow">
          <h2>Por día de la semana</h2>
          <div class="rp-wds">${wd}</div>
        </div>
      </section>`;
  }

  function goalsBlock(p) {
    const groups = [];
    const c = cursor();
    const list = (title, items) => {
      if (!items.length) return;
      groups.push(`
        <div class="rp-goal-group">
          <h3>${title} <span>${items.filter((g) => g.done).length}/${items.length}</span></h3>
          <ul>${items.map((g) => `<li class="${g.done ? 'is-done' : ''}"><span class="rp-box">${g.done ? '✓' : ''}</span>${U.esc(g.text)}</li>`).join('')}</ul>
        </div>`);
    };
    if (p.type === 'week') {
      list('Metas de la semana', S.goalList('week', c.week));
      const mo = U.monthOf(c.week);
      list(`Metas de ${U.MONTHS[mo.m]}`, S.goalList('month', U.monthKey(mo.y, mo.m)));
    } else {
      monthsIn(p.dates).forEach((k) => {
        const [y, m] = k.split('-').map(Number);
        list(`Metas de ${U.MONTHS[m - 1]}${p.type !== 'month' ? ` ${y}` : ''}`, S.goalList('month', k));
      });
      if (p.type === 'month') {
        const weeks = [];
        p.dates.forEach((d) => {
          const w = U.weekStartISO(d);
          if (!weeks.includes(w)) weeks.push(w);
        });
        const weekly = weeks.flatMap((w) => S.goalList('week', w));
        list('Metas semanales del mes', weekly);
      }
    }
    list('Corto plazo', S.goalList('short'));
    list('Mediano plazo', S.goalList('medium'));
    list('Largo plazo', S.goalList('long'));
    return `
      <section class="rp-section">
        <h2>Metas</h2>
        ${groups.length ? `<div class="rp-goals">${groups.join('')}</div>` : '<p class="rp-muted">No hay metas registradas para este período.</p>'}
      </section>`;
  }

  function notesBlock(p) {
    const keys = p.type === 'week' ? [U.weekStartISO(p.dates[0]).slice(0, 7)] : monthsIn(p.dates);
    const notes = keys
      .filter((k) => S.note(k).trim())
      .map((k) => {
        const [y, m] = k.split('-').map(Number);
        return `<div class="rp-note"><h3>${U.fmt.month(y, m - 1)}</h3>${S.note(k)
          .trim()
          .split(/\n{2,}/)
          .map((para) => `<p>${U.esc(para).replace(/\n/g, '<br>')}</p>`)
          .join('')}</div>`;
      });
    return `
      <section class="rp-section">
        <h2>Notas y reflexiones</h2>
        ${notes.length ? notes.join('') : '<p class="rp-muted">Sin notas escritas para este período.</p>'}
      </section>`;
  }

  function reflectionBlock() {
    const lines = (n) => Array.from({ length: n }, () => '<span class="rp-line"></span>').join('');
    return `
      <section class="rp-section rp-reflect">
        <h2>Reflexión a mano</h2>
        <div class="rp-reflect-grid">
          <div><h3>Lo que funcionó</h3>${lines(3)}</div>
          <div><h3>Lo que voy a ajustar</h3>${lines(3)}</div>
        </div>
        <div><h3>Mi compromiso para el próximo período</h3>${lines(2)}</div>
        <div class="rp-sign">
          <div><span class="rp-line"></span><small>Firma</small></div>
          <div><span class="rp-line"></span><small>Fecha</small></div>
        </div>
      </section>`;
  }

  function build() {
    const p = period();
    const sec = cfg().sections;
    const habits = S.habits();
    const sum = St.range(p.dates, habits);
    const name = S.data.profile.name;
    const t = U.todayISO();
    const best = habits
      .map((h) => ({ h, b: bestRunIn(h, p.dates) }))
      .sort((a, b) => b.b - a.b)[0];
    const top = sum.perHabit.filter((x) => x.scheduled).sort((a, b) => b.pct - a.pct || b.done - a.done)[0];
    const elapsed = p.dates.filter((d) => d <= t).length;

    const headline = sum.scheduled
      ? `Cumpliste el <em>${sum.pct}%</em> de tus hábitos`
      : 'Todavía no hay registros en este período';
    const lede = sum.scheduled
      ? `${sum.done} check-ins de ${sum.scheduled} programados en ${elapsed} ${elapsed === 1 ? 'día' : 'días'}. ${sum.perfect} ${sum.perfect === 1 ? 'día perfecto' : 'días perfectos'}${top ? ` y “${U.esc(top.habit.name)}” fue tu hábito más constante (${top.pct}%).` : '.'}`
      : 'Marca tus hábitos en la app y vuelve a generar el reporte.';

    let matrix = '';
    if (sec.matrix) {
      if (p.type === 'year') {
        matrix = `<section class="rp-section"><h2>Cumplimiento mes a mes</h2>${yearTable(habits, cursor().year)}</section>`;
      } else if (p.type === 'range' && p.dates.length > 31) {
        const chunks = monthsIn(p.dates).map((k) => p.dates.filter((d) => d.startsWith(k)));
        matrix = `<section class="rp-section"><h2>Registro diario</h2>${chunks
          .map((ds) => {
            const mo = U.monthOf(ds[0]);
            return matrixTable(habits, ds, U.fmt.month(mo.y, mo.m));
          })
          .join('')}</section>`;
      } else {
        matrix = `<section class="rp-section"><h2>Registro diario</h2>${matrixTable(habits, p.dates)}</section>`;
      }
    }

    return `
      <article class="paper" data-orient="${orientation(p)}" data-paper="${cfg().paper}">
        <header class="rp-head">
          <div class="rp-brand">${HA.atom.markInline('#1c1c1e', '#34c759')}<span><b>Hábitos</b> atómicos</span></div>
          <div class="rp-meta">
            <span>Reporte ${p.typeLabel}</span>
            <span>Generado el ${U.fmt.longYear(t)}</span>
          </div>
        </header>

        <section class="rp-title">
          <p class="rp-eyebrow">${name ? `${U.esc(name)} · ` : ''}${U.esc(p.label)}</p>
          <h1>${headline}</h1>
          <p class="rp-lede">${lede}</p>
        </section>

        <section class="rp-kpis">
          <div><span class="rp-kpi-v">${sum.pct}%</span><span class="rp-kpi-l">Cumplimiento</span></div>
          <div><span class="rp-kpi-v">${sum.done}<small>/${sum.scheduled}</small></span><span class="rp-kpi-l">Check-ins</span></div>
          <div><span class="rp-kpi-v">${sum.perfect}</span><span class="rp-kpi-l">Días perfectos</span></div>
          <div><span class="rp-kpi-v">${best ? best.b : 0}<small> días</small></span><span class="rp-kpi-l">Mejor racha${best && best.b ? ` · ${U.esc(best.h.name)}` : ''}</span></div>
          <div><span class="rp-kpi-v rp-kpi-text">${top ? U.esc(top.habit.name) : '—'}</span><span class="rp-kpi-l">Más constante</span></div>
        </section>

        ${matrix}
        ${sec.matrix && p.type !== 'year' ? `
        <ul class="rp-legend">
          <li><span class="rc rc-done">✓</span>Cumplido</li>
          <li><span class="rc rc-miss"></span>No cumplido</li>
          <li><span class="rc rc-off"></span>Sin programar</li>
          <li><span class="rp-dbar-sample"></span>Cumplimiento del día</li>
        </ul>` : ''}
        ${sec.stats ? statsBlock(sum, p.dates, habits) : ''}
        ${sec.goals ? goalsBlock(p) : ''}
        ${sec.notes ? notesBlock(p) : ''}
        ${sec.reflection ? reflectionBlock() : ''}

        <footer class="rp-foot">
          <span>Hábitos Atómicos · Pequeños cambios, resultados extraordinarios.</span>
          <span>${U.esc(p.label)}</span>
        </footer>
      </article>`;
  }

  /* ---------- impresión ---------- */
  let pageStyle = null;
  function preparePrint() {
    const p = period();
    const paper = PAPER[cfg().paper] || PAPER.a4;
    const root = document.getElementById('printRoot');
    root.innerHTML = build();
    if (!pageStyle) {
      pageStyle = document.createElement('style');
      pageStyle.id = 'pageStyle';
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `@page { size: ${paper.css} ${orientation(p)}; margin: 11mm 12mm 13mm; @bottom-right { content: "Página " counter(page) " de " counter(pages); font-family: -apple-system, BlinkMacSystemFont, Archivo, system-ui, sans-serif; font-size: 7.5pt; color: #8a8984; } }`;
  }
  function print() {
    preparePrint();
    HA.sound.tap();
    setTimeout(() => window.print(), 60);
  }
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', () => {
    const root = document.getElementById('printRoot');
    if (root) root.innerHTML = '';
  });

  /* ---------- vista ---------- */
  function periodControl() {
    const type = cfg().type;
    const c = cursor();
    if (type === 'range') {
      return `
        <div class="range-inputs">
          <label class="field"><span class="field-label">Desde</span><input class="input" type="date" data-range="from" value="${c.from}" max="${U.todayISO()}"></label>
          <label class="field"><span class="field-label">Hasta</span><input class="input" type="date" data-range="to" value="${c.to}"></label>
        </div>`;
    }
    const p = period();
    return ui.periodNav({ label: p.label, prevLabel: 'Período anterior', nextLabel: 'Período siguiente' });
  }

  function controls() {
    const c = cfg();
    return `
      <div class="core rc-core">
        <div class="field">
          <span class="field-label">Período</span>
          ${ui.seg({ name: 'type', value: c.type, options: TYPES, label: 'Tipo de reporte' })}
        </div>
        <div class="field" data-period>${periodControl()}</div>
        <div class="field">
          <span class="field-label">Incluir</span>
          <div class="check-list">
            ${SECTIONS.map((s) => `
              <label class="check-row">
                <input type="checkbox" data-section="${s.key}" ${c.sections[s.key] ? 'checked' : ''}>
                <span class="check-box"><svg viewBox="0 0 24 24"><use href="#tick"/></svg></span>
                <span class="check-text">${s.label}<small>${s.hint}</small></span>
              </label>`).join('')}
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <span class="field-label">Papel</span>
            ${ui.seg({ name: 'paper', value: c.paper, options: [{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Carta' }], label: 'Tamaño de papel' })}
          </div>
          <div class="field">
            <span class="field-label">Orientación</span>
            ${ui.seg({ name: 'orientation', value: c.orientation, options: [{ value: 'auto', label: 'Auto' }, { value: 'portrait', label: 'Vertical' }, { value: 'landscape', label: 'Horizontal' }], label: 'Orientación' })}
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-block" data-act="print">
          <span>Imprimir o guardar PDF</span>
          <span class="btn-orb">${ui.icon('printer', 'bold')}</span>
        </button>
        <p class="hint">${ui.icon('info')} En el diálogo elige <b>Guardar como PDF</b> para descargarlo. Desactiva “Encabezados y pies de página” para un resultado más limpio.</p>
      </div>`;
  }

  function fit(root) {
    const stage = root.querySelector('.paper-stage');
    const paper = stage && stage.querySelector('.paper');
    if (!paper) return;
    paper.style.zoom = 1;
    const p = period();
    const spec = PAPER[cfg().paper] || PAPER.a4;
    const o = orientation(p);
    const mm = o === 'landscape' ? spec.h : spec.w;
    const px = (mm / 25.4) * 96;
    const cs = getComputedStyle(stage);
    const avail = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const z = Math.min(1, avail / px);
    paper.style.zoom = z.toFixed(4);
    const zl = root.querySelector('[data-zoom]');
    if (zl) zl.textContent = `${Math.round(z * 100)}%`;
    const info = root.querySelector('[data-paperinfo]');
    if (info) info.textContent = `${spec.name} · ${o === 'landscape' ? 'horizontal' : 'vertical'}`;
  }

  function refreshPreview(root, animate) {
    const stage = root.querySelector('.paper-stage');
    if (!stage) return;
    stage.innerHTML = build();
    fit(root);
    if (animate && !ui.reduced()) {
      stage.firstElementChild.animate(
        [{ opacity: 0.2, filter: 'blur(8px)', transform: 'translateY(6px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }],
        { duration: 340, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
      );
    }
  }

  let ro = null;
  function render(root) {
    root.innerHTML = `
      <section class="page page-report">
        <header class="page-head reveal">
          <div class="page-head-main">
            <p class="eyebrow"><span class="eyebrow-dot"></span>Reporte</p>
            <h1 class="display">Imprime tu <em>constancia</em></h1>
            <p class="lede">Un documento limpio con tu registro, estadísticas, metas y notas. Listo para imprimir, archivar o compartir en PDF.</p>
          </div>
        </header>
        <div class="report-grid">
          <aside class="bezel report-controls reveal" data-controls>${controls()}</aside>
          <section class="report-preview reveal" aria-label="Vista previa del reporte">
            <div class="preview-bar">
              <span class="preview-title">${ui.icon('file-text')} Vista previa</span>
              <span class="preview-meta"><span data-paperinfo></span> · <span data-zoom></span></span>
            </div>
            <div class="paper-stage"></div>
          </section>
        </div>
      </section>`;
    refreshPreview(root, false);
    bind(root);
    if (ro) ro.disconnect();
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => fit(root));
      ro.observe(root.querySelector('.paper-stage'));
    }
  }

  function redrawControls(root) {
    const box = root.querySelector('[data-controls]');
    box.innerHTML = controls();
  }

  function shift(root, delta) {
    const c = cursor();
    const type = cfg().type;
    if (type === 'week') c.week = U.addDaysISO(c.week, delta * 7);
    else if (type === 'month') c.month = U.shiftMonth(c.month, delta);
    else if (type === 'year') c.year += delta;
    else return;
    HA.sound.tap();
    root.querySelector('[data-period]').innerHTML = periodControl();
    refreshPreview(root, true);
  }

  function bind(root) {
    root.onclick = (e) => {
      const seg = e.target.closest('.seg-btn');
      if (seg) {
        const box = seg.closest('[data-seg]');
        const name = box.dataset.seg;
        const value = seg.dataset.value;
        if (cfg()[name] === value) return;
        ui.setSeg(box, value);
        S.setReport({ [name]: value });
        HA.sound.tab();
        if (name === 'type') root.querySelector('[data-period]').innerHTML = periodControl();
        refreshPreview(root, true);
        return;
      }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'print') return print();
      if (act.dataset.act === 'prev') return shift(root, -1);
      if (act.dataset.act === 'next') return shift(root, 1);
    };
    root.onchange = (e) => {
      const sec = e.target.closest('[data-section]');
      if (sec) {
        const sections = Object.assign({}, cfg().sections, { [sec.dataset.section]: sec.checked });
        S.setReport({ sections });
        HA.sound.tap();
        refreshPreview(root, true);
        return;
      }
      const r = e.target.closest('[data-range]');
      if (r && r.value) {
        cursor()[r.dataset.range] = r.value;
        refreshPreview(root, true);
      }
    };
  }

  function onKey(e) {
    if (e.key === 'ArrowLeft') { shift(HA.app.root, -1); return true; }
    if (e.key === 'ArrowRight') { shift(HA.app.root, 1); return true; }
    return false;
  }

  HA.views.reporte = { render, onKey, title: 'Reporte', redrawControls };
  HA.report = { print, build };
})();
