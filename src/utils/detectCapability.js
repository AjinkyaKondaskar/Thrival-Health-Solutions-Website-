/**
 * Device capability detection for Thrival Health.
 * Returns a capability object describing the current device tier.
 */

function detectCapability() {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const isMobile = window.innerWidth < 768;

  const hasWebGL2 = (() => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('webgl2');
      if (!ctx) return false;
      // Attempt to read renderer to confirm a usable GPU
      const ext = ctx.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const renderer = ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        // Flag known software renderers as unsupported
        if (/swiftshader|llvmpipe|softpipe/i.test(renderer)) return false;
      }
      ctx.getExtension('WEBGL_lose_context')?.loseContext();
      return true;
    } catch {
      return false;
    }
  })();

  const cores = navigator.hardwareConcurrency || 1;

  let tier;
  if (!hasWebGL2 || prefersReducedMotion) {
    tier = 'minimal';
  } else if (isMobile || cores < 4) {
    tier = 'reduced';
  } else {
    tier = 'full';
  }

  return { tier, isMobile, hasWebGL2, prefersReducedMotion };
}

const capability = detectCapability();

export default capability;
export { detectCapability };
