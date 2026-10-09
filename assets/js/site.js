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

  /* 2b. Motion thumbnails: play project-card videos only while visible */
  const thumbs = document.querySelectorAll('.project-card__media video, .bento-card__media video');
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
