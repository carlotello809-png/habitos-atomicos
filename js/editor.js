/* ==========================================================================
   Hábitos Atómicos — editor de hábitos (modal) y ficha de hábito (panel)
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const S = HA.store;
  const ui = HA.ui;
  const St = HA.stats;

  const PRESETS = { all: [0, 1, 2, 3, 4, 5, 6], work: [0, 1, 2, 3, 4], weekend: [5, 6] };

  function daysLabel(days) {
    const sorted = days.slice().sort();
    if (sorted.length === 7) return 'Todos los días';
    if (sorted.join() === '0,1,2,3,4') return 'De lunes a viernes';
    if (sorted.join() === '5,6') return 'Fines de semana';
    return sorted.map((d) => U.cap(U.DOW_SHORT[d])).join(' · ');
  }

  /* ======================= EDITOR ======================= */
  function open(habitId, presetName) {
    const dlg = ui.$('#modal');
    const existing = habitId ? S.habit(habitId) : null;
    const isNew = !existing;
    const used = S.habits(true).map((h) => h.color);
    const freeColor = [0, 1, 2, 3, 4, 5, 6, 7].find((c) => !used.includes(c));
    const st = existing
      ? { name: existing.name, icon: existing.icon, color: existing.color, days: existing.days.slice(), identity: existing.identity, cue: existing.cue, mini: existing.mini }
      : { name: presetName || '', icon: 'sparkle', color: freeColor == null ? S.habits(true).length % 8 : freeColor, days: PRESETS.all.slice(), identity: '', cue: '', mini: '' };

    const icons = HA.HABIT_ICONS.map(
      (n) => `<button type="button" class="icon-opt${n === st.icon ? ' is-active' : ''}" data-icon="${n}" aria-pressed="${n === st.icon}" aria-label="${n}">${ui.icon(n, 'fill')}</button>`
    ).join('');
    const swatches = HA.HABIT_COLORS.map(
      (label, i) => `<button type="button" class="swatch${i === st.color ? ' is-active' : ''}" data-color="${i}" style="--sw: var(--c-${i})" aria-pressed="${i === st.color}" aria-label="Color ${label}"></button>`
    ).join('');
    const days = U.DOW_LETTER.map(
      (l, i) => `<button type="button" class="day-opt${st.days.includes(i) ? ' is-active' : ''}" data-day="${i}" aria-pressed="${st.days.includes(i)}" aria-label="${U.DOW_LONG[i]}">${l}</button>`
    ).join('');

    const html = `
      <form class="dlg-panel editor" novalidate>
        <header class="dlg-head">
          <span class="habit-tile tile-lg editor-preview" style="--hc: var(--c-${st.color})">${ui.icon(st.icon, 'fill')}</span>
          <div class="dlg-titles">
            <p class="eyebrow">${isNew ? 'Nuevo hábito' : 'Editar hábito'}</p>
            <h2 id="modalTitle">${isNew ? 'Diseña un hábito' : 'Ajusta tu hábito'}</h2>
          </div>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${ui.icon('x', 'bold')}</button>
        </header>

        <div class="dlg-body">
          <label class="field">
            <span class="field-label">Nombre</span>
            <input class="input" name="name" maxlength="40" value="${U.esc(st.name)}" placeholder="Ej. Leer 10 páginas" autocomplete="off">
            <span class="field-error" data-err="name" hidden>${ui.icon('warning-circle', 'fill')} Escribe un nombre para tu hábito.</span>
          </label>

          <fieldset class="field">
            <legend class="field-label">Ícono</legend>
            <div class="icon-grid">${icons}</div>
          </fieldset>

          <div class="field-row">
            <fieldset class="field">
              <legend class="field-label">Color</legend>
              <div class="swatches">${swatches}</div>
            </fieldset>
            <fieldset class="field">
              <legend class="field-label">Días</legend>
              <div class="days-pick">${days}</div>
              <div class="days-presets">
                <button type="button" class="chip chip-xs" data-preset="all">Diario</button>
                <button type="button" class="chip chip-xs" data-preset="work">L – V</button>
                <button type="button" class="chip chip-xs" data-preset="weekend">Fin de semana</button>
              </div>
              <span class="field-error" data-err="days" hidden>${ui.icon('warning-circle', 'fill')} Elige al menos un día.</span>
            </fieldset>
          </div>

          <section class="laws" aria-label="Diseño atómico">
            <p class="laws-title">${ui.icon('atom', 'fill')} Diseño atómico <span>opcional</span></p>
            <label class="field">
              <span class="field-label">Identidad · ¿quién quieres ser?</span>
              <input class="input" name="identity" maxlength="70" value="${U.esc(st.identity)}" placeholder="Soy una persona que lee cada día" autocomplete="off">
            </label>
            <label class="field">
              <span class="field-label">Señal · ¿cuándo y dónde?</span>
              <input class="input" name="cue" maxlength="70" value="${U.esc(st.cue)}" placeholder="Después de cenar, en el sofá" autocomplete="off">
            </label>
            <label class="field">
              <span class="field-label">Versión de dos minutos</span>
              <input class="input" name="mini" maxlength="70" value="${U.esc(st.mini)}" placeholder="Leer una página" autocomplete="off">
            </label>
          </section>
        </div>

        <footer class="dlg-foot">
          ${isNew ? '' : `<button type="button" class="btn btn-quiet is-danger" data-act="delete">${ui.icon('trash')} Eliminar</button>`}
          <span class="spacer"></span>
          <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">
            <span>${isNew ? 'Crear hábito' : 'Guardar'}</span>
            <span class="btn-orb">${ui.icon('arrow-right', 'bold')}</span>
          </button>
        </footer>
      </form>`;

    ui.dialog.open(dlg, html);
    HA.sound.open();
    const form = dlg.querySelector('form');
    const preview = form.querySelector('.editor-preview');
    const nameInput = form.elements.name;
    setTimeout(() => nameInput.focus(), 60);

    form.addEventListener('click', (e) => {
      const ic = e.target.closest('.icon-opt');
      if (ic) {
        st.icon = ic.dataset.icon;
        ui.$$('.icon-opt', form).forEach((b) => {
          b.classList.toggle('is-active', b === ic);
          b.setAttribute('aria-pressed', b === ic);
        });
        preview.innerHTML = ui.icon(st.icon, 'fill');
        bump(preview);
        HA.sound.tap();
        return;
      }
      const sw = e.target.closest('.swatch');
      if (sw) {
        st.color = +sw.dataset.color;
        ui.$$('.swatch', form).forEach((b) => {
          b.classList.toggle('is-active', b === sw);
          b.setAttribute('aria-pressed', b === sw);
        });
        preview.style.setProperty('--hc', `var(--c-${st.color})`);
        bump(preview);
        HA.sound.tap();
        return;
      }
      const dy = e.target.closest('.day-opt');
      if (dy) {
        const d = +dy.dataset.day;
        st.days = st.days.includes(d) ? st.days.filter((x) => x !== d) : st.days.concat(d);
        syncDays();
        HA.sound.tap();
        return;
      }
      const pr = e.target.closest('[data-preset]');
      if (pr) {
        st.days = PRESETS[pr.dataset.preset].slice();
        syncDays();
        HA.sound.tap();
        return;
      }
      if (e.target.closest('[data-act="delete"]')) {
        remove(existing.id, true);
      }
    });

    function syncDays() {
      ui.$$('.day-opt', form).forEach((b) => {
        const on = st.days.includes(+b.dataset.day);
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on);
      });
      if (st.days.length) form.querySelector('[data-err="days"]').hidden = true;
    }

    nameInput.addEventListener('input', () => {
      if (nameInput.value.trim()) {
        form.querySelector('[data-err="name"]').hidden = true;
        nameInput.removeAttribute('aria-invalid');
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      let ok = true;
      if (!name) {
        form.querySelector('[data-err="name"]').hidden = false;
        nameInput.setAttribute('aria-invalid', 'true');
        nameInput.focus();
        ok = false;
      }
      if (!st.days.length) {
        form.querySelector('[data-err="days"]').hidden = false;
        ok = false;
      }
      if (!ok) {
        shake(form);
        return;
      }
      const fields = {
        name,
        icon: st.icon,
        color: st.color,
        days: st.days.slice().sort(),
        identity: form.elements.identity.value.trim(),
        cue: form.elements.cue.value.trim(),
        mini: form.elements.mini.value.trim(),
      };
      if (isNew) {
        S.addHabit(fields);
        HA.sound.add();
        ui.toast({ title: 'Hábito creado', message: `${name} · ${daysLabel(fields.days)}`, icon: 'sparkle' });
      } else {
        S.updateHabit(existing.id, fields);
        HA.sound.add();
        ui.toast({ title: 'Cambios guardados', message: name, icon: 'check-circle' });
      }
      ui.dialog.close(dlg);
    });
  }

  function bump(el) {
    if (ui.reduced()) return;
    el.animate([{ transform: 'scale(0.86)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], {
      duration: 380,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
    });
  }
  function shake(el) {
    if (ui.reduced()) return;
    el.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
      { duration: 320, easing: 'ease-out' }
    );
  }

  async function remove(id, fromDialog) {
    const h = S.habit(id);
    if (!h) return;
    const ok = await ui.confirm({
      title: `¿Eliminar “${h.name}”?`,
      message: 'Se borrará el hábito y todo su historial. Si solo quieres pausarlo, archívalo.',
      confirm: 'Eliminar',
    });
    if (!ok) return;
    if (fromDialog) await ui.dialog.close(ui.$('#modal'));
    if (ui.$('#sheet').open) await ui.dialog.close(ui.$('#sheet'));
    const snap = S.removeHabit(id);
    HA.sound.remove();
    ui.toast({
      title: 'Hábito eliminado',
      message: h.name,
      icon: 'trash',
      tone: 'muted',
      action: { label: 'Deshacer', onClick: () => { S.restoreHabit(snap); HA.sound.add(); } },
      duration: 6000,
    });
  }

  async function archive(id, value) {
    const h = S.habit(id);
    if (!h) return;
    S.updateHabit(id, { archived: value });
    HA.sound.tap();
    ui.toast({
      title: value ? 'Hábito archivado' : 'Hábito restaurado',
      message: value ? `${h.name} ya no aparecerá en tu día. Puedes restaurarlo en Ajustes.` : h.name,
      icon: value ? 'archive' : 'arrow-counter-clockwise',
      tone: 'muted',
      action: { label: 'Deshacer', onClick: () => S.updateHabit(id, { archived: !value }) },
    });
  }

  /* ======================= FICHA DEL HÁBITO ======================= */
  function detail(id) {
    const h = S.habit(id);
    if (!h) return;
    const dlg = ui.$('#sheet');
    const t = U.todayISO();
    const last30 = U.rangeDates(U.addDaysISO(t, -29), t);
    const r30 = St.habitRange(h, last30);
    const cur = St.currentStreak(h);
    const best = St.bestStreak(h);
    const total = St.totalCheckins(h);
    const weeks = 20;
    const cells = St.heatHabit(h, t, weeks);
    const cols = [];
    for (let w = 0; w < weeks; w++) cols.push(cells.slice(w * 7, w * 7 + 7));
    const grid = cols
      .map(
        (col) =>
          `<div class="hh-col">${col
            .map((c) => {
              const state = c.future ? 'is-future' : c.done ? 'is-done' : c.scheduled ? 'is-miss' : 'is-off';
              const label = c.future ? 'Próximamente' : c.done ? 'Cumplido' : c.scheduled ? 'Pendiente' : 'Sin programar';
              return `<span class="hh-cell ${state}" data-tip="${U.fmt.dayShort(c.date)}|${label}"></span>`;
            })
            .join('')}</div>`
      )
      .join('');

    const html = `
      <div class="dlg-panel sheet-panel" style="--hc: var(--c-${h.color})">
        <header class="sheet-head">
          <span class="habit-tile tile-xl">${ui.icon(h.icon, 'fill')}</span>
          <div class="dlg-titles">
            <p class="eyebrow">${h.archived ? 'Hábito archivado' : 'Hábito'}</p>
            <h2 id="sheetTitle">${U.esc(h.name)}</h2>
            ${h.identity ? `<p class="sheet-identity">“${U.esc(h.identity)}”</p>` : ''}
          </div>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${ui.icon('x', 'bold')}</button>
        </header>

        <div class="sheet-body">
          <div class="mini-kpis">
            <div class="mini-kpi"><span class="mini-kpi-num"><span data-count="${cur}">0</span></span><span class="mini-kpi-label">${ui.icon('flame', 'fill')} Racha actual</span></div>
            <div class="mini-kpi"><span class="mini-kpi-num"><span data-count="${best}">0</span></span><span class="mini-kpi-label">${ui.icon('trophy', 'fill')} Mejor racha</span></div>
            <div class="mini-kpi"><span class="mini-kpi-num"><span data-count="${r30.pct}" data-suffix="%">0%</span></span><span class="mini-kpi-label">${ui.icon('calendar-check', 'fill')} Últimos 30 días</span></div>
            <div class="mini-kpi"><span class="mini-kpi-num"><span data-count="${total}">0</span></span><span class="mini-kpi-label">${ui.icon('check-circle', 'fill')} Check-ins totales</span></div>
          </div>

          <section class="sheet-sec">
            <h3>Últimas ${weeks} semanas</h3>
            <div class="hh-wrap">
              <div class="hh-days" aria-hidden="true">${U.DOW_LETTER.map((l, i) => `<span>${i % 2 === 0 ? l : ''}</span>`).join('')}</div>
              <div class="hh-grid">${grid}</div>
            </div>
            <div class="hh-legend"><span class="hh-cell is-done"></span> Cumplido <span class="hh-cell is-miss"></span> Pendiente <span class="hh-cell is-off"></span> Sin programar</div>
          </section>

          <section class="sheet-sec">
            <h3>Diseño del hábito</h3>
            <dl class="design-list">
              <div><dt>${ui.icon('bell-ringing')} Señal</dt><dd>${h.cue ? U.esc(h.cue) : '<span class="muted">Sin definir</span>'}</dd></div>
              <div><dt>${ui.icon('timer')} Versión de 2 minutos</dt><dd>${h.mini ? U.esc(h.mini) : '<span class="muted">Sin definir</span>'}</dd></div>
              <div><dt>${ui.icon('calendar-dots')} Días</dt><dd>${daysLabel(h.days)}</dd></div>
              <div><dt>${ui.icon('flag')} Desde</dt><dd>${U.fmt.longYear(h.start)}</dd></div>
            </dl>
          </section>
        </div>

        <footer class="sheet-foot">
          <button type="button" class="btn btn-ghost" data-act="edit">${ui.icon('pencil-simple')} Editar</button>
          <button type="button" class="btn btn-ghost" data-act="archive">${ui.icon(h.archived ? 'arrow-counter-clockwise' : 'archive')} ${h.archived ? 'Restaurar' : 'Archivar'}</button>
          <span class="spacer"></span>
          <button type="button" class="btn btn-quiet is-danger" data-act="delete">${ui.icon('trash')} Eliminar</button>
        </footer>
      </div>`;

    ui.dialog.open(dlg, html);
    HA.sound.open();
    ui.countAll(dlg);
    dlg.onclick = async (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'edit') {
        await ui.dialog.close(dlg);
        open(id);
      } else if (act.dataset.act === 'archive') {
        await ui.dialog.close(dlg);
        archive(id, !h.archived);
      } else if (act.dataset.act === 'delete') {
        remove(id, false);
      }
    };
  }

  HA.editor = { open, detail, remove, archive, daysLabel };
})();
