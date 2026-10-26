/* Marker art in the project-page footer.
   The homepage marker saves each visitor's strokes in this browser (localStorage, screen coordinates).
   Project pages don't show them over the content; only the dark footer does. A screen-sized canvas sits
   at the bottom of the footer, behind its content and clipped to it, so when you reach the end of the
   page the strokes appear exactly where they were on screen. Display only: nothing is drawn here. */
(() => {
  const footer = document.querySelector('body > .contact');
  if (!footer) return;
  let strokes = [];
  try { strokes = JSON.parse(localStorage.getItem('chandik-marker-v9')) || []; } catch { return; }
  if (!strokes.length) return;

  const style = document.createElement('style');
  style.textContent = `
    body > .contact { position: relative; overflow: hidden; isolation: isolate; }
    .contact__art { position: absolute; left: 0; bottom: 0; width: 100%; z-index: -1; pointer-events: none; opacity: .5; }
  `;
  document.head.append(style);
  const canvas = document.createElement('canvas');
  canvas.className = 'contact__art';
  canvas.setAttribute('aria-hidden', 'true');
  footer.prepend(canvas);

  // same drawing as the homepage: each stroke on a scratch canvas, multiplied in so overlaps darken
  const draw = () => {
    const w = document.documentElement.clientWidth, h = innerHeight;
    canvas.width = w; canvas.height = h; canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
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
  };
  draw();
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 150); });
})();
