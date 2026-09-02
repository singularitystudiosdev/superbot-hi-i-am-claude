// The pitch, "hi i am claude" remake — a deterministic seekable render.
// The little claude bot (the benchmarks page's own mascot engine, taken
// directly — variant puff, same as xdxdxd.dsh.sh/benchmarks) waves with a
// chat box: "Hi I am a orange blob!" then "Everyone hates me!" (user ask). Then claude
// code: the prompt types "Make me a scraper for twitter", claude refuses —
// "That is unsafe!" — and the request is DENIED (user ask). Superbot flies
// in from the right, bats claude clean off screen (user ask), and the retry
// runs IN THE SAME FRAME claude was already in (user ask): "/superbot Make
// me a scraper for twitter", the /superbot prefix glowing on a gradient.
// Superbot thinks in the terminal — bypassing captchas, parsing html with
// regex — and quickly outputs the working, tested scraper (user ask). Then
// the cost gauntlet: the same bar-comparison frame topic after topic,
// claude's bubble sits to his LEFT cycling a panic litany (UNSAFE /
// THINKING / durr / …, user ask) while superbot looks happy dominating
// him on all fronts. "TAKE YOUR PICK!" with claude beside
// superbot, then the superbot.gg end card.
// render(t) rebuilds every scene from scratch; every effect is computed
// from t, so ?t=SECONDS freeze-frames exactly. Arrows step ±0.25s in freeze.

import { Mascot } from './mascot.js';

const SPEED = 1.15;          // the whole show plays ~15% faster (user ask)

/* ---- scene 1: the wave intro ---- */
const T_INTRO = 4.6;         // wave + the two chat-box lines, +0.4s hold (user ask)
const SAY1_AT = 0.5;         // intro-local: "Hi I am a orange blob!" types in
const SAY1_LEN = 1.1;
const SWAP_AT = 2.5;         // intro-local: it swaps to "Everyone hates me!"
const SAY2_LEN = 1.1;

/* ---- scenes 2-3: the claude code refusal + the fly-in ---- */
const T_TERM = T_INTRO + 0.15;
const TERM_LEN = 5.4;
const PROMPT_AT = 0.35, PROMPT_DUR = 1.35;   // the prompt types
const REFUSE_AT = 1.95, REFUSE_LEN = 1.3;    // claude's bubble
const DENY_AT = 2.75,  DENY_LEN = 1.9;       // the request is denied

/* ---- scene 3: superbot flies in from the right, claude flies out ---- */
const T_FLY = T_TERM + TERM_LEN;
const FLY_LEN = 2.0;
const HIT_AT = 0.75;         // fly-local: the impact
const CLAUDE_OUT = 0.72;     // fly-local: claude leaves the frame

/* ---- scene 4: the /superbot retry ---- */
const T_RETRY = T_FLY + FLY_LEN;
const RETRY_LEN = 9.7;       // a longer hold after the final line before moving on (user ask)
const RPROMPT_AT = 0.35, RPROMPT_DUR = 1.5;
// the solving runs fast (user ask): three captcha solves at 0.3s each,
// then the regex parse with a live %, then the scraper types
const THINK1_AT = 1.95;      // captcha bypass: 3 solves × 0.3s
const THINK2_AT = 2.95;      // cool thinking lines, until the write starts
const CODE_AT = 3.9;         // the Claude Code tool-call presentation
const RUN_AT = 5.4;          // the Bash run call types
const OUT_AT = 6.0;          // the run's output lines (the end output)
const OK_AT = 7.2;           // the deliverable line types
const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const CAPTCHA_MS = [71, 58, 64];

/* ---- scene 5: the cost gauntlet (the bar-comparison frame) ---- */
const T_BENCH = T_RETRY + RETRY_LEN;
const SWIPE = 0.5;           // the terminal→benchmarks whip pan (user ask: 40% slower, smoother)
const TOPICS = [
  { title: 'COST PER PROMPT',        claude: '$10',   super: '¢70',   claudePct: 88,  superPct: 4.5, point: false },
  { title: 'WALL TIME PER TASK',     claude: '24.1s', super: '8.6s',  claudePct: 100, superPct: 36,  point: true },
  { title: 'STEPS PER TASK',         claude: '6.0',   super: '4.6',   claudePct: 100, superPct: 77,  point: true },
  { title: 'OUTPUT TOKENS PER TASK', claude: '1,210', super: '508',   claudePct: 100, superPct: 42,  point: true },
];
const COST_LEN = 5.0;
const TOPIC_LEN = 3.6;
const topicStart = (i) => (i === 0 ? 0 : COST_LEN + (i - 1) * TOPIC_LEN);
const BENCH_LEN = topicStart(TOPICS.length - 1) + TOPIC_LEN;
const DRAIN_END = 0.5;
const C_FILL = 0.6,  C_DUR = 0.8;    // claude's bar sweeps first (user ask)
const S_FILL = 1.7,  S_DUR = 0.45;   // superbot's lands after
const SAD_MILD = C_FILL + C_DUR;     // claude's first frown — a mild one

/* ---- scene 6: TAKE YOUR PICK! ---- */
const T_PICK = T_BENCH + BENCH_LEN;
const PICK_LEN = 3.8;

/* ---- scene 7: the superbot.gg end card ---- */
const T_END = T_PICK + PICK_LEN;
const DRIFT_AT = 0.7;        // endcard-local: the logo drifts left, the
                             // wordmark fades in beside it
const SETTLE = DRIFT_AT + 1.0; // the lockup is set; the laugh cycle starts
const LAUGH_PERIOD = 2.4;
const LAUGH_DUR = 0.9;
const LOGO_GAP = 24;
const END_LEN = 4.8;
const CYCLE = T_END + END_LEN + 1.8;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeOutQuint = (p) => 1 - Math.pow(1 - p, 5);
const easeOutBack = (p) => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);
const easeInOutSine = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
const inP = (p, dur) => clamp(p / dur, 0, 1);

// claude's chat bubbles sit to the LEFT of his head (user ask): the anchor
// is the sprite's INK box — its visible glyph art — not the layout <pre>
// box (the field's visual-vs-layout bounding box; DOM's own take is MDN
// TextMetrics actualBoundingBox*, baseline since 2015 — here done as
// string math over the renderer's own rows: first non-space glyph per
// line, × the grid's character width). At head height, tail pointing
// back right at him.
function anchorBubble(host, stage, bubble, side = 'left') {
  const r = host.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const lines = (host.textContent || '').split('\n');
  const cols = Math.max(1, ...lines.map((l) => l.length));
  const charW = r.width / cols;
  // the head, not the whole sprite: the puff's body is wider than its
  // head, so the edge comes from the top rows only — a bubble beside
  // the head must not hang out by the belly
  const headRows = Math.max(1, Math.ceil(lines.length * 0.35));
  let first = Infinity;
  for (const line of lines.slice(0, headRows)) {
    const i = line.search(/\S/);
    if (i !== -1) first = Math.min(first, i);
  }
  const inkX = first === Infinity ? r.width * 0.18 : first * charW;
  // 'left' (default): translateX(-100%) (the bubble-left class) hangs the
  // bubble's RIGHT edge at this coordinate — no width subtraction, or the
  // bubble drifts a full width off the head.
  // 'right' (user ask: "That is unsafe!" beside him): the mirror — the
  // bubble's LEFT edge sits 10px off the ink's right edge, tail pointing
  // back left at him
  if (side === 'right') {
    // centered above the head (user ask): same grammar as the intro bubble —
    // left at the sprite's center, JS transform translateX(-50%) centers on
    // it, bottom clears the sprite's top, tail pointing straight down
    bubble.style.left = (r.left - s.left + r.width / 2).toFixed(1) + 'px';
    bubble.style.top = (r.top - s.top - bubble.offsetHeight - 6).toFixed(1) + 'px';
  } else {
    bubble.style.left = Math.max(10, r.left - s.left + inkX - 10).toFixed(1) + 'px';
    bubble.style.top = (r.top - s.top + r.height * 0.05).toFixed(1) + 'px';
  }
}

/* ---- chrome: the loop veil ---- */

function renderChrome(t) {
  const veil = document.getElementById('veil');
  let v = 0;
  if (t < 0.35) v = 1 - t / 0.35;
  if (t > CYCLE - 1.8) v = clamp((t - (CYCLE - 1.8)) / 1.4, 0, 1);
  veil.style.opacity = v.toFixed(3);
}

/* ---- scene 1: the wave intro ---- */

let introBot = null;
let introPhase = '';

function initIntro() {
  try {
    // the benchmarks page's claude figure: variant puff, taken directly
    introBot = new Mascot(document.getElementById('introBot'), { cols: 30, rows: 15, variant: 'puff', anim: 'breathe', autoMorph: false });
  } catch (err) {
    console.warn('[hi] intro mascot unavailable:', err);
  }
}

const INTRO_SAY1 = 'Hi I am a orange blob!';
const INTRO_SAY2 = 'Everyone hates me!';

function renderIntro(t) {
  const intro = document.getElementById('intro');
  const say = document.getElementById('introSay');
  if (t >= T_INTRO) {
    intro.style.display = 'none';
    say.style.opacity = '0';
    introPhase = '';
    return;
  }
  intro.style.display = '';
  intro.style.opacity = '1';

  // he waves: a cheerful bounce and an ear-wiggle while the first line is up
  const s = t;
  const waving = s < SWAP_AT;
  intro.style.transform = `scale(${(0.9 + 0.1 * easeOutBack(inP(s, 0.5))).toFixed(3)})`;

  // the chat box ABOVE his head (user ask: the intro bubble sits up top,
  // centered — only the later bubbles hang to his left): line 1 types in,
  // holds, swaps to line 2
  const showLine2 = s >= SWAP_AT;
  const line = showLine2 ? INTRO_SAY2 : INTRO_SAY1;
  const at = showLine2 ? SWAP_AT : SAY1_AT;
  const p = s - at;
  if (p <= 0) {
    say.style.opacity = '0';
  } else {
    say.textContent = line.slice(0, Math.ceil(clamp(p / 0.5, 0, 1) * line.length));
    const stage = intro.getBoundingClientRect();
    const r = document.getElementById('introBot').getBoundingClientRect();
    say.style.left = (r.left - stage.left + r.width / 2).toFixed(1) + 'px';
    say.style.top = (r.top - stage.top - say.offsetHeight - 14).toFixed(1) + 'px';
    // the bubble clears over the scene's last 0.1s (user ask: it disappears
    // just before the cut to the terminal frame)
    say.style.opacity = (inP(p, 0.18)
      * (showLine2 ? 1 : 1 - inP(s - (SWAP_AT - 0.2), 0.2))
      * (1 - inP(s - (T_INTRO - 0.1), 0.1))).toFixed(3);
    say.style.transform = `translateX(-50%) scale(${Math.max(0.001, easeOutBack(inP(p, 0.18))).toFixed(3)})`;
  }

  // the faces: he grins and waggles through line 1; through line 2 he is
  // entirely unbothered — same grin (the joke is he means it). Asserted
  // EVERY frame: a blink's revert would land on the canonical smile and stick.
  if (introBot) {
    const wig = waving ? Math.sin(s * 14) * 0.5 : 0;
    Object.assign(introBot.expr, { eyeL: 'happy', eyeR: 'happy', mouth: 'grin', earTilt: waving ? wig : 0 });
    if (waving && introPhase !== 'wave') {
      introPhase = 'wave';
      introBot.excitedUntil = performance.now() + 1600;
    }
    introBot.lookAt = { x: 0.05 + 0.08 * Math.sin(s * 1.3), y: -0.08 };
  }
}

/* ---- scenes 2-3: the claude code refusal + the fly-in ---- */

let termBot = null;
let flyBot = null;
let flyCheer = false;

function initTerm() {
  try {
    termBot = new Mascot(document.getElementById('termBot'), { cols: 26, rows: 13, variant: 'puff', anim: 'breathe', autoMorph: false });
    flyBot = new Mascot(document.getElementById('flyBot'), { cols: 26, rows: 13, anim: 'perky', autoMorph: false });
  } catch (err) {
    console.warn('[hi] term mascots unavailable:', err);
  }
}

const PROMPT_TEXT = 'Make me a scraper for twitter';
const DENY_TEXT = '✗ request denied — unsafe';

function renderTerm(t) {
  const term = document.getElementById('term');
  const promptEl = document.getElementById('termPrompt');
  const noteEl = document.getElementById('termNote');
  const codeEl = document.getElementById('termCode');
  const okEl = document.getElementById('termOk');
  const say = document.getElementById('termSay');
  const bot = document.getElementById('termBot');
  const fly = document.getElementById('flyBot');
  const hide = t < T_TERM || t >= T_BENCH + SWIPE - 0.1; // the pane lives through the first half of the whip pan
  term.style.display = hide ? 'none' : '';
  if (hide) { flyCheer = false; return; }
  const s = t - T_TERM; // scene-local

  // the pane rises once, at the scene's start
  term.style.opacity = easeInOutSine(clamp(s / 0.5, 0, 1)).toFixed(3);

  const inFly = s >= TERM_LEN; // the fly-in owns the tail of this overlay
  const s2 = s - TERM_LEN;     // fly-local clock
  // the retry (scene 4) plays inside this same frame once superbot lands
  const s4 = s - (TERM_LEN + FLY_LEN);
  const retryPhase = s4 >= 0;

  // while superbot is running (user ask): a light border-beam travels the
  // pane's top edge and a super-light accent glow breathes around it —
  // Magic UI's border-beam pattern, deterministic from t
  term.classList.toggle('live', retryPhase);
  if (retryPhase) {
    // the green frame eases in over the retry's first 0.6s (user ask: a
    // smooth transition), then two hairline beams ride the whole border
    // counter-rotating, position from t
    term.style.setProperty('--glow', easeInOutSine(clamp(s4 / 0.6, 0, 1)).toFixed(3));
    term.style.setProperty('--beam', ((t * 0.28) % 1).toFixed(4));
  } else {
    term.style.setProperty('--glow', '0');
  }

  // the prompt: scene 2 types claude's plain prompt; in the retry the same
  // line retypes with the /superbot prefix glowing on a gradient that
  // slowly sweeps back and forth (user ask: the glow moves)
  if (retryPhase) {
    const pp = s4 - RPROMPT_AT;
    const typed = RPROMPT_TEXT.slice(0, Math.ceil(clamp(pp / RPROMPT_DUR, 0, 1) * RPROMPT_TEXT.length));
    const CMD = '/superbot';
    promptEl.innerHTML = typed.length === 0 ? ''
      : typed.length <= CMD.length
        ? '> <span class="cmd-glow">⚡ ' + typed + '</span>'
        : '> <span class="cmd-glow">⚡ ' + CMD + '</span>' + typed.slice(CMD.length);
    // glow breathe (user ask): the chip's glow deepens and releases on a
    // 2.2s cycle, computed from t — the span is rebuilt every frame
    const glow = promptEl.querySelector('.cmd-glow');
    if (glow) {
      const breath = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 2.2);
      glow.style.textShadow = `0 0 ${(6 + 8 * breath).toFixed(1)}px rgba(124, 179, 137, ${(0.3 + 0.3 * breath).toFixed(3)})`;
    }
  } else {
    const pp = s - PROMPT_AT;
    promptEl.textContent = '> ' + PROMPT_TEXT.slice(0, Math.ceil(clamp(pp / PROMPT_DUR, 0, 1) * PROMPT_TEXT.length));
  }

  // claude refuses — bubble to his RIGHT (user ask), tail pointing back
  const refuse = s - REFUSE_AT;
  if (refuse > 0 && refuse < REFUSE_LEN && !inFly) {
    say.textContent = 'That is unsafe!'.slice(0, Math.ceil(clamp(refuse / 0.4, 0, 1) * 15));
    anchorBubble(bot, term, say, 'right');
    say.style.opacity = (inP(refuse, 0.18) * (1 - inP(refuse - REFUSE_LEN + 0.2, 0.2))).toFixed(3);
    say.style.transform = `translateX(-50%) scale(${Math.max(0.001, easeOutBack(inP(refuse, 0.18))).toFixed(3)})`;
  } else {
    say.style.opacity = '0';
  }

  // the request is denied: the status line turns red, the prompt strikes.
  // In the retry phase the denial clears — the frame is superbot's now —
  // and his solving text runs fast and cool (user ask): a braille spinner,
  // captcha-by-captcha solves with their millis, then the parse with a
  // live %, the whole line pulsing an accent glow
  const deny = s - DENY_AT;
  const denied = deny > 0 && !retryPhase;
  if (retryPhase) {
    const n1 = s4 - THINK1_AT;
    const n2 = s4 - THINK2_AT;
    const cp = s4 - CODE_AT;
    const spin = SPIN[Math.floor(t * 12) % SPIN.length];
    // the thinking STOPS once the output lands (user ask: realistic) — the
    // last line freezes at the Write and fades out over 0.25s
    const visible = cp < 0.25;
    let html = null, since = 1;
    if (n2 >= 0 || (cp >= 0 && n1 >= 0)) {
      // cool thinking lines (user ask): confident telemetry, no % — frozen
      // at the Write moment so the fade-out does not cycle
      const n2f = Math.max(0, Math.min(n2, CODE_AT - THINK2_AT));
      const INFO = ['reading the api — 14 endpoints found', 'mapping twitter → x.com search', 'captchas 3/3 · cookies warm'];
      const li = Math.floor(n2f / 0.55) % INFO.length;
      html = `<span class="sp">${spin}</span> superbot: ${INFO[li]}`;
      since = cp < 0 ? n2f % 0.55 : 1;   // past the Write: entrance done, fade the exit
    } else if (n1 >= 0) {
      const step = Math.min(CAPTCHA_MS.length - 1, Math.floor(n1 / 0.3));
      html =
        `<span class="sp">${spin}</span> superbot: captcha ${step + 1}/${CAPTCHA_MS.length} solved <span class="dim">· ${CAPTCHA_MS[step]}ms</span>`;
      since = cp < 0 ? n1 % 0.3 : 0;
    }
    if (visible && html !== null) {
      // each line enters with a quick fade+rise (user ask: smooth entrance)
      const o = inP(since, 0.18) * (1 - inP(Math.max(0, cp), 0.25));
      noteEl.innerHTML = html;
      noteEl.style.opacity = o.toFixed(3);
      noteEl.style.transform = `translateY(${((1 - o) * 3).toFixed(1)}px)`;
      noteEl.style.textShadow = n1 >= 0
        ? `0 0 ${(8 + 5 * Math.sin(t * 14)).toFixed(1)}px color-mix(in srgb, var(--accent) 45%, transparent)` : '';
    } else {
      noteEl.innerHTML = '';
      noteEl.style.textShadow = '';
    }
  } else {
    noteEl.textContent = denied ? '' : 'thinking…';
    noteEl.style.textShadow = '';
  }
  const cp = s4 - CODE_AT;
  if (retryPhase && cp > 0) {
    // the Claude Code presentation (user ask: no code dump — the tool call,
    // its result, then a line to run it), each line typing in with a fade
    const t1 = 'Write(scraper.js)'.slice(0, Math.ceil(clamp(cp / 0.3, 0, 1) * 17));
    const l2p = clamp((cp - 0.4) / 0.4, 0, 1);
    const l2 = 'Wrote 38 lines · captcha-bypassed twitter search'
      .slice(0, Math.ceil(l2p * 44));
    const rp = clamp((cp - (RUN_AT - CODE_AT)) / 0.45, 0, 1);
    const runTyped = 'Bash(node scraper.js "ai news")'.slice(0, Math.ceil(rp * 31));
    const run = `<span class="cdot">●</span> ` + runTyped.replace('"ai news"', '<span class="dim">"ai news"</span>');
    // the run's end output (user ask: real output, not a caption) — the
    // scraper's own stdout, Claude Code result-line style
    const o1p = clamp((cp - (OUT_AT - CODE_AT)) / 0.3, 0, 1);
    const o2p = clamp((cp - (OUT_AT - CODE_AT + 0.35)) / 0.35, 0, 1);
    const o3p = clamp((cp - (OUT_AT - CODE_AT + 0.7)) / 0.35, 0, 1);
    const OUT2 = '"agents ate the captcha industry" · 12.4k reposts';
    const OUT3 = '"superbot shipped it in 8s" · 8.1k likes';
    const lineIn = (p) => (p <= 0 ? 'opacity:0' : `opacity:${inP(p, 0.14).toFixed(3)}`);
    codeEl.innerHTML =
      `<div style="${lineIn(cp)}"><span class="cdot">●</span> ${t1}</div>` +
      (cp > 0.4 ? `<div class="sub" style="${lineIn(cp - 0.4)}">⎿ ${l2}</div>` : '') +
      (rp > 0 ? `<div style="${lineIn(cp - (RUN_AT - CODE_AT))}">${run}</div>` : '') +
      (o1p > 0 ? `<div class="sub" style="${lineIn(cp - (OUT_AT - CODE_AT))}">⎿ ${'20 tweets in 0.8s'.slice(0, Math.ceil(o1p * 17))}</div>` : '') +
      (o2p > 0 ? `<div class="sub" style="${lineIn(cp - (OUT_AT - CODE_AT + 0.35))}">  ${OUT2.slice(0, Math.ceil(o2p * OUT2.length))}</div>` : '') +
      (o3p > 0 ? `<div class="sub" style="${lineIn(cp - (OUT_AT - CODE_AT + 0.7))}">  ${OUT3.slice(0, Math.ceil(o3p * OUT3.length))}</div>` : '');
  } else {
    codeEl.innerHTML = '';
  }
  // the ✓ line types in with a fade (user ask: clean entrance)
  const okp = retryPhase ? s4 - OK_AT : -1;
  if (retryPhase && okp > 0) {
    const OK_TEXT = '✓ scraper.js ready — node scraper.js "ai news"';
    okEl.textContent = OK_TEXT.slice(0, Math.ceil(clamp(okp / 0.6, 0, 1) * OK_TEXT.length));
    okEl.style.opacity = inP(okp, 0.2).toFixed(3);
  } else {
    okEl.textContent = retryPhase ? '' : (denied ? DENY_TEXT : '');
    okEl.style.opacity = '';
  }
  okEl.classList.toggle('deny', denied);
  promptEl.style.textDecoration = denied ? 'line-through' : 'none';
  promptEl.style.opacity = denied ? '0.55' : '1';

  // claude sits in the pane — and at the hit he is launched clean off
  // screen, left, tumbling (user ask)
  const r = term.getBoundingClientRect();
  const fv = s - TERM_LEN; // fly-local clock (0 during scene 2)
  const launched = inFly && fv >= HIT_AT;
  bot.style.display = launched && fv > CLAUDE_OUT + 0.55 ? 'none' : '';
  bot.style.left = '16px';
  bot.style.bottom = '14px';
  if (launched) {
    const lp = clamp((fv - HIT_AT) / 0.75, 0, 1);
    bot.style.transform =
      `translate(${(-r.width * 0.95 * easeOutQuint(lp)).toFixed(1)}px, ${(-150 * Math.sin(Math.PI * Math.min(1, lp * 1.2))).toFixed(1)}px) rotate(${(-560 * lp).toFixed(0)}deg)`;
    bot.style.opacity = (1 - easeOutQuint(clamp((lp - 0.55) / 0.45, 0, 1))).toFixed(3);
  } else {
    bot.style.transform = 'none';
    bot.style.opacity = '1';
  }
  if (termBot) {
    const scared = refuse > 0 && refuse < REFUSE_LEN;
    Object.assign(termBot.expr, launched
      ? { eyeL: 'open', eyeR: 'open', mouth: 'o', armDrop: 0.3 }
      : scared
        ? { eyeL: 'open', eyeR: 'open', mouth: 'o', armDrop: 0.2 }
        : denied
          ? { eyeL: 'sad', eyeR: 'sad', mouth: 'sad', armDrop: 0.4 }
          : { eyeL: 'open', eyeR: 'open', mouth: 'smile', armDrop: 0 });
    termBot.lookAt = launched ? { x: -0.8, y: -0.3 } : scared ? { x: 0, y: -0.6 } : { x: 0.2, y: 0.1 };
  }

  // scene 3: superbot flies in from the right screen edge, arcs down to
  // claude's seat, and the impact shakes the pane (user ask)
  if (inFly) {
    const shk = fv > HIT_AT && fv < HIT_AT + 0.45
      ? 7 * Math.exp(-(fv - HIT_AT) * 9) * Math.sin((fv - HIT_AT) * 48) : 0;
    term.style.transform =
      `translate(calc(-50% + ${shk.toFixed(2)}px), -50%)`;
    const fp = clamp(fv / HIT_AT, 0, 1);       // 0→1: the approach
    const fx = (r.width + 130) - (r.width + 114) * easeOutQuint(fp); // right edge → claude's seat
    const fy = -70 * Math.sin(Math.PI * fp);   // the arc
    const settle = fv > HIT_AT
      ? Math.sin((fv - HIT_AT) * 11) * 5 * Math.exp(-(fv - HIT_AT) * 5) : 0;
    fly.style.display = '';
    fly.style.left = '0px';
    fly.style.bottom = '14px';
    fly.style.transform = `translateX(${fx.toFixed(1)}px) translateY(${(fy + settle).toFixed(1)}px) rotate(${(-8 * Math.sin(Math.PI * fp)).toFixed(1)}deg)`;
    if (flyBot) {
      Object.assign(flyBot.expr, fv >= HIT_AT
        ? { eyeL: 'happy', eyeR: 'happy', mouth: 'grin' }
        : { eyeL: 'open', eyeR: 'open', mouth: 'grin' });
      if (fv >= HIT_AT && !flyCheer) {
        flyCheer = true;
        flyBot.excitedUntil = performance.now() + 800;
      }
      if (retryPhase) {
        // seated in claude's old spot: typing paws while thinking, grin the
        // whole way, a bounce when the ✓ lands (was the retry scene's bot)
        flyBot.typing = s4 >= THINK1_AT && s4 < OK_AT;
        if (s4 >= OK_AT && flyBot.excitedUntil < performance.now() - 1500) {
          flyBot.excitedUntil = performance.now() + 800;
        }
        flyBot.lookAt = { x: 0.05 + 0.1 * Math.sin(s4 * 1.2), y: -0.05 };
      } else {
        flyBot.lookAt = fv >= HIT_AT ? { x: 0, y: -0.05 } : { x: -0.8, y: 0 };
      }
    }
  } else {
    fly.style.display = 'none';
  }

  // the handoff (user ask): a whip pan AND a push transition — both frames
  // ride ONE clock, the benchmarks sheet sweeping across while the pane
  // slides out beneath it, so there is no dark gap between them (user ask:
  // it used to go into darkness then spawn the benchmarks). Blur is
  // proportional to swipe velocity — the film-editing whip pan, where the
  // camera pans so fast the picture smears (Wikipedia, retrieved 2026-09-02)
  const exitS = t - (T_BENCH - 0.1);
  if (exitS > 0) {
    const p = clamp(exitS / SWIPE, 0, 1);
    const pe = easeInOutSine(p);          // velocity peaks mid-swipe
    const clear = r.width / 2 + window.innerWidth / 2 + 30; // fully off-frame
    term.style.transform =
      `translate(calc(-50% + ${(-clear * pe).toFixed(1)}px), -50%) scaleX(${(1 + 0.045 * Math.sin(Math.PI * p)).toFixed(3)})`;
    term.style.filter = `blur(${(9 * Math.sin(Math.PI * p)).toFixed(2)}px)`;
    term.style.opacity = (1 - clamp((p - 0.72) / 0.28, 0, 1)).toFixed(3);
  } else {
    term.style.filter = '';
    if (!inFly) term.style.transform = ''; // clear a previous loop's exit
  }
}

/* ---- scene 4 (played inside the terminal frame): the /superbot retry ---- */

const RPROMPT_TEXT = '/superbot Make me a scraper for twitter';

/* ---- scene 5: the cost gauntlet (the bar-comparison frame) ---- */

let benchL = null;
let benchR = null;
let benchCheerKey = -1;

function initBench() {
  try {
    benchL = new Mascot(document.getElementById('benchBotL'), { cols: 30, rows: 15, variant: 'puff', anim: 'breathe', autoMorph: false });
    benchR = new Mascot(document.getElementById('benchBotR'), { cols: 30, rows: 15, anim: 'perky', autoMorph: false });
  } catch (err) {
    console.warn('[hi] bench mascots unavailable:', err);
  }
}

// claude's thoughts during the comparison (user ask): a rapid-fire panic
// litany — unsafe, thinking, gibberish, durr — cycled deterministically
// from t (user ask: "and others" — a few more in the same voice)
const FUZZ = ['UNSAFE', 'THINKING', '!@##!', 'durr', 'u sure?', 'moRALITY', 'NOPE', '??!?', 'hmm…'];

function renderBench(t) {
  const bench = document.getElementById('bench');
  const titleEl = document.getElementById('benchTitle');
  const rowL = document.getElementById('benchClaude');
  const rowR = document.getElementById('benchSuper');
  const fillL = document.getElementById('fillClaude');
  const fillR = document.getElementById('fillSuper');
  const priceL = document.getElementById('priceClaude');
  const priceR = document.getElementById('priceSuper');
  const fuzzEl = document.getElementById('benchFuzz');

  if (t < T_BENCH - 0.1 || t >= T_PICK) {
    bench.style.display = 'none';
    benchCheerKey = -1;
    return;
  }
  bench.style.display = '';
  const s = t - T_BENCH;
  // the push (user ask): the sheet sweeps in from the right edge on the
  // SAME clock as the pane's exit — one camera move, no dark gap — blur
  // peaking mid-swipe with the shared velocity curve
  bench.style.opacity = '1';
  const bp = clamp((t - (T_BENCH - 0.1)) / SWIPE, 0, 1);
  if (bp < 1) {
    const pe = easeInOutSine(bp);
    bench.style.transform = `translateX(${((window.innerWidth + 20) * (1 - pe)).toFixed(1)}px)`;
    bench.style.filter = `blur(${(10 * Math.sin(Math.PI * bp)).toFixed(2)}px)`;
  } else {
    bench.style.transform = 'none';
    bench.style.filter = 'none';
  }

  let ti = 0;
  for (let i = TOPICS.length - 1; i >= 0; i--) {
    if (s >= topicStart(i)) { ti = i; break; }
  }
  const T = TOPICS[ti];
  const prev = TOPICS[Math.max(0, ti - 1)];
  const u = s - topicStart(ti);

  if (ti === 0) {
    titleEl.textContent = T.title;
    titleEl.style.opacity = '1';
    titleEl.style.transform = 'none';
  } else if (u < DRAIN_END) {
    const dp = easeOutQuint(u / DRAIN_END);
    titleEl.textContent = prev.title;
    titleEl.style.opacity = (1 - dp).toFixed(3);
    titleEl.style.transform = `translateY(${(-14 * dp).toFixed(1)}px)`;
  } else {
    titleEl.textContent = T.title;
    titleEl.style.opacity = easeOutQuint(clamp((u - DRAIN_END) / 0.3, 0, 1)).toFixed(3);
    titleEl.style.transform = `translateY(${(10 * (1 - easeOutQuint(clamp((u - DRAIN_END) / 0.3, 0, 1)))).toFixed(1)}px)`;
  }

  const pts = TOPICS.filter((tp, i) => tp.point && s >= topicStart(i) + 2.35).length;
  const rise = easeOutQuint(clamp((s - 0.35) / 0.7, 0, 1));
  const crying = pts >= 3;
  const droop = 4 * pts + (crying ? Math.sin(s * 18) * 1.5 : 0);
  rowL.style.opacity = rise.toFixed(3);
  rowL.style.transform = `translateY(${(22 * (1 - rise) + droop).toFixed(2)}px)`;
  rowR.style.opacity = rise.toFixed(3);
  rowR.style.transform = `translateY(${(22 * (1 - rise)).toFixed(2)}px)`;

  const drainP = ti === 0 ? 1 : easeOutQuint(clamp(u / DRAIN_END, 0, 1));
  const cFill = ti === 0
    ? easeOutQuint(clamp((u - C_FILL) / C_DUR, 0, 1))
    : u < DRAIN_END ? 1 - drainP : easeOutQuint(clamp((u - C_FILL) / C_DUR, 0, 1));
  const sFill = ti === 0
    ? easeOutQuint(clamp((u - S_FILL) / S_DUR, 0, 1))
    : u < DRAIN_END ? 1 - drainP : easeOutQuint(clamp((u - S_FILL) / S_DUR, 0, 1));
  const setBar = (fill, pct, p) => {
    fill.style.width = (pct * p).toFixed(2) + '%';
    fill.style.filter = p > 0 && p < 1 ? `blur(${(5 * Math.sin(Math.PI * p)).toFixed(2)}px)` : 'none';
  };
  // the bars cap at 80% of the track (user ask): the price labels always
  // fit inside the frame — claude's bar never reaches the right edge
  setBar(fillL, T.claudePct * 0.8, cFill);
  setBar(fillR, T.superPct * 0.8, sFill);

  const popPrice = (node, pct, at) => {
    const p = clamp((u - at) / 0.35, 0, 1);
    if (p <= 0) { node.style.opacity = '0'; return; }
    node.style.left = `calc(${pct.toFixed(1)}% + 12px)`;
    node.style.opacity = Math.min(1, p * 2).toFixed(3);
    node.style.transform = `translateY(-50%) scale(${easeOutBack(p).toFixed(3)})`;
  };
  priceL.textContent = T.claude;
  priceR.textContent = T.super;
  popPrice(priceL, T.claudePct * 0.8, ti === 0 ? C_FILL + C_DUR - 0.1 : C_FILL + C_DUR);
  popPrice(priceR, T.superPct * 0.8, ti === 0 ? S_FILL + S_DUR : S_FILL + S_DUR);

  // claude's panic litany (user ask): the bubble sits to his LEFT — its
  // right edge beside his art, tail pointing back at him — cycling the
  // litany deterministically from t
  const fp = s - 0.8;
  if (fp > 0) {
    fuzzEl.textContent = FUZZ[Math.floor(s / 0.5) % FUZZ.length];
    anchorBubble(document.getElementById('benchBotL'), bench, fuzzEl);
    fuzzEl.style.opacity = rise.toFixed(3);   // steady while visible — no breathing (user ask)
  } else {
    fuzzEl.style.opacity = '0';
  }

  // claude: happy while his own bar sweeps (user ask: initially happy), then
  // down the ladder — mild frown, sad eyes, welling, tears. Asserted EVERY
  // frame: a blink's revert would land on the canonical smile and stick.
  if (benchL) {
    const inFirstSweep = ti === 0 && u < SAD_MILD;
    Object.assign(benchL.expr, inFirstSweep
      ? { eyeL: 'happy', eyeR: 'happy', mouth: 'smile', armDrop: 0 }
      : pts === 0
        ? { eyeL: 'open', eyeR: 'open', mouth: 'sad', armDrop: 0.2 }
        : pts === 1
          ? { eyeL: 'sad', eyeR: 'sad', mouth: 'sad', armDrop: 0.35 }
          : pts === 2
            ? { eyeL: 'sad', eyeR: 'sad', mouth: 'sad', armDrop: 0.55 }
            : { eyeL: 'sad', eyeR: 'sad', mouth: 'sad', armDrop: 0.75 });
    benchL.expr.tears = crying ? 1 : pts >= 2 ? 0.45 : 0;
    benchL.expr.tearsPhase = (s * 1.5) % 1;
    benchL.lookAt = crying
      ? { x: -0.1, y: 0.9 }
      : pts >= 2 ? { x: 0.15, y: 0.8 } : { x: 0.15, y: 0.4 };
  }
  // superbot: happy and dominating the whole gauntlet, bouncing on each win
  if (benchR) {
    Object.assign(benchR.expr, { eyeL: 'happy', eyeR: 'happy', mouth: 'grin' });
    if (u >= S_FILL + S_DUR && benchCheerKey !== ti) {
      benchCheerKey = ti;
      benchR.typing = false;
      benchR.excitedUntil = performance.now() + 900;
      benchR.lookAt = { x: 0, y: 0 };
    } else if (u < S_FILL) {
      benchR.lookAt = { x: 0.05 + 0.12 * Math.sin(s * 0.8 + 2), y: -0.05 + 0.06 * Math.cos(s * 1.0) };
    }
  }
}

/* ---- scene 6: TAKE YOUR PICK! ---- */

let pickL = null;
let pickR = null;

function initPick() {
  try {
    pickL = new Mascot(document.getElementById('pickBotL'), { cols: 28, rows: 14, variant: 'puff', anim: 'breathe', autoMorph: false });
    pickR = new Mascot(document.getElementById('pickBotR'), { cols: 30, rows: 15, anim: 'perky', autoMorph: false });
  } catch (err) {
    console.warn('[hi] pick mascots unavailable:', err);
  }
}

function renderPick(t) {
  const pick = document.getElementById('pick');
  const title = document.querySelector('.pick-title');
  const botL = document.getElementById('pickBotL');
  const botR = document.getElementById('pickBotR');
  if (t < T_PICK || t >= T_END) {
    pick.style.display = 'none';
    return;
  }
  pick.style.display = '';
  const s = t - T_PICK;
  pick.style.opacity = easeInOutSine(clamp(s / 0.6, 0, 1)).toFixed(3);

  // the title slams in with a decaying shake
  const slam = easeOutQuint(clamp(s / 0.45, 0, 1));
  const sh = Math.max(0, s - 0.45);
  const shake = sh > 0 ? 4 * Math.exp(-sh * 7) * Math.sin(sh * 46) : 0;
  title.style.opacity = slam.toFixed(3);
  title.style.transform = `scale(${(2.2 - 1.2 * slam).toFixed(3)}) translateX(${shake.toFixed(2)}px)`;
  title.style.filter = slam < 1 ? `blur(${(5 * (1 - slam)).toFixed(2)}px)` : 'none';

  // the duo: claude sobbing (tears on), superbot grinning and bouncing
  const bob = 4 * Math.sin(s * 3.2);
  botL.style.transform = `translateY(${(6 + 1.5 * Math.sin(s * 18)).toFixed(2)}px)`;
  botR.style.transform = `translateY(${bob.toFixed(2)}px)`;
  if (pickL) {
    Object.assign(pickL.expr, { eyeL: 'sad', eyeR: 'sad', mouth: 'sad', armDrop: 0.85 });
    pickL.expr.tears = 1;
    pickL.expr.tearsPhase = (s * 1.5) % 1;
    pickL.lookAt = { x: 0.5, y: 0.3 };
  }
  if (pickR) {
    Object.assign(pickR.expr, { eyeL: 'happy', eyeR: 'happy', mouth: 'grin' });
    pickR.lookAt = { x: -0.05 + 0.08 * Math.sin(s * 1.1), y: -0.05 };
  }
}

/* ---- scene 7: the end card ---- */

let endBot = null;
let endLaugh = false;

function initEndcard() {
  try {
    endBot = new Mascot(document.getElementById('endBot'), { cols: 30, rows: 15, anim: 'perky', autoMorph: false });
  } catch (err) {
    console.warn('[hi] end-card mascot unavailable:', err);
  }
}

function renderEndcard(t) {
  const overlay = document.getElementById('endcard');
  const bot = document.getElementById('endBot');
  const word = document.getElementById('endWord');
  if (t < T_END || t >= CYCLE) {
    overlay.style.display = 'none';
    endLaugh = false;
    return;
  }
  overlay.style.display = '';
  const s = t - T_END;
  overlay.style.opacity = easeOutQuint(clamp(s / 0.5, 0, 1)).toFixed(3);

  // the mascot lands centre-screen, then the whole lockup (logo + wordmark,
  // measured as one unit) drifts into a centered rest position
  const stage = overlay.getBoundingClientRect();
  const shift = easeOutQuint(clamp((s - DRIFT_AT) / 1.0, 0, 1));
  const w = bot.offsetWidth, h = bot.offsetHeight;
  const scale = 1.22;
  const wordW = word.offsetWidth;
  const total = w * scale + LOGO_GAP + wordW;
  const left = (stage.width - total) / 2;
  const midY = stage.height / 2;
  const logoX = stage.width / 2 + (left + (w * scale) / 2 - stage.width / 2) * shift;
  bot.style.transform =
    `translate(${(logoX - w / 2).toFixed(1)}px, ${(midY - h / 2).toFixed(1)}px) scale(${scale.toFixed(3)})`;
  word.style.opacity = shift.toFixed(3);
  word.style.filter = shift < 1 ? `blur(${(6 * (1 - shift)).toFixed(1)}px)` : 'none';
  word.style.transform =
    `translate(${(left + w * scale + LOGO_GAP + 20 * (1 - shift)).toFixed(1)}px, -50%)`;

  // neutral, bursting into a 0.9s laugh on a cycle once the lockup is set.
  // Asserted EVERY frame: a blink's revert would land on the canonical
  // smile and stick.
  if (endBot) {
    const laughing = s >= SETTLE && ((s - SETTLE) % LAUGH_PERIOD) < LAUGH_DUR;
    Object.assign(endBot.expr, laughing
      ? { eyeL: 'happy', eyeR: 'happy', mouth: 'grin' }
      : { eyeL: 'open', eyeR: 'open', mouth: 'smile' });
    if (laughing && !endLaugh) {
      endBot.excitedUntil = performance.now() + LAUGH_DUR * 1000;
    }
    endLaugh = laughing;
    endBot.lookAt = { x: 0.05 + 0.1 * Math.sin(s * 0.9), y: -0.05 + 0.06 * Math.sin(s * 1.1) };
  }
}

/* ---- driving ---- */

function render(t) {
  renderIntro(t);
  renderTerm(t);
  renderBench(t);
  renderPick(t);
  renderEndcard(t);
  renderChrome(t);
}

const urlT = new URLSearchParams(location.search).get('t');

initIntro();
initTerm();
initBench();
initPick();
initEndcard();

// the recorder (recorder.js) reads the loop's length and speed from here
window.__V7 = { CYCLE, SPEED };

if (urlT !== null) {
  // freeze-frame mode (?t=SECONDS): one deterministic frame, no loop, arrows
  // step ±0.25s. Every plain reload plays the loop.
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
    let t = ((now - t0) / 1000) * SPEED;
    if (t >= CYCLE) { t0 = now; t = 0; }
    render(t);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  // the recorder (recorder.js) rewinds the loop to the first frame once the
  // tab stream is live, so the take begins at the very start of the show
  window.__V7.restart = () => { t0 = performance.now(); };
}
