/* ══════════════════════════════════════════════════════════
   CINEMATIC INTERNSHIP PORTFOLIO — script.js
   Libraries : GSAP 3 + ScrollTrigger, Lenis, SplitType
   ══════════════════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────────────────────
   0.  GSAP REGISTRATION
──────────────────────────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

/* ────────────────────────────────────────────────────────────
   1.  GLOBALS
──────────────────────────────────────────────────────────── */
let lenis;               // Lenis smooth-scroll instance
let activeWeek = null;   // Currently open modal week number
let mouseX = 0;
let mouseY = 0;
let ringX  = 0;
let ringY  = 0;

/* ────────────────────────────────────────────────────────────
   2.  CUSTOM CURSOR
──────────────────────────────────────────────────────────── */
function initCursor() {
  /* Touch / coarse-pointer devices: skip entirely */
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const dot  = document.getElementById('cur-dot');
  const ring = document.getElementById('cur-ring');

  /* Dot follows mouse exactly */
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    gsap.set(dot, { x: mouseX, y: mouseY });
  });

  /* Ring lerps behind dot for a smooth trailing effect */
  (function animateRing() {
    ringX += (mouseX - ringX) * 0.11;
    ringY += (mouseY - ringY) * 0.11;
    gsap.set(ring, { x: ringX, y: ringY });
    requestAnimationFrame(animateRing);
  })();

  /* Cursor hover enlargement on interactive elements */
  const hoverTargets = document.querySelectorAll(
    'a, button, .wk-card, .sk-row, #modal-close-btn'
  );
  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

/* ────────────────────────────────────────────────────────────
   3.  WATER-RIPPLE CURSOR  (canvas)
──────────────────────────────────────────────────────────── */
function initRipple() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const canvas = document.getElementById('ripple-canvas');
  const ctx    = canvas.getContext('2d');
  const waves  = [];
  let lastRippleAt = 0;

  /* Always fill viewport */
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  /* Throttled ripple creation: max ~22 waves/sec */
  document.addEventListener('mousemove', e => {
    const now = performance.now();
    if (now - lastRippleAt < 45) return;
    lastRippleAt = now;
    waves.push({
      x     : e.clientX,
      y     : e.clientY,
      r     : 1,
      maxR  : 44 + Math.random() * 28,
      alpha : 0.22 + Math.random() * 0.08,
      speed : 0.75 + Math.random() * 0.45
    });
  });

  /* Animation loop */
  (function drawRipple() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.r    += w.speed;
      const progress = w.r / w.maxR;
      const a = w.alpha * (1 - progress);

      if (a <= 0.005) { waves.splice(i, 1); continue; }

      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.lineWidth   = 1;
      ctx.stroke();
    }
    requestAnimationFrame(drawRipple);
  })();
}

/* ────────────────────────────────────────────────────────────
   4.  LENIS SMOOTH SCROLL
──────────────────────────────────────────────────────────── */
function initLenis() {
  lenis = new Lenis({
    duration     : 1.4,
    easing       : t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel  : true,
    orientation  : 'vertical',
  });

  /* Keep ScrollTrigger in sync with Lenis */
  lenis.on('scroll', ScrollTrigger.update);

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

/* ────────────────────────────────────────────────────────────
   5.  LOADER SEQUENCE
   Thick bar fills left→right → morphs into letter D → portal zoom
──────────────────────────────────────────────────────────── */
function initLoader() {
  const loader    = document.getElementById('loader');
  const ldSvg     = document.getElementById('ld-svg');
  const morphPath = document.getElementById('morph-path');
  const fillRect  = document.getElementById('fill-rect');
  const barTrack  = document.getElementById('bar-track');
  const countEl   = document.getElementById('ld-count');
  const site      = document.getElementById('site');

  /* ───────────────────────────────────────────────────────────
     SVG path definitions — MUST have identical command structures
     Both use: M, C, C, C, C, Z  (26 numeric values each)
     Interpolation done numerically with lerpPath()
  ─────────────────────────────────────────────────────────── */
  // Thick horizontal bar (28px tall, 300px wide, centered at origin)
  const BAR_PATH = 'M -150,-14 C -50,-14 50,-14 150,-14 C 150,-14 150,14 150,14 C 50,14 -50,14 -150,14 C -150,14 -150,-14 -150,-14 Z';
  // Capital D shape (220px tall, vertical stroke left, curve right)
  const D_PATH   = 'M -50,-110 C 30,-110 100,-55 100,0 C 100,55 30,110 -50,110 C -50,110 -50,50 -50,0 C -50,0 -50,-110 -50,-110 Z';

  /* Linear numeric interpolation between two identically-structured SVG paths */
  function lerpPath(fromPath, toPath, t) {
    const fromNums = fromPath.match(/-?[\d.]+/g).map(Number);
    const toNums   = toPath.match(/-?[\d.]+/g).map(Number);
    let idx = 0;
    return fromPath.replace(/-?[\d.]+/g, () => {
      const v = fromNums[idx] + (toNums[idx] - fromNums[idx]) * t;
      idx++;
      return v.toFixed(3);
    });
  }

  /* Easing helper for the morph (ease in-out cubic) */
  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* ── Phase 1: clip rect slides right, revealing the bar + counter ── */
  const phase1 = gsap.timeline({ onComplete: phase2 });

  phase1
    /* Clip-rect width: 0 → 440 (full SVG width in viewBox units) */
    .to(fillRect, {
      attr     : { width: 440 },
      duration : 2.8,
      ease     : 'power1.inOut'
    })
    /* Counter: 00 → 100 */
    .to({ n: 0 }, {
      n        : 100,
      duration : 2.8,
      ease     : 'power1.inOut',
      onUpdate() {
        countEl.textContent = String(Math.round(this.targets()[0].n)).padStart(2, '0');
      }
    }, '<');

  /* ── Phase 2: bar morphs into D ── */
  function phase2() {
    /* Remove clip-path so full shape is visible during morph */
    morphPath.removeAttribute('clip-path');

    const morph  = gsap.timeline();
    const proxy  = { t: 0 };

    morph
      /* Fade out track + counter */
      .to([barTrack, countEl], {
        opacity  : 0,
        y        : -6,
        duration : 0.5,
        ease     : 'power2.in'
      })

      /* Animate proxy t from 0→1, updating the SVG path each frame */
      .to(proxy, {
        t        : 1,
        duration : 1.4,
        ease     : 'power3.inOut',
        onUpdate() {
          morphPath.setAttribute('d', lerpPath(BAR_PATH, D_PATH, easeInOut(proxy.t)));
        },
        onComplete() {
          /* Ensure path is exactly at D */
          morphPath.setAttribute('d', D_PATH);
        }
      }, '-=0.1')

      /* Soft white glow pulse on the D */
      .to(morphPath, {
        attr     : { filter: 'url(#d-glow)' },
        duration : 0.7,
        ease     : 'power2.inOut'
      }, '+=0.05')

      /* ── Phase 3: pause on D ── */
      .to({}, { duration: 1.1 })

      /* ── Phase 4: D zooms into portal ──
         Scale the entire SVG from center so the D fills then swallows the screen */
      .to(ldSvg, {
        scale    : 32,
        duration : 1.5,
        ease     : 'power3.in',
        transformOrigin: '50% 50%'
      })

      /* ── Phase 5: loader fades, site revealed beneath ── */
      .to(loader, {
        opacity  : 0,
        duration : 0.5,
        ease     : 'power1.in',
        onStart() {
          document.body.classList.add('has-loaded');
          gsap.set(site, { visibility: 'visible' });
          gsap.to(site, { opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.1 });
        },
        onComplete() {
          loader.style.display = 'none';
          initAfterLoader();
        }
      }, '-=0.4');
  }
}

/* ────────────────────────────────────────────────────────────
   6.  HERO ANIMATIONS  (called after loader)
──────────────────────────────────────────────────────────── */
function initHero() {
  // Reveal hero elements hidden during cinematic background transition
  gsap.set('.hero-center, .hero-ghost, .scroll-hint', { opacity: 1 });

  const tl = gsap.timeline({ delay: 0.15 });

  /* Masked word-slide reveal — each .h1-inner slides up from behind .h1-line (overflow:hidden) */
  tl.from('.h1-inner', {
      y       : '112%',
      duration: 1.05,
      ease    : 'power4.out',
      stagger : 0.16
    })
    .from('.hero-eyebrow', {
      opacity : 0,
      y       : 12,
      duration: 0.9,
      ease    : 'power3.out'
    }, 0.15)
    .from('.hero-sub', {
      opacity : 0,
      duration: 0.9,
      ease    : 'power3.out'
    }, 0.55)
    .from('.scroll-hint', {
      opacity : 0,
      duration: 0.7
    }, 0.85);

  /* ── Mouse parallax on ghost number + title ── */
  document.addEventListener('mousemove', e => {
    const cx = (e.clientX / window.innerWidth  - 0.5);
    const cy = (e.clientY / window.innerHeight - 0.5);

    gsap.to('.hero-ghost', {
      x       : cx * 28,
      y       : cy * 14,
      duration: 1.6,
      ease    : 'power1.out'
    });
    gsap.to('.hero-h1', {
      x       : cx * 8,
      y       : cy * 4,
      duration: 1.8,
      ease    : 'power1.out'
    });
  });
}

/* ────────────────────────────────────────────────────────────
   7.  STORY  — storytelling card and staggered line reveals
──────────────────────────────────────────────────────────── */
function initStory() {
  const card = document.querySelector('.story-premium-card');
  const lines = gsap.utils.toArray('.story-line');

  if (!card) return;

  // Animate the premium card itself (fade-in & move upward slightly)
  gsap.fromTo(card,
    { opacity: 0, y: 60 },
    {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    }
  );

  // Animate each sentence individually as it enters the viewport during scroll
  lines.forEach((line) => {
    gsap.fromTo(line,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: line,
          start: 'top 82%',
          toggleActions: 'play none none reverse'
        }
      }
    );
  });
}

/* ────────────────────────────────────────────────────────────
   8.  SECTION HEADERS
──────────────────────────────────────────────────────────── */
function initSectionHeaders() {
  gsap.utils.toArray('.sec-header').forEach(hdr => {
    /* h2 words slide up */
    const h2 = hdr.querySelector('.sec-h2');
    if (h2) {
      const split = new SplitType(h2, { types: 'words' });
      gsap.from(split.words, {
        y        : 40,
        opacity  : 0,
        duration : 0.85,
        ease     : 'power3.out',
        stagger  : 0.08,
        scrollTrigger: { trigger: hdr, start: 'top 82%' }
      });
    }
  });
}

/* ────────────────────────────────────────────────────────────
   9.  JOURNEY — week cards stagger in
──────────────────────────────────────────────────────────── */
function initJourney() {
  gsap.to('.wk-card', {
    opacity : 1,
    y       : 0,
    duration: 0.8,
    ease    : 'power3.out',
    stagger : 0.12,
    scrollTrigger: {
      trigger: '.week-grid',
      start  : 'top 80%'
    }
  });
}


/* ────────────────────────────────────────────────────────────
   11.  SKILLS  — rows slide in + numbers fade
──────────────────────────────────────────────────────────── */
function initSkills() {
  const rows = gsap.utils.toArray('.sk-row');

  rows.forEach(row => {
    const text = row.querySelector('.sk-text');
    const num  = row.querySelector('.sk-num');

    gsap.to(text, {
      opacity  : 1,
      x        : 0,
      duration : 0.85,
      ease     : 'power3.out',
      scrollTrigger: {
        trigger      : row,
        start        : 'top 87%',
        toggleActions: 'play none none reverse'
      }
    });

    gsap.to(num, {
      opacity  : 1,
      duration : 0.6,
      delay    : 0.18,
      scrollTrigger: {
        trigger      : row,
        start        : 'top 87%',
        toggleActions: 'play none none reverse'
      }
    });
  });
}

/* ────────────────────────────────────────────────────────────
   12.  THANK YOU  — cascade fade
──────────────────────────────────────────────────────────── */
function initThankyou() {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#thanks',
      start  : 'top 65%',
      once   : true
    }
  });

  tl.to('.ty-h2', {
      opacity : 1,
      y       : 0,
      duration: 1.1,
      ease    : 'power3.out'
    })
    .to('.ty-p', {
      opacity : 1,
      duration: 0.75,
      ease    : 'power3.out',
      stagger : 0.16
    }, 0.3)
    .to('.ty-credits', {
      opacity : 1,
      duration: 0.85,
      ease    : 'power3.out'
    }, 0.75)
    .to('.ty-action-wrap', {
      opacity : 1,
      y       : 0,
      duration: 0.85,
      ease    : 'power3.out'
    }, 1.0);
}

/* ────────────────────────────────────────────────────────────
   13.  NAV  — hide on scroll down, show on scroll up
──────────────────────────────────────────────────────────── */
function initNav() {
  let prevScroll = 0;
  const nav = document.getElementById('nav');

  lenis.on('scroll', ({ scroll }) => {
    if (scroll > prevScroll && scroll > 100) {
      gsap.to(nav, { y: -80, duration: 0.4, ease: 'power2.in' });
    } else {
      gsap.to(nav, { y: 0, duration: 0.55, ease: 'power2.out' });
    }
    prevScroll = scroll;
  });
}

/* ────────────────────────────────────────────────────────────
   14.  WEEK MODALS
──────────────────────────────────────────────────────────── */
function openWeekModal(weekNum) {
  const modal = document.getElementById('wk-modal');

  /* Show the correct pane */
  document.querySelectorAll('.wk-modal-pane').forEach(p => p.classList.remove('is-active'));
  const pane = document.getElementById(`wm-${weekNum}`);
  if (!pane) return;
  pane.classList.add('is-active');

  /* Make modal visible & accessible */
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  activeWeek = weekNum;

  /* Pause smooth scroll while modal is open */
  if (lenis) lenis.stop();
  document.body.style.overflow = 'hidden';

  /* Determine origin from last clicked card position */
  const card = document.querySelector(`.wk-card[data-week="${weekNum}"]`);
  let ox = '50%', oy = '50%';
  if (card) {
    const r = card.getBoundingClientRect();
    ox = (r.left + r.width  / 2) + 'px';
    oy = (r.top  + r.height / 2) + 'px';
  }

  /* Reset items first */
  const items = pane.querySelectorAll('.wm-list li');
  gsap.set(items, { opacity: 0, y: 18 });
  gsap.set('.wm-meta', { opacity: 0, y: 20 });

  /* Clip-path circle expands from card origin */
  gsap.to(modal, {
    clipPath : `circle(150% at ${ox} ${oy})`,
    duration : 0.85,
    ease     : 'power3.inOut',
    onComplete() {
      /* Animate modal content in */
      gsap.to('.wm-meta', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
      gsap.to(items, {
        opacity : 1,
        y       : 0,
        duration: 0.55,
        ease    : 'power3.out',
        stagger : 0.09,
        delay   : 0.1
      });
      /* Move focus to close button */
      document.getElementById('modal-close-btn').focus();
    }
  });
}

function closeWeekModal() {
  const modal = document.getElementById('wk-modal');
  if (!modal.classList.contains('is-open')) return;

  const card = activeWeek
    ? document.querySelector(`.wk-card[data-week="${activeWeek}"]`)
    : null;
  let ox = '50%', oy = '50%';
  if (card) {
    const r = card.getBoundingClientRect();
    ox = (r.left + r.width  / 2) + 'px';
    oy = (r.top  + r.height / 2) + 'px';
  }

  gsap.to(modal, {
    clipPath : `circle(0% at ${ox} ${oy})`,
    duration : 0.65,
    ease     : 'power3.inOut',
    onComplete() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      activeWeek = null;
      if (lenis) lenis.start();
      document.body.style.overflow = '';
    }
  });
}

/* ────────────────────────────────────────────────────────────
   15.  EVENT LISTENERS & INTERACTION
──────────────────────────────────────────────────────────── */
function initEvents() {
  /* Week cards click → open modal */
  document.querySelectorAll('.wk-card').forEach(card => {
    card.addEventListener('click', () => {
      const weekNum = parseInt(card.dataset.week, 10);
      if (weekNum) openWeekModal(weekNum);
    });
  });

  /* Modal close button click */
  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeWeekModal);
  }

  /* Close modal on ESC keypress */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeWeekModal();
  });

  /* Close modal when clicking on the backdrop (outside the pane content) */
  const modal = document.getElementById('wk-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeWeekModal();
      }
    });
  }
}

/* ────────────────────────────────────────────────────────────
   16.  POST-LOADER INIT (runs after loader completes)
──────────────────────────────────────────────────────────── */
function initAfterLoader() {
  initLenis();
  initNav();
  
  // Set initial state of hero contents to be invisible
  gsap.set('.hero-center, .hero-ghost, .scroll-hint', { opacity: 0 });

  // Start background memory image cinematic sequence
  runCinematicBackground();

  initStory();
  initSectionHeaders();
  initJourney();
  initSkills();
  initThankyou();
  initThankYouOverlay();
  initParallax();
  initQuoteSection();
  initJourneyLine();
  initTeamSection();
  initEvents();

  /* Refresh ScrollTrigger once everything is laid out */
  setTimeout(() => ScrollTrigger.refresh(), 300);
}

/* ────────────────────────────────────────────────────────────
   16.5. CINEMATIC MEMORY BACKGROUND TRANSITION
──────────────────────────────────────────────────────────── */
function runCinematicBackground() {
  const bg = document.getElementById('hero-mem-bg');
  const img = bg ? bg.querySelector('img') : null;
  const overlay = bg ? bg.querySelector('.hero-mem-overlay') : null;

  if (!bg || !img || !overlay) {
    initHero();
    return;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      // Trigger hero text animations after cinematic fade
      initHero();
    }
  });

  tl
    // Step 1: Fullscreen my.jpg fades in (opacity: 1)
    .to(bg, {
      opacity: 1,
      duration: 1.2,
      ease: 'power2.out'
    })
    // Step 2: Keep visible for about 1.5 seconds
    .to({}, { duration: 1.5 })
    // Step 3: Gradually fade the image into background (low opacity, blur, overlay)
    .to(bg, {
      opacity: 0.22,
      duration: 1.5,
      ease: 'power2.inOut'
    })
    .to(img, {
      filter: 'blur(3px)',
      duration: 1.5,
      ease: 'power2.inOut'
    }, '<')
    .to(overlay, {
      backgroundColor: 'rgba(255, 255, 255, 0.45)', // soft white overlay
      duration: 1.5,
      ease: 'power2.inOut'
    }, '<');
}

/* ────────────────────────────────────────────────────────────
   17.  PARALLAX SCROLL  (subtle depth on section headings)
──────────────────────────────────────────────────────────── */
function initParallax() {
  /* Ghost letters in section tags drift slower than scroll */
  gsap.utils.toArray('.sec-tag').forEach(tag => {
    gsap.to(tag, {
      y: -60,
      ease: 'none',
      scrollTrigger: {
        trigger: tag,
        start  : 'top bottom',
        end    : 'bottom top',
        scrub  : 1.5
      }
    });
  });
}

/* ────────────────────────────────────────────────────────────
   18.  QUOTE SECTION ANIMATION
   "EVERY STEP / TAUGHT SOMETHING" entrance, brief hold, and exit
──────────────────────────────────────────────────────────── */
function initQuoteSection() {
  const l1 = document.getElementById('qs-l1');
  const l2 = document.getElementById('qs-l2');
  if (!l1 || !l2) return;

  // Set initial states: off-screen left, scaled down, invisible
  gsap.set([l1, l2], { x: -250, scale: 0.8, opacity: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#quote-sec',
      start: 'top top',
      end: '+=1600',
      pin: true,
      pinSpacing: true,
      scrub: 1.2,
    }
  });

  tl
    // ── Entrance Phase ──
    .to(l1, {
      x: 0,
      scale: 1,
      opacity: 1,
      duration: 1.2,
      ease: 'back.out(1.5)'
    })
    .to(l2, {
      x: 0,
      scale: 1,
      opacity: 1,
      duration: 1.2,
      ease: 'back.out(1.5)'
    }, '-=0.7')

    // ── Hold Phase ──
    .to({}, { duration: 1.0 })

    // ── Exit Phase ──
    .to(l1, {
      x: 250,
      scale: 0.8,
      opacity: 0,
      duration: 1.2,
      ease: 'back.in(1.5)'
    })
    .to(l2, {
      x: 250,
      scale: 0.8,
      opacity: 0,
      duration: 1.2,
      ease: 'back.in(1.5)'
    }, '-=0.7');
}

/* ────────────────────────────────────────────────────────────
   19.  ANIMATED BLUE JOURNEY LINE & PHOTO
   Phase A — line draws via onUpdate (no scrub, no lag).
   Phase B — lenis.stop() locks viewport; image free-runs to center.
   Phase C — 1 s cinematic pause; lenis.start() + scrollTo past pin.
──────────────────────────────────────────────────────────── */
function initJourneyLine() {
  const mainPath = document.getElementById('journey-path');
  const glowPath = document.getElementById('journey-path-glow');
  const imgWrap  = document.getElementById('ls-image');
  if (!mainPath || !glowPath || !imgWrap) return;

  const len = mainPath.getTotalLength();
  [mainPath, glowPath].forEach(p => {
    p.style.strokeDasharray  = len;
    p.style.strokeDashoffset = len;
  });

  /* Ensure no leftover transforms on the image */
  gsap.set(imgWrap, { x: 0, y: 0, scale: 1, rotation: 0 });

  let imageAnimated = false;
  let lineST;          /* reference kept so we can read lineST.end later */

  /* ── Phase B + C ───────────────────────────────────────────
     animateImageToCenter() is called exactly once, the moment
     the line reaches 98 % of its path.

     Maths (section is now 100vh, pinned flush to viewport top):
       CSS left  = 60 px
       CSS width = 400 px → element centre from left = 60 + 200 = 260 px
       Viewport centre = window.innerWidth / 2
       Required GSAP x-offset = (window.innerWidth / 2) − 260

     With transformOrigin "center center" and scale 1.875:
       Rendered width  = 400 × 1.875 = 750 px  (≈ 750 px as requested)
       Visual centre stays at the same pixel → lands on viewport centre ✓

     Vertical: section is 100vh, image CSS top = calc(50% − 150px)
       → element centre = 50vh = viewport vertical centre ✓
  ─────────────────────────────────────────────────────────── */
  function animateImageToCenter() {
    if (imageAnimated) return;
    imageAnimated = true;

    /* Freeze the page — viewport stays locked during the cinematic reveal */
    if (lenis) lenis.stop();

    const targetX = window.innerWidth / 2 - 260;

    gsap.timeline({ defaults: { ease: 'sine.inOut' } })

      /* 1 — Lift gently off its resting spot */
      .to(imgWrap, {
        y       : -45,
        duration: 0.4,
        ease    : 'power2.out'
      })

      /* 2 — ¼ across: sway right, begin to rise */
      .to(imgWrap, {
        x       : targetX * 0.25,
        y       : -70,
        scale   : 1.2,
        rotation: 2,
        duration: 0.55
      })

      /* 3 — ½ across: dip gently, lean left */
      .to(imgWrap, {
        x       : targetX * 0.5,
        y       : -28,
        scale   : 1.45,
        rotation: -1.5,
        duration: 0.55
      })

      /* 4 — ¾ across: rise again, sway right */
      .to(imgWrap, {
        x       : targetX * 0.75,
        y       : -58,
        scale   : 1.7,
        rotation: 2.5,
        duration: 0.5
      })

      /* 5 — Arrive at exact viewport centre */
      .to(imgWrap, {
        x       : targetX,
        y       : -10,
        scale   : 1.875,     /* 750 px wide */
        rotation: 0,
        duration: 0.45,
        ease    : 'power2.out'
      })

      /* 6 — Bounce-settle onto the centre baseline */
      .to(imgWrap, {
        y       : 0,
        duration: 0.9,
        ease    : 'bounce.out',
        onComplete() {
          /* Perpetual water-float on the inner frame */
          gsap.to('#ls-frame', {
            y       : '+=10',
            rotation: 1.2,
            duration: 3.2,
            repeat  : -1,
            yoyo    : true,
            ease    : 'sine.inOut'
          });

          /* ── Reveal THE TEAM section immediately ─────────
             revealTeamSection is set by initTeamSection().
             Calling it here guarantees it fires only after the
             image has fully settled in the centre.
          ─────────────────────────────────────────────────── */
          if (typeof window.revealTeamSection === 'function') {
            window.revealTeamSection();
          }

          /* ── Phase C ───────────────────────────────────────
             Hold the cinematic frame for 1 second, then resume
             scrolling and advance cleanly past the pin boundary.
          ─────────────────────────────────────────────────── */
          gsap.delayedCall(1.0, () => {
            if (lenis) {
              lenis.start();
              /* Scroll to 10 px past the ScrollTrigger end so the pin
                 releases smoothly instead of waiting for user input */
              if (lineST) {
                lenis.scrollTo(lineST.end + 10, {
                  duration: 0.9,
                  easing  : t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
                });
              }
            }
          });
        }
      });
  }

  /* ── Phase A ───────────────────────────────────────────────
     Pin the section and drive line progress via onUpdate.
     onUpdate fires on every scroll tick; values are the raw
     scroll ratio [0 – 1], with no scrub lag at all.
     Image is not referenced here → it stays perfectly still.
  ─────────────────────────────────────────────────────────── */
  lineST = ScrollTrigger.create({
    trigger   : '#line-sec',
    start     : 'top top',
    end       : '+=1800',
    pin       : true,
    pinSpacing: true,
    onUpdate(self) {
      /* Draw line proportionally to how far the user has scrolled */
      const offset = len * (1 - self.progress);
      mainPath.style.strokeDashoffset = offset;
      glowPath.style.strokeDashoffset = offset;

      /* Trigger image animation the instant the line reaches the right edge */
      if (self.progress >= 0.98 && !imageAnimated) {
        animateImageToCenter();
      }
    }
  });
}

/* ────────────────────────────────────────────────────────────
   20.  THE TEAM SECTION — marquee reveal
   Hidden by default (.team-hidden). Revealed by revealTeamSection()
   which is called from initJourneyLine's Phase C onComplete.
   Marquee starts when the section enters the viewport.
──────────────────────────────────────────────────────────── */
function initTeamSection() {
  const sec    = document.getElementById('team-sec');
  const track1 = document.getElementById('marquee-track-1');
  const track2 = document.getElementById('marquee-track-2');
  if (!sec || !track1 || !track2) return;

  let fwdTween       = null;
  let revTween       = null;
  let marqueeStarted = false;

  /* ── Build the two infinite marquee tweens ─────────────────
     Each track holds 16 items (8 real + 8 clones).
     We animate x from 0 → -(half track width) and use the
     modifiers plugin to wrap the value, producing a seamless
     infinite scroll with no CSS keyframes at all.
  ─────────────────────────────────────────────────────────── */
  function buildMarquee() {
    const half1 = track1.scrollWidth / 2;
    const half2 = track2.scrollWidth / 2;

    /* Row 1 — scrolls Left → Right (x: -half → 0, wraps) */
    gsap.set(track1, { x: -half1 });
    fwdTween = gsap.to(track1, {
      x        : 0,
      duration : 18,
      ease     : 'none',
      repeat   : -1,
      paused   : true,
      modifiers: {
        x(val) {
          return `${gsap.utils.wrap(-half1, 0, parseFloat(val))}px`;
        }
      }
    });

    /* Row 2 — scrolls Right → Left (x: 0 → -half, wraps) */
    gsap.set(track2, { x: 0 });
    revTween = gsap.to(track2, {
      x        : -half2,
      duration : 18,
      ease     : 'none',
      repeat   : -1,
      paused   : true,
      modifiers: {
        x(val) {
          return `${gsap.utils.wrap(-half2, 0, parseFloat(val))}px`;
        }
      }
    });
  }

  function startMarquee() {
    if (marqueeStarted) return;
    marqueeStarted = true;
    if (fwdTween) fwdTween.play();
    if (revTween) revTween.play();
  }

  /* ── Public hook: called by initJourneyLine's onComplete ──
     Revealed only after the image has fully settled in centre.
  ─────────────────────────────────────────────────────────── */
  window.revealTeamSection = function () {
    buildMarquee();   /* measure track width now that layout is stable */

    /* Fade the section in smoothly */
    sec.classList.remove('team-hidden');
    sec.classList.add('team-visible');

    /* Recalculate ScrollTrigger positions for the new section height */
    ScrollTrigger.refresh();

    /* Start marquee the first time the section enters the viewport */
    ScrollTrigger.create({
      trigger: '#team-sec',
      start  : 'top 85%',
      once   : true,
      onEnter: startMarquee
    });
  }; /* end window.revealTeamSection */
} /* end initTeamSection */

/* ────────────────────────────────────────────────────────────
   21.  THANK YOU OVERLAY INTERACTION & TIMELINE
   Triggered by "View Special Thank You" button.
   Desktop: Pinned scrollable animation inside fixed overlay.
   Mobile: Stacked responsive fallback scroll.
──────────────────────────────────────────────────────────── */
function initThankYouOverlay() {
  const overlay  = document.getElementById('thank-you-overlay');
  const btn      = document.getElementById('view-thanks-btn');
  const closeBtn = document.getElementById('overlay-close-btn');
  const imgWrap  = document.getElementById('overlay-img-wrap');
  const lines    = gsap.utils.toArray('#thank-you-overlay .overlay-line');

  if (!overlay || !btn || !closeBtn || !imgWrap) return;

  const isDesktop = window.matchMedia('(min-width: 992px)').matches;

  /* Helper to calculate center & right positions for desktop image positioning */
  function calcOverlayPos() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Retrieve active width based on clamp(340px, 30vw, 480px)
    let imgW = vw * 0.3;
    if (imgW < 340) imgW = 340;
    if (imgW > 480) imgW = 480;

    // Aspect ratio 2 / 3
    const imgH = imgW * 1.5;

    /* Center of viewport */
    const cx = (vw - imgW) / 2;
    const cy = (vh - imgH) / 2;

    /* Right side: 52px margin from right, vertically centered */
    const rx = vw - imgW - 52;
    const ry = cy;

    return { cx, cy, rx, ry };
  }

  let overlayTL = null;

  function initOverlayScrollTrigger() {
    if (overlayTL) {
      overlayTL.scrollTrigger.kill();
      overlayTL.kill();
    }

    if (isDesktop) {
      overlayTL = gsap.timeline({
        scrollTrigger: {
          trigger: '.overlay-pin-section',
          scroller: '.overlay-scroll-container',
          start: 'top top',
          end: '+=2000',
          pin: true,
          pinSpacing: true,
          scrub: 1.5,
          onRefresh() {
            const p = calcOverlayPos();
            gsap.set(imgWrap, { left: p.cx, top: p.cy });
          }
        }
      });

      // Step 4 — Scroll-based Image Movement: Center to Right
      overlayTL.to(imgWrap, {
        left: () => calcOverlayPos().rx,
        top: () => calcOverlayPos().ry,
        rotation: 1.5, // subtle tilt during motion
        duration: 1.5,
        ease: 'power3.inOut',
        onComplete() {
          // Gentle perpetual float on scroll complete
          gsap.to(imgWrap, {
            y: 8,
            rotation: 0,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
          });
        }
      });

      // Hold briefly
      overlayTL.to({}, { duration: 0.3 });

      // Step 5 — Line-by-line reveal on the left side
      lines.forEach((line, i) => {
        overlayTL.to(line, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out'
        }, i === 0 ? '+=0.1' : '+=0.35');
      });

      ScrollTrigger.refresh();
    }
  }

  /* Listeners to open overlay */
  btn.addEventListener('click', () => {
    // Show Overlay Container with smooth fade
    gsap.to(overlay, {
      opacity: 1,
      duration: 0.6,
      ease: 'power2.out',
      onStart() {
        overlay.style.display = 'block';
        overlay.setAttribute('aria-hidden', 'false');

        // Destroy Lenis completely so it doesn't hijack wheel events inside scroller
        if (window.lenis) {
          window.lenis.destroy();
          window.lenis = null;
        }
        document.body.style.overflow = 'hidden';

        // Reset scroll position within the overlay scroller
        const scroller = document.querySelector('.overlay-scroll-container');
        if (scroller) scroller.scrollTop = 0;

        // Set initial state of image and lines
        if (isDesktop) {
          const p = calcOverlayPos();
          gsap.set(imgWrap, {
            position: 'absolute',
            visibility: 'visible',
            left: p.cx,
            top: p.cy,
            right: 'auto',
            transform: 'none',
            opacity: 0,
            scale: 0.8,
            rotation: 0
          });
        } else {
          gsap.set(imgWrap, { opacity: 0, scale: 0.8 });
        }
        gsap.set(lines, { opacity: 0, y: 24 });
      },
      onComplete() {
        // Step 3 — Pop image into exact center of viewport
        gsap.to(imgWrap, {
          opacity: 1,
          scale: 1,
          duration: 0.9,
          ease: 'back.out(1.4)',
          onComplete() {
            // Initialize scroll trigger once image pop is completed
            initOverlayScrollTrigger();
          }
        });
      }
    });
  });

  /* Listeners to close overlay */
  closeBtn.addEventListener('click', () => {
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.inOut',
      onComplete() {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        
        // Clean up timeline and ScrollTrigger
        if (overlayTL) {
          overlayTL.scrollTrigger.kill();
          overlayTL.kill();
          overlayTL = null;
        }

        // Reset scroll position within the overlay
        const scroller = document.querySelector('.overlay-scroll-container');
        if (scroller) scroller.scrollTop = 0;

        // Reset positions
        gsap.set(imgWrap, { opacity: 0, scale: 0.8 });
        gsap.set(lines, { opacity: 0, y: 24 });

        // Restore body scroll and re-init Lenis
        document.body.style.overflow = '';
        initLenis();

        // Restore ScrollTrigger layout parameters
        ScrollTrigger.refresh();
      }
    });
  });

  /* Fallback: Mobile scroll reveal within the scroll container */
  if (!isDesktop) {
    const scroller = document.querySelector('.overlay-scroll-container');
    if (scroller) {
      scroller.addEventListener('scroll', () => {
        if (scroller.scrollTop > 100) {
          gsap.to(lines, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.25,
            ease: 'power2.out'
          });
        }
      });
    }
  }
}



/* processImageBackground has been intentionally removed.
   It ran a canvas BFS flood-fill that erased white-connected pixels from
   office.jpg, causing the office photograph to disappear during the line animation.
   The office image now displays with its original colours intact. */

/* ────────────────────────────────────────────────────────────
   BOOT — runs on DOMContentLoaded
──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initCursor();    /* Custom cursor + hover states */
  initRipple();    /* Water-ripple canvas effect   */
  initLoader();    /* Cinematic loader sequence    */
  /* All other inits happen inside initAfterLoader()
     which is called at the end of the loader animation */
});
