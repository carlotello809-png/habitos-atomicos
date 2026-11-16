/* ==========================================================================
   Hábitos Atómicos — panel de ajustes
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const S = HA.store;
  const ui = HA.ui;

  function toggle(name, on, label, hint) {
    return `
      <label class="switch-row">
        <span class="switch-text"><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}</span>
        <span class="switch">
          <input type="checkbox" data-setting="${name}" ${on ? 'checked' : ''}>
          <span class="switch-track"><span class="switch-thumb"></span></span>
        </span>
      </label>`;
  }

  function habitRows() {
    const list = S.habits(true);
    if (!list.length) return '<p class="muted small">Todavía no tienes hábitos.</p>';
    return list
      .map(
        (h, i) => `
      <li class="manage-row${h.archived ? ' is-archived' : ''}" data-hid="${h.id}" style="--hc: var(--c-${h.color})">
        <span class="habit-tile tile-sm">${ui.icon(h.icon, 'fill')}</span>
        <span class="manage-name">${U.esc(h.name)}${h.archived ? ' <em>archivado</em>' : ''}</span>
        <span class="manage-actions">
          <button type="button" class="icon-btn xs" data-act="up" aria-label="Subir ${U.esc(h.name)}" ${i === 0 ? 'disabled' : ''}>${ui.icon('arrow-up', 'bold')}</button>
          <button type="button" class="icon-btn xs" data-act="down" aria-label="Bajar ${U.esc(h.name)}" ${i === list.length - 1 ? 'disabled' : ''}>${ui.icon('arrow-down', 'bold')}</button>
          <button type="button" class="icon-btn xs" data-act="edit" aria-label="Editar ${U.esc(h.name)}">${ui.icon('pencil-simple')}</button>
          <button type="button" class="icon-btn xs" data-act="archive" aria-label="${h.archived ? 'Restaurar' : 'Archivar'} ${U.esc(h.name)}">${ui.icon(h.archived ? 'arrow-counter-clockwise' : 'archive')}</button>
        </span>
      </li>`
      )
      .join('');
  }

  function open() {
    const dlg = ui.$('#sheet');
    const d = S.data;
    const html = `
      <div class="dlg-panel sheet-panel settings">
        <header class="sheet-head">
          <span class="habit-tile tile-xl tile-accent">${ui.icon('gear-six', 'fill')}</span>
          <div class="dlg-titles">
            <p class="eyebrow">Preferencias</p>
            <h2 id="sheetTitle">Ajustes</h2>
          </div>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${ui.icon('x', 'bold')}</button>
        </header>

        <div class="sheet-body">
          <section class="sheet-sec">
            <h3>Perfil</h3>
            <label class="field">
              <span class="field-label">Tu nombre</span>
              <input class="input" id="setName" maxlength="30" value="${U.esc(d.profile.name)}" placeholder="¿Cómo te llamamos?" autocomplete="given-name">
            </label>
            <div class="field">
              <span class="field-label">Color de tu perfil</span>
              <div class="swatches" id="setColor">
                ${HA.HABIT_COLORS.map((label, i) => {
                  const cur = S.currentProfile() ? S.currentProfile().color : 0;
                  return `<button type="button" class="swatch${i === cur ? ' is-active' : ''}" data-color="${i}" style="--sw: var(--c-${i})" aria-pressed="${i === cur}" aria-label="Color ${label}"></button>`;
                }).join('')}
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-block" data-act="switch">${ui.icon('users-three')} Cambiar de persona</button>
          </section>

          <section class="sheet-sec">
            <h3>Apariencia</h3>
            <div class="field">
              <span class="field-label">Tema</span>
              ${ui.seg({
                name: 'theme',
                value: d.settings.theme,
                label: 'Tema',
                options: [
                  { value: 'light', label: 'Claro', icon: 'sun' },
                  { value: 'dark', label: 'Oscuro', icon: 'moon' },
                  { value: 'system', label: 'Auto', icon: 'device-mobile' },
                ],
              })}
            </div>
            ${toggle('sound', d.settings.sound, 'Sonidos', 'Clics suaves al marcar y acordes al lograr un día perfecto.')}
            ${toggle('reduceMotion', d.settings.reduceMotion, 'Reducir movimiento', 'Desactiva desplazamientos, partículas y confeti.')}
          </section>

          <section class="sheet-sec">
            <div class="sec-head">
              <h3>Tus hábitos</h3>
              <button type="button" class="btn btn-ghost btn-sm" data-act="new">${ui.icon('plus', 'bold')} Nuevo</button>
            </div>
            <ul class="manage-list" id="manageList">${habitRows()}</ul>
          </section>

          <section class="sheet-sec">
            <h3>Tus datos</h3>
            <p class="muted small">Todo se guarda solo en este navegador. Exporta una copia para pasarla a otro dispositivo.</p>
            <div class="data-actions">
              <button type="button" class="btn btn-ghost" data-act="export">${ui.icon('download-simple')} Exportar copia</button>
              <label class="btn btn-ghost" tabindex="0">${ui.icon('upload-simple')} Importar copia<input type="file" accept="application/json,.json" id="importFile" hidden></label>
              <button type="button" class="btn btn-ghost" data-act="demo">${ui.icon('flask')} Cargar datos de ejemplo</button>
              <button type="button" class="btn btn-quiet is-danger" data-act="reset">${ui.icon('trash')} Borrar todo</button>
            </div>
          </section>

          <section class="sheet-sec">
            <h3>Atajos de teclado</h3>
            <dl class="keys">
              <div><dt><kbd>1</kbd>–<kbd>6</kbd></dt><dd>Cambiar de sección</dd></div>
              <div><dt><kbd>N</kbd></dt><dd>Nuevo hábito</dd></div>
              <div><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Período anterior / siguiente</dd></div>
              <div><dt><kbd>T</kbd></dt><dd>Volver a hoy</dd></div>
              <div><dt><kbd>P</kbd></dt><dd>Imprimir reporte</dd></div>
              <div><dt><kbd>S</kbd></dt><dd>Activar o silenciar sonido</dd></div>
            </dl>
          </section>

          <p class="about">Hábitos Atómicos · versión 2.0<br>Pequeños cambios, resultados extraordinarios.</p>
        </div>
      </div>`;

    ui.dialog.open(dlg, html);
    HA.sound.open();

    const nameInput = dlg.querySelector('#setName');
    nameInput.addEventListener('change', () => {
      S.setName(nameInput.value);
      ui.toast({ title: 'Nombre actualizado', message: S.data.profile.name || 'Sin nombre', icon: 'user-circle' });
    });

    dlg.querySelector('#setColor').addEventListener('click', (e) => {
      const sw = e.target.closest('.swatch');
      if (!sw) return;
      dlg.querySelectorAll('#setColor .swatch').forEach((b) => {
        b.classList.toggle('is-active', b === sw);
        b.setAttribute('aria-pressed', b === sw);
      });
      S.setProfileColor(+sw.dataset.color);
      HA.sound.tap();
    });

    dlg.querySelectorAll('[data-setting]').forEach((input) => {
      input.addEventListener('change', () => {
        S.setSetting(input.dataset.setting, input.checked);
        if (input.dataset.setting === 'sound' && input.checked) HA.sound.tap();
        HA.app.syncChrome();
      });
    });

    const seg = dlg.querySelector('[data-seg="theme"]');
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('.seg-btn');
      if (!b) return;
      ui.setSeg(seg, b.dataset.value);
      S.setSetting('theme', b.dataset.value);
      HA.app.applyTheme(true);
      HA.sound.tab();
    });

    dlg.querySelector('#importFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const ok = await ui.confirm({
          title: '¿Importar esta copia?',
          message: 'Reemplazará todos los datos actuales de este navegador.',
          confirm: 'Importar',
          tone: 'accent',
          icon: 'upload-simple',
        });
        if (!ok) return;
        try {
          S.importJSON(String(reader.result));
          HA.app.applyTheme(false);
          ui.toast({ title: 'Copia importada', message: `${S.habits(true).length} hábitos restaurados`, icon: 'check-circle' });
          ui.dialog.close(dlg);
        } catch (err) {
          ui.toast({ title: 'No se pudo importar', message: err.message || 'El archivo no es válido.', icon: 'warning-circle', tone: 'danger' });
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    dlg.onclick = async (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const row = act.closest('.manage-row');
      const id = row && row.dataset.hid;
      switch (act.dataset.act) {
        case 'switch':
          HA.app.switchProfile();
          break;
        case 'up':
        case 'down':
          S.moveHabit(id, act.dataset.act === 'up' ? -1 : 1);
          HA.sound.tap();
          refreshList(dlg);
          break;
        case 'edit':
          await ui.dialog.close(dlg);
          HA.editor.open(id);
          break;
        case 'archive': {
          const h = S.habit(id);
          S.updateHabit(id, { archived: !h.archived });
          HA.sound.tap();
          refreshList(dlg);
          break;
        }
        case 'new':
          await ui.dialog.close(dlg);
          HA.editor.open();
          break;
        case 'export': {
          const name = `habitos-atomicos-${U.todayISO()}.json`;
          ui.download(name, S.exportJSON());
          ui.toast({ title: 'Copia exportada', message: name, icon: 'download-simple' });
          break;
        }
        case 'demo': {
          const ok = await ui.confirm({
            title: '¿Cargar datos de ejemplo?',
            message: 'Reemplaza tus hábitos y registros por 5 meses de datos de muestra. Exporta una copia antes si quieres conservar los tuyos.',
            confirm: 'Cargar ejemplo',
            tone: 'accent',
            icon: 'flask',
          });
          if (!ok) return;
          S.loadDemo();
          ui.dialog.close(dlg);
          ui.toast({ title: 'Datos de ejemplo cargados', message: 'Explora el Mes, Progreso y el Reporte.', icon: 'flask' });
          break;
        }
        case 'reset': {
          const ok = await ui.confirm({
            title: '¿Borrar todos tus datos?',
            message: 'Se eliminarán hábitos, registros, metas y notas de este navegador. No se puede deshacer.',
            confirm: 'Borrar todo',
          });
          if (!ok) return;
          S.resetAll();
          ui.dialog.close(dlg);
          ui.toast({ title: 'Datos borrados', message: 'Empezaste de cero con 5 hábitos sugeridos.', icon: 'trash', tone: 'muted' });
          break;
        }
        default:
      }
    };
  }

  function refreshList(dlg) {
    const list = dlg.querySelector('#manageList');
    if (list) list.innerHTML = habitRows();
  }

  HA.settings = { open };
})();
