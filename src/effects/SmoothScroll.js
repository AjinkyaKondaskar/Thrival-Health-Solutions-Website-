/**
 * Lenis smooth scroll wrapper for Thrival Health.
 * Falls back to native scrolling on minimal-tier devices.
 */

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import capability from '../utils/detectCapability.js';

let lenis = null;
let rafId = null;

function tick(time) {
  if (lenis) {
    lenis.raf(time);
  }
  rafId = requestAnimationFrame(tick);
}

function init(options = {}) {
  if (capability.tier === 'minimal') {
    // Use native smooth scroll for minimal-tier devices
    document.documentElement.style.scrollBehavior = 'smooth';
    return;
  }

  if (lenis) return; // already initialised

  const lenisOpts = {
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
  };

  // If a wrapper element is provided, use it as the scroll container
  if (options.wrapper) {
    lenisOpts.wrapper = options.wrapper;
    lenisOpts.content = options.wrapper;
  }

  lenis = new Lenis(lenisOpts);

  // Override default scroll-behavior while Lenis is active
  document.documentElement.style.scrollBehavior = 'auto';

  rafId = requestAnimationFrame(tick);
}

function destroy() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
  document.documentElement.style.scrollBehavior = '';
}

function scrollTo(target, options) {
  if (lenis) {
    lenis.scrollTo(target, options);
  } else {
    // Fallback for minimal tier
    const el =
      typeof target === 'string' ? document.querySelector(target) : target;
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
  }
}

function stop() {
  if (lenis) lenis.stop();
}

function start() {
  if (lenis) lenis.start();
}

function getInstance() {
  return lenis;
}

export default { init, destroy, scrollTo, stop, start, getInstance };
export { init, destroy, scrollTo, stop, start, getInstance };
