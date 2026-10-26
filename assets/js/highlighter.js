/* Highlighter marker (shared): the mouse, or a finger on phones, leaves a marker trail on the page.
   Switch it on with <script src="…/highlighter.js" defer> and, on <body>,
   data-highlighter="#RRGGBB" (colour) and optionally data-highlighter-opacity="0.5".
   Same as the v8 homepage's marker: drawn under all content (thumbnails cover it), multiplied onto
   the page (vanishes on black), overlapping strokes darken. */
/* v8 highlighter: the mouse leaves a #BFFF00 trail wherever it moves (no clicking), including
   while scrolling with the mouse held still. The trail is
   fixed to the page, so it scrolls with the content. Drawn in 2048px-tall canvas tiles, made only
   where a stroke lands, so a long page doesn't need one giant canvas. Mouse and touch. */
(() => {

  const cfg = document.body.dataset;
  const TILE = 2048, WIDTH = 22, COLOUR = cfg.highlighter || '#BFFF00';
  // layer styles live here so any page can switch the marker on with just the script + data-highlighter
  const css = document.createElement('style');
  css.textContent = `html { background: #F3F2EC; }
    .hl-layer { position: absolute; left: 0; top: 0; width: 100%; z-index: -1; pointer-events: none; mix-blend-mode: multiply; opacity: ${cfg.highlighterOpacity || .5}; }
    .hl-layer canvas { position: absolute; left: 0; display: block; }
    .hl-layer canvas.is-live { mix-blend-mode: multiply; }`;
  document.head.append(css);
  const layer = document.createElement('div');
  layer.className = 'hl-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.prepend(layer);
  // each tile = a "done" canvas (finished strokes, multiplied into each other so overlaps darken)
  // and a "live" canvas on top (the stroke being drawn, itself multiplied over the done strokes)
  const tiles = new Map();
  const make = (i, live) => {
    const c = document.createElement('canvas');
    c.width = document.documentElement.clientWidth;
    c.height = TILE;
    c.style.top = `${i * TILE}px`;
    if (live) c.className = 'is-live';
    layer.append(c);
    const ctx = c.getContext('2d');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = WIDTH; ctx.strokeStyle = COLOUR;
    return ctx;
  };
  const tile = (i) => {
    if (!tiles.has(i)) tiles.set(i, { done: make(i, false), live: make(i, true), dirty: false });
    return tiles.get(i);
  };
  const segment = (a, b) => {
    const top = Math.floor((Math.min(a.y, b.y) - WIDTH) / TILE), bottom = Math.floor((Math.max(a.y, b.y) + WIDTH) / TILE);
    for (let i = Math.max(0, top); i <= bottom; i++) {
      const t = tile(i), off = i * TILE;
      t.live.beginPath(); t.live.moveTo(a.x, a.y - off); t.live.lineTo(b.x, b.y - off); t.live.stroke();
      t.dirty = true;
    }
    drawn += Math.hypot(b.x - a.x, b.y - a.y);
    clearTimeout(idle);
    idle = setTimeout(commit, 250);
    if (drawn > 1500) commit();   // very long strokes are merged in pieces, so they can cross themselves too
  };
  // finish the stroke: multiply it into the done canvas (darkening where it overlaps), clear the live one
  let drawn = 0, idle;
  const commit = () => {
    drawn = 0;
    tiles.forEach((t) => {
      if (!t.dirty) return;
      t.done.globalCompositeOperation = 'multiply';
      t.done.drawImage(t.live.canvas, 0, 0);
      t.done.globalCompositeOperation = 'source-over';
      t.live.clearRect(0, 0, t.live.canvas.width, t.live.canvas.height);
      t.dirty = false;
    });
  };
  let last = null, client = null;   // last point on the page, and where the mouse is on screen
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    for (const ev of (e.getCoalescedEvents?.() || [e])) {
      client = { x: ev.clientX, y: ev.clientY };
      const p = { x: ev.clientX + scrollX, y: ev.clientY + scrollY };
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 600) segment(last, p);
      else { commit(); segment(p, p); }   // a jump: finish the old stroke, dot to start a new one
      last = p;
    }
  }, { passive: true });
  // scrolling moves the page under a still mouse: the pen stays down, so it streaks along the page
  addEventListener('scroll', () => {
    if (!client) return;
    const p = { x: client.x + scrollX, y: client.y + scrollY };
    if (last) segment(last, p);
    last = p;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { last = null; client = null; commit(); });

  // phones: the finger is the pen. Wherever it touches and slides (including while it scrolls the
  // page), the trail follows it; lifting the finger lifts the pen (momentum scrolling doesn't draw).
  let touchLast = null;
  const touchPoint = (e) => { const t = e.touches[0]; return t && { x: t.pageX, y: t.pageY }; };
  addEventListener('touchstart', (e) => { touchLast = touchPoint(e); if (touchLast) segment(touchLast, touchLast); }, { passive: true });
  addEventListener('touchmove', (e) => {
    const p = touchPoint(e);
    if (!p) return;
    if (touchLast) segment(touchLast, p);
    touchLast = p;
  }, { passive: true });
  addEventListener('touchend', () => { touchLast = null; commit(); }, { passive: true });
  addEventListener('touchcancel', () => { touchLast = null; }, { passive: true });
})();
