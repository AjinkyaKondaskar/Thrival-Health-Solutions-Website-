/**
 * MonitorRenderer — CSS3DRenderer bridge for rendering interactive HTML
 * on the 3D monitor screen in the room scene.
 */

import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

export class MonitorRenderer {
  /**
   * @param {import('three').PerspectiveCamera} camera — shared camera
   * @param {import('three').Scene} scene — shared scene (for adding CSS3DObject)
   */
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.cssRenderer = null;
    this.cssObject = null;
    this.contentElement = null;
  }

  /**
   * Initialize the CSS3DRenderer and create the CSS3DObject
   * wrapping the #monitor-content element.
   * @param {{ width: number, height: number, position: import('three').Vector3 }} screenTransform
   */
  init(screenTransform) {
    // 1. Create CSS3DRenderer
    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(window.innerWidth, window.innerHeight);

    const domEl = this.cssRenderer.domElement;
    domEl.style.position = 'fixed';
    domEl.style.top = '0';
    domEl.style.left = '0';
    domEl.style.zIndex = '3'; // Behind WebGL canvas (z-index 5)
    domEl.style.pointerEvents = 'none';
    // Match the room background color — WebGL canvas is transparent (alpha),
    // so this dark color shows through wherever there are no 3D objects
    domEl.style.background = '#0a0908';

    // Insert CSS3D renderer DOM into body (before the WebGL canvas)
    const canvas = document.getElementById('three-canvas');
    document.body.insertBefore(domEl, canvas);

    // 2. Get the monitor-content element
    this.contentElement = document.getElementById('monitor-content');
    if (!this.contentElement) {
      console.warn('MonitorRenderer: #monitor-content not found');
      return;
    }

    // 3. Create CSS3DObject wrapping the content
    this.cssObject = new CSS3DObject(this.contentElement);

    // 4. Scale: map pixel dimensions to 3D world units
    // The monitor screen is screenTransform.width world units wide
    // The content div is 1920px wide
    const pixelWidth = 1920;
    const scaleFactor = screenTransform.width / pixelWidth;
    this.cssObject.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // 5. Position at monitor screen center
    this.cssObject.position.copy(screenTransform.position);
    // Slightly in front of the screen plane so it doesn't z-fight
    this.cssObject.position.z += 0.001;

    // 6. Add to scene
    this.scene.add(this.cssObject);
  }

  /** Enable pointer interaction on the monitor content. */
  enableInteraction() {
    if (this.cssRenderer) {
      this.cssRenderer.domElement.style.pointerEvents = 'auto';
    }
    if (this.contentElement) {
      this.contentElement.classList.add('active');
    }
  }

  /** Disable pointer interaction on the monitor content. */
  disableInteraction() {
    if (this.cssRenderer) {
      this.cssRenderer.domElement.style.pointerEvents = 'none';
    }
    if (this.contentElement) {
      this.contentElement.classList.remove('active');
    }
  }

  /** Render the CSS3D scene (call every frame). */
  render() {
    if (this.cssRenderer) {
      this.cssRenderer.render(this.scene, this.camera);
    }
  }

  /** Handle viewport resize. */
  resize(width, height) {
    if (this.cssRenderer) {
      this.cssRenderer.setSize(width, height);
    }
  }

  /** Cleanup. */
  dispose() {
    if (this.cssObject) {
      this.scene.remove(this.cssObject);
      this.cssObject = null;
    }
    if (this.cssRenderer && this.cssRenderer.domElement.parentNode) {
      this.cssRenderer.domElement.parentNode.removeChild(this.cssRenderer.domElement);
      this.cssRenderer = null;
    }
  }
}
