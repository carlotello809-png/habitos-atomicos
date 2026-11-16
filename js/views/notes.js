/* ==========================================================================
   Vista: NOTAS — reflexión mensual con autoguardado
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const S = HA.store;
  const St = HA.stats;
  const ui = HA.ui;

  const state = () => HA.app.state;
  const MAX = 10000;

  const PROMPTS = [
    { label: '¿Qué funcionó?', text: 'Lo que funcionó este mes:' },
    { label: '¿Qué me frenó?', text: 'Lo que me frenó:' },
    { label: 'Ajuste para el próximo mes', text: 'Lo que voy a ajustar:' },
    { label: 'Agradezco…', text: 'Agradezco:' },
    { label: 'Una victoria pequeña', text: 'Una victoria pequeña:' },
  ];

  const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

  function archive(current) {
    const keys = Object.keys(S.data.notes).filter((k) => S.data.notes[k] && S.data.notes[k].trim()).sort().reverse();
    if (!keys.length) {
      return '<li class="muted small archive-empty">Tus reflexiones de cada mes aparecerán aquí.</li>';
    }
    return keys
      .map((k) => {
        const [y, m] = k.split('-').map(Number);
        const text = S.data.notes[k];
        const first = text.trim().split('\n').find((l) => l.trim()) || '';
        return `
          <li>
            <button type="button" class="archive-item${k === current ? ' is-active' : ''}" data-act="open" data-key="${k}">
              <span class="archive-month">${U.fmt.month(y, m - 1)}</span>
              <span class="archive-snippet">${U.esc(first.slice(0, 90))}${first.length > 90 ? '…' : ''}</span>
              <span class="archive-meta">${words(text)} palabras</span>
            </button>
          </li>`;
      })
      .join('');
  }

  function monthContext(y, m) {
    const sum = St.range(U.monthDates(y, m));
    const top = sum.perHabit.filter((x) => x.scheduled).sort((a, b) => b.pct - a.pct)[0];
    return `
      <ul class="context-list">
        <li><span>${ui.icon('chart-donut')} Cumplimiento</span><b>${sum.scheduled ? sum.pct + '%' : '—'}</b></li>
        <li><span>${ui.icon('star')} Días perfectos</span><b>${sum.perfect}</b></li>
        <li><span>${ui.icon('trophy')} Hábito más constante</span><b>${top ? U.esc(top.habit.name) : '—'}</b></li>
      </ul>`;
  }

  function render(root) {
    const { y, m } = state().month;
    const mk = U.monthKey(y, m);
    const text = S.note(mk);

    root.innerHTML = `
      <section class="page page-notes">
        <header class="page-head reveal">
          <div class="page-head-main">
            <p class="eyebrow"><span class="eyebrow-dot"></span>Notas</p>
            <h1 class="display">Reflexiones de <em>${U.MONTHS[m]}</em></h1>
            <p class="lede">Escribir lo que aprendiste convierte la experiencia en criterio.</p>
          </div>
          <div class="head-tools">
            ${ui.periodNav({ label: U.fmt.month(y, m), prevLabel: 'Mes anterior', nextLabel: 'Mes siguiente' })}
          </div>
        </header>

        <div class="notes-grid">
          <article class="bezel reveal">
            <div class="core notes-core">
              <div class="prompts" role="group" aria-label="Ideas para escribir">
                ${PROMPTS.map((p, i) => `<button type="button" class="chip chip-xs" data-act="prompt" data-i="${i}">${ui.icon('plus', 'bold')} ${p.label}</button>`).join('')}
              </div>
              <label class="sr-only" for="notesArea">Reflexión de ${U.fmt.month(y, m)}</label>
              <textarea id="notesArea" class="notes-area" maxlength="${MAX}" placeholder="¿Qué aprendiste este mes? ¿Qué hábito te costó más y por qué? ¿Qué vas a cambiar?">${U.esc(text)}</textarea>
              <div class="notes-foot">
                <span class="muted small" data-words>${words(text)} palabras · ${text.length} / ${MAX}</span>
                <span class="save-state" data-save>${ui.icon('check-circle', 'fill')} Guardado</span>
              </div>
            </div>
          </article>

          <aside class="notes-side">
            <article class="bezel reveal">
              <div class="core">
                <div class="card-head"><h2 class="card-title">${U.fmt.month(y, m)} en números</h2></div>
                ${monthContext(y, m)}
              </div>
            </article>
            <article class="bezel reveal">
              <div class="core">
                <div class="card-head"><h2 class="card-title">Archivo</h2><span class="card-meta">${ui.icon('notebook')}</span></div>
                <ul class="archive" data-archive>${archive(mk)}</ul>
              </div>
            </article>
          </aside>
        </div>
      </section>`;

    bind(root, mk);
  }

  function bind(root, mk) {
    const area = root.querySelector('#notesArea');
    const save = root.querySelector('[data-save]');
    const count = root.querySelector('[data-words]');
    const autosize = () => {
      area.style.height = 'auto';
      area.style.height = `${Math.max(360, area.scrollHeight + 4)}px`;
    };
    requestAnimationFrame(autosize);

    const persist = U.debounce(() => {
      S.setNote(mk, area.value);
      save.classList.remove('is-saving');
      save.innerHTML = `${ui.icon('check-circle', 'fill')} Guardado`;
      save.classList.add('is-saved');
      setTimeout(() => save.classList.remove('is-saved'), 1400);
      const arch = root.querySelector('[data-archive]');
      if (arch) arch.innerHTML = archive(mk);
    }, 550);

    area.addEventListener('input', () => {
      count.textContent = `${words(area.value)} palabras · ${area.value.length} / ${MAX}`;
      save.classList.add('is-saving');
      save.innerHTML = `${ui.icon('circle-notch', 'bold', 'spin')} Guardando`;
      autosize();
      persist();
    });

    root.onclick = (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      switch (act.dataset.act) {
        case 'prompt': {
          const p = PROMPTS[+act.dataset.i];
          const before = area.value.replace(/\s+$/, '');
          area.value = `${before}${before ? '\n\n' : ''}${p.text}\n`;
          area.focus();
          area.setSelectionRange(area.value.length, area.value.length);
          area.dispatchEvent(new Event('input'));
          HA.sound.tap();
          return;
        }
        case 'open': {
          const [y, m] = act.dataset.key.split('-').map(Number);
          state().month = { y, m: m - 1 };
          HA.sound.tap();
          HA.app.rerender({ soft: true });
          return;
        }
        case 'prev': return shift(-1);
        case 'next': return shift(1);
        default:
      }
    };
  }

  function shift(delta) {
    const area = document.getElementById('notesArea');
    if (area) S.setNote(U.monthKey(state().month.y, state().month.m), area.value);
    state().month = U.shiftMonth(state().month, delta);
    HA.sound.tap();
    HA.app.rerender({ soft: true });
  }

  function onKey(e) {
    if (e.key === 'ArrowLeft') { shift(-1); return true; }
    if (e.key === 'ArrowRight') { shift(1); return true; }
    return false;
  }

  HA.views.notas = { render, onKey, title: 'Notas' };
})();
