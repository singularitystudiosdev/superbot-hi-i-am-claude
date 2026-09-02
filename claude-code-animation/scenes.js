// Downstream frames for the race spot: benchmark chart → cost bars → the eat
// gag → the superbot.gg endcard. Persistent DOM, built once, whose opacity /
// transform / draw-progress are set from t — the same deterministic, seekable
// contract as timeline.js (?t=SECONDS freeze-frames every scene too).
// Scene windows and the loop constant live here; timeline.js imports them.

import { mascotFrame } from './mascot.js';

// scene windows, in seconds from loop start
export const SCENE = {
  race:  [0, 9.6],    // compressed race + wink beat; flash hands off at 9.6
  bench: [9.6, 16.1], // frontier lines draw, then superbot pops top-right
  cost:  [16.1, 21.1],// two bars: superbot $0.92 vs fable 5.1 $9.90
  eat:   [21.1, 25.6],// superbot opens up and eats claude, then pops out
  logo:  [25.6, 30.0],// the endcard, pulled from superbot.gg
};
export const CYCLE = SCENE.logo[1];
const TR = 0.5; // crossfade window at every boundary

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeOutQuint = (p) => 1 - Math.pow(1 - p, 5);
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeInQuad = (p) => p * p;

/* ---- deterministic static bot: a Mascot face without its self-running loop.
   The stage owns every expression from t, so the duel and the gag stay
   seekable (?t=15 must land on the exact same frame every time). ---- */

class StaticBot {
  constructor(el, cols, rows, shape) {
    this.el = el;
    this.cols = cols;
    this.rows = rows;
    this.shape = shape;
    this.prev = [];
    this.spans = [];
    el.textContent = '';
    for (let y = 0; y < rows; y++) {
      const s = document.createElement('span');
      s.style.display = 'block';
      el.appendChild(s);
      this.spans.push(s);
      this.prev.push(null);
    }
  }
  set(expr) {
    const f = mascotFrame(this.cols, this.rows, expr, this.shape);
    for (let y = 0; y < this.rows; y++) {
      const line = f[y] ?? '';
      if (line !== this.prev[y]) { // row diff, like Mascot.render
        this.spans[y].textContent = line;
        this.prev[y] = line;
      }
    }
  }
}

// superbot: the stock smol variant. claude: a hornless round blob in claude's
// coral, read via the CSS color on the host pre
const SUPER_SHAPE = 'smol';
const CLAUDE_SHAPE = {
  round: 1, headW: 0.40, headH: 0.36, hornScale: 0,
  eyeScale: 1.3, eyeTall: 1.25, eyeDX: 0.33, eyeY: -0.06,
  mouthScale: 1.15, mouthY: 0.42, cy: 0.55, blush: 0,
};

let bots = null;
let bench = null;
let logoEls = null;

export function initScenes() {
  bots = {
    duelL: new StaticBot(document.getElementById('duelL'), 46, 20, SUPER_SHAPE),
    duelR: new StaticBot(document.getElementById('duelR'), 46, 20, CLAUDE_SHAPE),
    eatL: new StaticBot(document.getElementById('eatL'), 44, 18, SUPER_SHAPE),
    eatR: new StaticBot(document.getElementById('eatR'), 44, 18, CLAUDE_SHAPE),
  };
  buildBench();
  logoEls = {
    mark: document.querySelector('#logo .logo-mark'),
    word: document.querySelector('#logo .logo-word'),
    tag: document.querySelector('#logo .logo-tag'),
    url: document.querySelector('#logo .logo-url'),
  };
}

/* ---- the duel: superbot left, claude right, under the comparison panes ----
   race = { green, refusedAt, superDoneAt, winkAt } from the timeline. claude
   saddens when the refusal lands and the loss is sealed; superbot celebrates
   with the same excited grin the copy command bar triggers (happy eyes + grin
   + fast bob — mascot.js's superbot:copied celebration, driven from t). */

function renderDuel(t, race) {
  if (!bots) return;
  const { green, refusedAt, superDoneAt, winkAt } = race;
  const won = t >= superDoneAt;
  bots.duelL.set({
    eyeL: 'open', eyeR: 'open',
    mouth: won ? 'grin' : 'smile',
    bob: won ? Math.sin(t / 0.18) * 1.4 : Math.sin(t / 0.9),
    earTilt: t > green ? Math.sin(t / 0.45) * 0.7 : 0,
  });
  const wink = t >= winkAt;
  const sad = t >= refusedAt && !wink;
  bots.duelR.set({
    eyeL: wink ? 'open' : sad ? 'sad' : 'open',
    eyeR: wink ? 'wink' : sad ? 'sad' : 'open',
    mouth: wink ? 'o' : sad ? 'sad' : 'smile',
    bob: sad ? Math.sin(t / 1.1 + 1) * 0.4 : Math.sin(t / 1.1 + 1),
    earTilt: 0,
  });
}

/* ---- benchmark: score vs cost, frontier set, then superbot top-right ----
   Data mirrors the published frontier chart (retrieved 2026-09-02): quality
   up, cost right-to-left so cheap-and-good sits top right. */

const BENCH = {
  W: 980, H: 520,
  pad: { l: 64, r: 30, t: 34, b: 56 },
  cost: [0, 10.5],
  score: [45, 75],
  series: [
    { name: 'fable 5.1', color: '#c9b458', at: 1.2, dur: 1.2, pts: [[10.0, 73.3], [6.2, 72.8], [3.4, 69.1], [2.1, 66.4]] },
    { name: 'grok 4.6', color: '#d8d8d2', at: 1.4, dur: 1.2, pts: [[2.2, 70.6], [1.4, 69.4], [0.9, 66.4], [0.55, 61.0]] },
    { name: 'luna', color: '#9fb4d0', at: 1.6, dur: 1.2, pts: [[1.2, 61.4], [0.8, 58.9], [0.55, 56.3], [0.3, 52.0], [0.12, 47.4]] },
    { name: 'flash', color: '#b98a6e', at: 1.8, dur: 1.2, pts: [[1.1, 64.5], [0.7, 58.7], [0.5, 53.8], [0.35, 49.4], [0.22, 46.8]] },
  ],
  super: { name: 'superbot', at: 3.8, drawDur: 0.7, pts: [[0.75, 72.2], [0.55, 70.8], [0.38, 67.5]] },
};

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

function buildBench() {
  const wrap = document.getElementById('benchWrap');
  const { pad, W, H } = BENCH;
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
  const xOf = (c) => pad.l + (1 - (c - BENCH.cost[0]) / (BENCH.cost[1] - BENCH.cost[0])) * plotW;
  const yOf = (q) => pad.t + (1 - (q - BENCH.score[0]) / (BENCH.score[1] - BENCH.score[0])) * plotH;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });

  const grid = svgEl('g');
  grid.style.opacity = '0';
  for (let q = BENCH.score[0]; q <= BENCH.score[1]; q += 5) {
    grid.appendChild(svgEl('line', { x1: pad.l, x2: W - pad.r, y1: yOf(q), y2: yOf(q), class: 'bench-grid' }));
    const lbl = svgEl('text', { x: pad.l - 12, y: yOf(q) + 4, 'text-anchor': 'end', class: 'bench-axis' });
    lbl.textContent = `${q}%`;
    grid.appendChild(lbl);
  }
  for (const c of [10, 5, 0]) {
    const lbl = svgEl('text', { x: xOf(c), y: H - 16, 'text-anchor': 'middle', class: 'bench-axis' });
    lbl.textContent = `$${c.toFixed(2)}`;
    grid.appendChild(lbl);
  }
  svg.appendChild(grid);

  bench = { gridG: grid, lines: [], super: null };
  for (const s of BENCH.series) {
    const pts = s.pts.map(([c, q]) => `${xOf(c).toFixed(1)},${yOf(q).toFixed(1)}`).join(' ');
    const pl = svgEl('polyline', { points: pts, fill: 'none', stroke: s.color, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: '1' });
    pl.style.strokeDasharray = '1';
    pl.style.strokeDashoffset = '1';
    const head = s.pts[0];
    const lbl = svgEl('text', { x: xOf(head[0]) + 10, y: yOf(head[1]) - 12, class: 'bench-label' });
    lbl.textContent = s.name;
    lbl.style.opacity = '0';
    svg.appendChild(pl);
    svg.appendChild(lbl);
    bench.lines.push({ node: pl, lbl, at: s.at, dur: s.dur });
  }

  const sup = BENCH.super;
  const g = svgEl('g');
  g.style.opacity = '0';
  g.style.filter = 'drop-shadow(0 0 7px rgba(124, 179, 137, .75))';
  const spl = svgEl('polyline', {
    points: sup.pts.map(([c, q]) => `${xOf(c).toFixed(1)},${yOf(q).toFixed(1)}`).join(' '),
    fill: 'none', stroke: '#7cb389', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: '1',
  });
  spl.style.strokeDasharray = '1';
  spl.style.strokeDashoffset = '1';
  g.appendChild(spl);
  const dots = sup.pts.map(([c, q]) => {
    const d = svgEl('circle', { cx: xOf(c).toFixed(1), cy: yOf(q).toFixed(1), r: 0, fill: '#7cb389', stroke: '#050505', 'stroke-width': 1.5 });
    g.appendChild(d);
    return d;
  });
  const slbl = svgEl('text', { x: xOf(sup.pts[0][0]) - 16, y: yOf(sup.pts[0][1]) - 16, 'text-anchor': 'end', class: 'bench-label super-label' });
  slbl.textContent = sup.name;
  slbl.style.opacity = '0';
  g.appendChild(slbl);
  svg.appendChild(g);
  bench.super = { g, spl, dots, slbl, at: sup.at, drawDur: sup.drawDur };

  wrap.appendChild(svg);
}

function renderBench(t) {
  if (!bench) return;
  const [start, end] = SCENE.bench;
  if (t < start || t >= end) return;
  const lt = t - start;
  bench.gridG.style.opacity = clamp((lt - 0.5) / 0.6, 0, 1).toFixed(3);
  for (const L of bench.lines) {
    const p = easeOutQuint(clamp((lt - L.at) / L.dur, 0, 1));
    L.node.style.strokeDashoffset = (1 - p).toFixed(3);
    L.lbl.style.opacity = clamp((lt - L.at - L.dur) / 0.35, 0, 1).toFixed(3);
  }
  const S = bench.super;
  const p = easeOutQuint(clamp((lt - S.at) / S.drawDur, 0, 1));
  S.g.style.opacity = p > 0 ? '1' : '0';
  S.spl.style.strokeDashoffset = (1 - p).toFixed(3);
  S.dots.forEach((d, i) => {
    const dp = easeOutQuint(clamp((lt - S.at - 0.45 - i * 0.18) / 0.16, 0, 1));
    d.setAttribute('r', (6.5 * dp).toFixed(2));
  });
  S.slbl.style.opacity = clamp((lt - S.at - 0.95) / 0.4, 0, 1).toFixed(3);
}

/* ---- cost: two bars, counted up from t ---- */

const COST = { max: 10, super: 0.92, fable: 9.9, superAt: 0.5, superDur: 1.1, fableAt: 0.8, fableDur: 2.3 };

function renderCost(t) {
  const [start, end] = SCENE.cost;
  if (t < start || t >= end) return;
  const lt = t - start;
  const pS = easeOutQuint(clamp((lt - COST.superAt) / COST.superDur, 0, 1));
  const pF = easeOutQuint(clamp((lt - COST.fableAt) / COST.fableDur, 0, 1));
  document.getElementById('barSuper').style.width = `${(COST.super / COST.max * 100 * pS).toFixed(2)}%`;
  document.getElementById('barFable').style.width = `${(COST.fable / COST.max * 100 * pF).toFixed(2)}%`;
  document.getElementById('valSuper').textContent = `$${(COST.super * pS).toFixed(2)}`;
  document.getElementById('valFable').textContent = `$${(COST.fable * pF).toFixed(2)}`;
}

/* ---- the eat gag: superbot opens up, claude slides in, gulp, pop ---- */

function renderEat(t) {
  const [start, end] = SCENE.eat;
  if (t < start || t >= end || !bots) return;
  const lt = t - start;
  const inP = easeOutQuint(clamp(lt / 0.5, 0, 1));
  const approach = easeInOut(clamp((lt - 1.2) / 1.0, 0, 1));
  const chomp = clamp((lt - 1.4) / 0.4, 0, 1) * (1 - clamp((lt - 2.35) / 0.25, 0, 1));
  const gulp = lt > 2.6 && lt < 3.1 ? Math.sin(((lt - 2.6) / 0.5) * Math.PI) : 0;
  const pop = clamp((lt - 3.4) / 0.55, 0, 1);
  const swallow = easeInQuad(clamp((lt - 1.7) / 0.6, 0, 1));

  const L = document.getElementById('eatL');
  L.style.opacity = (inP * (1 - pop)).toFixed(3);
  L.style.filter = pop > 0 ? `blur(${(12 * pop).toFixed(1)}px)` : 'none';
  L.style.transform =
    `translate(${(approach * 230).toFixed(1)}px, ${(-gulp * 14).toFixed(1)}px) scale(${(1 + 0.45 * easeOutQuint(pop)).toFixed(3)})`;
  bots.eatL.set({
    eyeL: 'open', eyeR: 'open',
    mouth: chomp > 0.04 ? 'chomp' : 'grin',
    chomp,
    bob: Math.sin(t / 0.28) * (1 + gulp * 2),
  });

  const R = document.getElementById('eatR');
  R.style.opacity = (inP * clamp(1 - swallow * 1.05, 0, 1)).toFixed(3);
  R.style.transform = `translate(${(-swallow * 260).toFixed(1)}px, 0) scale(${Math.max(0.03, 1 - swallow * 0.97).toFixed(3)})`;
  bots.eatR.set({
    eyeL: swallow > 0.03 ? 'closed' : 'open',
    eyeR: swallow > 0.03 ? 'closed' : 'open',
    mouth: swallow > 0.03 ? 'o' : 'smile',
    bob: Math.sin(t / 1.15 + 2),
  });
}

/* ---- the endcard: mark + wordmark + tagline, pulled from superbot.gg ---- */

function renderLogo(t) {
  const [start, end] = SCENE.logo;
  if (t < start || t >= end || !logoEls) return;
  const lt = t - start;
  const inFx = (el, p, dy = 12) => {
    el.style.opacity = p.toFixed(3);
    el.style.filter = p < 1 ? `blur(${(10 * (1 - p)).toFixed(2)}px)` : 'none';
    el.style.transform = p < 1 ? `translateY(${(dy * (1 - p)).toFixed(2)}px)` : 'none';
  };
  inFx(logoEls.mark, easeOutQuint(clamp((lt - 0.3) / 0.8, 0, 1)), 10);
  inFx(logoEls.word, easeOutQuint(clamp((lt - 0.55) / 0.7, 0, 1)));
  inFx(logoEls.tag, clamp((lt - 1.3) / 0.5, 0, 1), 8);
  inFx(logoEls.url, clamp((lt - 1.6) / 0.5, 0, 1), 8);
}

/* ---- flash sweep: the race→benchmark handoff, light bar right + blur ---- */

function renderFlash(t) {
  const flash = document.getElementById('flash');
  const fStart = SCENE.bench[0] - 0.05, fDur = 0.55;
  const p = (t - fStart) / fDur;
  if (p <= 0 || p >= 1) { flash.style.visibility = 'hidden'; return; }
  flash.style.visibility = 'visible';
  flash.style.backgroundPosition = `${(150 - 300 * p).toFixed(1)}% 0`;
  flash.style.opacity = (0.95 * Math.sin(Math.PI * p)).toFixed(3);
}

/* ---- director: window visibility + boundary crossfades + per-frame renders ---- */

const SCENE_IDS = ['raceScene', 'benchmark', 'cost', 'eat', 'logo'];
const SCENE_KEYS = ['race', 'bench', 'cost', 'eat', 'logo'];

export function renderScenes(t, race) {
  SCENE_KEYS.forEach((key, i) => {
    const node = document.getElementById(SCENE_IDS[i]);
    const [start, end] = SCENE[key];
    if (t < start || t >= end) {
      node.style.visibility = 'hidden';
      return;
    }
    node.style.visibility = 'visible';
    const since = t - start;
    let op = 1, tx = 0, blur = 0;
    if (i > 0 && since < TR) { // incoming: slides in from the right, de-blurring
      const p = easeOutQuint(since / TR);
      op = p; blur = 7 * (1 - p); tx = 70 * (1 - p);
    }
    if (i < SCENE_KEYS.length - 1 && end - t < TR) { // outgoing: sinks left, blurring out
      const p = easeOutQuint((end - t) / TR);
      op = Math.min(op, p);
      blur = Math.max(blur, 7 * (1 - p));
      tx = Math.min(tx, -50 * (1 - p));
    }
    node.style.opacity = op.toFixed(3);
    node.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
    node.style.transform = tx !== 0 ? `translateX(${tx.toFixed(2)}px)` : 'none';
  });
  renderFlash(t);
  renderDuel(t, race);
  renderBench(t);
  renderCost(t);
  renderEat(t);
  renderLogo(t);
}
