/* chandik. — shared site script
   1. Includes       <div data-include="nav"></div> → partials/nav.js
   2. Hero preview   .project-row[data-preview="images/…"]
   3. Compare slider .compare
   4. Scroll sequence .scroll-seq
   5. Scroll video   .scroll-video
*/
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Includes -----------------------------------------------------------
     Partials are .js files (not .html) so pages also work when opened
     straight from disk. The site root is worked out from this script's URL. */
  const root = new URL('../../', document.currentScript.src).href;
  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });

  document.querySelectorAll('[data-include]').forEach(async (slot) => {
    const name = slot.dataset.include;
    try {
      if (!window.SITE_PARTIALS?.[name]) await loadScript(`${root}partials/${name}.js`);
      const tpl = document.createElement('template');
      tpl.innerHTML = window.SITE_PARTIALS[name].replaceAll('{{root}}', root).trim();
      const current = document.body.dataset.page;
      tpl.content.querySelectorAll('[data-nav]').forEach((a) => {
        if (a.dataset.nav === current) a.setAttribute('aria-current', 'page');
      });
      slot.replaceWith(tpl.content);
    } catch (err) {
      console.warn(`Could not load partial "${name}"`, err);
    }
  });

  /* 1b. Scrollbar width as --sbw, so full-bleed pieces (.figure--bleed) stop at the scrollbar */
  if (document.querySelector('.figure--bleed')) {
    const sbw = () => document.documentElement.style.setProperty('--sbw', `${innerWidth - document.documentElement.clientWidth}px`);
    sbw();
    addEventListener('resize', sbw);
  }

  /* 1c. Custom cursor (pages with [data-cursor], mouse only): a blob, dark grey on light
     backgrounds and white on dark ones, turning into a rounded label with the project type
     over anything carrying data-cursor="…". */
  if (document.querySelector('[data-cursor]') && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cur = document.createElement('div');
    cur.className = 'cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span class="cursor__blob"></span><span class="cursor__label"></span>';
    document.body.append(cur);
    document.documentElement.classList.add('has-cursor');
    const label = cur.querySelector('.cursor__label');
    let x = -100, y = -100, cx = x, cy = y, raf = 0;
    const isDark = (el) => !!el?.closest?.('.intro-sheet, .footer, footer, .sheet-footer--dark')
      || parseFloat(getComputedStyle(document.body).getPropertyValue('--dark')) > 0.5;
    const tick = () => {
      const k = reduceMotion ? 1 : 0.35;
      cx += (x - cx) * k; cy += (y - cy) * k;
      cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.1 ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      cur.classList.add('is-visible');
      const t = e.target.closest?.('[data-cursor]');
      cur.classList.toggle('is-on-dark', isDark(e.target));
      if (t) {
        if (label.dataset.for !== t.dataset.cursor) {
          label.dataset.for = t.dataset.cursor;
          // every label ends with a top-right arrow
          label.innerHTML = t.dataset.cursor.replace(/</g, '&lt;')
            + ' <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11l6-6M6 5h5v5"/></svg>';
        }
      }
      cur.classList.toggle('is-label', !!t);
      // project type colours: visual / branding in the NID green, UX / research in the Samsung blue
      cur.dataset.tone = t?.dataset.cursorTone || '';
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    // scrolling changes what's under a still mouse (and the dark fade), so re-check then too
    addEventListener('scroll', () => {
      if (!cur.classList.contains('is-visible')) return;
      const el = document.elementFromPoint(x, y);
      cur.classList.toggle('is-on-dark', isDark(el));
      const t = el?.closest?.('[data-cursor]');
      cur.classList.toggle('is-label', !!t && label.dataset.for === t.dataset.cursor);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => cur.classList.remove('is-visible'));
    addEventListener('pointerdown', () => cur.classList.add('is-down'));
    addEventListener('pointerup', () => cur.classList.remove('is-down'));
  }

  /* 2. Hover preview ------------------------------------------------------ */
  const rows = document.querySelectorAll('.project-row[data-preview]');
  if (rows.length && matchMedia('(hover: hover) and (min-width: 1024px)').matches) {
    const preview = document.createElement('div');
    preview.className = 'hero-preview';
    preview.setAttribute('aria-hidden', 'true');
    preview.innerHTML = '<img alt="">';
    document.body.append(preview);
    const img = preview.firstElementChild;

    // left  = list's left edge + --preview-start (set in styles.css)
    // width = up to --preview-max-w, never past the screen edge
    const place = (row) => {
      const list = row.closest('.project-list');
      const box = row.closest('.container') || document.body;
      const pad = parseFloat(getComputedStyle(box).paddingRight) || 0;
      const cs = getComputedStyle(list);
      const start = parseFloat(cs.getPropertyValue('--preview-start')) || 430;
      const maxW = parseFloat(cs.getPropertyValue('--preview-max-w')) || 800;
      const left = list.getBoundingClientRect().left + start;
      const room = document.documentElement.clientWidth - left - 16;
      preview.style.setProperty('--left', `${left}px`);
      preview.style.setProperty('--max-w', `${Math.max(320, Math.min(maxW, room))}px`);
      // vertical: image centre = centre of the row (title + description)
      const r = row.getBoundingClientRect();
      preview.style.setProperty('--top', `${r.top + r.height / 2}px`);
    };
    let current = null;
    addEventListener('scroll', () => { if (current) place(current); }, { passive: true });

    rows.forEach((row) => {
      new Image().src = row.dataset.preview;
      const show = () => {
        current = row;
        place(row);
        img.src = row.dataset.preview;
        preview.classList.add('is-visible');
      };
      const hide = () => { current = null; preview.classList.remove('is-visible'); };
      row.addEventListener('mouseenter', show);
      row.addEventListener('mouseleave', hide);
      row.addEventListener('focus', show);
      row.addEventListener('blur', hide);
    });
  }

  /* 2a. Name spiral: clone the row, give each its index and fade amount */
  document.querySelectorAll('.name-spiral').forEach((el) => {
    const n = +el.dataset.rows || 11;
    const row = el.querySelector('.name-spiral__row');
    for (let i = 1; i < n; i++) el.append(row.cloneNode(true));
    [...el.children].forEach((r, i) => {
      r.style.setProperty('--i', i);
      r.style.setProperty('--n', n);
      r.style.setProperty('--fade', `${(i / (n - 1)) * 100}%`);
    });
  });

  /* 2a+. Ticker: repeat the items once so the -50% scroll loops seamlessly */
  document.querySelectorAll('.studio-ticker__track').forEach((t) => { t.innerHTML += t.innerHTML; });
  // Studio nav: transparent over the dark hero, solid once past it
  const studioNav = document.querySelector('.studio-nav');
  const studioHero = document.querySelector('.studio-hero');
  if (studioNav && studioHero) {
    const solid = () => studioNav.classList.toggle('is-solid', studioHero.getBoundingClientRect().bottom <= studioNav.offsetHeight);
    addEventListener('scroll', solid, { passive: true });
    solid();
  }

  /* 2d. Mosaic (home-v2): intro text → paragraph → tile mosaic, driven by scroll */
  document.querySelectorAll('.mosaic').forEach((el) => {
    const stage = el.querySelector('.mosaic__stage');
    const grid = el.querySelector('.mosaic__grid');
    const intro = el.querySelector('.mosaic__intro');
    const [line1, line2] = intro.querySelectorAll('.mosaic__line');
    const hint = el.querySelector('.mosaic__hint');
    const tiles = [...grid.querySelectorAll('.tile')];
    const isStatic = () => reduceMotion || innerWidth < 900;
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let geo = [];

    // each tile starts pushed out from the stage centre, along its own direction
    const measure = () => {
      tiles.forEach((t) => { t.style.transform = ''; });
      const W = stage.clientWidth, H = stage.clientHeight, push = Math.max(W, H) * .75;
      geo = tiles.map((t, i) => {
        const cx = grid.offsetLeft + t.offsetLeft + t.offsetWidth / 2 - W / 2;
        const cy = grid.offsetTop + t.offsetTop + t.offsetHeight / 2 - H / 2;
        const len = Math.hypot(cx, cy) || 1;
        return { dx: cx / len * push, dy: cy / len * push, delay: (i % 5) * .025 };
      });
    };

    const render = () => {
      if (el.classList.contains('is-static')) return;
      const r = el.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - innerHeight || 1));
      line1.style.opacity = 1 - seg(p, .12, .22);
      line2.style.opacity = seg(p, .2, .3) * (1 - seg(p, .48, .58));
      hint.style.opacity = 1 - seg(p, .02, .08);
      tiles.forEach((t, i) => {
        const k = 1 - ease(seg(p, .3 + geo[i].delay, .78 + geo[i].delay));
        t.style.transform = k ? `translate(${geo[i].dx * k}px, ${geo[i].dy * k}px)` : '';
      });
    };

    const setup = () => {
      el.classList.toggle('is-static', isStatic());
      if (isStatic()) {
        [line1, line2, hint].forEach((n) => n.removeAttribute('style'));
        tiles.forEach((t) => { t.style.transform = ''; });
        return;
      }
      measure();
      render();
    };
    let ticking = false;
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; render(); }); } }, { passive: true });
    addEventListener('resize', setup);
    setup();
  });

  /* 2e. Type reveal: types a draft, backspaces, settles on the final line.
     Out of view it rewrites to an "away" line; back in view it hurries to the final line. */
  document.querySelectorAll('.type-reveal__text').forEach((el) => {
    const final = el.dataset.text;
    const draft = el.dataset.draft;
    const away = (el.dataset.away || '').split('|').filter(Boolean);
    const cursor = document.createElement('span');
    cursor.className = 'type-reveal__cursor';
    cursor.textContent = '.';
    el.append(cursor);
    const breakAt = final.lastIndexOf(' ');        // "I overthink" stays on line one
    const char = (c, i) => {
      const s = document.createElement('span');
      s.dataset.c = c;
      if (i === breakAt && c === ' ') s.append(document.createElement('br')); else s.textContent = c;
      return s;
    };
    const put = (str) => el.replaceChildren(...[...str].map(char), cursor);
    if (reduceMotion) { put(final); return; }

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const text = () => [...el.children].slice(0, -1).map((c) => c.dataset.c).join('');
    let run = 0;
    const SPEED = { normal: [70, 60, 45], quick: [32, 18, 26] };   // [type min, type jitter, delete]
    const typeTo = async (target, pace, id) => {
      const [tMin, tJit, del] = SPEED[pace];
      let cur = text(), k = 0;
      while (k < cur.length && cur[k] === target[k]) k++;
      while (cur.length > k) {
        if (id !== run) return false;
        cursor.previousSibling.remove(); cur = cur.slice(0, -1);
        await sleep(del);
      }
      for (const c of target.slice(k)) {
        if (id !== run) return false;
        cursor.before(char(c, el.children.length - 1));
        await sleep(tMin + Math.random() * tJit);
      }
      return id === run;
    };
    const play = async (steps) => {
      const id = ++run;
      for (const step of steps) {
        if (typeof step === 'number') { await sleep(step); if (id !== run) return; continue; }
        if (!(await typeTo(step[0], step[1], id))) return;
      }
    };

    // first visit: "I overthink every." → pause → "I overthink ." → "I overthink professionally."
    const base = draft ? draft.slice(0, draft.lastIndexOf(' ') + 1) : '';
    play(draft ? [500, [draft, 'normal'], 1000, [base, 'normal'], 250, [final, 'normal']] : [500, [final, 'normal']]);

    // watch scroll position (not IntersectionObserver) so it also works in background-throttled tabs
    const box = el.closest('.type-reveal') || el;
    let inView = true, n = 0;
    const check = () => {
      const r = box.getBoundingClientRect();
      const now = r.bottom > 0 && r.top < innerHeight && !box.closest('.is-covered');   // a pinned hero under the work counts as away
      if (now === inView || !away.length) return;
      inView = now;
      if (now) play([350, [final, 'quick']]);
      else play([[away[n++ % away.length], 'quick']]);
    };
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
  });

  /* 2f. Scroll reveal: letters of [data-reveal] turn solid in reading order as it scrolls through */
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    // letters keep a highlight from any <span class="hl"> they sat in
    const letters = [];
    const walk = (node, hl) => node.childNodes.forEach((n) => {
      if (n.nodeType === 3) [...n.textContent].forEach((ch) => letters.push({ ch, hl }));
      else if (n.nodeName === 'BR') letters.push({ br: true });   // <br>s survive the split
      else walk(n, hl || n.classList?.contains('hl'));
    });
    walk(el, false);
    const words = [];
    letters.forEach((l) => {
      if (l.br) words.push('<br>', []);
      else if (/\s/.test(l.ch)) { if (words.at(-1)?.length) words.push([]); }
      else { if (!words.length) words.push([]); words.at(-1).push(l); }
    });
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    el.innerHTML = words.filter((w) => w.length).map((w) => w === '<br>' ? w : `<span class="w" aria-hidden="true">${w.map((l) => `<span class="c${l.hl ? ' hl' : ''}">${l.ch}</span>`).join('')}</span>`).join(' ');
    const chars = [...el.querySelectorAll('.c')];
    if (reduceMotion) { chars.forEach((c) => c.classList.add('on')); return; }
    const update = () => {
      const r = el.getBoundingClientRect();
      const start = innerHeight * .85, end = innerHeight * .35;   // top of text at 85% → bottom at 35%
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height)));
      const n = Math.round(p * chars.length);
      chars.forEach((c, i) => c.classList.toggle('on', i < n));
    };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  });

  /* 2f2. Homepage project cards: the whole card opens the project, not just the image and title.
     The card takes the image's cursor label; clicks on real links, or while selecting text, are left alone. */
  document.querySelectorAll('.minis .pair__col').forEach((card) => {
    const link = card.querySelector(':scope > a.plate, :scope > a.slides');
    if (!link) return;
    card.classList.add('is-linked');
    if (link.dataset.cursor) { card.dataset.cursor = link.dataset.cursor; card.dataset.cursorTone = link.dataset.cursorTone || ''; }
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button') || String(getSelection()).length) return;
      if (link.target === '_blank' || e.metaKey || e.ctrlKey) window.open(link.href, '_blank', 'noopener');
      else location.href = link.href;
    });
  });

  /* 2g. Dot-grid parallax: background drifts at 35% of the scroll speed */
  if (document.body.classList.contains('dot-grid') && !reduceMotion) {
    document.body.classList.add('is-parallax');
    let queued = false;
    const drift = () => { queued = false; document.body.style.setProperty('--grid-y', `${(-scrollY * .35).toFixed(1)}px`); };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(drift); } }, { passive: true });
    drift();
  }

  /* 2h. Dark shift (index-v4): --dark on <body> goes 0 → 1 over data-dark-distance px (default 200)
     of scroll, starting when [data-dark-trigger]'s top edge reaches the middle of the screen.
     Scroll-linked, so it reverses on the way up. The colours are mixed in CSS. */
  const darkTrigger = document.querySelector('[data-dark-trigger]');
  if (darkTrigger && document.body.classList.contains('dark-shift')) {
    const distance = +darkTrigger.dataset.darkDistance || 200;
    let queued = false;
    const update = () => {
      queued = false;
      const p = (innerHeight / 2 - darkTrigger.getBoundingClientRect().top) / distance;
      document.body.style.setProperty('--dark', Math.min(1, Math.max(0, p)).toFixed(3));
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* 2i. History peek: hovering a sentence ([data-peek][data-img]) shows its photo behind the paragraph.
     Touch screens in v4 (.intro-sheet--v4, no hover): the sentence crossing the middle of the screen shows it. */
  document.querySelectorAll('.intro-sheet__meta').forEach((meta) => {
    const hists = [...meta.querySelectorAll('[data-peek][data-img]')];
    const canHover = matchMedia('(hover: hover)').matches;
    const byScroll = !canHover && meta.closest('.intro-sheet--v4, [data-peek-scroll]');
    if (!hists.length || (!canHover && !byScroll)) return;
    const peek = document.createElement('span');
    peek.className = 'history-peek';
    peek.setAttribute('aria-hidden', 'true');
    peek.innerHTML = '<img alt="">';
    meta.prepend(peek);
    const img = peek.firstElementChild;
    let shown = null;
    const show = (h) => {
      if (shown === h) return;
      shown = h;
      img.src = h.dataset.img;
      meta.dataset.peek = h.dataset.peek;
      // centre the photo on the phrase that stays visible
      const seg = meta.querySelector(`.seg[data-seg="${h.dataset.peek}"]`);
      const rs = [...(seg || meta).getClientRects()], top = meta.getBoundingClientRect().top;
      peek.style.top = `${(Math.min(...rs.map((r) => r.top)) + Math.max(...rs.map((r) => r.bottom))) / 2 - top}px`;
      meta.classList.add('is-peek');
    };
    const hide = () => { shown = null; meta.classList.remove('is-peek'); delete meta.dataset.peek; };
    hists.forEach((h) => { new Image().src = h.dataset.img; });

    if (canHover) {
      hists.forEach((h) => {
        h.addEventListener('mouseenter', () => show(h));
        h.addEventListener('mouseleave', hide);
      });
      return;
    }
    // touch: whichever sentence spans the screen's middle line; none → hide. Other sentences stay visible.
    meta.classList.add('is-scroll-peek');
    let queued = false;
    const check = () => {
      queued = false;
      const mid = innerHeight / 2;
      let best = null, bestD = Infinity;
      hists.forEach((h) => {
        const r = h.getBoundingClientRect();
        if (r.top > mid || r.bottom < mid) return;
        const d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestD) { best = h; bestD = d; }
      });
      if (best) show(best); else if (shown) hide();
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(check); } }, { passive: true });
    addEventListener('resize', check);
    check();
  });

  /* 2b. Motion thumbnails: play project-card videos only while visible */
  const thumbs = document.querySelectorAll('.project-card__media video, .bento-card__media video, .play-tile video');
  if (thumbs.length) {
    thumbs.forEach((v) => { v.muted = true; v.loop = true; v.playsInline = true; });
    if (!reduceMotion && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause();
      }), { threshold: 0.25 });
      thumbs.forEach((v) => io.observe(v));
    }
  }

  /* 2c. Carousel: prev/next buttons + counter */
  document.querySelectorAll('.carousel').forEach((el) => {
    const track = el.querySelector('.carousel__track');
    const slides = [...track.children];
    const count = el.querySelector('.carousel__count');
    const [prev, next] = el.querySelectorAll('.carousel__nav button');
    const step = () => (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth);
    const index = () => Math.round(track.scrollLeft / step());
    const go = (i) => track.scrollTo({ left: Math.max(0, Math.min(i, slides.length - 1)) * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
    const update = () => {
      const i = index();
      if (count) count.textContent = `${i + 1} / ${slides.length}`;
      if (prev) prev.disabled = i <= 0;
      if (next) next.disabled = i >= slides.length - 1;
    };
    prev?.addEventListener('click', () => go(index() - 1));
    next?.addEventListener('click', () => go(index() + 1));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    update();
  });

  /* 3. Compare slider ----------------------------------------------------- */
  document.querySelectorAll('.compare').forEach((el) => {
    const range = el.querySelector('.compare__range');
    const set = () => el.style.setProperty('--pos', `${range.value}%`);
    range.addEventListener('input', set);
    set();
  });

  /* Shared: progress (0 → 1) of a tall wrapper scrolling past its sticky stage */
  const progressOf = (el) => {
    const r = el.getBoundingClientRect();
    const travel = r.height - innerHeight;
    return Math.min(1, Math.max(0, -r.top / (travel || 1)));
  };

  /* 4. Scroll sequence ---------------------------------------------------- */
  const seqs = [...document.querySelectorAll('.scroll-seq')];
  seqs.forEach((el) => {
    const n = el.querySelectorAll('.scroll-seq__layer').length;
    el.style.setProperty('--steps', n);
    const dots = el.querySelector('.scroll-seq__dots');
    if (dots) dots.innerHTML = '<span></span>'.repeat(n);
  });

  /* 5. Scroll video ------------------------------------------------------- */
  const vids = [...document.querySelectorAll('.scroll-video')];
  vids.forEach((el) => {
    const v = el.querySelector('video');
    if (reduceMotion) { v.controls = true; return; }
    v.muted = true;
    v.pause();
    // Load into memory so every frame is seekable, whatever the host supports
    fetch(v.currentSrc || v.src)
      .then((r) => r.blob())
      .then((blob) => { v.src = URL.createObjectURL(blob); })
      .catch(() => {});
  });

  if (!reduceMotion && (seqs.length || vids.length)) {
    let ticking = false;
    const update = () => {
      ticking = false;
      seqs.forEach((el) => {
        const p = progressOf(el);
        el.style.setProperty('--p', p.toFixed(4));
        const steps = el.querySelectorAll('.scroll-seq__dots span');
        const active = Math.min(steps.length - 1, Math.round(p * (steps.length - 1)));
        steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
        el.querySelectorAll('.scroll-seq__captions span').forEach((s, i) => s.classList.toggle('is-active', i === active));
      });
      vids.forEach((el) => {
        const v = el.querySelector('video');
        if (!v.duration) return;
        v._target = progressOf(el) * (v.duration - 0.05);
        if (!v.seeking) v.currentTime = v._target;   // otherwise picked up on 'seeked'
      });
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    vids.forEach((el) => {
      const v = el.querySelector('video');
      v.addEventListener('loadedmetadata', onScroll);
      v.addEventListener('seeked', () => {
        if (v._target != null && Math.abs(v.currentTime - v._target) > 0.02) v.currentTime = v._target;
      });
    });
    update();
  }
})();
