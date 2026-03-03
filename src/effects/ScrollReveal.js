/**
 * GSAP ScrollTrigger reveal animations for Thrival Health.
 * Supports multiple reveal types via data-reveal attribute.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import capability from '../utils/detectCapability.js';

gsap.registerPlugin(ScrollTrigger);

const REVEAL_DEFAULTS = {
  'fade-up': { opacity: 0, y: 40 },
  'fade-left': { opacity: 0, x: -40 },
  'fade-right': { opacity: 0, x: 40 },
  scale: { opacity: 0, scale: 0.9 },
};

function makeVisible(elements) {
  elements.forEach((el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
}

function initStagger(parent) {
  const delay = parseFloat(parent.dataset.revealDelay) || 0;
  const children = Array.from(parent.children);

  if (capability.tier === 'minimal') {
    makeVisible(children);
    return;
  }

  gsap.set(children, { opacity: 0, y: 40 });

  ScrollTrigger.create({
    trigger: parent,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to(children, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.1,
        delay,
      });
    },
  });
}

function initElement(el) {
  const type = el.dataset.reveal;
  const delay = parseFloat(el.dataset.revealDelay) || 0;
  const from = REVEAL_DEFAULTS[type];

  if (!from) return;

  gsap.set(el, from);

  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to(el, {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
        delay,
      });
    },
  });
}

function init() {
  const elements = document.querySelectorAll('[data-reveal]');
  if (!elements.length) return;

  if (capability.tier === 'minimal') {
    makeVisible(Array.from(elements));
    return;
  }

  elements.forEach((el) => {
    if (el.dataset.reveal === 'stagger') {
      initStagger(el);
    } else {
      initElement(el);
    }
  });
}

function refresh() {
  ScrollTrigger.refresh();
}

function cleanup() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
}

export default init;
export { init, refresh, cleanup };
