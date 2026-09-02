// the record button (user ask): click → pick "this tab" in the browser's
// share sheet → the loop rewinds to its first frame and plays ONCE while
// the browser's own compositor captures the tab (Screen Capture API — the
// show keeps its native frame rate; zero main-thread cost, so no lag), and
// the take downloads as a 4:3 webm. A second click (or Esc) ends it early.
// Tab capture sees the whole tab, so the page's own chrome (button, hint)
// is hidden for the duration of the take.
(() => {
  'use strict';
  const W = 1440, H = 1080;            // 4:3
  const FPS = 30;

  const btn = document.getElementById('recordBtn');
  const label = document.getElementById('recordLabel');
  const hud = document.getElementById('recHud');
  const hudTime = document.getElementById('recTime');
  const hint = document.getElementById('hint');
  const chromeBits = [btn, hud, hint].filter(Boolean);
  if (document.body.classList.contains('freeze')) btn.style.display = 'none';

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function pickMime() {
    for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    }
    return '';
  }

  let active = false; // a take is in flight

  async function record() {
    if (active || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia
        || !window.MediaRecorder || !window.__V7) return;
    active = true;
    let stream;
    try {
      // preferCurrentTab (Chrome 94+): the share sheet opens on this tab
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: FPS, cursor: 'never' },
        preferCurrentTab: true,
        audio: false,
      });
    } catch (err) {
      console.warn('recorder: capture cancelled or failed:', err);
      active = false;
      return;
    }

    // page chrome would be visible in a tab capture — hide it for the take
    const prev = chromeBits.map(el => el.style.display);
    chromeBits.forEach(el => { el.style.display = 'none'; });
    hud.style.display = 'flex';

    // the stream is the tab: play it into a video, composite contain-fit
    // into the 4:3 canvas (the dark bars vanish into the page background),
    // and rewind the show so the take starts at the first frame
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();

    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    const rec = new MediaRecorder(out.captureStream(FPS), pickMime()
      ? { mimeType: pickMime(), videoBitsPerSecond: 12_000_000 }
      : { videoBitsPerSecond: 12_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise((res) => { rec.onstop = res; });

    const meta = window.__V7;
    const wall = meta.CYCLE / meta.SPEED + 0.25;
    const started = performance.now();
    if (meta.restart) meta.restart();   // the show begins at frame one

    rec.start(250);
    const esc = (ev) => { if (ev.key === 'Escape') finish(); };
    window.addEventListener('keydown', esc);

    (function composite() {
      const t = (performance.now() - started) / 1000;
      const k = Math.min(W / video.videoWidth, H / video.videoHeight) || 1;
      const dw = video.videoWidth * k, dh = video.videoHeight * k;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, W, H);
      if (dw) ctx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
      hudTime.textContent = fmt(Math.min(t, wall));
      if (active && t < wall) requestAnimationFrame(composite);
      else finish();
    })();

    async function finish() {
      active = false;
      window.removeEventListener('keydown', esc);
      if (rec.state !== 'inactive') rec.stop();
      await done;
      stream.getTracks().forEach(tr => tr.stop());
      chromeBits.forEach((el, i) => { el.style.display = prev[i]; });
      const blob = new Blob(chunks, { type: chunks[0] ? chunks[0].type || 'video/webm' : 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'superbot-hi-i-am-claude-4x3.webm';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }

  btn.addEventListener('click', () => { if (!active) record(); });
})();
