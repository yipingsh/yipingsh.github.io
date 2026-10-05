document.documentElement.classList.remove('no-js');


(function () {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── FOOTER YEAR ───────────────────────────────────────────
    document.getElementById('year').textContent = new Date().getFullYear();

    // ── SCROLL PROGRESS BAR + NAV STATE ───────────────────────
    const progressBar = document.getElementById('progress-bar');
    const nav = document.getElementById('nav');

    function onScroll() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const progress = max > 0 ? window.scrollY / max : 0;
        progressBar.style.width = (progress * 100) + '%';
        nav.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.6);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    // ── ACTIVE NAV LINK ───────────────────────────────────────
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = [...navLinks].map(l => document.querySelector(l.getAttribute('href')));

    const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const idx = sections.indexOf(entry.target);
            navLinks.forEach((l, i) => l.classList.toggle('active', i === idx));
        });
    }, { rootMargin: '-45% 0px -54% 0px' });
    sections.forEach(s => s && sectionObserver.observe(s));

    // ── SCROLL REVEAL ─────────────────────────────────────────
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ── MOBILE MENU ───────────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const overlay = document.getElementById('mobile-overlay');

    function setMenu(open) {
        hamburger.classList.toggle('open', open);
        overlay.classList.toggle('open', open);
        document.body.style.overflow = open ? 'hidden' : '';
    }
    hamburger.addEventListener('click', () => setMenu(!overlay.classList.contains('open')));
    overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

    // ── CV PLACEHOLDER ────────────────────────────────────────
    const toast = document.getElementById('toast');
    let toastTimer;
    document.getElementById('cv-button').addEventListener('click', () => {
        toast.textContent = 'My CV is still being finalised. Check back soon!';
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
    });

    // ── KINETIC DOT GRID (HERO BACKGROUND) ────────────────────
    const hero = document.getElementById('hero');
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');

    const config = {
        spacing: 36,
        baseRadius: 2,
        maxRadius: 10,
        influence: 340,
        spring: 0.18,
        damping: 0.52,
        repulsion: 5,

        rippleSpeed: 9,
        rippleMax: 880,
        rippleThickness: 48,
        rippleForce: 9
    };

    function cssRgb(name) {
        const [r, g, b] = getComputedStyle(document.documentElement).getPropertyValue(name).split(',').map(Number);
        return { r, g, b };
    }
    const colors = {
        base: cssRgb('--dot-base'),
        hover: cssRgb('--dot-hover'),
        wave: cssRgb('--dot-wave')
    };

    let width = 0, height = 0;
    let dots = [];
    let ripples = [];
    let running = false;
    const pointer = { x: -9999, y: -9999, px: -9999, py: -9999, down: false };

    function initGrid() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = hero.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        dots = [];
        const offX = (width % config.spacing) / 2 + config.spacing / 2;
        const offY = (height % config.spacing) / 2 + config.spacing / 2;
        for (let y = offY; y < height; y += config.spacing) {
            for (let x = offX; x < width; x += config.spacing) {
                dots.push({ ox: x, oy: y, x, y, vx: 0, vy: 0 });
            }
        }
        if (reducedMotion) drawFrame(false);
    }

    function mix(a, b, t) {
        return Math.round(a + (b - a) * t);
    }

    function drawFrame(simulate) {
        ctx.clearRect(0, 0, width, height);

        if (simulate) {
            ripples.forEach(r => {
                r.radius += config.rippleSpeed;
                r.alpha = 1 - r.radius / config.rippleMax;
            });
            ripples = ripples.filter(r => r.alpha > 0);
        }

        const { base: c0, hover: c1, wave: c2 } = colors;

        for (const d of dots) {
            const mdx = d.x - pointer.x;
            const mdy = d.y - pointer.y;
            const mDist = Math.hypot(mdx, mdy);

            if (simulate) {
                // spring back home
                d.vx += (d.ox - d.x) * config.spring;
                d.vy += (d.oy - d.y) * config.spring;

                // push away from the cursor
                if (mDist < config.influence && mDist > 0.01) {
                    const f = Math.pow(1 - mDist / config.influence, 2) * config.repulsion;
                    d.vx += (mdx / mDist) * f;
                    d.vy += (mdy / mDist) * f;
                }

                // click shockwaves
                for (const r of ripples) {
                    const rdx = d.x - r.x;
                    const rdy = d.y - r.y;
                    const rDist = Math.hypot(rdx, rdy) || 0.01;
                    const diff = Math.abs(rDist - r.radius);
                    if (diff < config.rippleThickness) {
                        const f = (1 - diff / config.rippleThickness) * r.alpha * config.rippleForce * r.strength;
                        d.vx += (rdx / rDist) * f;
                        d.vy += (rdy / rDist) * f;
                    }
                }

                d.vx *= config.damping;
                d.vy *= config.damping;
                d.x += d.vx;
                d.y += d.vy;
            }

            const near = mDist < config.influence ? Math.pow(1 - mDist / config.influence, 2) : 0;
            const speed = Math.hypot(d.vx, d.vy);
            const radius = Math.min(config.baseRadius + (config.maxRadius - config.baseRadius) * near + speed * 0.35, 16);

            const tHover = Math.min(1, near);
            const tWave = Math.min(1, speed / 5);
            let r = mix(c0.r, c1.r, tHover), g = mix(c0.g, c1.g, tHover), b = mix(c0.b, c1.b, tHover);
            r = mix(r, c2.r, tWave * (1 - tHover));
            g = mix(g, c2.g, tWave * (1 - tHover));
            b = mix(b, c2.b, tWave * (1 - tHover));

            ctx.beginPath();
            ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fill();
        }
    }

    function loop() {
        if (!running) return;
        drawFrame(true);
        requestAnimationFrame(loop);
    }

    function start() {
        if (running || reducedMotion) return;
        running = true;
        requestAnimationFrame(loop);
    }

    function stop() {
        running = false;
    }

    // Only animate while the hero is on screen
    new IntersectionObserver(([entry]) => {
        entry.isIntersecting ? start() : stop();
    }).observe(hero);

    function localPoint(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
        return { x, y, inside };
    }

    function movePointer(clientX, clientY) {
        const p = localPoint(clientX, clientY);
        if (!p.inside) {
            pointer.x = pointer.y = -9999;
            pointer.down = false;
            return;
        }
        pointer.px = pointer.x;
        pointer.py = pointer.y;
        pointer.x = p.x;
        pointer.y = p.y;

        // dragging leaves a trail of small ripples
        if (pointer.down && Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py) > 25) {
            ripples.push({ x: p.x, y: p.y, radius: 0, alpha: 1, strength: 0.4 });
        }
    }

    function pressPointer(clientX, clientY) {
        const p = localPoint(clientX, clientY);
        if (!p.inside) return;
        pointer.down = true;
        pointer.x = p.x;
        pointer.y = p.y;
        ripples.push({ x: p.x, y: p.y, radius: 0, alpha: 1, strength: 1 });
    }

    window.addEventListener('mousemove', e => movePointer(e.clientX, e.clientY));
    window.addEventListener('mousedown', e => { if (e.button === 0) pressPointer(e.clientX, e.clientY); });
    window.addEventListener('mouseup', () => { pointer.down = false; });
    document.addEventListener('mouseleave', () => { pointer.x = pointer.y = -9999; pointer.down = false; });

    window.addEventListener('touchstart', e => {
        const t = e.touches[0];
        if (t) pressPointer(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchmove', e => {
        const t = e.touches[0];
        if (t) movePointer(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchend', () => {
        pointer.down = false;
        pointer.x = pointer.y = -9999;
    });

    // Rebuild grid on resize (debounced)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initGrid, 120);
    });

    initGrid();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(initGrid);
})();
