/**
 * ScrollExperience — Hybrid scroll orchestrator.
 *
 * Phase 1 (spacers 1-3): Room visible, text overlays 1-3
 * Phase 2 (spacer 4, pinned): Scroll-driven camera zoom into monitor
 * Phase 3 (spacers 5-7): Page scroll drives monitor-content.scrollTop
 *   + text overlays 4-6 appear on screen
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let roomManager = null;
let triggers = [];

/**
 * @param {import('../three/RoomManager.js').RoomManager} rm
 */
export function init(rm) {
  roomManager = rm;

  initPageOverlays();
  initCameraZoom();
  initMonitorScrollProxy();
  initMonitorOverlays();

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });
}

export function cleanup() {
  triggers.forEach((t) => t.kill());
  triggers = [];
}

// ─── Phase 1: Room text overlays ─────────────────────────────

function initPageOverlays() {
  createOverlay('#overlay-1', '#spacer-1', { fadeIn: 0, fadeOut: 0.7 });
  createOverlay('#overlay-2', '#spacer-2', { fadeIn: 0.1, fadeOut: 0.7 });
  createOverlay('#overlay-3', '#spacer-3', { fadeIn: 0.1, fadeOut: 0.7 });
}

// ─── Phase 2: Camera zoom (pinned) ──────────────────────────

function initCameraZoom() {
  if (!roomManager || !roomManager.cameraAnimation) return;

  const camAnim = roomManager.cameraAnimation;
  const startPos = camAnim.roomOverviewPos.clone();
  const endPos = camAnim.monitorClosePos.clone();
  const startTarget = camAnim.roomOverviewTarget.clone();
  const endTarget = camAnim.monitorCloseTarget.clone();

  const st = ScrollTrigger.create({
    trigger: '#spacer-4',
    start: 'top top',
    end: '+=100%',
    scrub: 0.3,
    pin: true,
    onUpdate: (self) => {
      const p = self.progress;

      const camera = roomManager.camera;
      camera.position.x = startPos.x + (endPos.x - startPos.x) * p;
      camera.position.y = startPos.y + (endPos.y - startPos.y) * p;
      camera.position.z = startPos.z + (endPos.z - startPos.z) * p;

      const lx = startTarget.x + (endTarget.x - startTarget.x) * p;
      const ly = startTarget.y + (endTarget.y - startTarget.y) * p;
      const lz = startTarget.z + (endTarget.z - startTarget.z) * p;
      camera.lookAt(lx, ly, lz);

      camAnim._lookProxy.x = lx;
      camAnim._lookProxy.y = ly;
      camAnim._lookProxy.z = lz;
    },
    onLeave: () => {
      if (roomManager.monitorRenderer) {
        roomManager.monitorRenderer.enableInteraction();
      }
    },
    onEnterBack: () => {
      if (roomManager.monitorRenderer) {
        roomManager.monitorRenderer.disableInteraction();
      }
    },
    onLeaveBack: () => {
      camAnim.setToRoomOverview();
    },
  });

  triggers.push(st);
}

// ─── Phase 3: Page scroll → monitor-content.scrollTop ────────

function initMonitorScrollProxy() {
  const monitorContent = document.getElementById('monitor-content');
  if (!monitorContent) return;

  // Spacers 5-7 drive monitor content scroll.
  // Map the scroll range across all 3 spacers to monitor's full scroll range.
  const st = ScrollTrigger.create({
    trigger: '#spacer-5',
    endTrigger: '#spacer-7',
    start: 'top top',
    end: 'bottom top',
    scrub: 0.3,
    onUpdate: (self) => {
      const maxScroll = monitorContent.scrollHeight - monitorContent.clientHeight;
      monitorContent.scrollTop = self.progress * maxScroll;
    },
  });

  triggers.push(st);
}

// ─── Phase 3: On-screen text overlays (during monitor scroll) ─

function initMonitorOverlays() {
  createOverlay('#overlay-4', '#spacer-5', { fadeIn: 0.1, fadeOut: 0.7 });
  createOverlay('#overlay-5', '#spacer-6', { fadeIn: 0.1, fadeOut: 0.7 });
  createOverlay('#overlay-6', '#spacer-7', { fadeIn: 0.1, fadeOut: 0.9 });
}

// ─── Shared overlay helper ───────────────────────────────────

function createOverlay(overlaySelector, spacerSelector, { fadeIn = 0, fadeOut = 0.8 } = {}) {
  const overlay = document.querySelector(overlaySelector);
  const spacer = document.querySelector(spacerSelector);
  if (!overlay || !spacer) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: spacer,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.5,
    },
  });

  tl.fromTo(
    overlay,
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
    fadeIn
  );

  tl.to(overlay, { opacity: 1, duration: fadeOut - fadeIn - 0.3 });
  tl.to(overlay, { opacity: 0, y: -30, duration: 0.2, ease: 'power2.in' }, fadeOut);

  if (tl.scrollTrigger) triggers.push(tl.scrollTrigger);
}
