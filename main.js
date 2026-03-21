/* ============================================
   Klarr — Minimalist Bubbles + Interactions
   ============================================ */

(function () {
  'use strict';

  // ─── Bubble Canvas ───────────────────────────
  const canvas = document.getElementById('bubble-canvas');
  const ctx = canvas.getContext('2d');
  let width, height;
  let bubbles = [];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  class Bubble {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.radius = Math.random() * 50 + 16;
      this.x = Math.random() * width;
      this.y = initial
        ? Math.random() * (height + 200)
        : height + this.radius + Math.random() * 300;
      this.speedY = Math.random() * 0.3 + 0.08;
      this.speedX = (Math.random() - 0.5) * 0.1;
      this.wobbleFreq = Math.random() * 0.004 + 0.001;
      this.phase = Math.random() * Math.PI * 2;

      // Soft, visible, minimalist palette
      const palettes = [
        { h: 215, s: 70, l: 72 },  // soft blue
        { h: 260, s: 50, l: 78 },  // lavender
        { h: 200, s: 55, l: 80 },  // sky
        { h: 170, s: 40, l: 76 },  // teal
        { h: 230, s: 45, l: 82 },  // periwinkle
      ];
      const p = palettes[Math.floor(Math.random() * palettes.length)];
      this.hue = p.h;
      this.sat = p.s;
      this.light = p.l;
      this.opacity = Math.random() * 0.15 + 0.08;
    }

    update(time) {
      this.y -= this.speedY;
      this.x += this.speedX + Math.sin(time * this.wobbleFreq + this.phase) * 0.12;

      if (this.y < -this.radius * 2) {
        this.reset();
      }
    }

    draw() {
      ctx.save();

      // Clean, solid circle with slight transparency — no blur
      const color = `hsla(${this.hue}, ${this.sat}%, ${this.light}%, ${this.opacity})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Crisp inner highlight — glass-like reflection
      const hlSize = this.radius * 0.6;
      const hlX = this.x - this.radius * 0.2;
      const hlY = this.y - this.radius * 0.25;
      const hl = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlSize);
      hl.addColorStop(0, `hsla(0, 0%, 100%, ${this.opacity * 0.6})`);
      hl.addColorStop(1, `hsla(0, 0%, 100%, 0)`);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = hl;
      ctx.fill();

      // Subtle border ring for definition
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${this.hue}, ${this.sat}%, ${this.light}%, ${this.opacity * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }
  }

  function initBubbles() {
    const count = Math.min(Math.floor(width / 80), 16);
    bubbles = [];
    for (let i = 0; i < count; i++) {
      bubbles.push(new Bubble());
    }
  }

  let time = 0;
  function animate() {
    time++;
    ctx.clearRect(0, 0, width, height);
    for (const b of bubbles) {
      b.update(time);
      b.draw();
    }
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    resize();
    initBubbles();
  });

  resize();
  initBubbles();
  animate();

  // ─── Feature Card Scroll Reveal ──────────────
  const cards = document.querySelectorAll('.feature-card');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const index = Array.from(cards).indexOf(card);
          setTimeout(() => {
            card.classList.add('visible');
          }, index * 120);
          observer.unobserve(card);
        }
      });
    },
    { threshold: 0.15 }
  );

  cards.forEach((card) => observer.observe(card));

  // ─── Email Form ──────────────────────────────
  const form = document.getElementById('email-form');
  const inputWrapper = form.querySelector('.input-wrapper');

  const successMsg = document.createElement('div');
  successMsg.className = 'success-message';
  successMsg.innerHTML = '✓ You\'re on the list. We\'ll be in touch!';
  inputWrapper.appendChild(successMsg);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('email-input');
    const email = emailInput.value.trim();
    if (!email) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.style.outline = '1px solid rgba(239, 68, 68, 0.5)';
      setTimeout(() => (emailInput.style.outline = ''), 2000);
      return;
    }

    if (form.action.includes('YOUR_FORM_ID')) {
      alert("Almost there! Replace 'YOUR_FORM_ID' in index.html with your actual Formspree ID to start collecting emails.");
      form.classList.add('success');
      return;
    }

    const ctaButton = document.getElementById('cta-button');
    const originalText = ctaButton.innerHTML;
    ctaButton.innerHTML = 'Sending...';
    ctaButton.style.opacity = '0.7';
    ctaButton.style.pointerEvents = 'none';

    try {
      const response = await fetch(form.action, {
        method: form.method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
      });
      
      if (response.ok) {
        form.classList.add('success');
      } else {
        alert("Oops! There was a problem saving your email.");
      }
    } catch (error) {
      alert("Oops! There was a network problem. Please try again.");
    } finally {
      ctaButton.innerHTML = originalText;
      ctaButton.style.opacity = '1';
      ctaButton.style.pointerEvents = 'auto';
    }
  });

  // ─── Navbar scroll ──────────────────────────
  const navbar = document.getElementById('navbar');

  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 40) {
        navbar.style.background = 'rgba(255, 255, 255, 0.88)';
      } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.72)';
      }
    },
    { passive: true }
  );
})();
