import { PEOPLE, TASKS, START_MONDAY, firebaseConfig } from './config.js';

const FIREBASE_VERSION = '12.6.0';
const DAY_MS = 86400000;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const WEEKDAYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];
const ME_KEY = 'vaskelista.me';
const DEMO_KEY = 'vaskelista.demo.v1';

const STATUS_LABEL = {
  done: 'Ferdig',
  pending: 'Ikke gjort',
  missed: 'Glippet',
  upcoming: 'Kommer',
};

const ICONS = {
  pan: '<circle cx="10" cy="13" r="6"/><path d="M16 13h6"/><path d="M8 4c0 1.2 1 1.4 1 2.6M12 4c0 1.2 1 1.4 1 2.6"/>',
  drop: '<path d="M12 3c3.6 4.3 6 7.4 6 10.6a6 6 0 0 1-12 0C6 10.4 8.4 7.3 12 3z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.5"/>',
  vacuum: '<path d="M17 3l-6.5 12"/><rect x="3.5" y="15" width="13" height="5" rx="2.5"/><path d="M19.5 18.5h1M19.5 15.5h1"/>',
  plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
};

// ---------- Datoer og uker ----------
// Alle datoer holdes på kl. 12 lokal tid, så sommertid aldri flytter en dag.

const pad = (n) => String(n).padStart(2, '0');
const atNoon = (y, m, d) => new Date(y, m, d, 12);
const addDays = (date, n) => atNoon(date.getFullYear(), date.getMonth(), date.getDate() + n);
const dayIndex = (date) => (date.getDay() + 6) % 7; // mandag = 0
const mondayOf = (date) => addDays(date, -dayIndex(date));

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return atNoon(y, m - 1, d);
}

function today() {
  // ?dato=2026-10-01 later som om det er en annen dag (nyttig for testing).
  const override = new URLSearchParams(location.search).get('dato');
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return parseDate(override);
  const now = new Date();
  return atNoon(now.getFullYear(), now.getMonth(), now.getDate());
}

const START = mondayOf(parseDate(START_MONDAY));

// Uke 0 er startuka. Negative tall er uker før start.
const weekIndexOf = (date) => Math.round((mondayOf(date) - START) / (7 * DAY_MS));
const mondayOfIndex = (wi) => addDays(START, wi * 7);

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // torsdag samme uke
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - Date.UTC(year, 0, 1)) / DAY_MS + 1) / 7);
  return { year, week };
}

function weekKey(wi) {
  const { year, week } = isoWeek(mondayOfIndex(wi));
  return `${year}-W${pad(week)}`;
}

const weekNumber = (wi) => isoWeek(mondayOfIndex(wi)).week;

function taskFor(personIndex, wi) {
  const n = TASKS.length;
  return TASKS[(((personIndex + wi) % n) + n) % n];
}

const fmtDay = (date) => `${date.getDate()}. ${MONTHS[date.getMonth()]}`;
const fmtRange = (wi) => `${fmtDay(mondayOfIndex(wi))} – ${fmtDay(addDays(mondayOfIndex(wi), 6))}`;

function fmtStamp(ms) {
  const d = new Date(ms);
  return `${WEEKDAYS[dayIndex(d)]}. ${fmtDay(d)} kl. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function relLabel(wi) {
  const ti = state.todayIndex;
  if (ti < 0 && wi === 0) return `Starter mandag ${fmtDay(START)}`;
  const diff = wi - ti;
  if (diff === 0) return 'Denne uka';
  if (diff === -1) return 'Forrige uke';
  if (diff === 1) return 'Neste uke';
  return diff < 0 ? `${-diff} uker siden` : `Om ${diff} uker`;
}

// ---------- Lagring ----------

function isConfigured(cfg) {
  return Boolean(cfg && cfg.apiKey && cfg.apiKey !== 'LIM_INN_HER' && cfg.projectId);
}

function createDemoStore() {
  const read = () => {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || {}; } catch { return {}; }
  };
  let data = read();
  const listeners = [];
  const emit = () => listeners.forEach((fn) => fn(data));
  window.addEventListener('storage', (e) => {
    if (e.key === DEMO_KEY) { data = read(); emit(); }
  });
  return {
    mode: 'demo',
    subscribe(onData) { listeners.push(onData); onData(data); },
    async setDone({ week, person, task, done, markedBy }) {
      data = { ...data, [`${week}_${person}`]: { week, person, task, done, markedBy, doneAt: done ? Date.now() : null } };
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(data)); } catch { /* privat modus */ }
      emit();
    },
  };
}

async function createFirebaseStore() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const { initializeApp } = await import(`${base}/firebase-app.js`);
  const { getFirestore, collection, doc, setDoc, onSnapshot, serverTimestamp } = await import(`${base}/firebase-firestore.js`);
  const db = getFirestore(initializeApp(firebaseConfig));
  return {
    mode: 'live',
    subscribe(onData, onError) {
      onSnapshot(collection(db, 'completions'), (snap) => {
        const data = {};
        snap.forEach((d) => {
          const v = d.data({ serverTimestamps: 'estimate' });
          data[d.id] = { ...v, doneAt: v.doneAt ? v.doneAt.toMillis() : null };
        });
        onData(data);
      }, onError);
    },
    setDone({ week, person, task, done, markedBy }) {
      return setDoc(doc(db, 'completions', `${week}_${person}`), {
        week, person, task, done, markedBy,
        doneAt: done ? serverTimestamp() : null,
      });
    },
  };
}

// ---------- Tilstand ----------

function loadMe() {
  try {
    const id = localStorage.getItem(ME_KEY);
    return PEOPLE.some((p) => p.id === id) ? id : null;
  } catch { return null; }
}

const state = {
  me: loadMe(),
  data: {},
  loaded: false,
  error: null,
  todayIndex: weekIndexOf(today()),
  viewIndex: 0,
};
state.viewIndex = Math.max(0, state.todayIndex);

let store = null;

const personById = (id) => PEOPLE.find((p) => p.id === id);
const recordFor = (wi, pid) => state.data[`${weekKey(wi)}_${pid}`];

function statusOf(wi, pid) {
  if (recordFor(wi, pid)?.done) return 'done';
  if (wi < state.todayIndex) return 'missed';
  if (wi === state.todayIndex) return 'pending';
  return 'upcoming';
}

function scoreboard() {
  const ti = state.todayIndex;
  const rows = PEOPLE.map((person) => {
    let done = 0;
    let missed = 0;
    for (let wi = 0; wi <= ti; wi++) {
      const s = statusOf(wi, person.id);
      if (s === 'done') done++;
      else if (s === 'missed') missed++;
    }
    // Uka som pågår bryter ikke en streak før den er over.
    let streak = 0;
    for (let wi = ti; wi >= 0; wi--) {
      const s = statusOf(wi, person.id);
      if (s === 'done') streak++;
      else if (s !== 'pending') break;
    }
    const counted = done + missed;
    return { person, done, missed, streak, pct: counted ? Math.round((100 * done) / counted) : null };
  });
  rows.sort((a, b) => b.done - a.done || a.missed - b.missed || a.person.name.localeCompare(b.person.name, 'nb'));
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    row.rank = prev && prev.done === row.done && prev.missed === row.missed ? prev.rank : i + 1;
  });
  return rows;
}

// ---------- Handlinger ----------

function setMe(id) {
  state.me = id;
  try { localStorage.setItem(ME_KEY, id); } catch { /* privat modus */ }
  $('#me-hint').hidden = true;
  render();
}

function goTo(wi) {
  state.viewIndex = Math.max(0, wi);
  render();
}

async function setDone(wi, personIndex, done) {
  if (!store) return;
  if (!state.me) {
    const hint = $('#me-hint');
    hint.hidden = false;
    hint.classList.remove('nudge');
    void hint.offsetWidth; // start animasjonen på nytt
    hint.classList.add('nudge');
    $('.top').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const person = PEOPLE[personIndex];
  const task = taskFor(personIndex, wi);
  try {
    const pending = store.setDone({ week: weekKey(wi), person: person.id, task: task.id, done, markedBy: state.me });
    if (done) {
      toast(person.id === state.me
        ? `Bra jobba! ${task.name} er krysset av.`
        : `${task.name} er krysset av for ${person.name}.`);
    }
    await pending;
  } catch (err) {
    console.error(err);
    toast('Klarte ikke å lagre. Sjekk nettet og prøv igjen.', true);
  }
}

// ---------- Visning ----------

const $ = (sel) => document.querySelector(sel);

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

function icon(name) {
  const span = h('span', { class: 'task-icon', 'aria-hidden': 'true' });
  span.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[name] || ''}</svg>`;
  return span;
}

function renderMe() {
  const wrap = $('#me-chips');
  wrap.replaceChildren(...PEOPLE.map((p) => h('button', {
    type: 'button',
    class: 'chip',
    style: `--person:${p.color}`,
    'aria-pressed': String(p.id === state.me),
    onclick: () => setMe(p.id),
  }, h('span', { class: 'dot' }), p.name)));
}

function renderWeekHead() {
  const wi = state.viewIndex;
  $('#week-title').textContent = `Uke ${weekNumber(wi)}`;
  $('#week-sub').textContent = fmtRange(wi);
  const rel = $('#week-rel');
  rel.textContent = relLabel(wi);
  rel.className = `rel${wi === state.todayIndex ? ' is-now' : ''}`;
  if (wi === state.todayIndex) {
    const left = 7 - dayIndex(today());
    rel.textContent += left === 1 ? ' · siste dag' : ` · ${left} dager igjen`;
  }
  $('#prev').disabled = wi <= 0;
  const home = Math.max(0, state.todayIndex);
  $('#today').hidden = wi === home;
  $('#today').textContent = state.todayIndex < 0 ? 'Gå til første uke' : 'Gå til denne uka';
}

function renderProgress() {
  const wi = state.viewIndex;
  const statuses = PEOPLE.map((p) => statusOf(wi, p.id));
  const done = statuses.filter((s) => s === 'done').length;
  const el = $('#progress');
  const label = statuses.every((s) => s === 'upcoming')
    ? 'Ingen kan krysse av ennå'
    : done === PEOPLE.length
      ? 'Alt er gjort denne uka'
      : `${done} av ${PEOPLE.length} ferdig`;
  el.replaceChildren(
    h('div', { class: 'progress-bar', 'aria-hidden': 'true' },
      statuses.map((s) => h('span', { class: `seg seg-${s}` }))),
    h('p', { class: 'progress-label' }, label),
  );
}

function card(personIndex, wi) {
  const person = PEOPLE[personIndex];
  const task = taskFor(personIndex, wi);
  const status = statusOf(wi, person.id);
  const rec = recordFor(wi, person.id);
  const isMe = person.id === state.me;

  let note;
  let action = null;
  if (status === 'done') {
    const by = rec.markedBy && rec.markedBy !== person.id ? personById(rec.markedBy) : null;
    const late = rec.doneAt && rec.doneAt >= mondayOfIndex(wi + 1).setHours(0, 0, 0, 0);
    note = [
      rec.doneAt ? `Krysset av ${fmtStamp(rec.doneAt)}` : 'Krysset av',
      by ? ` av ${by.name}` : '',
      late ? ' (i etterkant)' : '',
    ].join('');
    action = h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => setDone(wi, personIndex, false) }, 'Angre');
  } else if (status === 'pending') {
    note = `Frist søndag ${fmtDay(addDays(mondayOfIndex(wi), 6))}.`;
    action = h('button', {
      type: 'button',
      class: `btn ${isMe ? 'btn-primary' : 'btn-secondary'}`,
      onclick: () => setDone(wi, personIndex, true),
    }, isMe ? 'Marker som ferdig' : `Marker ferdig for ${person.name}`);
  } else if (status === 'missed') {
    note = `Ble ikke krysset av i uke ${weekNumber(wi)}.`;
    action = h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => setDone(wi, personIndex, true) }, 'Glemte å krysse av');
  } else {
    note = `Kan krysses av fra mandag ${fmtDay(mondayOfIndex(wi))}.`;
  }

  return h('article', { class: `card is-${status}${isMe ? ' is-me' : ''}`, style: `--person:${person.color}` },
    h('div', { class: 'card-top' },
      h('span', { class: 'who' }, h('span', { class: 'dot' }), person.name, isMe ? h('span', { class: 'you' }, 'Deg') : null),
      h('span', { class: `status status-${status}` }, STATUS_LABEL[status])),
    h('div', { class: 'task' }, icon(task.icon), h('h3', {}, task.name)),
    h('p', { class: 'task-desc' }, task.desc),
    h('div', { class: 'card-foot' }, h('p', { class: 'note' }, note), action),
  );
}

function renderCards() {
  const wi = state.viewIndex;
  const order = PEOPLE.map((_, i) => i);
  // Din egen oppgave først.
  order.sort((a, b) => (PEOPLE[b].id === state.me) - (PEOPLE[a].id === state.me));
  $('#cards').replaceChildren(...order.map((i) => card(i, wi)));
}

function renderBoard() {
  const rows = scoreboard();
  const weeks = Math.max(1, state.todayIndex + 1);
  const anyDone = rows.some((r) => r.done > 0);
  $('#board').replaceChildren(...rows.map((r) => {
    const stats = [
      `${r.missed} glipp`,
      r.pct == null ? null : `${r.pct} %`,
      r.streak > 1 ? `${r.streak} på rad` : null,
    ].filter(Boolean).join(' · ');
    return h('li', {
      class: `board-row${anyDone && r.rank === 1 ? ' is-lead' : ''}${r.person.id === state.me ? ' is-me' : ''}`,
      style: `--person:${r.person.color}`,
    },
    h('span', { class: 'rank' }, `${r.rank}.`),
    h('div', { class: 'board-main' },
      h('p', { class: 'board-name' }, h('span', { class: 'dot' }), r.person.name,
        anyDone && r.rank === 1 ? h('span', { class: 'lead-tag' }, 'Leder') : null),
      h('div', { class: 'bar', 'aria-hidden': 'true' },
        h('span', { style: `width:${(100 * r.done) / weeks}%` })),
      h('p', { class: 'board-stats' }, stats)),
    h('p', { class: 'board-score' }, h('strong', {}, String(r.done)), h('span', {}, r.done === 1 ? 'uke' : 'uker')));
  }));
  if (state.todayIndex < 0) {
    $('#board').append(h('li', { class: 'board-empty' }, `Poengene begynner å telle mandag ${fmtDay(START)}.`));
  }
}

function renderHistory() {
  const ti = state.todayIndex;
  const from = Math.max(0, ti - 5);
  const to = Math.max(ti, 0) + 3;
  const head = h('thead', {}, h('tr', {},
    h('th', { scope: 'col' }, 'Uke'),
    PEOPLE.map((p) => h('th', { scope: 'col', class: p.id === state.me ? 'is-me' : null, style: `--person:${p.color}` },
      h('span', { class: 'dot' }), p.name))));
  const body = h('tbody', {});
  for (let wi = from; wi <= to; wi++) {
    const cls = [wi === ti ? 'is-now' : '', wi === state.viewIndex ? 'is-view' : ''].join(' ').trim();
    body.append(h('tr', { class: cls || null },
      h('th', { scope: 'row' },
        h('button', { type: 'button', class: 'week-link', onclick: () => { goTo(wi); $('#week').scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
          h('span', { class: 'wk' }, `Uke ${weekNumber(wi)}`),
          h('span', { class: 'wk-date' }, fmtDay(mondayOfIndex(wi)))),
      ),
      PEOPLE.map((p, pi) => {
        const s = statusOf(wi, p.id);
        return h('td', { class: `cell cell-${s}` },
          h('span', { class: 'mark', 'aria-label': STATUS_LABEL[s] }, s === 'done' ? '✓' : s === 'missed' ? '✗' : ''),
          taskFor(pi, wi).short);
      })));
  }
  $('#hist').replaceChildren(head, body);
}

function renderStatus() {
  const banner = $('#banner');
  const status = $('#status');
  if (state.error) {
    banner.hidden = false;
    banner.className = 'banner is-error';
    banner.textContent = state.error;
  } else if (store?.mode === 'demo') {
    banner.hidden = false;
    banner.className = 'banner';
    banner.textContent = 'Demomodus: avkrysninger lagres bare i denne nettleseren. Koble til Firebase (se README) så deles alt mellom dere.';
  } else {
    banner.hidden = true;
  }
  status.textContent = store?.mode === 'live'
    ? (state.loaded ? 'Synkronisert med Firebase. Endringer vises live for alle.' : 'Kobler til databasen …')
    : store?.mode === 'demo' ? 'Demomodus uten delt database.' : '';
}

function render() {
  renderMe();
  renderWeekHead();
  renderProgress();
  renderCards();
  renderBoard();
  renderHistory();
  renderStatus();
}

let toastTimer;
function toast(message, isError = false) {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast${isError ? ' is-error' : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

// ---------- Oppstart ----------

$('#prev').addEventListener('click', () => goTo(state.viewIndex - 1));
$('#next').addEventListener('click', () => goTo(state.viewIndex + 1));
$('#today').addEventListener('click', () => goTo(Math.max(0, state.todayIndex)));

// Ny uke mens siden står åpen: flytt visningen videre hvis du så på "denne uka".
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  const ti = weekIndexOf(today());
  if (ti === state.todayIndex) return;
  if (state.viewIndex === Math.max(0, state.todayIndex)) state.viewIndex = Math.max(0, ti);
  state.todayIndex = ti;
  render();
});

render();

if (isConfigured(firebaseConfig)) {
  try {
    store = await createFirebaseStore();
  } catch (err) {
    console.error(err);
    state.error = 'Fikk ikke lastet Firebase. Sjekk nettforbindelsen og last siden på nytt.';
  }
} else {
  store = createDemoStore();
}

store?.subscribe(
  (data) => { state.data = data; state.loaded = true; state.error = null; render(); },
  (err) => {
    console.error(err);
    state.error = err?.code === 'permission-denied'
      ? 'Databasen avviste forespørselen. Sjekk at reglene fra firestore.rules er publisert i Firebase.'
      : 'Mistet kontakten med databasen. Last siden på nytt.';
    render();
  },
);
render();
