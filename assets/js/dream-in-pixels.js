/* I dream in pixels — the artworks on dream-in-pixels.html.
   Each <section class="artwork" data-art="…"> holds a .artwork__stage with a <canvas>, and an
   empty .artwork__controls that the piece fills with its own controls (always outside the art).
   A piece only animates while its section is on screen. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));

  /* Shared: size a canvas to its square stage; report visibility; run a frame loop */
  function setup(section, onResize) {
    const stage = section.querySelector('.artwork__stage');
    const canvas = stage.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const state = { stage, canvas, ctx, side: 0, dpr: 1, visible: false };
    const fit = () => {
      state.dpr = Math.min(devicePixelRatio || 1, 2);
      state.side = stage.clientWidth;
      canvas.width = canvas.height = Math.round(state.side * state.dpr);
      onResize?.(state);
    };
    new ResizeObserver(fit).observe(stage);
    new IntersectionObserver(([e]) => { state.visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(stage);
    fit();
    return state;
  }
  const loop = (state, draw) => {
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (state.visible && !document.hidden) draw(now, dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const controls = (section) => section.querySelector('.artwork__controls');
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  // a − value + stepper; returns nothing, calls onChange(value)
  function stepper(box, label, { min, max, value }, onChange) {
    const id = `s${Math.random().toString(36).slice(2, 7)}`;
    const c = el(`<div class="ctl"><span class="ctl__label" id="${id}">${label}</span>
      <span class="stepper" role="group" aria-labelledby="${id}">
        <button type="button" aria-label="Fewer ${label.toLowerCase()}">−</button>
        <output aria-live="polite"></output>
        <button type="button" aria-label="More ${label.toLowerCase()}">+</button></span></div>`);
    const [minus, plus] = c.querySelectorAll('button'), out = c.querySelector('output');
    const show = () => { out.textContent = value; minus.disabled = value <= min; plus.disabled = value >= max; onChange(value); };
    minus.addEventListener('click', () => { value = Math.max(min, value - 1); show(); });
    plus.addEventListener('click', () => { value = Math.min(max, value + 1); show(); });
    box.append(c);
    show();
  }
  /* ---------------------------------------------------------------------------------------
     Pixel Moves: four pixel flowers, 2 × 2. Each turns slowly (its stair-stepped edges
     re-form as it goes) while its colours "drip" outward from the centre. */
  function pixelMoves(section) {
    const TAU = Math.PI * 2, GRID = 26, BG = '#07040f';
    const PALETTE = ['#2433d8', '#3f7cff', '#86baff', '#dfe6ff', '#f4eedc', '#c6c0ff',
                     '#7b5cf0', '#8b2be2', '#ff2fd6', '#b64cff', '#5d63e6', '#1d6bff'];
    // per flower: rotation speed (rad/s), start angle, colour phase, drip speed
    const FLOWERS = [
      { spin:  0.10, angle: 0.15, phase: 0,   rate: 0.75 },
      { spin: -0.08, angle: 0.40, phase: 5,   rate: 0.70 },
      { spin: -0.09, angle: 0.05, phase: 3.5, rate: 0.80 },
      { spin:  0.11, angle: 0.30, phase: 8,   rate: 0.72 },
    ];
    let petals = 8;
    const pick = (i) => PALETTE[((Math.floor(i) % PALETTE.length) + PALETTE.length) % PALETTE.length];
    // 0 none, 1 outer petal, 2 inner star, 3 centre (u, v in -1..1)
    const layerAt = (u, v, rot) => {
      if (Math.abs(u) + Math.abs(v) < 0.2) return 3;
      const r = Math.hypot(u, v);
      if (r > 1) return 0;
      const sector = TAU / petals;
      let d = (((Math.atan2(v, u) - rot) % sector) + sector) % sector;
      if (d > sector / 2) d = sector - d;
      const along = r * Math.cos(d), lateral = r * Math.sin(d);
      if (r < 0.25 || lateral < 0.2 * (1 - along / 0.56)) return 2;
      if (along < 1 && lateral < 0.17 * Math.min(1, (1 - along) * 2.4)) return 1;
      return 0;
    };
    const s = setup(section);
    stepper(controls(section), 'Petals', { min: 4, max: 10, value: petals }, (n) => { petals = n; });
    let t = 0;
    loop(s, (now, dt) => {
      t += dt * (reduce ? 0.3 : 1);
      const { ctx } = s, W = s.canvas.width;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, W);
      const cell = Math.max(1, Math.floor(W / 2.08 / GRID));
      const size = GRID * cell, gap = Math.round(cell * 0.6);
      const x0 = Math.round((W - (size * 2 + gap)) / 2);
      FLOWERS.forEach((f, i) => {
        const ox = x0 + (i % 2) * (size + gap), oy = x0 + Math.floor(i / 2) * (size + gap);
        const rot = f.angle + f.spin * t;
        for (let gy = 0; gy < GRID; gy++) {
          for (let gx = 0; gx < GRID; gx++) {
            const u = ((gx + 0.5) / GRID) * 2 - 1, v = ((gy + 0.5) / GRID) * 2 - 1;
            const layer = layerAt(u, v, rot);
            if (!layer) continue;
            ctx.fillStyle = layer === 3 ? BG
              : pick(f.phase + t * f.rate - Math.hypot(u, v) * 0.45 + (layer === 2 ? 2 : 0));
            ctx.fillRect(ox + gx * cell, oy + gy * cell, cell, cell);
          }
        }
      });
    });
  }

  /* ---------------------------------------------------------------------------------------
     Ripple Field: an 85 × 85 grid. Every ripple is a cross through the centre, of random
     width, travelling outward as a chevron. Squares swell to full size as the front passes.
     turning: false = Ripple Field I, true = Ripple Field II (each cross also turns clockwise). */
  function rippleField(section, turning) {
    const N = 85, WAVE = 0.3, SPEED = 0.5;
    const PERI = '#7f90ff', BLUE = '#1d18ee', VIOLET = '#8e1fd2', RED = '#e8283c';
    // [leading colour, trailing colour]
    const PAIRS = [[RED, BLUE], [RED, PERI], [VIOLET, PERI], [RED, VIOLET], [BLUE, PERI], [VIOLET, BLUE]].map((p) => p.map(hex));
    const START = [hex(PERI), hex(PERI)];
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    let cells = [], grain, ripples = [], clicks = 0;

    const makeGrain = (ctx) => {
      const g = document.createElement('canvas');
      g.width = g.height = 160;
      const gx = g.getContext('2d'), img = gx.createImageData(160, 160);
      for (let n = 0; n < img.data.length; n += 4) {
        const v = Math.random() * 255;
        img.data[n] = img.data[n + 1] = img.data[n + 2] = v; img.data[n + 3] = 22;
      }
      gx.putImageData(img, 0, 0);
      return ctx.createPattern(g, 'repeat');
    };
    const s = setup(section, (st) => {
      grain = makeGrain(st.ctx);
      const p = st.side / N;
      cells = [];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const odd = (i + j) & 1;
        cells.push({ x: (i + 0.5) * p, y: (j + 0.5) * p, i, j, odd, rest: START[odd], restT: -1 });
      }
    });
    s.canvas.dataset.tap = '';

    function spawn(pair) {
      const mid = Math.floor(N / 2);
      let w, sp;
      if (turning) { w = 1 + Math.floor(Math.random() ** 2 * 30); sp = 2.4 - 1.8 * (w - 1) / 29; }   // narrow runs fastest
      else { w = 1 + Math.floor(Math.random() ** 2 * N); sp = 0.6 + 1.8 * (w - 1) / (N - 1); }        // wide runs fastest
      const lo = -Math.floor((w - 1) / 2);
      ripples.push({ lo, hi: lo + w - 1, ci: mid, cj: mid, sp, om: 0.5 * sp,
        t0: performance.now() / 1000, pair: pair || PAIRS[clicks++ % PAIRS.length] });
    }
    s.canvas.addEventListener('pointerdown', () => spawn());
    (function auto() {
      if (s.visible && !document.hidden) spawn(PAIRS[Math.floor(Math.random() * PAIRS.length)]);
      setTimeout(auto, turning ? 375 + Math.random() * 875 : 120 + Math.random() * 780);
    })();

    loop(s, (ms) => {
      const now = ms / 1000, { ctx, side, dpr } = s;
      const p = side / N, half = p / 2;
      const wave = WAVE * side, v = SPEED * (reduce ? 0.2 : 1) * wave;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, side, side);
      const fronts = ripples.map((r) => (now - r.t0) * v * r.sp);
      const reach = 2 * side + wave;
      for (let n = ripples.length - 1; n >= 0; n--) if (fronts[n] > reach) { ripples.splice(n, 1); fronts.splice(n, 1); }
      const rot = ripples.map((r) => { const a = turning ? r.om * (now - r.t0) : 0; return [Math.cos(a), Math.sin(a)]; });
      for (const c of cells) {
        let u = 0, col = null;
        for (let n = 0; n < ripples.length; n++) {
          const r = ripples[n];
          const ox = c.i - r.ci, oy = c.j - r.cj;
          const dx = ox * rot[n][0] + oy * rot[n][1], dy = -ox * rot[n][1] + oy * rot[n][0];
          const e = turning ? 0.5 : 0;
          if (!(dx >= r.lo - e && dx <= r.hi + e) && !(dy >= r.lo - e && dy <= r.hi + e)) continue;
          // the middle line leads; every line further out trails by one cell (a chevron front)
          const back = fronts[n] - (Math.abs(dx) + Math.abs(dy)) * p;
          const [a, b] = c.odd ? [r.pair[1], r.pair[0]] : r.pair;
          if (back >= wave) { if (r.t0 > c.restT) { c.rest = b; c.restT = r.t0; } }
          else if (back >= 0) {
            const a1 = 1 - back / wave;
            if (a1 > u) { u = a1; col = mix(mix(c.rest, b, Math.min(1, back / wave * 3)), a, a1 * a1); }
          }
        }
        const h = half * Math.pow(u, 0.7);
        if (h < 0.01) continue;
        const k = col || c.rest;
        ctx.fillStyle = `rgb(${k[0] | 0},${k[1] | 0},${k[2] | 0})`;
        // snap to device pixels so neighbouring full squares meet without a seam
        const x0 = Math.round((c.x - h) * dpr) / dpr, x1 = Math.round((c.x + h) * dpr) / dpr;
        const y0 = Math.round((c.y - h) * dpr) / dpr, y1 = Math.round((c.y + h) * dpr) / dpr;
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
      ctx.fillStyle = grain;
      ctx.fillRect(0, 0, side, side);
    });
  }

  /* ---------------------------------------------------------------------------------------
     Stitch: a 24 × 24 cloth. Tap a cell and a thread wanders from it, one cell at a time,
     moving by its colour's nature, never crossing another stitch. */
  function stitch(section) {
    const N = 24, MIN_GAP = 10, STEP_MS = reduce ? 90 : 45, TRAIL = 50, BRANCH = 0.05, MAX_HEADS = 3;
    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const COLORS = ['#787878', '#141414', '#3c3c3c', '#0000ff'];
    const RGB = COLORS.map(hex);
    const grid = new Int8Array(N * N).fill(-1), owner = new Int32Array(N * N).fill(-1), age = new Int32Array(N * N);
    const at = (x, y) => grid[y * N + x];
    const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
    const open = (x, y) => inside(x, y) && at(x, y) < 0;
    const shut = (x, y) => DIRS.filter(([dx, dy]) => !open(x + dx, y + dy)).length;
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
    // each colour's nature: how much it wants straight on / its own coiling hand / the other hand
    const NATURE = [
      (kind, x, y) => 0.2 + shut(x, y) ** 2,                                   // grey hugs walls, fills gaps
      (kind) => ({ straight: 0.45, hand: 0.5, other: 0.05 })[kind],           // near-black coils into spirals
      (kind) => ({ straight: 0.1, hand: 0.45, other: 0.45 })[kind],           // charcoal squiggles tightly
      (kind) => ({ straight: 0.86, hand: 0.07, other: 0.07 })[kind],          // blue runs long corridors
    ];
    const trails = new Map(), threads = [];
    let nextId = 0, fighting = false;

    const fade = (th) => {
      const cut = th.count - TRAIL;
      for (let i = 0; i < N * N; i++) if (owner[i] === th.id && age[i] < cut) { grid[i] = -1; owner[i] = -1; th.cells--; }
      if (th.cells <= 0) trails.delete(th.id);
    };
    const lay = (x, y, th) => { const i = y * N + x; grid[i] = th.colour; owner[i] = th.id; age[i] = th.count++; th.cells++; fade(th); };
    const spawn = (x, y, dir, colour, hand) => {
      const th = { id: nextId++, x, y, dir, colour, hand, count: 0, cells: 0, stuck: false, next: performance.now() + STEP_MS };
      threads.push(th); trails.set(th.id, th); return th;
    };
    const heads = (colour) => threads.filter((t) => t.colour === colour && !t.stuck).length;
    const hand = () => (Math.random() < 0.5 ? 1 : 3);
    function regrow() {
      for (let colour = 0; colour < 4; colour++) {
        if (heads(colour)) continue;
        const spots = [];
        for (let i = 0; i < N * N; i++) {
          const x = i % N, y = i / N | 0;
          if (!open(x, y)) continue;
          for (let d = 0; d < 4; d++) if (open(x + DIRS[d][0], y + DIRS[d][1])) { spots.push([x, y, d]); break; }
        }
        if (!spots.length) continue;
        const [x, y, d] = spots[Math.random() * spots.length | 0];
        const th = spawn(x + DIRS[d][0], y + DIRS[d][1], d, colour, hand());
        lay(x, y, th); lay(th.x, th.y, th);
      }
    }
    const wipe = () => { threads.length = 0; trails.clear(); grid.fill(-1); owner.fill(-1); };
    function release() {
      wipe(); fighting = true;
      const c = N / 2;
      [[c - 1, c - 1, 3], [c, c - 1, 0], [c, c, 1], [c - 1, c, 2]].forEach(([x, y, dir], colour) => {
        const [dx, dy] = DIRS[dir], th = spawn(x + dx, y + dy, dir, colour, hand());
        lay(x, y, th); lay(x + dx, y + dy, th);
      });
    }
    function startThread(x, y) {
      if (!open(x, y)) return;
      const exits = shuffle([0, 1, 2, 3]).filter((d) => open(x + DIRS[d][0], y + DIRS[d][1]));
      if (!exits.length) return;
      const dir = exits[0], th = spawn(x + DIRS[dir][0], y + DIRS[dir][1], dir, Math.random() * 4 | 0, hand());
      lay(x, y, th); lay(th.x, th.y, th);
    }
    function stepThread(th) {
      if (th.stuck) { th.count++; fade(th); return; }   // boxed in: reel the tail in
      const options = [[th.dir, 'straight'], [(th.dir + th.hand) % 4, 'hand'], [(th.dir + 4 - th.hand) % 4, 'other']]
        .map(([d, kind]) => ({ d, x: th.x + DIRS[d][0], y: th.y + DIRS[d][1], kind }))
        .filter((o) => open(o.x, o.y))
        .map((o) => ({ ...o, w: NATURE[th.colour](o.kind, o.x, o.y) }));
      if (!options.length) { th.stuck = true; return; }
      let r = Math.random() * options.reduce((sum, o) => sum + o.w, 0);
      const pick = options.find((o) => (r -= o.w) <= 0) || options[options.length - 1];
      const fork = options.find((o) => o !== pick);
      if (fork && Math.random() < BRANCH && heads(th.colour) < MAX_HEADS) lay(fork.x, fork.y, spawn(fork.x, fork.y, fork.d, th.colour, th.hand));
      th.dir = pick.d; th.x = pick.x; th.y = pick.y;
      lay(th.x, th.y, th);
    }

    // rows and columns breathe: rest, glide to a new width, rest; only one direction moves at a time
    const pickWidth = () => 0.1 + Math.random() ** 2 * 4;
    const smooth = (t) => t * t * (3 - 2 * t);
    const restFor = () => (Math.random() < 0.25 ? 3 + Math.random() * 6 : 0.3 + Math.random() * 3);
    const strands = () => Array.from({ length: N }, () => { const w = pickWidth(); return { from: w, to: w, start: 0, dur: 0, moving: false, restUntil: Math.random() * 3 }; });
    const cols = strands(), rows = strands();
    let axis = Math.random() < 0.5 ? cols : rows, spellEnds = 3 + Math.random() * 4;
    const turn = (t) => { if (t < spellEnds || axis.some((x) => x.moving)) return; axis = axis === cols ? rows : cols; spellEnds = t + 2 + Math.random() * 5; };
    function width(st, t, mayStart) {
      if (st.moving) {
        const k = (t - st.start) / st.dur;
        if (k < 1) return st.from + (st.to - st.from) * smooth(k);
        st.moving = false; st.from = st.to; st.restUntil = t + restFor(); return st.to;
      }
      if (mayStart && t >= st.restUntil) { st.moving = true; st.start = t; st.dur = reduce ? 4 : 0.5 + Math.random() * 2.5; st.to = pickWidth(); }
      return st.from;
    }
    function edges(list, t, size, dpr) {
      const w = list.map((x) => width(x, t, list === axis && t < spellEnds));
      const sum = w.reduce((a, b) => a + b, 0) || 1;
      const floor = Math.min(MIN_GAP * dpr, size / N * 0.5), spare = size - floor * N;
      const out = [0];
      for (const x of w) out.push(out[out.length - 1] + floor + x / sum * spare);
      return out;
    }

    // sandpaper grain over the stage only
    const texture = document.createElement('div');
    texture.className = 'artwork__texture';
    texture.style.backgroundColor = 'rgba(0, 0, 0, 0.12)';
    texture.style.opacity = 0.5;   // grain fixed at 50%
    const S = 256, tile = document.createElement('canvas');
    tile.width = tile.height = S;
    const tc = tile.getContext('2d'), img = tc.createImageData(S, S);
    for (let i = 0; i < img.data.length; i += 4) {
      const r = Math.random(), light = r > 0.55;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = light ? 255 : 0;
      img.data[i + 3] = light ? (r - 0.55) * 120 : (0.55 - r) * 160;
    }
    tc.putImageData(img, 0, 0);
    texture.style.backgroundImage = `url(${tile.toDataURL()})`;

    const s = setup(section);
    s.stage.append(texture);
    s.canvas.dataset.tap = '';
    let xs = [], ys = [];
    s.canvas.addEventListener('pointerdown', (e) => {
      const box = s.canvas.getBoundingClientRect(), k = s.canvas.width / box.width;
      const px = (e.clientX - box.left) * k, py = (e.clientY - box.top) * k;
      const x = Math.min(N - 1, xs.findIndex((v) => v > px) - 1), y = Math.min(N - 1, ys.findIndex((v) => v > py) - 1);
      if (x >= 0 && y >= 0) startThread(x, y);
    });

    // controls: colour choosers, Reset (all four start again from the centre), Clear
    const box = controls(section);
    const fight = el('<button class="btn btn--secondary btn--sm" type="button">Reset</button>');
    const clear = el('<button class="btn btn--secondary btn--sm" type="button">Clear</button>');
    const chips = el(`<span class="tally" role="group" aria-label="Thread colours">${COLORS.map((c, i) =>
      `<span><input type="color" value="${c}" aria-label="Colour ${i + 1}"></span>`).join('')}</span>`);
    box.append(chips, fight, clear);
    fight.addEventListener('click', release);
    clear.addEventListener('click', () => { fighting = false; wipe(); });
    chips.querySelectorAll('input').forEach((input, i) => input.addEventListener('input', () => { RGB[i] = hex(input.value); }));
    // the rows and columns breathe on their own
    let clock = 0;

    loop(s, (now, dt) => {
      clock += dt;
      for (const th of threads.slice()) while (trails.has(th.id) && now >= th.next) { stepThread(th); th.next += STEP_MS; }
      for (let i = threads.length - 1; i >= 0; i--) if (!trails.has(threads[i].id)) threads.splice(i, 1);
      if (fighting) regrow();
      turn(clock);
      const { ctx } = s, W = s.canvas.width;
      xs = edges(cols, clock, W, s.dpr);
      ys = edges(rows, clock, W, s.dpr);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, W);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (at(c, r) < 0) continue;
        // each trail shades from its newest stitch (full colour) to its 50th back (75% toward black)
        const k = at(c, r), th = trails.get(owner[r * N + c]);
        const t = th ? Math.max(0, 1 - (th.count - 1 - age[r * N + c]) / (TRAIL - 1)) : 1, f = 0.25 + 0.75 * t;
        ctx.fillStyle = `rgb(${RGB[k][0] * f | 0},${RGB[k][1] * f | 0},${RGB[k][2] * f | 0})`;
        ctx.fillRect(xs[c], ys[r], xs[c + 1] - xs[c] + 1, ys[r + 1] - ys[r] + 1);
      }
    });
    // threads step on wall-clock time; skip the backlog after being off screen.
    // Coming into view: all four set off at once (unless threads are already running)
    new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      const t = performance.now();
      threads.forEach((th) => { th.next = t + STEP_MS; });
      if (!threads.some((th) => !th.stuck)) release();
    }, { threshold: 0.35 }).observe(s.stage);
  }

  const ARTWORKS = { 'pixel-moves': pixelMoves, 'ripple-field': (s) => rippleField(s, false), 'ripple-field-ii': (s) => rippleField(s, true), stitch };
  document.querySelectorAll('.artwork[data-art]').forEach((section) => ARTWORKS[section.dataset.art]?.(section));
})();
