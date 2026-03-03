/**
 * Thrival Health — Main entry point
 * 3D Room with hybrid scroll experience.
 */

// --- CSS imports ---
import './styles/base.css';
import './styles/effects.css';
import './styles/room.css';
import './styles/scroll-sections.css';

// --- Utilities ---
import capability from './utils/detectCapability.js';

// ─── State ────────────────────────────────────────────────
let roomManager = null;

// ─── Bootstrap ────────────────────────────────────────────
function boot() {
  if (capability.tier === 'full') {
    initRoomExperience();
  } else {
    initFallback();
  }
}

// ─── Room Experience (full tier) ─────────────────────────
async function initRoomExperience() {
  try {
    const { RoomManager } = await import('./three/RoomManager.js');
    roomManager = new RoomManager();
    await roomManager.init();
    roomManager.start();

    // Once room is rendering, initialize scroll-driven animations
    const { init: initScrollExperience } = await import('./effects/ScrollExperience.js');
    initScrollExperience(roomManager);
  } catch (err) {
    console.warn('Room experience failed, falling back:', err);
    initFallback();
  }
}

// ─── Fallback ────────────────────────────────────────────
function initFallback() {
  const monitorContent = document.getElementById('monitor-content');
  if (monitorContent) monitorContent.classList.add('fallback-mode');

  const loading = document.getElementById('room-loading');
  if (loading) loading.style.display = 'none';

  const canvas = document.getElementById('three-canvas');
  if (canvas) canvas.style.display = 'none';

  // Show all overlays statically in fallback
  document.querySelectorAll('.text-overlay').forEach((el) => {
    el.style.opacity = '1';
    el.style.position = 'relative';
    el.style.minHeight = '80vh';
  });

  // Hide spacers
  document.querySelectorAll('.scroll-spacer').forEach((el) => {
    el.style.display = 'none';
  });
}

// ─── Kick off ────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
