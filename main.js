/* Larkfield Court: motion edition.
   Borrowed ideas: UMS-Wright (percent preloader, circle menu, stat ticker, photo rail) and
   Brentwood (giant title with rising tiles, word-by-word reveal, drawn underlines, tile wall). */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none)').matches;

  const finishNoMotion = () => {
    root.classList.add('reduce');
    $('#pre')?.remove();
    document.body.classList.remove('loading');
  };

  // Libraries failed to load, or user prefers reduced motion: show a static, fully usable page.
  if (!window.gsap || !window.ScrollTrigger || reduce) {
    finishNoMotion();
    setupMenu(null);
    setupStatic();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Smooth scroll
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  setupMenu(lenis);

  // Progress bar
  gsap.to('#bar', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 } });

  // Pre-hide intro elements
  gsap.set(['.logo', '.mbtn'], { autoAlpha: 0, y: -12 });
  gsap.set('.hero-title .line > span', { yPercent: 115 });
  gsap.set(['.pillars', '.hero-cue'], { autoAlpha: 0, y: 20 });

  runPreloader().then(() => {
    intro();
    buildHero();
    buildTicker();
    buildReveals();
    buildWall();
    buildRail();
    buildStages();
    buildCta();
    setupLightbox();
    ScrollTrigger.refresh();
    addEventListener('load', () => ScrollTrigger.refresh());
  });

  // ---------- Preloader ----------
  function runPreloader() {
    return new Promise((resolve) => {
      const cnt = $('#pcount'), fill = $('#pfill');
      const st = { v: 0 };
      const paint = () => { cnt.textContent = Math.round(st.v) + '%'; fill.style.transform = `scaleX(${st.v / 100})`; };
      const eager = $$('img').filter((i) => i.loading !== 'lazy');
      const imgsReady = Promise.all(eager.map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))));
      const minTime = new Promise((r) => setTimeout(r, 1700));
      const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
      gsap.to(st, { v: 88, duration: 1.7, ease: 'power1.out', onUpdate: paint });
      const safety = new Promise((r) => setTimeout(r, 6000));
      Promise.race([Promise.all([imgsReady, minTime, fonts]), safety]).then(() => {
        gsap.killTweensOf(st);
        gsap.to(st, {
          v: 100, duration: 0.45, ease: 'power1.in', onUpdate: paint,
          onComplete: () => {
            gsap.timeline({ onComplete: () => { $('#pre').remove(); document.body.classList.remove('loading'); lenis && lenis.start(); resolve(); } })
              .to('#pre .pin', { opacity: 0, y: -16, duration: 0.35 })
              .to('#pre', { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '+=.05');
          },
        });
      });
    });
  }

  function intro() {
    gsap.to('.hero-title .line > span', { yPercent: 0, duration: 1.3, ease: 'power4.out', stagger: 0.14 });
    gsap.to(['.logo', '.mbtn'], { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.4, stagger: 0.1 });
    gsap.to(['.pillars', '.hero-cue'], { autoAlpha: 1, y: 0, duration: 0.9, delay: 0.7, stagger: 0.15 });
  }

  // ---------- Hero scene: tiles rise past the giant title ----------
  function buildHero() {
    const hero = $('.hero');
    const tiles = $$('.ftile').filter((t) => getComputedStyle(t).display !== 'none');
    gsap.set('.hero-bg', { scale: 1.2 });
    tiles.forEach((t) => gsap.set(t, { y: () => innerHeight * 1.1 }));
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=280%', pin: true, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: true },
    });
    tl.to('.hero-bg', { scale: 1, duration: 2 }, 0)
      .to('.hero-title', { scale: 1.12, duration: 2 }, 0)
      .fromTo(['.pillars', '.hero-cue'], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: 30, duration: 0.25, immediateRender: false }, 0);
    const speeds = [1, 1.35, 0.85, 1.2, 1.1, 0.95];
    tiles.forEach((t, i) => {
      const dur = 1.6 / speeds[i % speeds.length];
      tl.to(t, { y: () => -(t.offsetHeight + innerHeight * 0.2), duration: dur }, 0.12 * i + (i % 2) * 0.1);
    });
    tl.to('.hero-title', { autoAlpha: 0, duration: 0.35 }, 1.75);
    tl.to('.hero-shade', { opacity: 0.6, duration: 0.5 }, 1.6);
  }

  // ---------- Ticker whose speed follows scroll velocity ----------
  function buildTicker() {
    const tw = gsap.to('.ticker-track', { xPercent: -50, duration: 36, ease: 'none', repeat: -1 });
    const p = { ts: 1 };
    ScrollTrigger.create({
      onUpdate: (s) => {
        const dir = s.direction || 1;
        const boost = Math.min(Math.abs(s.getVelocity()) / 300, 5);
        gsap.killTweensOf(p);
        p.ts = dir * (1 + boost);
        tw.timeScale(p.ts);
        gsap.to(p, { ts: dir, duration: 0.9, delay: 0.1, onUpdate: () => tw.timeScale(p.ts) });
      },
    });
  }

  // ---------- Word-by-word reveal, drawn arrow, underlines, counters ----------
  function buildReveals() {
    $$('[data-words]').forEach((el) => {
      el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
      gsap.fromTo($$('.w', el), { opacity: 0.16 }, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 55%', scrub: true } });
    });
    gsap.fromTo('.arrow', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top 70%', end: 'top 30%', scrub: true } });
    gsap.from('.about .btn', { y: 30, opacity: 0, duration: 0.8, scrollTrigger: { trigger: '.about .btn', start: 'top 92%' } });

    const us = $$('[data-u]');
    ScrollTrigger.create({
      trigger: '.values .q', start: 'top 70%', once: true,
      onEnter: () => gsap.to(us, { backgroundSize: '100% .09em', duration: 0.9, ease: 'power2.out', stagger: 0.35, delay: 0.2 }),
    });
    gsap.from('.values .mark', { scale: 0.4, opacity: 0, duration: 0.9, ease: 'back.out(2)', scrollTrigger: { trigger: '.values', start: 'top 65%' } });

    $$('[data-count]').forEach((el) => {
      const end = +el.dataset.count, suf = el.dataset.suffix || '', o = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v) + suf) }),
      });
    });
  }

  // ---------- Tile wall ----------
  function buildWall() {
    gsap.set('.wall .t', { y: 70, opacity: 0 });
    ScrollTrigger.batch('.wall .t', {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12 }),
    });
    gsap.from('.wall h2', { y: 40, opacity: 0, duration: 0.9, scrollTrigger: { trigger: '.wall h2', start: 'top 90%' } });
  }

  // ---------- Photo rail: arrows, drag, progress ----------
  function buildRail() {
    const rail = $('.rail'), bar = $('.prog i');
    const step = () => rail.clientWidth * 0.6;
    $('.prev').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    $('.next').addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    const upd = () => (bar.style.transform = `scaleX(${Math.min(1, (rail.scrollLeft + rail.clientWidth) / rail.scrollWidth)})`);
    rail.addEventListener('scroll', upd, { passive: true });
    upd();
    let down = false, sx = 0, sl = 0;
    rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('drag'); });
    addEventListener('pointermove', (e) => { if (down) rail.scrollLeft = sl - (e.clientX - sx); });
    addEventListener('pointerup', () => { if (down) { down = false; rail.classList.remove('drag'); } });
    rail.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') rail.scrollBy({ left: step(), behavior: 'smooth' }); if (e.key === 'ArrowLeft') rail.scrollBy({ left: -step(), behavior: 'smooth' }); });
    gsap.from('.rail figure', { x: 80, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.rail', start: 'top 85%' } });
  }

  // ---------- Stage accordion ----------
  function buildStages() {
    setupStages();
    gsap.from('.panel', { y: 60, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.acc', start: 'top 85%' } });
  }

  // ---------- Closing CTA ----------
  function buildCta() {
    gsap.set('[data-rise]', { yPercent: 110 });
    gsap.to('[data-rise]', { yPercent: 0, duration: 1.2, ease: 'power4.out', stagger: 0.14, scrollTrigger: { trigger: '.cta h2', start: 'top 85%' } });
    if (touch) return;
    $$('.mag').forEach((b) => {
      const qx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' }), qy = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); qx((e.clientX - (r.left + r.width / 2)) * 0.3); qy((e.clientY - (r.top + r.height / 2)) * 0.4); });
      b.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
  }

  // ---------- shared setup (also used in reduced-motion mode) ----------
  function setupMenu(lenisInst) {
    const menu = $('#menu'), btn = $('.mbtn');
    const set = (open) => {
      menu.classList.toggle('open', open);
      menu.inert = !open;
      btn.classList.toggle('x', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (lenisInst) open ? lenisInst.stop() : lenisInst.start();
      else document.body.style.overflow = open ? 'hidden' : '';
      if (open) setTimeout(() => $('a', menu).focus({ preventScroll: true }), 450);
    };
    btn.addEventListener('click', () => set(!menu.classList.contains('open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) { set(false); btn.focus(); } });
    $$('a', menu).forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = $(a.getAttribute('href'));
      set(false);
      setTimeout(() => (lenisInst ? lenisInst.scrollTo(target, { duration: 1.6 }) : target.scrollIntoView({ behavior: 'auto' })), 500);
    }));
    $$('a[href^="#"]:not(#menu a)').forEach((a) => a.addEventListener('click', (e) => {
      const target = $(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenisInst ? lenisInst.scrollTo(target, { duration: 1.6 }) : target.scrollIntoView({ behavior: 'auto' });
    }));
  }

  function setupStages() {
    const panels = $$('.panel');
    const on = (p) => panels.forEach((q) => { q.classList.toggle('on', q === p); q.setAttribute('aria-expanded', String(q === p)); });
    panels.forEach((p) => {
      p.addEventListener('click', () => on(p));
      p.addEventListener('focus', () => on(p));
      if (!touch) p.addEventListener('pointerenter', () => on(p));
    });
  }

  function setupLightbox() {
    const lb = $('#lb');
    $$('[data-light]').forEach((b) => b.addEventListener('click', () => {
      $('img', lb).src = b.dataset.light;
      $('img', lb).alt = b.dataset.cap;
      $('p', lb).textContent = b.dataset.cap;
      lb.showModal();
    }));
    $('#lbx').addEventListener('click', () => lb.close());
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  }

  function setupStatic() {
    setupStages();
    setupLightbox();
    $$('[data-count]').forEach((el) => (el.textContent = el.dataset.count + (el.dataset.suffix || '')));
    $('.prev')?.addEventListener('click', () => $('.rail').scrollBy({ left: -$('.rail').clientWidth * 0.6, behavior: 'smooth' }));
    $('.next')?.addEventListener('click', () => $('.rail').scrollBy({ left: $('.rail').clientWidth * 0.6, behavior: 'smooth' }));
  }
})();
