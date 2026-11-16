/* ==========================================================================
   Hábitos Atómicos — cálculos: cumplimiento, rachas, resúmenes
   ========================================================================== */
(function () {
  'use strict';

  const HA = window.HA;
  const U = HA.util;
  const S = HA.store;

  /** ¿El hábito estaba programado ese día (y ya había empezado)? */
  function scheduled(h, date) {
    return date >= h.start && h.days.includes(U.wdISO(date));
  }
  /** Programado y no en el futuro: cuenta para el porcentaje. */
  function tracked(h, date, todayIso) {
    return date <= (todayIso || U.todayISO()) && scheduled(h, date);
  }

  function day(date, list) {
    const habits = list || S.habits();
    const t = U.todayISO();
    let sched = 0;
    let done = 0;
    let bonus = 0;
    habits.forEach((h) => {
      const isDone = S.isDone(h.id, date);
      if (tracked(h, date, t) || (date === t && scheduled(h, date))) {
        sched++;
        if (isDone) done++;
      } else if (isDone) {
        bonus++;
      }
    });
    return { scheduled: sched, done, bonus, pct: U.pct(done, sched), perfect: sched > 0 && done === sched };
  }

  function habitRange(h, dates) {
    const t = U.todayISO();
    let sched = 0;
    let done = 0;
    dates.forEach((date) => {
      if (tracked(h, date, t)) {
        sched++;
        if (S.isDone(h.id, date)) done++;
      }
    });
    return { scheduled: sched, done, pct: U.pct(done, sched) };
  }

  function range(dates, list) {
    const habits = list || S.habits();
    const t = U.todayISO();
    let sched = 0;
    let done = 0;
    let perfect = 0;
    let activeDays = 0;
    let best = null;
    const perDay = [];
    dates.forEach((date) => {
      const d = day(date, habits);
      perDay.push(Object.assign({ date }, d));
      if (date > t) return;
      sched += d.scheduled;
      done += d.done;
      if (d.perfect) perfect++;
      if (d.scheduled) activeDays++;
      if (d.scheduled && (!best || d.pct > best.pct || (d.pct === best.pct && d.done > best.done))) {
        best = Object.assign({ date }, d);
      }
    });
    const perHabit = habits.map((h) => Object.assign({ habit: h }, habitRange(h, dates)));
    return { scheduled: sched, done, pct: U.pct(done, sched), perfect, activeDays, best, perDay, perHabit };
  }

  /** Racha actual: días programados consecutivos cumplidos hasta hoy (hoy no rompe la racha si aún no está hecho). */
  function currentStreak(h, upTo) {
    const t = upTo || U.todayISO();
    let d = U.parse(t);
    let streak = 0;
    for (let i = 0; i < 4000; i++) {
      const date = U.iso(d);
      if (date < h.start) break;
      if (h.days.includes(U.wd(d))) {
        if (S.isDone(h.id, date)) streak++;
        else if (date !== t) break;
      }
      d = U.addDays(d, -1);
    }
    return streak;
  }

  function bestStreak(h) {
    const t = U.todayISO();
    let best = 0;
    let run = 0;
    let d = U.parse(h.start);
    const end = U.parse(t);
    let guard = 0;
    while (d <= end && guard < 4000) {
      const date = U.iso(d);
      if (h.days.includes(U.wd(d))) {
        if (S.isDone(h.id, date)) {
          run++;
          if (run > best) best = run;
        } else if (date !== t) {
          run = 0;
        }
      }
      d = U.addDays(d, 1);
      guard++;
    }
    return best;
  }

  /** Días perfectos consecutivos (los días sin hábitos programados no cuentan ni rompen). */
  function perfectStreak() {
    const habits = S.habits();
    if (!habits.length) return 0;
    const t = U.todayISO();
    let d = U.parse(t);
    let streak = 0;
    const earliest = habits.reduce((m, h) => (h.start < m ? h.start : m), t);
    for (let i = 0; i < 4000; i++) {
      const date = U.iso(d);
      if (date < earliest) break;
      const s = day(date, habits);
      if (s.scheduled) {
        if (s.perfect) streak++;
        else if (date !== t) break;
      }
      d = U.addDays(d, -1);
    }
    return streak;
  }

  /** "Nunca falles dos veces": ayer estaba programado, no se hizo y hoy todavía no. */
  function missedYesterday(h, date) {
    const ref = date || U.todayISO();
    const y = U.addDaysISO(ref, -1);
    return scheduled(h, y) && !S.isDone(h.id, y) && !S.isDone(h.id, ref);
  }

  function weekdayProfile(dates, list) {
    const habits = list || S.habits();
    const t = U.todayISO();
    const acc = Array.from({ length: 7 }, () => ({ s: 0, d: 0 }));
    dates.forEach((date) => {
      if (date > t) return;
      const w = U.wdISO(date);
      habits.forEach((h) => {
        if (tracked(h, date, t)) {
          acc[w].s++;
          if (S.isDone(h.id, date)) acc[w].d++;
        }
      });
    });
    return acc.map((x) => ({ scheduled: x.s, done: x.d, pct: U.pct(x.d, x.s) }));
  }

  /** Celdas para un mapa de calor de N semanas que termina en la semana de `endISO`. */
  function heat(endISO, weeks, list) {
    const habits = list || S.habits();
    const end = U.addDays(U.weekStart(U.parse(endISO)), 6);
    const start = U.addDays(end, -(weeks * 7 - 1));
    const out = [];
    for (let d = start; d <= end; d = U.addDays(d, 1)) {
      const date = U.iso(d);
      out.push(Object.assign({ date }, day(date, habits)));
    }
    return out;
  }

  function heatHabit(h, endISO, weeks) {
    const end = U.addDays(U.weekStart(U.parse(endISO)), 6);
    const start = U.addDays(end, -(weeks * 7 - 1));
    const t = U.todayISO();
    const out = [];
    for (let d = start; d <= end; d = U.addDays(d, 1)) {
      const date = U.iso(d);
      out.push({
        date,
        done: S.isDone(h.id, date),
        scheduled: scheduled(h, date),
        future: date > t,
      });
    }
    return out;
  }

  function level(pct, scheduledCount) {
    if (!scheduledCount) return -1;
    if (pct === 0) return 0;
    if (pct < 40) return 1;
    if (pct < 70) return 2;
    if (pct < 100) return 3;
    return 4;
  }

  function totalCheckins(h) {
    let n = 0;
    Object.keys(S.data.log).forEach((date) => {
      if (S.data.log[date][h.id]) n++;
    });
    return n;
  }

  HA.stats = {
    scheduled, tracked, day, habitRange, range, currentStreak, bestStreak, perfectStreak,
    missedYesterday, weekdayProfile, heat, heatHabit, level, totalCheckins,
  };
})();
