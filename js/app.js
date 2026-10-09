'use strict';

const US_ID = '2688';
const TZ = 'America/Santiago';
const fmtDay = new Intl.DateTimeFormat('es-CL', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' });
const fmtDow = new Intl.DateTimeFormat('es-CL', { timeZone: TZ, weekday: 'short' });
const fmtTime = new Intl.DateTimeFormat('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const $ = (id) => document.getElementById(id);

const state = { all: [], played: [], upcoming: [] };

// Resultado desde la perspectiva de Colo-Colo
function outcome(m) {
  const us = m.home.id === US_ID ? m.home : m.away;
  const them = us === m.home ? m.away : m.home;
  const r = us.score > them.score ? 'W' : us.score < them.score ? 'L' : 'D';
  return { us, them, r, isHome: us === m.home };
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) n.append(c);
  return n;
}

function teamRow(t, isUs, showScore) {
  const row = el('div', { class: 'team' + (isUs ? ' us' : '') });
  if (t.logo) row.append(el('img', { src: t.logo, alt: '', loading: 'lazy', width: 22, height: 22 }));
  row.append(el('span', { text: t.name }));
  if (showScore) row.append(el('em', { text: String(t.score) }));
  return row;
}

function matchCard(m, upcoming) {
  const d = new Date(m.date);
  const li = el('li', { class: 'match' + (upcoming ? ' upcoming' : '') });
  li.append(el('div', { class: 'when' }, [
    el('b', { text: fmtDay.format(d) }),
    document.createTextNode(`${fmtDow.format(d)} · ${fmtTime.format(d)}`),
  ]));
  li.append(el('div', { class: 'teams' }, [
    teamRow(m.home, m.home.id === US_ID, !upcoming),
    teamRow(m.away, m.away.id === US_ID, !upcoming),
  ]));
  if (!upcoming) li.append(el('div', { class: 'side' }, el('span', { class: 'badge ' + outcome(m).r, text: { W: 'V', D: 'E', L: 'D' }[outcome(m).r] })));
  const stage = m.stage && !/^\d{4}/.test(m.stage) ? ` · ${m.stage}` : '';
  li.append(el('div', { class: 'info', text: `${m.competition}${stage}${m.venue ? ' · ' + m.venue : ''}` }));
  return li;
}

function summarize(list) {
  const s = { pj: list.length, g: 0, e: 0, p: 0, gf: 0, gc: 0 };
  for (const m of list) {
    const o = outcome(m);
    s.gf += o.us.score; s.gc += o.them.score;
    if (o.r === 'W') s.g++; else if (o.r === 'D') s.e++; else s.p++;
  }
  return s;
}

function renderStats(list) {
  const s = summarize(list);
  const items = [['PJ', s.pj, ''], ['G', s.g, 'w'], ['E', s.e, 'd'], ['P', s.p, 'l'], ['GF', s.gf, ''], ['GC', s.gc, '']];
  $('stats').replaceChildren(...items.map(([l, v, c]) => el('div', { class: 'stat ' + c }, [el('b', { text: v }), el('span', { text: l })])));
  const last5 = [...list].slice(-5).reverse();
  $('form').replaceChildren(...last5.map((m) => el('span', { class: 'badge ' + outcome(m).r, text: { W: 'V', D: 'E', L: 'D' }[outcome(m).r] })));
}

function applyFilters() {
  const season = $('f-season').value, comp = $('f-comp').value, res = $('f-result').value;
  const venue = $('f-venue').value, q = $('f-q').value.trim().toLowerCase();
  const list = state.played.filter((m) => {
    const o = outcome(m);
    return (!season || String(m.season) === season)
      && (!comp || m.competition === comp)
      && (!res || o.r === res)
      && (!venue || (venue === 'home') === o.isHome)
      && (!q || o.them.name.toLowerCase().includes(q));
  });
  renderStats(list);
  $('count').textContent = `${list.length} partido${list.length === 1 ? '' : 's'}`;
  const ul = $('matches');
  if (!list.length) ul.replaceChildren(el('li', { class: 'empty', text: 'No hay partidos con esos filtros.' }));
  else ul.replaceChildren(...[...list].reverse().map((m) => matchCard(m, false)));
}

function fillSelect(sel, first, values) {
  sel.replaceChildren(el('option', { value: '', text: first }), ...values.map((v) => el('option', { value: String(v), text: String(v) })));
}

function renderSeasons() {
  const tbody = document.querySelector('#season-table tbody');
  const seasons = [...new Set(state.played.map((m) => m.season))].sort((a, b) => b - a);
  tbody.replaceChildren(...seasons.map((y) => {
    const s = summarize(state.played.filter((m) => m.season === y));
    const pct = Math.round(((s.g * 3 + s.e) / (s.pj * 3)) * 100);
    const tr = el('tr');
    const btn = el('button', { class: 'link-btn', text: String(y) });
    btn.addEventListener('click', () => { $('f-season').value = String(y); applyFilters(); selectTab('results'); });
    tr.append(el('td', {}, btn));
    for (const v of [s.pj, s.g, s.e, s.p, s.gf, s.gc, (s.gf - s.gc > 0 ? '+' : '') + (s.gf - s.gc), pct + '%']) tr.append(el('td', { text: String(v) }));
    const bar = el('div', { class: 'bar-track', title: `${s.g} G · ${s.e} E · ${s.p} P` }, [s.g, s.e, s.p].map((n) => {
      const i = el('i'); i.style.width = (n / s.pj) * 100 + '%'; return i;
    }));
    tr.append(el('td', { class: 'bar' }, bar));
    return tr;
  }));
}

function renderNext() {
  const box = $('next-body');
  const m = state.upcoming[0];
  if (!m) { box.textContent = 'Sin partidos programados por ahora.'; return; }
  const d = new Date(m.date);
  const cd = el('div', { class: 'countdown' });
  box.replaceChildren(
    el('div', { class: 'next-teams' }, [
      el('div', { class: 't' }, [m.home.logo ? el('img', { src: m.home.logo, alt: '' }) : '', el('span', { text: m.home.name })]),
      el('span', { class: 'vs', text: 'vs' }),
      el('div', { class: 't' }, [el('span', { text: m.away.name }), m.away.logo ? el('img', { src: m.away.logo, alt: '' }) : '']),
    ]),
    el('div', { class: 'next-meta', text: `${fmtDow.format(d)} ${fmtDay.format(d)} · ${fmtTime.format(d)} · ${m.competition}${m.venue ? ' · ' + m.venue : ''}` }),
    cd,
  );
  const tick = () => {
    const ms = d - Date.now();
    if (ms <= 0) { cd.textContent = 'En juego o por comenzar'; return; }
    const days = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, mi = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
    cd.textContent = `${days}d ${String(h).padStart(2, '0')}h ${String(mi).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };
  tick(); setInterval(tick, 1000);
}

function selectTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== 'tab-' + name; });
}

async function init() {
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));
  let data;
  try {
    const r = await fetch('data/matches.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    data = await r.json();
  } catch (e) {
    $('next-body').textContent = 'No se pudieron cargar los datos.';
    $('matches').replaceChildren(el('li', { class: 'empty', text: 'Error al cargar data/matches.json' }));
    return;
  }
  state.all = data.matches;
  state.played = data.matches.filter((m) => m.state === 'post');
  state.upcoming = data.matches.filter((m) => m.state !== 'post' && new Date(m.date) > Date.now() - 3 * 36e5);

  const seasons = [...new Set(state.played.map((m) => m.season))].sort((a, b) => b - a);
  fillSelect($('f-season'), 'Todas', seasons);
  fillSelect($('f-comp'), 'Todas', [...new Set(state.played.map((m) => m.competition))].sort());
  ['f-season', 'f-comp', 'f-result', 'f-venue'].forEach((id) => $(id).addEventListener('change', applyFilters));
  $('f-q').addEventListener('input', applyFilters);

  $('updated').textContent = 'Datos actualizados: ' + new Intl.DateTimeFormat('es-CL', { timeZone: TZ, dateStyle: 'long', timeStyle: 'short' }).format(new Date(data.updated));
  const ul = $('upcoming');
  ul.replaceChildren(...(state.upcoming.length ? state.upcoming.map((m) => matchCard(m, true)) : [el('li', { class: 'empty', text: 'Sin partidos programados.' })]));
  renderNext(); renderSeasons(); applyFilters();
}
init();
