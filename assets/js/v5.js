/* index-v5.html — motion and the light → dark turn. Needs assets/vendor (gsap, ScrollTrigger, SplitText).
   Native scrolling throughout (anchors use CSS scroll-behavior + scroll-padding).
   1. Dark shift: --dark on <body> goes 0 → 1 across .turn, scroll-linked (reverses going up)
   2. Scroll spy for the masthead tabs, back-to-top button
   3. DR.I.P: the piece list switches which live artwork is shown
   4. Entrances: hairlines draw in, [data-fade] rises, [data-lines] titles slide up line by line,
      plates and video tiles unmask, case images drift slightly inside their frames
   5. Job headings and compact rows: their image follows the pointer
   With reduced motion: the colour shift and the switcher still work; no entrances. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { gsap, ScrollTrigger, SplitText } = window;
  const root = document.documentElement;
  const body = document.body;
  const mast = document.querySelector('[data-mast]');
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  /* 1. Dark shift: starts as the turn's second line reaches 80% of the screen, done by 35% */
  const turnB = document.querySelector('.turn__b');
  const shift = () => {
    if (!turnB) return;   // only the homepage has the turn
    const r = turnB.getBoundingClientRect();
    const p = clamp01((innerHeight * .8 - r.top) / (innerHeight * .45));
    body.style.setProperty('--dark', p.toFixed(3));
    document.querySelector('meta[name="theme-color"]').content = p > .5 ? '#000000' : '#F3F2EC';
  };

  /* 2. Scroll spy: the last section whose top has passed under the masthead; none in the hero */
  const tabs = [...document.querySelectorAll('[data-spy]')];
  const secs = tabs.map((t) => document.getElementById(t.dataset.spy));   // homepage only; case pages have no data-spy tabs
  const toTop = document.querySelector('.to-top');
  const spy = () => {
    const line = mast.offsetHeight + 80;
    let on = -1;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= line) on = i; });
    if (tabs.length) tabs.forEach((t, i) => t.classList.toggle('is-active', i === on));
    toTop?.classList.toggle('is-on', scrollY > innerHeight);
  };
  let queued = false;
  const onScroll = () => { queued = false; shift(); spy(); };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* 3. DR.I.P switcher */
  const hint = document.querySelector('.drip__hint');
  document.querySelectorAll('.drip__list [data-show]').forEach((btn, _, all) => btn.addEventListener('click', () => {
    all.forEach((b) => {
      const on = b === btn;
      b.setAttribute('aria-pressed', on);
      document.getElementById(b.dataset.show).classList.toggle('is-on', on);
    });
    hint.textContent = btn.dataset.hint;
  }));

  if (!gsap || !ScrollTrigger || reduce) { root.classList.remove('js'); return; }
  gsap.registerPlugin(ScrollTrigger, ...(SplitText ? [SplitText] : []));

  /* 4. Entrances ----------------------------------------------------------------- */
  const EASE = 'expo.out';
  gsap.from('.mast > *', { y: -12, opacity: 0, duration: 1, ease: EASE, stagger: 0.06, delay: 0.1 });

  // hairlines draw from the left
  const rules = gsap.utils.toArray('.ruled');
  gsap.set(rules, { '--draw': 0 });
  ScrollTrigger.batch(rules, {
    start: 'top 94%', once: true,
    onEnter: (batch) => gsap.to(batch, { '--draw': 1, duration: 1.4, ease: 'expo.inOut', stagger: 0.06 }),
  });

  // small pieces rise and fade in
  gsap.set('[data-fade]', { opacity: 0, y: 24 });
  root.classList.remove('js');
  ScrollTrigger.batch('[data-fade]', {
    start: 'top bottom', once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: EASE, stagger: 0.08, delay: 0.15 }),
  });

  // rows and captions: a quieter stagger (compact rows animate their children: the rows have a CSS opacity transition)
  ScrollTrigger.batch('.more__row, .piece figcaption, .case__notes, .details > div, .drip__info, .cs .prose__body, .cs .exploration__head, .cs-intro__body, .pair__col > :not(.plate), .thumb > :not(.plate)', {
    start: 'top 92%', once: true,
    onEnter: (batch) => gsap.from(batch.map((el) => (el.classList.contains('more__row') ? [...el.children] : el)).flat(), {
      opacity: 0, y: 18, duration: 1, ease: EASE, stagger: 0.05,
    }),
  });

  // big titles: each line slides up out of its own mask (split once fonts are in, re-split on resize)
  document.fonts.ready.then(() => {
    if (!SplitText) return;
    document.querySelectorAll('[data-lines]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 110, duration: 1.3, ease: EASE, stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
      });
    });
    ScrollTrigger.refresh();
  });

  /* 5. Image beside the pointer -------------------------------------------------------- */
  const hovers = document.querySelectorAll('.role__head[data-img], .more__row[data-img]');
  if (hovers.length && matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px)').matches) {
    const box = document.createElement('div');
    box.className = 'follow';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<img alt="">';
    body.append(box);
    const img = box.firstElementChild;
    gsap.set(box, { xPercent: -50, yPercent: -50 });
    const x = gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3' });
    const y = gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3' });
    const hide = () => gsap.to(box, { autoAlpha: 0, scale: 0.94, duration: 0.25, ease: 'power2.in', overwrite: 'auto' });
    hovers.forEach((el) => {
      new Image().src = el.dataset.img;
      el.addEventListener('mouseenter', (e) => {
        img.src = el.dataset.img;
        x(e.clientX); y(e.clientY);
        gsap.to(box, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
      });
      el.addEventListener('mousemove', (e) => { x(e.clientX); y(e.clientY); });
      el.addEventListener('mouseleave', hide);
    });
    addEventListener('scroll', hide, { passive: true });
  }
})();

/* Hero colour picker. The typewriter's blinking full stop takes v_color, picked by the pointer:
   the hero is the colour field (x → hue 0–360°, y → lightness 100% at the top to 0% at the bottom,
   so the middle of the screen is the pure hue). Clicking floods the hero with v_color from the
   click point (GSAP clip-path circle); clicking again floods the new colour over the last one.
   Hero text switches to black or white for contrast on the flood. */
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const gsap = window.gsap;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let h = 0, l = 50;
  const pick = (x, y) => {
    const r = hero.getBoundingClientRect();
    h = Math.round(Math.min(1, Math.max(0, (x - r.left) / r.width)) * 360);
    l = Math.round(100 - Math.min(1, Math.max(0, (y - r.top) / r.height)) * 100);
    hero.style.setProperty('--v-color', `hsl(${h} 100% ${l}%)`);
  };
  hero.addEventListener('pointermove', (e) => pick(e.clientX, e.clientY));

  hero.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    pick(e.clientX, e.clientY);
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const flood = document.createElement('div');
    flood.className = 'hero__flood';
    flood.style.background = `hsl(${h} 100% ${l}%)`;
    flood.style.setProperty('--x', `${x}px`);
    flood.style.setProperty('--y', `${y}px`);
    hero.append(flood);
    // relative luminance of the picked colour decides the text colour
    const [R, G, B] = getComputedStyle(flood).backgroundColor.match(/\d+/g).map((v) => {
      v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    const onDark = 0.2126 * R + 0.7152 * G + 0.0722 * B < 0.4;
    // once this flood covers the hero, only the floods *under* it can go (never a newer one still
    // growing on top: removing the cover under that one is what flashed the paper white)
    const done = () => {
      let prev = flood.previousElementSibling;
      while (prev) { const p = prev.previousElementSibling; if (prev.classList.contains('hero__flood')) prev.remove(); prev = p; }
    };
    hero.classList.add('is-flooded');
    // soft-edged circle (CSS mask, feather = last 35% of the radius) grows past the far corner
    const radius = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) / 0.65 + 40;
    if (!gsap || reduce) { flood.style.setProperty('--r', `${radius}px`); hero.classList.toggle('is-flooded-dark', onDark); done(); return; }
    const state = { r: 0 };
    gsap.to(state, {
      r: radius, duration: 1.4, ease: 'power2.inOut',
      onUpdate: () => flood.style.setProperty('--r', `${state.r}px`), onComplete: done,
    });
    // the wash: hero text blurs as the colour passes over it, then settles
    gsap.fromTo(hero.querySelectorAll('.hero__statement, .hero__intro, .hero__specs'), { filter: 'blur(0px)' }, {
      keyframes: [{ filter: 'blur(10px)', duration: 0.55, ease: 'power2.in' }, { filter: 'blur(0px)', duration: 0.85, ease: 'power2.out' }],
      overwrite: 'auto', clearProps: 'filter',
    });
    gsap.delayedCall(0.5, () => hero.classList.toggle('is-flooded-dark', onDark));
  });

  // the full stop stops blinking once typing pauses, so the next colour reads clearly
  const typed = hero.querySelector('.type-reveal__text');
  if (typed) {
    let idle;
    new MutationObserver(() => {
      hero.classList.remove('is-typed');
      clearTimeout(idle);
      idle = setTimeout(() => hero.classList.add('is-typed'), 700);
    }).observe(typed, { childList: true, subtree: true, characterData: true });
  }
})();

/* Masthead on the homepage: hidden over the hero (full-screen colour field), slides down from
   above once you scroll past half the hero, and slides away again when you come back up. */
(() => {
  const hero = document.querySelector('.hero');
  const mast = document.querySelector('[data-mast]');
  if (!hero || !mast) return;
  document.body.classList.add('has-hero');
  const check = () => mast.classList.toggle('is-shown', scrollY > hero.offsetHeight * 0.5);
  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', check);
  check();
})();

/* Slideshow ([data-slides]): one fixed frame, its images take turns. Each image is fitted so it
   covers the frame: a wider one rests on its left edge and pans slowly to its right edge; a taller
   one fills the width, starts at its top and scrolls up to its bottom. When the pan is done and
   the interval has passed, the next image pushes the current one out to the left. Runs only while
   the frame is on screen; with reduced motion the images just swap, without moving. */
(() => {
  const { gsap } = window;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INTERVAL = 2.5, SPEED = 80, PUSH = 1.1;   // seconds per image (min), pan px/s, push duration
  document.querySelectorAll('[data-slides]').forEach((box) => {
    const slides = [...box.querySelectorAll('.slide')];
    if (slides.length < 2 || !gsap) return;
    let i = 0, tl = null, panTw = null, visible = true;   // plays by default; the observer pauses it off screen
    // size the image to cover the frame, park it at its start, and note how far / how long it pans
    const fit = (slide) => {
      const img = slide.querySelector('img');
      const W = box.clientWidth, H = box.clientHeight;
      const ar = (+img.getAttribute('width')) / (+img.getAttribute('height'));
      let pan;
      if (ar > W / H) { gsap.set(img, { width: H * ar, height: H, x: 0, y: 0 }); pan = { x: -(H * ar - W) }; }
      else { gsap.set(img, { width: W, height: W / ar, x: 0, y: 0 }); pan = { y: -(W / ar - H) }; }
      const dist = Math.abs(pan.x || pan.y || 0);
      slide._pan = pan;
      slide._dur = reduce || dist < 1 ? 0 : dist / SPEED;
    };
    const startPan = (slide) => (slide._dur ? gsap.to(slide.querySelector('img'), { ...slide._pan, duration: slide._dur, ease: 'sine.inOut' }) : null);
    // each image starts panning the moment it begins to push in, so there is no pause after a change;
    // `offset` = how long the current image has already been panning (the push time, after the first)
    const step = (offset) => {
      const cur = slides[i], next = slides[(i + 1) % slides.length];
      if (offset === 0) panTw = startPan(cur);
      const at = Math.max(0.1, Math.max(INTERVAL, cur._dur) - offset);
      fit(next);
      tl = gsap.timeline({ onComplete: () => { i = (i + 1) % slides.length; step(PUSH); } });
      if (reduce) { tl.set(cur, { xPercent: 100 }, at).set(next, { xPercent: 0 }, at); return; }
      tl.call(() => { panTw = startPan(next); }, null, at)
        .fromTo(next, { xPercent: 100 }, { xPercent: 0, duration: PUSH, ease: 'power3.inOut' }, at)
        .to(cur, { xPercent: -100, duration: PUSH, ease: 'power3.inOut' }, at);
      if (!visible) { tl.pause(); panTw?.pause(); }
    };
    gsap.set(slides, { xPercent: 100 });
    gsap.set(slides[0], { xPercent: 0 });
    fit(slides[0]);
    step(0);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      [tl, panTw].forEach((t) => t && (visible ? t.play() : t.pause()));
    }).observe(box);
    let rt;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        tl?.kill(); panTw?.kill();
        slides.forEach((sl, k) => gsap.set(sl, { xPercent: k === i ? 0 : 100 }));
        fit(slides[i]); step(0);
      }, 200);
    });
  });
})();

/* 7. Hero underlay (homepage). The hero is pinned behind the page (v5.css section 10).
   .is-covered  while the work is over it: the typed line counts as out of view (site.js 2e),
                so it drifts to an "away" line and types its way back when uncovered.
   .is-resting  once About arrives: intro and specs fade, only the typed line stays.
   --rest-o     the line fades back as About's text scrolls over it. */
(() => {
  const hero = document.querySelector('.hero');
  const work = document.getElementById('work');
  const about = document.getElementById('about');
  const aboutText = about?.querySelector('.about5');
  const line = hero?.querySelector('.hero__statement');
  if (!hero || !work || !about || !document.body.classList.contains('has-hero')) return;
  const update = () => {
    const h = innerHeight;
    const workTop = work.getBoundingClientRect().top;
    const aboutTop = about.getBoundingClientRect().top;
    const resting = work.getBoundingClientRect().bottom < h || aboutTop < h * 0.95;   // as soon as the work has scrolled past
    const covered = workTop < h * 0.15 && !resting;
    hero.classList.toggle('is-covered', covered);
    hero.classList.toggle('is-resting', resting);
    if (aboutText && line) {
      const overlap = line.getBoundingClientRect().bottom - aboutText.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, overlap / (h * 0.35)));
      hero.style.setProperty('--rest-o', (1 - 0.88 * p).toFixed(3));
    }
  };
  let queued = false;
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();
