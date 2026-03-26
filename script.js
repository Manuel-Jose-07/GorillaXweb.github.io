/* ==========================================
   GORILLA X — script.js
   Optimized scroll · Cart · Helmet Canvas
========================================== */

'use strict';

/* ============================================================
   SECTION 1: PRELOADER — Brief fade
   Total display time: ~1.2s max
   Logo fades in over 0.7s → page loads → 0.3s hold → fade out
============================================================ */
(function initPreloader() {
    const pre = document.getElementById('preloader');
    const body = document.body;
    const MIN = 1200; // ms minimum display
    const t0 = Date.now();

    function dismiss() {
        const wait = Math.max(0, MIN - (Date.now() - t0));
        setTimeout(() => {
            pre.classList.add('hidden');
            body.classList.remove('loading');
        }, wait);
    }

    if (document.readyState === 'complete') {
        dismiss();
    } else {
        window.addEventListener('load', dismiss, { once: true });
    }
})();


/* ============================================================
   SECTION 2: SCROLL OPTIMISATION
   RAF-throttled single scroll handler.
   Uses passive listeners throughout.
============================================================ */
const header = document.getElementById('mainHeader');
let rafPending = false;
let lastY = 0;

window.addEventListener('scroll', () => {
    lastY = window.scrollY;
    if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
            handleScroll(lastY);
            rafPending = false;
        });
    }
}, { passive: true });

function handleScroll(y) {
    header.classList.toggle('scrolled', y > 60);
}


/* ============================================================
   SECTION 3: REVEAL ON SCROLL (IntersectionObserver)
   Single observer for all .reveal / .reveal-r elements.
   Respects --d (delay) CSS custom property on cards.
============================================================ */
(function initReveal() {
    const els = document.querySelectorAll('.reveal, .reveal-r');
    if (!els.length) return;

    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const delay = getComputedStyle(e.target).getPropertyValue('--d') || '0ms';
                e.target.style.transitionDelay = delay;
                e.target.classList.add('visible');
                io.unobserve(e.target);

                // Animate tech bars when tech section visible
                e.target.querySelectorAll && e.target.querySelectorAll('.tbb-fill').forEach(b => b.classList.add('animated'));
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => io.observe(el));

    // Tech bars may be in a separate parent — observe the tech section too
    const techSection = document.getElementById('tecnologia');
    if (techSection) {
        const barObs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.querySelectorAll('.tbb-fill').forEach(b => b.classList.add('animated'));
                    barObs.unobserve(e.target);
                }
            });
        }, { threshold: 0.2 });
        barObs.observe(techSection);
    }
})();


/* ============================================================
   SECTION 4: CART — Full functional system
============================================================ */
const Cart = (function () {
    let items = []; // { id, name, price, qty }

    /* ---- DOM refs ---- */
    const openBtn = document.getElementById('openCart');
    const closeBtn = document.getElementById('closeCart');
    const overlay = document.getElementById('cartOverlay');
    const drawer = document.getElementById('cartDrawer');
    const itemsWrap = document.getElementById('cartItems');
    const badge = document.getElementById('cartBadge');
    const subtitle = document.getElementById('cartSubtitle');
    const subEl = document.getElementById('cartSub');
    const totEl = document.getElementById('cartTot');
    const cartBtn = document.getElementById('openCart');
    const btnCheckout = document.getElementById('btnCheckout');
    const btnContinue = document.getElementById('btnContinue');

    function open() { drawer.classList.add('open'); overlay.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); }
    function close() { drawer.classList.remove('open'); overlay.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); }

    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    btnContinue && btnContinue.addEventListener('click', close);
    btnCheckout && btnCheckout.addEventListener('click', () => {
        if (!items.length) { showToast('Tu carrito está vacío'); return; }
        showToast('¡Gracias! Procesando pedido…');
        setTimeout(() => { items = []; render(); close(); }, 800);
    });

    function uid(name) {
        return name.toLowerCase().replace(/\s+/g, '-');
    }

    function add(name, price) {
        const id = uid(name);
        const existing = items.find(i => i.id === id);
        if (existing) {
            existing.qty++;
        } else {
            items.push({ id, name, price: parseFloat(price), qty: 1 });
        }
        render();
        animateBadge();
        shakeCart();
    }

    function remove(id) {
        items = items.filter(i => i.id !== id);
        render();
    }

    function changeQty(id, delta) {
        const item = items.find(i => i.id === id);
        if (!item) return;
        item.qty += delta;
        if (item.qty <= 0) remove(id);
        else render();
    }

    function totalItems() { return items.reduce((s, i) => s + i.qty, 0); }
    function totalPrice() { return items.reduce((s, i) => s + i.price * i.qty, 0); }

    function render() {
        const count = totalItems();
        const total = totalPrice();

        badge.textContent = count;
        subtitle.textContent = `${count} artículo${count !== 1 ? 's' : ''}`;
        const fmt = n => n.toFixed(2) + '€';
        subEl.textContent = fmt(total);
        totEl.textContent = fmt(total);

        if (!items.length) {
            itemsWrap.innerHTML = `
                <div class="cart-empty">
                    <i class="ph ph-shopping-cart-simple"></i>
                    <p>Tu carrito está vacío</p>
                    <span>Añade equipación de élite</span>
                </div>`;
            return;
        }

        itemsWrap.innerHTML = items.map(item => `
            <div class="ci" data-id="${item.id}">
                <div class="ci-thumb">
                    <i class="ph-fill ph-helmet"></i>
                </div>
                <div class="ci-info">
                    <div class="ci-name">${item.name}</div>
                    <div class="ci-price">${item.price.toFixed(2)}€</div>
                    <div class="ci-qty">
                        <button class="qty-btn" data-action="dec" data-id="${item.id}" aria-label="Quitar uno">
                            <i class="ph ph-minus"></i>
                        </button>
                        <span class="qty-num">${item.qty}</span>
                        <button class="qty-btn" data-action="inc" data-id="${item.id}" aria-label="Añadir uno">
                            <i class="ph ph-plus"></i>
                        </button>
                    </div>
                </div>
                <button class="ci-remove" data-id="${item.id}" aria-label="Eliminar ${item.name}">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
        `).join('');

        // Delegate qty / remove events
        itemsWrap.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const act = btn.dataset.action;
                changeQty(id, act === 'inc' ? 1 : -1);
            });
        });
        itemsWrap.querySelectorAll('.ci-remove').forEach(btn => {
            btn.addEventListener('click', () => remove(btn.dataset.id));
        });
    }

    function animateBadge() {
        badge.classList.remove('bump');
        void badge.offsetWidth; // reflow
        badge.classList.add('bump');
        setTimeout(() => badge.classList.remove('bump'), 300);
    }
    function shakeCart() {
        cartBtn.classList.remove('shake');
        void cartBtn.offsetWidth;
        cartBtn.classList.add('shake');
        setTimeout(() => cartBtn.classList.remove('shake'), 400);
    }

    /* Flying particle animation */
    function flyParticle(fromX, fromY) {
        const prt = document.createElement('div');
        prt.className = 'cart-prt';
        prt.style.cssText = `left:${fromX}px;top:${fromY}px;`;
        document.body.appendChild(prt);

        const cartIco = cartBtn.querySelector('i');
        const r = cartIco.getBoundingClientRect();
        const dx = r.left + r.width / 2 - fromX;
        const dy = r.top + r.height / 2 - fromY;

        requestAnimationFrame(() => {
            prt.style.transform = `translate(${dx}px,${dy}px) scale(0.25)`;
            prt.style.opacity = '0';
        });
        setTimeout(() => prt.remove(), 700);
    }

    /* Public API */
    return { add, flyParticle, open };
})();


/* ============================================================
   SECTION 5: ADD TO CART BUTTONS
============================================================ */
function bindAddToCart() {
    document.querySelectorAll('.atc').forEach(btn => {
        btn.addEventListener('click', e => {
            const name = btn.dataset.name || 'Casco GX';
            const price = btn.dataset.price || '0';
            const rect = btn.getBoundingClientRect();

            Cart.flyParticle(rect.left + rect.width / 2, rect.top + rect.height / 2);

            // Button feedback
            const orig = btn.innerHTML;
            btn.classList.add('added');
            btn.innerHTML = '<i class="ph ph-check"></i> ¡Añadido!';
            setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = orig; }, 1500);

            setTimeout(() => {
                Cart.add(name, price);
                showToast(`${name} añadido 🦍`);
            }, 650);
        });
    });
}
bindAddToCart();

// Custom helmet cart buttons
['addCustomCart', 'addCustomCart2'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', e => {
        const rect = el.getBoundingClientRect();
        Cart.flyParticle(rect.left + rect.width / 2, rect.top + rect.height / 2);
        setTimeout(() => {
            Cart.add('Casco Personalizado GX', 449);
            showToast('Diseño personalizado añadido 🦍');
        }, 650);
    });
});


/* ============================================================
   SECTION 6: TOAST SYSTEM
============================================================ */
const toastEl = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
let toastTimer;

function showToast(msg) {
    toastMsg.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}


/* ============================================================
   SECTION 7: HELMET CANVAS — Realistic Football Helmet
   Front-facing with proper dome, face opening, cage bars,
   visor, 3D shading, stripes, logo, number.
============================================================ */
(function initHelmetCanvas() {
    const canvas = document.getElementById('helmetCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;   // 460
    const H = canvas.height;  // 480

    /* State */
    const S = {
        color: '#0052FF',
        maskColor: '#1c1c1c',
        stripe: 'none',
        stripeColor: '#FFFFFF',
        finish: 'gloss',
        visor: 'none',
        number: '',
        numColor: '#FFFFFF',
        logoImg: null,
        logoOpac: 0.85,
        logoSize: 0.45,
        logoPosX: 0,
        logoPosY: 0,
    };

    /* Center point */
    const CX = W / 2;       // 230
    const CY = H / 2 - 10;  // 230

    /* ---- Color helpers ---- */
    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const n = parseInt(hex, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function lighten(hex, amt) {
        const [r, g, b] = hexToRgb(hex);
        return `rgb(${Math.min(r + amt, 255)},${Math.min(g + amt, 255)},${Math.min(b + amt, 255)})`;
    }
    function darken(hex, amt) {
        const [r, g, b] = hexToRgb(hex);
        return `rgb(${Math.max(r - amt, 0)},${Math.max(g - amt, 0)},${Math.max(b - amt, 0)})`;
    }
    function alpha(hex, a) {
        const [r, g, b] = hexToRgb(hex);
        return `rgba(${r},${g},${b},${a})`;
    }
    function getLuminance(hex) {
        const [r, g, b] = hexToRgb(hex);
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    /* ----------------------------------------------------------------
       PATHS
    ---------------------------------------------------------------- */

    /**
     * Main helmet shell silhouette.
     * A rounded dome-shaped outline seen from the front.
     * Proportions match a real NFL-style football helmet.
     */
    function pathShell(ctx) {
        const cx = CX, cy = CY;
        ctx.beginPath();
        // Top centre
        ctx.moveTo(cx, cy - 188);
        // ── Right dome arc ──
        ctx.bezierCurveTo(cx + 148, cy - 188, cx + 175, cy - 70, cx + 175, cy + 10);
        // ── Right side, curves down toward face opening ──
        ctx.bezierCurveTo(cx + 175, cy + 100, cx + 158, cy + 162, cx + 120, cy + 194);
        // ── Lower-right (under ear flap) ──
        ctx.bezierCurveTo(cx + 90, cy + 218, cx + 50, cy + 226, cx + 26, cy + 220);
        // ── Chin-right ──
        ctx.lineTo(cx + 18, cy + 224);
        ctx.bezierCurveTo(cx + 9, cy + 235, cx - 9, cy + 235, cx - 18, cy + 224);
        // ── Chin-left ──
        ctx.lineTo(cx - 26, cy + 220);
        // ── Lower-left ──
        ctx.bezierCurveTo(cx - 50, cy + 226, cx - 90, cy + 218, cx - 120, cy + 194);
        // ── Left side ──
        ctx.bezierCurveTo(cx - 158, cy + 162, cx - 175, cy + 100, cx - 175, cy + 10);
        // ── Left dome arc ──
        ctx.bezierCurveTo(cx - 175, cy - 70, cx - 148, cy - 188, cx, cy - 188);
        ctx.closePath();
    }

    /**
     * Face opening — the recessed dark window.
     * Rounded rect, slightly tapered toward the bottom.
     */
    const FACE = {
        l: CX - 100,
        r: CX + 100,
        t: CY - 12,
        b: CY + 208,
        r_t: 18,   // top corner radius
        r_b: 22,   // bottom corner radius
    };

    function pathFace(ctx) {
        const { l, r, t, b, r_t, r_b } = FACE;
        ctx.beginPath();
        ctx.moveTo(l + r_t, t);
        ctx.lineTo(r - r_t, t);
        ctx.quadraticCurveTo(r, t, r, t + r_t);
        ctx.lineTo(r, b - r_b);
        ctx.quadraticCurveTo(r, b, r - r_b, b);
        ctx.lineTo(l + r_b, b);
        ctx.quadraticCurveTo(l, b, l, b - r_b);
        ctx.lineTo(l, t + r_t);
        ctx.quadraticCurveTo(l, t, l + r_t, t);
        ctx.closePath();
    }

    /* ----------------------------------------------------------------
       DRAWING FUNCTIONS
    ---------------------------------------------------------------- */

    /** Draw a cylindrical rod (face cage bar) with 3-D tube shading */
    function drawRod(x1, y1, x2, y2, diam, baseColor) {
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len === 0) return;

        // Save & rotate to rod angle
        ctx.save();
        ctx.translate(x1, y1);
        ctx.rotate(Math.atan2(dy, dx));

        const h = diam;

        // Shadow beneath rod
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = diam * 0.35;

        // Main body
        ctx.beginPath();
        ctx.rect(0, -h / 2, len, h);
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Top highlight (light reflection on curved surface)
        const hl = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        hl.addColorStop(0, 'rgba(255,255,255,0.38)');
        hl.addColorStop(0.3, 'rgba(255,255,255,0.12)');
        hl.addColorStop(1, 'rgba(0,0,0,0.20)');
        ctx.beginPath();
        ctx.rect(0, -h / 2, len, h);
        ctx.fillStyle = hl;
        ctx.fill();

        // Thin bright specular line on top edge
        ctx.beginPath();
        ctx.rect(0, -h / 2, len, h * 0.18);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fill();

        ctx.restore();
    }

    /** The face cage — frame rails + horizontal bars + center vertical */
    function drawFaceCage() {
        const { l, r, t, b } = FACE;
        const railL = l - 14;
        const railR = r + 14;
        const railTop = t - 2;
        const railBot = b + 8;
        const railD = 14;  // rail diameter (thicker)
        const barD = 9;   // horizontal bar diameter (thinner)
        const cageColor = darken(S.maskColor, 20);
        // If mask color is very dark, use a metallic grey
        const baseCol = getLuminance(S.maskColor) < 20 ? '#2a2a2a' : S.maskColor;

        // ── Side rails (thickest elements) ──
        drawRod(railL, railTop, railL, railBot, railD, darken(baseCol, 10));
        drawRod(railR, railTop, railR, railBot, railD, darken(baseCol, 10));

        // ── Top cross-bar (connects rails at top) ──
        drawRod(railL, railTop + railD * 0.5, railR, railTop + railD * 0.5, railD * 0.9, baseCol);

        // ── Horizontal bars (4 bars across face opening) ──
        const numBars = 4;
        const barSpan = railBot - railTop - railD * 2 - 16;
        const barStep = barSpan / (numBars + 0.5);
        for (let i = 0; i < numBars; i++) {
            const barY = railTop + railD + 16 + i * barStep;
            drawRod(railL, barY, railR, barY, barD, baseCol);
        }

        // ── Chin cup cross-bar ──
        drawRod(railL, railBot - railD, railR, railBot - railD, railD * 0.9, baseCol);

        // ── Centre vertical bar ──
        drawRod(CX, t + 4, CX, b + 10, barD * 0.9, lighten(baseCol, 10));

        // ── Attachment bolts (rivets) at top corners ──
        [railL, railR].forEach(rx => {
            ctx.beginPath();
            ctx.arc(rx, railTop + railD, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#555';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rx, railTop + railD, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#aaa';
            ctx.fill();
        });
    }

    /** Stripe / decoration on the dome */
    function drawStripe() {
        if (S.stripe === 'none') return;
        ctx.save();
        pathShell(ctx);
        ctx.clip();

        const sc = S.stripeColor;
        const cx = CX, cy = CY;

        ctx.globalAlpha = 0.88;
        ctx.lineJoin = 'round';

        // Helper: draw a curved vertical band on dome
        function domeBand(offsetX, width) {
            ctx.beginPath();
            // The stripe follows dome curvature from top down to face opening
            ctx.moveTo(cx + offsetX - width / 2, cy - 185);
            ctx.bezierCurveTo(
                cx + offsetX - width / 2, cy - 80,
                cx + offsetX - width / 2, cy - 10,
                cx + offsetX - width / 2, cy - 10
            );
            ctx.lineTo(cx + offsetX + width / 2, cy - 10);
            ctx.bezierCurveTo(
                cx + offsetX + width / 2, cy - 10,
                cx + offsetX + width / 2, cy - 80,
                cx + offsetX + width / 2, cy - 185
            );
            ctx.closePath();
            ctx.fillStyle = sc;
            ctx.fill();
        }

        switch (S.stripe) {
            case 'single':
                domeBand(0, 26);
                break;
            case 'double':
                domeBand(-20, 13);
                domeBand(+20, 13);
                break;
            case 'triple':
                domeBand(-30, 11);
                domeBand(0, 18);
                domeBand(+30, 11);
                break;
            case 'lightning': {
                ctx.strokeStyle = sc;
                ctx.lineWidth = 18;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(cx + 18, cy - 185);
                ctx.lineTo(cx - 14, cy - 90);
                ctx.lineTo(cx + 10, cy - 90);
                ctx.lineTo(cx - 20, cy - 10);
                ctx.stroke();
                break;
            }
            case 'nfl': {
                // Single wide centre + two thin flanking
                domeBand(0, 28);
                ctx.globalAlpha = 0.5;
                domeBand(-38, 8);
                domeBand(+38, 8);
                break;
            }
        }
        ctx.restore();
    }

    /** Visor overlay — sits above face cage area at top of opening */
    function drawVisor() {
        if (S.visor === 'none') return;
        const { l, r, t } = FACE;
        const visorH = 85;
        const vl = l - 2, vr = r + 2, vt = t - 1;

        ctx.save();
        ctx.beginPath();
        ctx.rect(vl, vt, vr - vl, visorH);

        switch (S.visor) {
            case 'clear': {
                ctx.fillStyle = 'rgba(180,220,255,0.12)';
                ctx.fill();
                break;
            }
            case 'smoke': {
                ctx.fillStyle = 'rgba(0,0,0,0.70)';
                ctx.fill();
                // slight blue tint at top
                const g = ctx.createLinearGradient(vl, vt, vl, vt + visorH);
                g.addColorStop(0, 'rgba(30,60,120,0.15)');
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.fill();
                break;
            }
            case 'mirror': {
                const mg = ctx.createLinearGradient(vl, vt, vr, vt + visorH);
                mg.addColorStop(0, 'rgba(140,190,255,0.55)');
                mg.addColorStop(0.35, 'rgba(220,240,255,0.65)');
                mg.addColorStop(0.65, 'rgba(180,220,255,0.55)');
                mg.addColorStop(1, 'rgba(100,160,240,0.50)');
                ctx.fillStyle = mg;
                ctx.fill();
                // Specular streak
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.beginPath();
                ctx.rect(vl, vt, (vr - vl) * 0.45, visorH * 0.3);
                ctx.fill();
                break;
            }
            case 'gold': {
                const gg = ctx.createLinearGradient(vl, vt, vr, vt + visorH);
                gg.addColorStop(0, 'rgba(220,170,0,0.60)');
                gg.addColorStop(1, 'rgba(180,130,0,0.45)');
                ctx.fillStyle = gg;
                ctx.fill();
                break;
            }
            case 'red': {
                const rg = ctx.createLinearGradient(vl, vt, vr, vt + visorH);
                rg.addColorStop(0, 'rgba(200,0,0,0.65)');
                rg.addColorStop(1, 'rgba(140,0,0,0.45)');
                ctx.fillStyle = rg;
                ctx.fill();
                break;
            }
        }

        // Edge highlight at top of visor
        ctx.beginPath();
        ctx.rect(vl, vt, vr - vl, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fill();

        ctx.restore();
    }

    /** Number on helmet dome (right side) */
    function drawNumber() {
        if (!S.number.trim()) return;
        ctx.save();
        pathShell(ctx);
        ctx.clip();

        const num = S.number.toUpperCase();
        const fs = num.length === 1 ? 88 : 68;
        ctx.font = `bold ${fs}px 'Archivo Black', sans-serif`;
        ctx.fillStyle = S.numColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.88;

        // Slight shadow for depth
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillText(num, CX + 80, CY - 70);
        ctx.restore();
    }

    /** User-uploaded logo on dome (centre or custom position) */
    function drawLogo() {
        if (!S.logoImg) return;
        ctx.save();
        pathShell(ctx);
        ctx.clip();

        const size = 300 * S.logoSize;
        const lx = CX - size / 2 + S.logoPosX;
        const ly = CY - size / 2 - 40 + S.logoPosY;

        ctx.globalAlpha = S.logoOpac;
        ctx.drawImage(S.logoImg, lx, ly, size, size);
        ctx.restore();
    }

    /** Ventilation slots on top of dome */
    function drawVents() {
        ctx.save();
        pathShell(ctx);
        ctx.clip();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';

        // 5 vent slots near top of dome
        const vY = CY - 155;
        const slotW = 6, slotH = 22, gap = 16;
        const startX = CX - 2 * gap - 2;
        for (let i = 0; i < 5; i++) {
            const sx = startX + i * (slotW + gap);
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(sx, vY, slotW, slotH, 3)
                : ctx.rect(sx, vY, slotW, slotH);
            ctx.fill();
        }
        ctx.restore();
    }

    /** Chin strap */
    function drawChinStrap() {
        const cy = CY;
        ctx.save();
        ctx.globalAlpha = 0.85;

        // Left strap
        ctx.beginPath();
        ctx.moveTo(CX - 26, cy + 220);
        ctx.quadraticCurveTo(CX - 36, cy + 230, CX - 28, cy + 240);
        ctx.quadraticCurveTo(CX - 20, cy + 248, CX, cy + 248);
        ctx.quadraticCurveTo(CX + 20, cy + 248, CX + 28, cy + 240);
        ctx.quadraticCurveTo(CX + 36, cy + 230, CX + 26, cy + 220);

        // Strap fill
        ctx.fillStyle = darken(S.color, 50);
        ctx.fill();

        // Buckle
        ctx.fillStyle = '#888';
        ctx.fillRect(CX - 14, cy + 239, 28, 10);
        ctx.fillStyle = '#ccc';
        ctx.fillRect(CX - 11, cy + 241, 8, 6);
        ctx.fillRect(CX + 3, cy + 241, 8, 6);

        ctx.restore();
    }

    /* ----------------------------------------------------------------
       MAIN DRAW FUNCTION
    ---------------------------------------------------------------- */
    function draw() {
        ctx.clearRect(0, 0, W, H);

        /* ── 1. Drop shadow beneath entire helmet ── */
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.65)';
        ctx.shadowBlur = 50;
        ctx.shadowOffsetX = -8;
        ctx.shadowOffsetY = 18;
        pathShell(ctx);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();

        /* ── 2. Main shell fill with gradient ── */
        ctx.save();
        pathShell(ctx);
        ctx.clip();

        // Radial gradient: bright top-left → mid tone → dark right
        const sg = ctx.createRadialGradient(
            CX - 65, CY - 120, 20,
            CX, CY - 30, W * 0.75
        );

        if (S.finish === 'matte') {
            // Flatter gradient
            sg.addColorStop(0, lighten(S.color, 35));
            sg.addColorStop(0.5, S.color);
            sg.addColorStop(1, darken(S.color, 45));
        } else if (S.finish === 'chrome') {
            // Multi-band chrome effect
            sg.addColorStop(0, '#ffffff');
            sg.addColorStop(0.1, lighten(S.color, 80));
            sg.addColorStop(0.3, S.color);
            sg.addColorStop(0.55, lighten(S.color, 40));
            sg.addColorStop(0.75, darken(S.color, 40));
            sg.addColorStop(1, darken(S.color, 70));
        } else if (S.finish === 'carbon') {
            sg.addColorStop(0, '#444');
            sg.addColorStop(0.4, '#1a1a1a');
            sg.addColorStop(1, '#000');
        } else {
            // Gloss (default)
            sg.addColorStop(0, lighten(S.color, 65));
            sg.addColorStop(0.35, lighten(S.color, 20));
            sg.addColorStop(0.65, S.color);
            sg.addColorStop(1, darken(S.color, 70));
        }
        ctx.fillStyle = sg;
        ctx.fill();

        /* Lateral sheen band */
        const sheen = ctx.createLinearGradient(CX - 175, 0, CX + 100, 0);
        sheen.addColorStop(0, 'rgba(255,255,255,0.14)');
        sheen.addColorStop(0.35, 'rgba(255,255,255,0.04)');
        sheen.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sheen;
        ctx.fill();

        ctx.restore();

        /* ── 3. Carbon fibre texture (if selected) ── */
        if (S.finish === 'carbon') {
            ctx.save();
            pathShell(ctx);
            ctx.clip();
            ctx.globalAlpha = 0.18;
            const sz = 8;
            for (let y = 0; y < H; y += sz) {
                for (let x = 0; x < W; x += sz) {
                    if ((Math.floor(x / sz) + Math.floor(y / sz)) % 2 === 0) {
                        ctx.fillStyle = 'rgba(255,255,255,0.06)';
                        ctx.fillRect(x, y, sz, sz);
                    }
                }
            }
            ctx.restore();
        }

        /* ── 4. Side contour lines (panel seams) ── */
        ctx.save();
        pathShell(ctx);
        ctx.clip();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 2;
        // Left panel seam
        ctx.beginPath();
        ctx.moveTo(CX - 100, CY - 185);
        ctx.bezierCurveTo(CX - 105, CY - 40, CX - 110, CY + 60, CX - 100, CY - 12);
        ctx.stroke();
        // Right panel seam
        ctx.beginPath();
        ctx.moveTo(CX + 100, CY - 185);
        ctx.bezierCurveTo(CX + 105, CY - 40, CX + 110, CY + 60, CX + 100, CY - 12);
        ctx.stroke();
        ctx.restore();

        /* ── 5. Stripe ── */
        drawStripe();

        /* ── 6. Logo overlay ── */
        drawLogo();

        /* ── 7. Number ── */
        drawNumber();

        /* ── 8. Ventilation slots ── */
        drawVents();

        /* ── 9. Face opening background ── */
        ctx.save();
        pathFace(ctx);
        ctx.fillStyle = '#050505';
        ctx.fill();

        // Inner shadow (depth illusion)
        const innerShadow = ctx.createRadialGradient(
            CX, FACE.t + 50, 10,
            CX, FACE.t + 60, 120
        );
        innerShadow.addColorStop(0, 'rgba(255,255,255,0.02)');
        innerShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = innerShadow;
        ctx.fill();
        ctx.restore();

        /* ── 10. Face opening rim (3-D bevel) ── */
        ctx.save();
        pathFace(ctx);
        ctx.strokeStyle = darken(S.color, 55);
        ctx.lineWidth = 10;
        ctx.stroke();
        // Highlight on top edge
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        /* ── 11. Ear cutout shading ── */
        const earR = 28;
        const earY = CY + 55;
        [CX - 172, CX + 172].forEach(ex => {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(ex, earY, earR * 0.6, earR, 0, 0, Math.PI * 2);
            const eg = ctx.createRadialGradient(ex, earY, 2, ex, earY, earR);
            eg.addColorStop(0, 'rgba(0,0,0,0.55)');
            eg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = eg;
            ctx.fill();
            ctx.restore();
        });

        /* ── 12. Visor ── */
        drawVisor();

        /* ── 13. Face cage ── */
        drawFaceCage();

        /* ── 14. Chin strap ── */
        drawChinStrap();

        /* ── 15. Specular highlight (top-left dome) ── */
        ctx.save();
        pathShell(ctx);
        ctx.clip();
        if (S.finish !== 'matte') {
            const hl = ctx.createRadialGradient(
                CX - 75, CY - 140, 4,
                CX - 40, CY - 90, 160
            );
            const hlStr = S.finish === 'chrome' ? 0.55 : 0.30;
            hl.addColorStop(0, `rgba(255,255,255,${hlStr})`);
            hl.addColorStop(0.45, `rgba(255,255,255,0.07)`);
            hl.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = hl;
            ctx.fill();

            // Tiny bright hot-spot
            const hot = ctx.createRadialGradient(
                CX - 88, CY - 158, 0,
                CX - 88, CY - 158, 38
            );
            hot.addColorStop(0, 'rgba(255,255,255,0.7)');
            hot.addColorStop(0.5, 'rgba(255,255,255,0.15)');
            hot.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = hot;
            ctx.fill();
        }
        ctx.restore();

        /* ── 16. Outer shell stroke ── */
        ctx.save();
        pathShell(ctx);
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }

    /* Initial draw */
    draw();

    /* ---- CONTROLS WIRING ---- */

    /* Color swatches */
    document.querySelectorAll('#colorSwatches .swatch').forEach(sw => {
        sw.addEventListener('click', () => {
            document.querySelectorAll('#colorSwatches .swatch').forEach(s => s.classList.remove('active'));
            sw.classList.add('active');
            S.color = sw.dataset.color;
            document.getElementById('customColor').value = S.color;
            document.getElementById('hexDisplay').textContent = S.color;
            draw();
        });
    });

    /* Custom colour picker */
    document.getElementById('customColor').addEventListener('input', e => {
        S.color = e.target.value;
        document.getElementById('hexDisplay').textContent = S.color;
        document.querySelectorAll('#colorSwatches .swatch').forEach(s => s.classList.remove('active'));
        draw();
    });

    /* Mask colour */
    document.getElementById('maskColor').addEventListener('input', e => {
        S.maskColor = e.target.value;
        document.getElementById('maskHex').textContent = e.target.value;
        draw();
    });

    /* Stripe buttons */
    document.querySelectorAll('[data-stripe]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-stripe]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            S.stripe = btn.dataset.stripe;
            draw();
        });
    });

    document.getElementById('stripeColor').addEventListener('input', e => {
        S.stripeColor = e.target.value;
        draw();
    });

    /* Finish buttons */
    document.querySelectorAll('[data-finish]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-finish]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            S.finish = btn.dataset.finish;
            draw();
        });
    });

    /* Number input */
    document.getElementById('helmetNumber').addEventListener('input', e => {
        S.number = e.target.value.toUpperCase().slice(0, 2);
        e.target.value = S.number;
        draw();
    });
    document.getElementById('numColor').addEventListener('input', e => {
        S.numColor = e.target.value;
        draw();
    });

    /* Visor cards */
    document.querySelectorAll('[data-visor]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-visor]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            S.visor = btn.dataset.visor;
            draw();
        });
    });

    /* Logo upload */
    const uploadZone = document.getElementById('uploadZone');
    const logoInput = document.getElementById('logoUpload');
    const logoCtrl = document.getElementById('logoCtrl');
    const fileNameEl = document.getElementById('fileName');
    const removeLogo = document.getElementById('removeLogo');

    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('over'));
    uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('over');
        const f = e.dataTransfer.files[0];
        if (f && f.type.startsWith('image/')) loadLogo(f);
    });

    logoInput.addEventListener('change', e => {
        const f = e.target.files[0];
        if (f) loadLogo(f);
    });

    function loadLogo(file) {
        if (file.size > 5 * 1024 * 1024) { showToast('⚠️ Imagen demasiado grande (máx 5MB)'); return; }
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => {
                S.logoImg = img;
                draw();
                logoCtrl.classList.remove('hidden');
                fileNameEl.textContent = '✓ ' + file.name;
                showToast('Imagen aplicada al casco');
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    document.getElementById('logoOpac').addEventListener('input', e => {
        S.logoOpac = e.target.value / 100;
        document.getElementById('opacVal').textContent = e.target.value + '%';
        draw();
    });
    document.getElementById('logoSz').addEventListener('input', e => {
        S.logoSize = e.target.value / 100;
        document.getElementById('szVal').textContent = e.target.value + '%';
        draw();
    });
    document.getElementById('logoPosX').addEventListener('input', e => {
        S.logoPosX = +e.target.value;
        draw();
    });
    document.getElementById('logoPosY').addEventListener('input', e => {
        S.logoPosY = +e.target.value;
        draw();
    });

    removeLogo.addEventListener('click', () => {
        S.logoImg = null;
        logoInput.value = '';
        logoCtrl.classList.add('hidden');
        draw();
    });

    /* Download */
    document.getElementById('btnDownload').addEventListener('click', () => {
        const a = document.createElement('a');
        a.download = 'gorillax-casco.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
        showToast('Imagen descargada');
    });

    /* Reset */
    document.getElementById('btnReset').addEventListener('click', () => {
        S.color = '#0052FF';
        S.maskColor = '#1c1c1c';
        S.stripe = 'none';
        S.stripeColor = '#FFFFFF';
        S.finish = 'gloss';
        S.visor = 'none';
        S.number = '';
        S.numColor = '#FFFFFF';
        S.logoImg = null;
        S.logoOpac = 0.85;
        S.logoSize = 0.45;
        S.logoPosX = 0;
        S.logoPosY = 0;

        // Reset UI
        document.querySelectorAll('#colorSwatches .swatch').forEach((s, i) => s.classList.toggle('active', i === 0));
        document.querySelectorAll('[data-stripe]').forEach((b, i) => b.classList.toggle('active', i === 0));
        document.querySelectorAll('[data-finish]').forEach((b, i) => b.classList.toggle('active', i === 0));
        document.querySelectorAll('[data-visor]').forEach((b, i) => b.classList.toggle('active', i === 0));
        document.getElementById('customColor').value = '#0052FF';
        document.getElementById('hexDisplay').textContent = '#0052FF';
        document.getElementById('maskColor').value = '#1c1c1c';
        document.getElementById('maskHex').textContent = '#1c1c1c';
        document.getElementById('stripeColor').value = '#FFFFFF';
        document.getElementById('helmetNumber').value = '';
        document.getElementById('numColor').value = '#FFFFFF';
        document.getElementById('logoUpload').value = '';
        document.getElementById('logoCtrl').classList.add('hidden');
        document.getElementById('logoOpac').value = 85;
        document.getElementById('opacVal').textContent = '85%';
        document.getElementById('logoSz').value = 45;
        document.getElementById('szVal').textContent = '45%';
        document.getElementById('logoPosX').value = 0;
        document.getElementById('logoPosY').value = 0;

        draw();
        showToast('Diseño reseteado');
    });

})();


/* ============================================================
   SECTION 8: TABS — Customizer control panel
============================================================ */
(function initTabs() {
    document.querySelectorAll('.ctab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.ctab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            const target = tab.dataset.tab;
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById('tab-' + target);
            if (panel) panel.classList.add('active');
        });
    });
})();


/* ============================================================
   SECTION 9: SMOOTH ANCHOR SCROLLING
   Accounts for sticky header height.
============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const offset = header.getBoundingClientRect().height + 16;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    });
});


// --- SECCIÓN DE AUDIO GORILLA X ---
document.addEventListener('DOMContentLoaded', () => {
    const boton = document.getElementById('btnRadio');
    const audio = document.getElementById('audioCuña');

    if (boton && audio) {
        boton.addEventListener('click', (e) => {
            e.preventDefault();
            if (audio.paused) {
                audio.play();
                boton.style.borderColor = "#0052FF"; // Brillo azul al sonar
                boton.style.boxShadow = "0 0 20px rgba(0, 82, 255, 0.6)";
            } else {
                audio.pause();
                boton.style.boxShadow = "none";
            }
        });
    }
});