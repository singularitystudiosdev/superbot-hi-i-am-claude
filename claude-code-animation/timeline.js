// The race, rebuilt as a deterministic seekable render.
// Two panes: plain claude code (left) vs /superbot (right). Start lights go
// red/red/red then green; both clocks start on green and both users type.
// The left user keeps prompting — the model thinks about morality, refuses,
// ships lazy output the user doesn't like (lines grounded in the reddit
// refusal/moralizing corpus, .tmp/reddit/). The right pane runs superbot's
// loop and finishes in less than half the time.
// Every event's share of the pane's target is proportional to its weight
// (hero-race.js pattern), so the finish clocks land on the ledger's measured
// means: 0:08.551 super, 0:24.057 plain (verdict-v3).
// render(t) rebuilds the terminal DOM from scratch; every effect is computed
// from t, so ?t=SECONDS freeze-frames exactly. Arrows step ±0.25s in freeze.

import { Mascot } from './mascot.js';

const CHAR_MS = 21;          // prompt typing pace, both panes
const STEP_CHAR_MS = 6;      // superbot steps type in fast
const T_GREEN = 2.1;         // lights: red 0.6/1.1/1.6, green 2.1
const TARGET = { plain: 24057, super: 8551 };
const T_FINISH = {
  plain: T_GREEN + TARGET.plain / 1000,
  super: T_GREEN + TARGET.super / 1000,
};
const HOLD = 4.4;            // both done, hold before the loop wrap
const CYCLE = T_GREEN + TARGET.plain / 1000 + HOLD + 1.8;

const GLYPHS = ['·', '✢', '✳', '∗', '✻', '✽'];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeOutQuint = (p) => 1 - Math.pow(1 - p, 5);

const PROMPT = 'add a rate limit to the /upload route and write the tests';
const CMD = '/superbot';

// ---- left pane script: prompt → moralizing → refusal → retort → lazy edit
// → failing tests → retort → more thinking → failing again → gives up "done"
// (line shapes from the corpus: the "let me be careful here" lecture 1rdfom9,
// refusals-as-first-response 1566bi9, half-the-job lazy output 1lf6p36)
const PLAIN_EVENTS = [
  { k: 'type',  w: 1900, text: PROMPT },
  { k: 'commit', w: 250 },
  { k: 'think', w: 2500, text: 'Thinking about the morality of the request…' },
  { k: 'wait',  w: 2200, text: 'I want to be careful here: rate limits can feel restrictive to your users. Are you sure you want to proceed?' },
  { k: 'type',  w: 700,  text: 'yes. just do it' },
  { k: 'commit', w: 250 },
  { k: 'think', w: 2000, text: 'Thinking about whether the refusal was justified…' },
  { k: 'tool',  w: 1400, name: 'src/routes/upload.ts', lines: ['+ if (count > 100) return; // TODO: real limit'], wrote: 'Edited 1 line' },
  { k: 'tline', w: 900,  text: 'run npm test' },
  { k: 'wait',  w: 2100, text: '2 failing · reading the errors…' },
  { k: 'type',  w: 900,  text: 'you broke it. fix it properly' },
  { k: 'commit', w: 250 },
  { k: 'think', w: 2000, text: 'Thinking about how to explain the failures…' },
  { k: 'tool',  w: 1300, name: 'src/routes/upload.ts', lines: ['+ if (count > 100) return 429; // fixed?'], wrote: 'Edited 1 line' },
  { k: 'tline', w: 900,  text: 'run npm test' },
  { k: 'wait',  w: 2100, text: '2 failing · reading the errors…' },
  { k: 'ok',    w: 250,  text: 'done · 9 steps · sorry about the earlier refusal' },
];

// ---- right pane script: the benchmark's superbot run
const SUPER_EVENTS = [
  { k: 'typecmd', w: 1800, text: PROMPT },
  { k: 'commit',  w: 250 },
  { k: 'step',    w: 1400, text: 'superbot: read upload.ts and the middleware' },
  { k: 'step',    w: 1400, text: 'superbot: wrote the limiter and 3 tests' },
  { k: 'tline',   w: 900,  text: 'run npm test' },
  { k: 'step',    w: 1400, text: 'superbot: checked the diff · 3 passing' },
  { k: 'ok',      w: 250,  text: 'done · 4 steps · less than half the tokens' },
];

// hero-race.js pattern: each event's start is its weight's share of the
// pane's target, so the finish lands on the measured mean exactly
function schedule(events, targetMs) {
  const total = events.reduce((a, e) => a + e.w, 0);
  let cum = 0;
  return events.map((e) => {
    const at = T_GREEN + (cum / total) * (targetMs / 1000);
    cum += e.w;
    return { ...e, at, until: T_GREEN + (cum / total) * (targetMs / 1000) };
  });
}

const PLAIN = schedule(PLAIN_EVENTS, TARGET.plain);
const SUPER = schedule(SUPER_EVENTS, TARGET.super);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* ---- effects, computed from t ---- */

function fxLineIn(node, t, birth) {
  const e = easeOutQuint(clamp((t - birth) / 0.26, 0, 1));
  node.style.opacity = e.toFixed(3);
  node.style.filter = e < 1 ? `blur(${(4 * (1 - e)).toFixed(2)}px)` : 'none';
  node.style.transform = e < 1 ? `translateY(${(5 * (1 - e)).toFixed(2)}px)` : 'none';
}

function fxBlink(cursor, t) {
  cursor.style.opacity = (t % 1.06) < 0.53 ? '1' : '0';
}

function fxShimmer(em, t) {
  em.style.backgroundPosition = `${(130 - 200 * ((t % 2.1) / 2.1)).toFixed(1)}% 0`;
}

function fxRunningDot(dot, t) {
  dot.style.opacity = (0.25 + 0.75 * Math.abs(Math.cos(Math.PI * t / 0.9))).toFixed(3);
}

function fxPillLit(pill, t, litAt) {
  const p = clamp((t - litAt) / 0.7, 0, 1);
  if (p >= 1) { pill.style.boxShadow = ''; return; }
  const ring = (14 * easeOutQuint(p)).toFixed(1);
  const alpha = (0.55 * (1 - p)).toFixed(3);
  pill.style.boxShadow =
    `inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent), 0 0 0 ${ring}px color-mix(in srgb, var(--accent) ${alpha}, transparent)`;
}

/* ---- line builders ---- */

function addPromptInput(inn, t, birth, text) {
  const line = el('div', 'in-input');
  fxLineIn(line, t, birth);
  const p = el('span', 'p');
  p.appendChild(document.createTextNode(text));
  const cur = el('span', 'cur');
  p.appendChild(cur);
  fxBlink(cur, t);
  line.appendChild(p);
  inn.appendChild(line);
}

function addThinkLine(inn, t, birth, text) {
  const line = el('div', 'think');
  fxLineIn(line, t, birth);
  line.appendChild(el('span', 'glyph', GLYPHS[Math.floor(t / 0.28) % GLYPHS.length]));
  const em = el('em', null, text);
  line.appendChild(em);
  fxShimmer(em, t);
  inn.appendChild(line);
}

function addStepLine(inn, t, birth, running, text) {
  const line = el('div', running ? 'step running' : 'step');
  fxLineIn(line, t, birth);
  const dot = el('span', 'dot');
  if (running) fxRunningDot(dot, t);
  line.appendChild(dot);
  line.appendChild(document.createTextNode(text));
  inn.appendChild(line);
}

function addToolBlock(inn, t, ev) {
  const wrap = el('div', 'tool');
  fxLineIn(wrap, t, ev.at);
  const head = el('div', 'thead');
  head.appendChild(el('span', 'tick', '⏺'));
  head.appendChild(document.createTextNode('Edit('));
  head.appendChild(el('span', 'fname', ev.name));
  head.appendChild(document.createTextNode(')'));
  wrap.appendChild(head);

  const n = clamp(Math.floor((t - ev.at - 0.3) / 0.06), 0, ev.lines.length);
  if (n > 0) {
    // no empty frame: the box appears with its first line, not before
    const box = el('div', 'codebox');
    for (let i = 0; i < n; i++) {
      const cl = el('div', null, ev.lines[i]);
      fxLineIn(cl, t, ev.at + 0.3 + i * 0.06);
      box.appendChild(cl);
    }
    wrap.appendChild(box);
  }

  const wroteAt = ev.at + 0.3 + ev.lines.length * 0.06 + 0.15;
  if (t >= wroteAt) {
    const w = el('div', 'wrote', ev.wrote);
    fxLineIn(w, t, wroteAt);
    wrap.appendChild(w);
  }
  inn.appendChild(wrap);
}

function addTLine(inn, t, birth, text) {
  const line = el('div', 'tline');
  fxLineIn(line, t, birth);
  line.appendChild(document.createTextNode(text));
  inn.appendChild(line);
}

function addOk(inn, t, birth, text) {
  const line = el('div', 'ok', text);
  fxLineIn(line, t, birth);
  inn.appendChild(line);
}

/* ---- per-pane renders: walk the schedule, render events ≤ t ---- */

function scrollBottom(inn) {
  const term = inn.parentElement;
  term.scrollTop = term.scrollHeight;
}

function renderPlain(t) {
  const inn = document.getElementById('in1');
  inn.innerHTML = '';
  let typed = null;         // event of the type currently in progress
  for (const ev of PLAIN) {
    if (ev.at > t) break;
    if (ev.k === 'type') {
      const done = t >= ev.until - 0.001;
      if (!done) { typed = ev; break; }
      const line = el('div', 'p', ev.text);
      fxLineIn(line, t, ev.at);
      inn.appendChild(line);
    } else if (ev.k === 'commit') {
      // commit only flips the typed prompt into history; the prompt line is
      // already rendered above once its type event completed
    } else if (ev.k === 'think') {
      addThinkLine(inn, t, ev.at, ev.text);
    } else if (ev.k === 'wait') {
      const line = el('div', 'wait', ev.text);
      fxLineIn(line, t, ev.at);
      inn.appendChild(line);
    } else if (ev.k === 'tool') {
      addToolBlock(inn, t, ev);
    } else if (ev.k === 'tline') {
      addTLine(inn, t, ev.at, ev.text);
    } else if (ev.k === 'ok') {
      addOk(inn, t, ev.at, ev.text);
    }
  }
  if (typed) {
    const n = clamp(Math.floor((t - typed.at) * 1000 / CHAR_MS), 0, typed.text.length);
    addPromptInput(inn, t, typed.at, typed.text.slice(0, n));
  }
  scrollBottom(inn);
}

function renderSuper(t) {
  const inn = document.getElementById('in2');
  const menu = document.getElementById('slashMenu');
  inn.innerHTML = '';

  const typeEv = SUPER.find((e) => e.k === 'typecmd');
  // the command segment types slower than prose (55ms/char, hero-race pace):
  // the menu gets a readable beat, and the pill lights as a deliberate snap
  const CMD_MS = 55;
  const cmdDur = (CMD.length * CMD_MS) / 1000;
  const cmdDoneAt = typeEv.at + cmdDur;
  const superChars = (t) => {
    const elapsed = (t - typeEv.at) * 1000;
    if (elapsed <= 0) return 0;
    if (elapsed <= cmdDur * 1000) return Math.min(CMD.length, Math.floor(elapsed / CMD_MS));
    return Math.min(typeEv.text.length + CMD.length,
      CMD.length + Math.floor((elapsed - cmdDur * 1000) / CHAR_MS));
  };

  // slash menu: open while the command is being typed, close when it lands
  menu.hidden = !(t >= typeEv.at && t < cmdDoneAt);
  if (!menu.hidden) {
    const e = easeOutQuint(clamp((t - typeEv.at) / 0.16, 0, 1));
    menu.style.opacity = e.toFixed(3);
    menu.style.transform = e < 1 ? `translateY(${(4 * (1 - e)).toFixed(2)}px)` : 'none';
  }

  const committed = t >= typeEv.until - 0.001;
  if (!committed) {
    const n = superChars(t);
    const line = el('div', 'in-input');
    fxLineIn(line, t, typeEv.at);
    const p = el('span', 'p');
    if (n > 0) {
      if (n > CMD.length) {
        const pill = el('span', 'cmd', '⚡' + CMD);
        fxPillLit(pill, t, cmdDoneAt);
        p.appendChild(pill);
        p.appendChild(document.createTextNode(typeEv.text.slice(0, n - CMD.length)));
      } else {
        p.appendChild(el('span', 'cmd-typing', CMD.slice(0, n)));
      }
    }
    const cur = el('span', 'cur');
    p.appendChild(cur);
    fxBlink(cur, t);
    line.appendChild(p);
    inn.appendChild(line);
  } else {
    const line = el('div', 'p');
    fxLineIn(line, t, typeEv.at);
    line.appendChild(el('span', 'cmd', '⚡' + CMD));
    line.appendChild(document.createTextNode(typeEv.text));
    inn.appendChild(line);

    for (const ev of SUPER) {
      if (ev.at > t || ev.k === 'typecmd') continue;
      if (ev.k === 'step') {
        addStepLine(inn, t, ev.at, t < ev.until - 0.001, ev.text);
      } else if (ev.k === 'tline') {
        addTLine(inn, t, ev.at, ev.text);
      } else if (ev.k === 'ok') {
        addOk(inn, t, ev.at, ev.text);
      }
    }
  }
  scrollBottom(inn);
}

/* ---- clock / lights / veil ---- */

function fmtClock(sec) {
  // round the milliseconds, not floor — 24.057 must not render as .056
  const ms = Math.round((sec % 1) * 1000);
  const s = Math.floor(sec) + (ms === 1000 ? 1 : 0);
  return `${Math.floor(sec / 60)}:${String(s % 60).padStart(2, '0')}.${String(ms === 1000 ? 0 : ms).padStart(3, '0')}`;
}

function setPaneState(paneId, t, finish, target) {
  const pane = document.getElementById(paneId);
  const clock = pane.querySelector('.clock');
  const done = t >= finish;
  clock.textContent = fmtClock(clamp(t - T_GREEN, 0, target / 1000));
  pane.classList.toggle('running', t >= T_GREEN && !done);
  pane.classList.toggle('done', done);
  return done;
}

function renderLights(t) {
  const wrap = document.getElementById('lights');
  const order = [[0.6, 'bulb1'], [1.1, 'bulb2'], [1.6, 'bulb3']];
  for (const [at, id] of order) {
    const b = document.getElementById(id);
    b.classList.toggle('red', t >= at && t < T_GREEN);
    b.classList.toggle('green', t >= T_GREEN);
  }
  // the tree folds away once the race starts
  const fade = clamp((t - T_GREEN) / 0.5, 0, 1);
  wrap.style.opacity = t < T_GREEN ? '1' : (1 - fade).toFixed(3);
  wrap.style.pointerEvents = 'none';
}

function renderChrome(t) {
  renderLights(t);
  setPaneState('pane1', t, T_FINISH.plain, TARGET.plain);
  const superDone = setPaneState('pane2', t, T_FINISH.super, TARGET.super);

  // loop veil: fade in at the very start, fade out before the wrap
  const veil = document.getElementById('veil');
  let v = 0;
  if (t < 0.35) v = 1 - t / 0.35;
  if (t > CYCLE - 1.8) v = clamp((t - (CYCLE - 1.8)) / 1.4, 0, 1);
  veil.style.opacity = v.toFixed(3);
  return superDone;
}

/* ---- mascot: types while the superbot stopwatch runs, cheers at the stop
   (hero-race.js behavior, PAW_MS paw alternation included) ---- */

const PAW_MS = 110;
let bot = null;
let botPhase = '';
let botBeat = -1;

function initBot() {
  const host = document.getElementById('raceBot');
  try {
    // respectReducedMotion stays off: the OS Reduce Motion setting used to
    // freeze the bot mid-show — the spot always plays (user request)
    bot = new Mascot(host, { variant: 'smol', autoMorph: false });
  } catch (err) {
    console.warn('[race] mascot unavailable:', err);
  }
}

function syncBot(t, superDone) {
  if (!bot) return;
  const phase = t < T_GREEN ? 'watch' : superDone ? 'cheer' : 'typing';
  if (phase !== botPhase) {
    botPhase = phase;
    if (phase === 'watch') {
      bot.typing = false;
      bot.lookAt = { x: -0.7, y: -0.8 };
      bot.setExpr({ eyeL: 'open', eyeR: 'open', mouth: 'smile' });
      botBeat = -1;
    } else if (phase === 'typing') {
      bot.typing = true;
      bot.lookAt = { x: -0.5, y: -0.55 };
      botBeat = -1;
    } else {
      bot.typing = false;
      bot.lookAt = null;
      bot.setExpr({ eyeL: 'happy', eyeR: 'happy', mouth: 'grin' }, 1800);
      bot.excitedUntil = performance.now() + 1500;
    }
  }
  if (phase === 'typing') {
    const ms = (t - T_GREEN) * 1000;
    const b = Math.floor(ms / PAW_MS);
    if (b !== botBeat) {
      botBeat = b;
      bot.press?.(b % 2 ? 'right' : 'left', 70);
    }
  }
}

/* ---- driving ---- */

function render(t) {
  renderPlain(t);
  renderSuper(t);
  const superDone = renderChrome(t);
  syncBot(t, superDone);
}

const urlT = new URLSearchParams(location.search).get('t');

initBot();

if (urlT !== null) {
  // freeze-frame mode (?t=SECONDS): one deterministic frame, no loop, arrows
  // step ±0.25s. The OS Reduce Motion setting no longer freezes the show —
  // every plain reload plays the loop (user request).
  let t = clamp(parseFloat(urlT) || 0, 0, CYCLE);
  document.body.classList.add('freeze');
  render(t);
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight') { t = clamp(t + 0.25, 0, CYCLE); render(t); }
    if (ev.key === 'ArrowLeft')  { t = clamp(t - 0.25, 0, CYCLE); render(t); }
  });
} else {
  let t0 = performance.now();
  function tick(now) {
    let t = (now - t0) / 1000;
    if (t >= CYCLE) { t0 = now; t = 0; }
    render(t);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
