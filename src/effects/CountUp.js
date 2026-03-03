/**
 * Animated stat counters for Thrival Health.
 * Triggers a count-up animation when elements enter the viewport.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import capability from '../utils/detectCapability.js';

gsap.registerPlugin(ScrollTrigger);

function renderValue(el, value) {
  const prefix = el.dataset.countupPrefix || '';
  const suffix = el.dataset.countupSuffix || '';
  const isFloat = String(el.dataset.countup).includes('.');
  const display = isFloat ? value.toFixed(1) : Math.round(value);
  el.textContent = `${prefix}${display}${suffix}`;
}

function initElement(el) {
  const target = parseFloat(el.dataset.countup);
  if (isNaN(target)) return;

  if (capability.tier === 'minimal') {
    renderValue(el, target);
    return;
  }

  // Set initial display to 0
  renderValue(el, 0);

  const counter = { value: 0 };

  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to(counter, {
        value: target,
        duration: 2,
        ease: 'power2.out',
        onUpdate: () => renderValue(el, counter.value),
      });
    },
  });
}

function init() {
  const elements = document.querySelectorAll('[data-countup]');
  elements.forEach(initElement);
}

export default init;
export { init };
