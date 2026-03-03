/**
 * Cursor-reactive magnetic text displacement for Thrival Health.
 * Characters push away from the cursor when it is nearby.
 */

import capability from '../utils/detectCapability.js';

const THRESHOLD = 150;
const MAX_DISPLACEMENT = 20;
const FRAME_INTERVAL = 1000 / 60; // ~60 fps throttle

let activeInstances = [];
let lastMoveTime = 0;
let rafId = null;
let mouseX = -9999;
let mouseY = -9999;

function splitIntoSpans(el) {
  const text = el.textContent;
  el.textContent = '';
  const spans = [];

  for (const char of text) {
    const span = document.createElement('span');
    span.style.display = 'inline-block';
    span.style.transition = 'transform 0.3s ease-out';

    if (char === ' ') {
      span.innerHTML = '\u00A0';
    } else {
      span.textContent = char;
    }

    el.appendChild(span);
    spans.push(span);
  }

  return spans;
}

function getCenter(span) {
  const rect = span.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function updateDisplacements() {
  for (const instance of activeInstances) {
    for (const span of instance.spans) {
      const center = getCenter(span);
      const dx = center.x - mouseX;
      const dy = center.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < THRESHOLD && dist > 0) {
        const force = (1 - dist / THRESHOLD) * MAX_DISPLACEMENT;
        const angle = Math.atan2(dy, dx);
        const tx = Math.cos(angle) * force;
        const ty = Math.sin(angle) * force;
        span.style.transform = `translate(${tx}px, ${ty}px)`;
      } else {
        span.style.transform = '';
      }
    }
  }

  rafId = null;
}

function onMouseMove(e) {
  const now = performance.now();
  if (now - lastMoveTime < FRAME_INTERVAL) return;
  lastMoveTime = now;

  mouseX = e.clientX;
  mouseY = e.clientY;

  if (rafId === null) {
    rafId = requestAnimationFrame(updateDisplacements);
  }
}

function resetAllSpans() {
  for (const instance of activeInstances) {
    for (const span of instance.spans) {
      span.style.transform = '';
    }
  }
}

function onMouseLeave() {
  mouseX = -9999;
  mouseY = -9999;
  resetAllSpans();
}

function init() {
  // Skip on mobile/reduced or minimal tier
  if (capability.tier === 'reduced' || capability.tier === 'minimal') return;

  const elements = document.querySelectorAll('[data-magnetic]');
  if (!elements.length) return;

  elements.forEach((el) => {
    const spans = splitIntoSpans(el);
    activeInstances.push({ el, spans });
  });

  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave);
}

function destroy() {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseleave', onMouseLeave);

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Restore original text content
  for (const instance of activeInstances) {
    const text = instance.spans.map((s) =>
      s.innerHTML === '\u00A0' ? ' ' : s.textContent
    ).join('');
    instance.el.textContent = text;
  }

  activeInstances = [];
}

export default init;
export { init, destroy };
