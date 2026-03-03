/**
 * ParticleSystem — 2D canvas particle system with gold/cream palette.
 * Renders floating particles behind website content with cursor interaction.
 */

const PALETTE = [
  'rgba(201, 173, 134, 0.15)', // light gold
  'rgba(155, 128, 95, 0.12)',  // medium gold
  'rgba(125, 95, 67, 0.10)',   // deep bronze
  'rgba(201, 173, 134, 0.08)', // very subtle
];

const CONNECTION_COLOR_BASE = [155, 128, 95];

const TIER_CONFIG = {
  full: { minParticles: 60, maxParticles: 80, connections: true },
  reduced: { minParticles: 20, maxParticles: 30, connections: false },
  minimal: null,
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createParticle(canvasW, canvasH) {
  return {
    x: Math.random() * canvasW,
    y: Math.random() * canvasH,
    vx: randomBetween(-0.15, 0.15),
    vy: randomBetween(-0.15, 0.15),
    baseRadius: randomBetween(2, 5),
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    phaseOffset: Math.random() * Math.PI * 2,
  };
}

export class ParticleSystem {
  /**
   * @param {string} canvasId — id of the <canvas> element
   * @param {object} [options]
   * @param {string} [options.tier='full'] — 'full' | 'reduced' | 'minimal'
   */
  constructor(canvasId, options = {}) {
    this.canvasId = canvasId;
    this.tier = options.tier || 'full';
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animFrameId = null;
    this.mouseX = -9999;
    this.mouseY = -9999;
    this._onResize = this.resize.bind(this);
    this._time = 0;
  }

  /** Create context, spawn particles, start animation loop. */
  init() {
    const config = TIER_CONFIG[this.tier];
    if (!config) return; // minimal tier — do nothing

    this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resize();

    const count = Math.floor(randomBetween(config.minParticles, config.maxParticles + 1));
    for (let i = 0; i < count; i++) {
      this.particles.push(createParticle(this.canvas.width, this.canvas.height));
    }

    window.addEventListener('resize', this._onResize);
    this._loop();
  }

  /** Stop animation loop and remove event listeners. */
  destroy() {
    if (this.animFrameId != null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    window.removeEventListener('resize', this._onResize);
    this.particles = [];
  }

  /** Update canvas dimensions to match viewport. */
  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Update the tracked cursor position (called externally from mousemove).
   * @param {number} x
   * @param {number} y
   */
  setMousePosition(x, y) {
    this.mouseX = x;
    this.mouseY = y;
  }

  // ---- internal ----

  /** Main animation loop. */
  _loop() {
    this._time += 0.02;
    this._update();
    this._draw();
    this.animFrameId = requestAnimationFrame(() => this._loop());
  }

  /** Update particle positions and apply forces. */
  _update() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const mx = this.mouseX;
    const my = this.mouseY;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // --- cursor repulsion ---
      const dx = p.x - mx;
      const dy = p.y - my;
      const distSq = dx * dx + dy * dy;
      const repulsionRadius = 120;

      if (distSq < repulsionRadius * repulsionRadius && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const force = Math.min(2, (repulsionRadius - dist) / repulsionRadius * 2);
        const nx = dx / dist;
        const ny = dy / dist;
        p.vx += nx * force;
        p.vy += ny * force;
      }

      // --- friction (smooth deceleration) ---
      p.vx *= 0.95;
      p.vy *= 0.95;

      // Restore gentle drift so particles don't stall completely.
      // If speed has dropped very low, nudge back toward original drift range.
      const speed = Math.abs(p.vx) + Math.abs(p.vy);
      if (speed < 0.05) {
        p.vx += randomBetween(-0.02, 0.02);
        p.vy += randomBetween(-0.02, 0.02);
      }

      // --- move ---
      p.x += p.vx;
      p.y += p.vy;

      // --- wrap around edges ---
      if (p.x < -10) p.x = w + 10;
      else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      else if (p.y > h + 10) p.y = -10;
    }
  }

  /** Render particles and (optionally) connection lines. */
  _draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = this._time;
    const particles = this.particles;
    const config = TIER_CONFIG[this.tier];

    ctx.clearRect(0, 0, w, h);

    // --- connection lines (full tier only) ---
    if (config.connections) {
      const maxDist = 150;
      const maxDistSq = maxDist * maxDist;
      const r = CONNECTION_COLOR_BASE[0];
      const g = CONNECTION_COLOR_BASE[1];
      const b = CONNECTION_COLOR_BASE[2];

      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const bp = particles[j];
          const dx = a.x - bp.x;
          const dy = a.y - bp.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / maxDist) * 0.06;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(bp.x, bp.y);
            ctx.stroke();
          }
        }
      }
    }

    // --- particles ---
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const pulse = Math.sin(t + p.phaseOffset) * 0.5;
      const radius = p.baseRadius + pulse;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
