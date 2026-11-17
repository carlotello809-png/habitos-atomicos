/* ==========================================================================
   Vista: PROGRESO — indicadores, mapa de calor anual y gráficos
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const S = HA.store;
  const St = HA.stats;
  const ui = HA.ui;

  const state = () => HA.app.state;

  /* ---------- mapa de calor (53 semanas) ---------- */
  function heatmap() {
    const t = U.todayISO();
    const weeks = 53;
    const cells = St.heat(t, weeks);
    const cols = [];
    for (let w = 0; w < weeks; w++) cols.push(cells.slice(w * 7, w * 7 + 7));
    let lastMonth = -1;
    const months = cols
      .map((col) => {
        const d = U.parse(col[0].date);
        const m = d.getMonth();
        if (m !== lastMonth && d.getDate() <= 7) {
          lastMonth = m;
          return `<span>${U.cap(U.MONTHS_SHORT[m])}</span>`;
        }
        return '<span></span>';
      })
      .join('');
    let active = 0;
    let perfect = 0;
    const grid = cols
      .map(
        (col, ci) =>
          `<div class="hm-col" style="--ci:${ci}">${col
            .map((c) => {
              const fut = c.date > t;
              const lvl = fut ? 'f' : St.level(c.pct, c.scheduled);
              if (!fut && c.done) active++;
              if (!fut && c.perfect) perfect++;
              const tip = fut ? `${U.fmt.dayShort(c.date)}|Aún no llega` : c.scheduled ? `${U.fmt.dayShort(c.date)}|${c.done} de ${c.scheduled} hábitos · ${c.pct}%` : `${U.fmt.dayShort(c.date)}|Sin hábitos programados`;
              return `<button type="button" class="hm-cell l${lvl}${c.date === t ? ' is-today' : ''}" data-act="day" data-date="${c.date}" data-tip="${tip}" ${fut ? 'disabled tabindex="-1"' : 'tabindex="-1"'} aria-label="${tip.replace('|', ': ')}"></button>`;
            })
            .join('')}</div>`
      )
      .join('');

    return `
      <article class="bezel reveal">
        <div class="core heat-core">
          <div class="card-head">
            <div>
              <h2 class="card-title">Tu año en hábitos</h2>
              <p class="card-sub">${active} días con al menos un check · ${perfect} días perfectos en las últimas 53 semanas</p>
            </div>
            <div class="hm-legend" aria-hidden="true">
              <span>Menos</span><i class="hm-cell l0"></i><i class="hm-cell l1"></i><i class="hm-cell l2"></i><i class="hm-cell l3"></i><i class="hm-cell l4"></i><span>Más</span>
            </div>
          </div>
          <div class="hm-scroll">
            <div class="hm">
              <div class="hm-months" aria-hidden="true">${months}</div>
              <div class="hm-body">
                <div class="hm-days" aria-hidden="true">${U.DOW_LETTER.map((l, i) => `<span>${i % 2 === 0 ? l : ''}</span>`).join('')}</div>
                <div class="hm-grid">${grid}</div>
              </div>
            </div>
          </div>
        </div>
      </article>`;
  }

  /* ---------- constancia por hábito (barras horizontales) ---------- */
  function consistency(sum) {
    const rows = sum.perHabit
      .filter((x) => x.scheduled)
      .sort((a, b) => b.pct - a.pct || b.done - a.done);
    const body = rows.length
      ? rows
          .map(
            (x, i) => `
        <li class="hb-row" style="--hc: var(--c-${x.habit.color}); --i:${i}">
          <span class="habit-tile tile-sm">${ui.icon(x.habit.icon, 'fill')}</span>
          <span class="hb-name">${U.esc(x.habit.name)}</span>
          <span class="hb-track" data-tip="${U.esc(x.habit.name)}|${x.done} de ${x.scheduled} días · ${x.pct}%"><span class="hb-fill" style="--v:${x.pct / 100}"></span></span>
          <span class="hb-val">${x.pct}%</span>
        </li>`
          )
          .join('')
      : '<li class="muted small">Sin registros en este mes todavía.</li>';
    return `
      <article class="bezel reveal">
        <div class="core">
          <div class="card-head">
            <div>
              <h2 class="card-title">Constancia por hábito</h2>
              <p class="card-sub">Porcentaje de días programados cumplidos</p>
            </div>
          </div>
          <ul class="hb-list">${body}</ul>
        </div>
      </article>`;
  }

  /* ---------- ritmo diario (barras verticales con promedio) ---------- */
  function daily(sum, dates) {
    const t = U.todayISO();
    const past = sum.perDay.filter((d) => d.date <= t && d.scheduled);
    const avg = past.length ? Math.round(past.reduce((a, d) => a + d.pct, 0) / past.length) : 0;
    const bars = sum.perDay
      .map((d, i) => {
        const fut = d.date > t;
        const tip = fut ? `${U.fmt.dayShort(d.date)}|Aún no llega` : `${U.fmt.dayShort(d.date)}|${d.done} de ${d.scheduled} · ${d.pct}%`;
        return `<div class="db-col${fut ? ' is-future' : ''}${d.perfect ? ' is-perfect' : ''}" style="--i:${i}" data-tip="${tip}">
          <span class="db-bar" style="--v:${fut || !d.scheduled ? 0 : Math.max(0.02, d.pct / 100)}"></span>
          <span class="db-x">${(i + 1) % 5 === 0 || i === 0 ? i + 1 : ''}</span>
        </div>`;
      })
      .join('');
    return `
      <article class="bezel reveal">
        <div class="core">
          <div class="card-head">
            <div>
              <h2 class="card-title">Ritmo diario</h2>
              <p class="card-sub">Cumplimiento de cada día de ${U.MONTHS[state().month.m]}</p>
            </div>
            <span class="card-meta">Promedio <b>${avg}%</b></span>
          </div>
          <div class="db-chart" style="--avg:${avg / 100}; --n:${dates.length}">
            <div class="db-grid" aria-hidden="true"><span data-y="100%"></span><span data-y="50%"></span><span data-y="0%"></span></div>
            ${past.length ? `<div class="db-avg" aria-hidden="true"><span>Prom. ${avg}%</span></div>` : ''}
            <div class="db-bars">${bars}</div>
          </div>
        </div>
      </article>`;
  }

  /* ---------- día de la semana (últimas 12 semanas) ---------- */
  function weekdays() {
    const t = U.todayISO();
    const dates = U.rangeDates(U.addDaysISO(t, -83), t);
    const prof = St.weekdayProfile(dates);
    const max = Math.max(...prof.map((p) => p.pct), 1);
    const best = prof.reduce((b, p, i) => (p.scheduled && (b < 0 || p.pct > prof[b].pct) ? i : b), -1);
    const worst = prof.reduce((b, p, i) => (p.scheduled && (b < 0 || p.pct < prof[b].pct) ? i : b), -1);
    const bars = prof
      .map(
        (p, i) => `
      <div class="wb-col${i === best ? ' is-best' : ''}" style="--i:${i}" data-tip="${U.cap(U.DOW_LONG[i])}|${p.done} de ${p.scheduled} · ${p.pct}%">
        <span class="wb-val">${p.scheduled ? p.pct + '%' : '—'}</span>
        <span class="wb-track"><span class="wb-bar" style="--v:${p.pct / max}"></span></span>
        <span class="wb-x">${U.DOW_LETTER[i]}</span>
      </div>`
      )
      .join('');
    return `
      <article class="bezel reveal">
        <div class="core">
          <div class="card-head">
            <div>
              <h2 class="card-title">Por día de la semana</h2>
              <p class="card-sub">Últimas 12 semanas${best >= 0 && worst >= 0 && best !== worst ? ` · Tu mejor día es el ${U.DOW_LONG[best]}, el más flojo el ${U.DOW_LONG[worst]}` : ''}</p>
            </div>
          </div>
          <div class="wb-chart">${bars}</div>
        </div>
      </article>`;
  }

  /* ---------- acumulado del mes: real vs ideal ---------- */
  function cumulative(sum) {
    const t = U.todayISO();
    const days = sum.perDay;
    let real = 0;
    let ideal = 0;
    const pts = days.map((d) => {
      if (d.date <= t) {
        real += d.done;
        ideal += d.scheduled;
      }
      return { date: d.date, real, ideal, fut: d.date > t };
    });
    const known = pts.filter((p) => !p.fut);
    const W = 600;
    const H = 220;
    const P = { l: 34, r: 16, t: 14, b: 26 };
    const maxY = Math.max(4, ideal);
    const n = days.length;
    const x = (i) => P.l + (i / Math.max(1, n - 1)) * (W - P.l - P.r);
    const y = (v) => H - P.b - (v / maxY) * (H - P.t - P.b);
    const line = (key) => known.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
    const area = known.length ? `${line('real')} L${x(known.length - 1).toFixed(1)},${y(0)} L${x(0)},${y(0)} Z` : '';
    const ticks = [0, Math.round(maxY / 2), maxY];
    const cols = pts
      .map((p, i) => {
        const w = (W - P.l - P.r) / Math.max(1, n - 1);
        return `<rect class="cu-hit" x="${(x(i) - w / 2).toFixed(1)}" y="${P.t}" width="${w.toFixed(1)}" height="${H - P.t - P.b}"
          data-tip="${U.fmt.dayShort(p.date)}|${p.fut ? 'Aún no llega' : `Real ${p.real} · Ideal ${p.ideal}`}"/>
          <line class="cu-guide" x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${P.t}" y2="${H - P.b}"/>`;
      })
      .join('');
    const last = known[known.length - 1];
    return `
      <article class="bezel reveal">
        <div class="core">
          <div class="card-head">
            <div>
              <h2 class="card-title">Acumulado del mes</h2>
              <p class="card-sub">Check-ins reales frente al ideal programado</p>
            </div>
            <ul class="cu-legend">
              <li><span class="sw sw-real"></span>Real</li>
              <li><span class="sw sw-ideal"></span>Ideal</li>
            </ul>
          </div>
          <svg class="cu-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Acumulado real ${last ? last.real : 0} de ${last ? last.ideal : 0}">
            ${ticks.map((v) => `<line class="cu-gridline" x1="${P.l}" x2="${W - P.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="cu-tick" x="${P.l - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join('')}
            <text class="cu-tick" x="${x(0)}" y="${H - 6}" text-anchor="start">1</text>
            <text class="cu-tick" x="${x(n - 1)}" y="${H - 6}" text-anchor="end">${n}</text>
            ${known.length ? `
              <path class="cu-area" d="${area}"/>
              <path class="cu-ideal" d="${line('ideal')}"/>
              <path class="cu-real" d="${line('real')}" pathLength="1"/>
              <circle class="cu-dot" cx="${x(known.length - 1).toFixed(1)}" cy="${y(last.real).toFixed(1)}" r="4.5"/>
              <text class="cu-label" x="${Math.min(x(known.length - 1) + 8, W - 60).toFixed(1)}" y="${(y(last.real) - 10).toFixed(1)}">${last.real} de ${last.ideal}</text>` : ''}
            ${cols}
          </svg>
        </div>
      </article>`;
  }

  /* ---------- consejo personalizado ---------- */
  function advice(sum) {
    const parts = [];
    const tracked = sum.perHabit.filter((x) => x.scheduled >= 3).sort((a, b) => a.pct - b.pct);
    if (tracked.length && tracked[0].pct < 70) {
      const w = tracked[0];
      parts.push({
        icon: 'target',
        title: `Prioriza “${w.habit.name}”`,
        text: `Va en ${w.pct}% este mes. Reduce la meta a su versión de dos minutos${w.habit.mini ? ` (“${w.habit.mini}”)` : ''} y únela a algo que ya haces todos los días.`,
      });
    }
    const t = U.todayISO();
    const prof = St.weekdayProfile(U.rangeDates(U.addDaysISO(t, -55), t));
    const worst = prof.reduce((b, p, i) => (p.scheduled >= 4 && (b < 0 || p.pct < prof[b].pct) ? i : b), -1);
    if (worst >= 0 && prof[worst].pct < 60) {
      parts.push({
        icon: 'calendar-x',
        title: `Cuida tus ${U.DOW_LONG[worst].endsWith('s') ? U.DOW_LONG[worst] : U.DOW_LONG[worst] + 's'}`,
        text: `Es tu día más flojo (${prof[worst].pct}%). Prepara el entorno la noche anterior para que empezar sea obvio.`,
      });
    }
    const kinds = [
      ['week', 'tus metas de la semana', U.weekStartISO(t)],
      ['month', 'tus metas del mes', U.monthKey(state().month.y, state().month.m)],
      ['short', 'tus metas a corto plazo', null],
      ['medium', 'tus metas a mediano plazo', null],
      ['long', 'tus metas a largo plazo', null],
    ]
      .map(([k, label, key]) => {
        const list = S.goalList(k, key);
        const done = list.filter((g) => g.done).length;
        return { label, total: list.length, pending: list.length - done, ratio: list.length ? done / list.length : 1 };
      })
      .filter((x) => x.total)
      .sort((a, b) => a.ratio - b.ratio);
    if (kinds.length && kinds[0].ratio < 1) {
      parts.push({
        icon: 'flag',
        title: 'Metas pendientes',
        text: `Tienes ${U.fmt.plural(kinds[0].pending, 'meta pendiente', 'metas pendientes')} en ${kinds[0].label}. Elige una y dale un bloque de tiempo esta semana.`,
      });
    }
    if (!parts.length) {
      parts.push({
        icon: 'sparkle',
        title: S.habits().length ? 'Vas muy bien' : 'Empieza hoy',
        text: S.habits().length ? 'No hay áreas urgentes. Considera subir un poco la dificultad de tu hábito más constante.' : 'Crea tu primer hábito para recibir recomendaciones personalizadas.',
      });
    }
    return parts
      .slice(0, 3)
      .map(
        (p) => `
      <li class="advice-item">
        <span class="advice-icon">${ui.icon(p.icon, 'fill')}</span>
        <div><p class="advice-title">${U.esc(p.title)}</p><p class="advice-text">${U.esc(p.text)}</p></div>
      </li>`
      )
      .join('');
  }

  function kpis(sum, prevSum) {
    const delta = prevSum.scheduled ? sum.pct - prevSum.pct : null;
    let best = { s: 0, h: null };
    S.habits().forEach((h) => {
      const b = St.bestStreak(h);
      if (b > best.s) best = { s: b, h };
    });
    const prevName = U.MONTHS[U.shiftMonth(state().month, -1).m];
    return `
      <div class="kpi kpi-lg reveal">
        <p class="kpi-label">${ui.icon('chart-donut', 'fill')} Cumplimiento del mes</p>
        <p class="kpi-value"><span data-count="${sum.pct}">0</span><small>%</small></p>
        <p class="kpi-sub">${delta == null ? 'Sin datos del mes anterior' : `<span class="delta ${delta >= 0 ? 'is-up' : 'is-down'}">${ui.icon(delta >= 0 ? 'arrow-up-right' : 'arrow-down-right', 'bold')} ${Math.abs(delta)} pts</span> frente a ${prevName}`}</p>
      </div>
      <div class="kpi reveal">
        <p class="kpi-label">${ui.icon('check-circle', 'fill')} Check-ins</p>
        <p class="kpi-value"><span data-count="${sum.done}">0</span></p>
        <p class="kpi-sub">de ${sum.scheduled} programados</p>
      </div>
      <div class="kpi reveal">
        <p class="kpi-label">${ui.icon('star', 'fill')} Días perfectos</p>
        <p class="kpi-value"><span data-count="${sum.perfect}">0</span></p>
        <p class="kpi-sub">Racha actual: ${St.perfectStreak()} ${St.perfectStreak() === 1 ? 'día' : 'días'}</p>
      </div>
      <div class="kpi reveal">
        <p class="kpi-label">${ui.icon('trophy', 'fill')} Mejor racha</p>
        <p class="kpi-value"><span data-count="${best.s}">0</span><small>días</small></p>
        <p class="kpi-sub">${best.h ? U.esc(best.h.name) : 'Aún sin rachas'}</p>
      </div>`;
  }

  function render(root) {
    const { y, m } = state().month;
    const dates = U.monthDates(y, m);
    const sum = St.range(dates);
    const prev = U.shiftMonth({ y, m }, -1);
    const prevSum = St.range(U.monthDates(prev.y, prev.m));
    const qi = (U.dayOfYear(U.today()) + 7) % HA.QUOTES.length;
    const q = HA.QUOTES[qi];

    root.innerHTML = `
      <section class="page page-progress">
        <header class="page-head reveal">
          <div class="page-head-main">
            <p class="eyebrow"><span class="eyebrow-dot"></span>Progreso</p>
            <h1 class="display">El efecto <em>compuesto</em></h1>
            <p class="lede">Los resultados son el interés de tus hábitos. Así se ve tu constancia en ${U.fmt.month(y, m).toLowerCase()}.</p>
          </div>
          <div class="head-tools">
            ${ui.periodNav({ label: U.fmt.month(y, m), prevLabel: 'Mes anterior', nextLabel: 'Mes siguiente' })}
          </div>
        </header>

        <div class="kpi-row">${kpis(sum, prevSum)}</div>

        ${heatmap()}

        <div class="chart-grid">
          ${consistency(sum)}
          ${daily(sum, dates)}
          ${weekdays()}
          ${cumulative(sum)}
        </div>

        <div class="insight-grid">
          <article class="bezel reveal">
            <div class="core">
              <div class="card-head"><h2 class="card-title">${ui.icon('lightbulb', 'fill')} Qué deberías mejorar</h2></div>
              <ul class="advice">${advice(sum)}</ul>
            </div>
          </article>
          <article class="quote-card quote-wide reveal" data-qi="${qi}" role="button" tabindex="0" aria-label="Consejo del día. Toca para ver otro.">
            <span class="quote-mark" aria-hidden="true">“</span>
            <p class="quote-text">${U.esc(q)}</p>
            <p class="quote-label">${ui.icon('sparkle', 'fill')} Consejo del día</p>
          </article>
        </div>
      </section>`;

    bind(root);
    requestAnimationFrame(() => {
      const sc = root.querySelector('.hm-scroll');
      if (sc) sc.scrollLeft = sc.scrollWidth;
    });
  }

  function bind(root) {
    root.onclick = (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'day') {
        state().date = act.dataset.date;
        location.hash = '#hoy';
        return;
      }
      if (act.dataset.act === 'prev') return shift(-1);
      if (act.dataset.act === 'next') return shift(1);
    };
  }

  function shift(delta) {
    state().month = U.shiftMonth(state().month, delta);
    HA.sound.tap();
    HA.app.rerender({ soft: true });
  }

  function onKey(e) {
    if (e.key === 'ArrowLeft') { shift(-1); return true; }
    if (e.key === 'ArrowRight') { shift(1); return true; }
    return false;
  }

  HA.views.progreso = { render, onKey, title: 'Progreso' };
})();
