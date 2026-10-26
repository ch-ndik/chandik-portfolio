/* Marker art in the dark blocks of project pages (the next-project block and the footer).
   Same canvas as the homepage: strokes are kept in this browser (localStorage, screen coordinates),
   so what you drew on the homepage shows here, and what you draw here shows there. The light content
   above stays clean; the marker only appears, and only draws, inside the dark blocks. Each block holds
   a screen-sized canvas, fixed to the screen and clipped to the block, so strokes stay put on screen like on the homepage. Mouse only; phones just see the art. */
(() => {
  const blocks = [...document.querySelectorAll('.cs-next.is-dark, body > .contact')];
  if (!blocks.length) return;
  const KEY = 'chandik-marker-v9', WIDTH = 22;
  const COLOURS = ['#BFFF00', '#7FD4FF', '#FFB38A', '#FFE500', '#FFB6D9'];
  let strokes = [], colour = COLOURS[0];
  try {
    strokes = JSON.parse(localStorage.getItem(KEY)) || [];
    const n = +localStorage.getItem('chandik-marker-visits') || 0;   // the homepage moves this on; here we keep its current colour
    colour = COLOURS[Math.max(0, n - 1) % COLOURS.length];
  } catch { /* no storage: draw in lime, nothing kept */ }

  const style = document.createElement('style');
  style.textContent = `
    .has-marker-art { position: relative; isolation: isolate; clip-path: inset(0); }   /* clip-path also clips a fixed child */
    .marker-art { position: fixed; left: 0; top: 0; z-index: -1; pointer-events: none; opacity: .15; }
  `;
  document.head.append(style);
  const canvases = blocks.map((b) => {
    b.classList.add('has-marker-art');
    const c = document.createElement('canvas');
    c.className = 'marker-art';
    c.setAttribute('aria-hidden', 'true');
    b.prepend(c);
    return c;
  });

  // full redraw: each stroke on a scratch canvas, newer strokes on top (as on the homepage)
  const art = document.createElement('canvas');
  const pen = (ctx, c) => { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = WIDTH; ctx.strokeStyle = c; };
  const draw = () => {
    const w = document.documentElement.clientWidth, h = innerHeight;
    art.width = w; art.height = h;
    const ctx = art.getContext('2d');
    const live = document.createElement('canvas');
    live.width = w; live.height = h;
    const lc = live.getContext('2d');
    strokes.forEach((st) => {
      const pts = Array.isArray(st) ? st : st.p;
      lc.clearRect(0, 0, w, h);
      pen(lc, Array.isArray(st) ? COLOURS[0] : st.c);
      lc.beginPath();
      lc.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) lc.lineTo(pts[i], pts[i + 1]);
      if (pts.length === 2) lc.lineTo(pts[0], pts[1]);
      lc.stroke();
      ctx.drawImage(live, 0, 0);
    });
    canvases.forEach((c) => { c.width = w; c.height = h; c.getContext('2d').drawImage(art, 0, 0); });
  };
  draw();
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 150); });

  // drawing, inside the dark blocks only: segments go straight onto the canvases while the mouse moves;
  // when it pauses or leaves, the stroke is saved and everything is redrawn from the saved list
  let current = null, last = null, idle;
  const inDark = (x, y) => blocks.some((b) => { const r = b.getBoundingClientRect(); return y >= r.top && y <= r.bottom && x >= r.left && x <= r.right; });
  const commit = () => {
    last = null;
    if (!current) return;
    strokes.push(current); current = null;
    try {
      let json = JSON.stringify(strokes);
      while (json.length > 2e6 && strokes.length > 1) { strokes.splice(0, Math.ceil(strokes.length / 10)); json = JSON.stringify(strokes); }
      localStorage.setItem(KEY, json);
    } catch { /* storage full or blocked: marks just aren't kept */ }
    draw();
  };
  const segment = (a, b) => canvases.forEach((c) => {
    const ctx = c.getContext('2d');
    pen(ctx, colour);
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    for (const ev of (e.getCoalescedEvents?.() || [e])) {
      const p = { x: ev.clientX, y: ev.clientY };
      if (!inDark(p.x, p.y)) { commit(); continue; }
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 600) segment(last, p);
      else { commit(); segment(p, p); }
      if (!current) current = { c: colour, p: [Math.round(p.x), Math.round(p.y)] };
      else {
        const q = current.p, n = q.length;
        if (Math.hypot(p.x - q[n - 2], p.y - q[n - 1]) >= 3) q.push(Math.round(p.x), Math.round(p.y));
      }
      last = p;
      clearTimeout(idle);
      idle = setTimeout(commit, 250);
    }
  }, { passive: true });
  addEventListener('scroll', commit, { passive: true });   // the screen is the canvas: scrolling lifts the pen
  document.documentElement.addEventListener('pointerleave', commit);
})();
