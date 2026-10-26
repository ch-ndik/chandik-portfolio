/* Marker art in the dark blocks of project pages (the next-project block and the footer).
   The homepage marker saves each visitor's strokes in this browser (localStorage, screen coordinates).
   Project pages don't show them over the content, only inside the dark blocks. Each block holds a
   screen-sized canvas, behind its content and clipped to it, that is kept lined up with the screen as
   the page scrolls, so the strokes sit exactly where they were drawn. Display only: nothing is drawn here. */
(() => {
  const blocks = [...document.querySelectorAll('.cs-next.is-dark, body > .contact')];
  if (!blocks.length) return;
  let strokes = [];
  try { strokes = JSON.parse(localStorage.getItem('chandik-marker-v9')) || []; } catch { return; }
  if (!strokes.length) return;

  const style = document.createElement('style');
  style.textContent = `
    .has-marker-art { position: relative; overflow: hidden; isolation: isolate; }
    .marker-art { position: absolute; left: 0; top: 0; z-index: -1; pointer-events: none; opacity: .5; will-change: transform; }
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

  // same drawing as the homepage: each stroke on a scratch canvas, multiplied in so overlaps darken
  const art = document.createElement('canvas');
  const draw = () => {
    const w = document.documentElement.clientWidth, h = innerHeight;
    art.width = w; art.height = h;
    const ctx = art.getContext('2d');
    const live = document.createElement('canvas');
    live.width = w; live.height = h;
    const lc = live.getContext('2d');
    lc.lineCap = 'round'; lc.lineJoin = 'round'; lc.lineWidth = 22;
    strokes.forEach((st) => {
      const pts = Array.isArray(st) ? st : st.p;
      lc.clearRect(0, 0, w, h);
      lc.strokeStyle = Array.isArray(st) ? '#BFFF00' : st.c;
      lc.beginPath();
      lc.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) lc.lineTo(pts[i], pts[i + 1]);
      if (pts.length === 2) lc.lineTo(pts[0], pts[1]);
      lc.stroke();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(live, 0, 0);
    });
    canvases.forEach((c) => { c.width = w; c.height = h; c.getContext('2d').drawImage(art, 0, 0); });
    place();
  };
  // keep each canvas over the screen: shift it up by however far its block's top is from the screen's top
  const place = () => blocks.forEach((b, i) => {
    canvases[i].style.transform = `translate(${-b.getBoundingClientRect().left}px, ${-b.getBoundingClientRect().top}px)`;
  });
  draw();
  addEventListener('scroll', place, { passive: true });
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 150); });
})();
