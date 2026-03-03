/**
 * RoomManager — Top-level orchestrator for the 3D room experience.
 * Coordinates WebGLRenderer (room), CSS3DRenderer (monitor content),
 * and camera. Scroll-driven animations are handled externally by ScrollExperience.
 */

import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Clock,
  AmbientLight,
  DirectionalLight,
  PointLight,
} from 'three';
import gsap from 'gsap';
import { RoomScene } from './RoomScene.js';
import { MonitorRenderer } from './MonitorRenderer.js';
import { CameraAnimation } from './CameraAnimation.js';

export class RoomManager {
  constructor() {
    this.canvas = null;
    this.renderer = null;
    this.camera = null;
    this.scene = null;
    this.clock = null;

    this.roomScene = null;
    this.monitorRenderer = null;
    this.cameraAnimation = null;

    this.running = false;
    this.animationId = null;

    // State: loading | active
    this.state = 'loading';
  }

  async init() {
    // 1. WebGL Renderer
    this.canvas = document.getElementById('three-canvas');
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    // 2. Camera
    this.camera = new PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    // 3. Scene + lighting (no scene.background — canvas stays transparent)
    this.scene = new Scene();

    const ambient = new AmbientLight(0xc9ad86, 0.3);
    this.scene.add(ambient);

    const dirLight = new DirectionalLight(0xfff5e6, 0.6);
    dirLight.position.set(3, 4, 2);
    this.scene.add(dirLight);

    const monitorGlow = new PointLight(0xe8e4ff, 0.4, 3);
    monitorGlow.position.set(0, 0.5, 0.5);
    this.scene.add(monitorGlow);

    // 4. Build room geometry
    this.roomScene = new RoomScene();
    this.scene.add(this.roomScene.group);

    // 5. CSS3D monitor renderer
    const screenTransform = this.roomScene.getMonitorScreenTransform();
    this.monitorRenderer = new MonitorRenderer(this.camera, this.scene);
    this.monitorRenderer.init(screenTransform);

    // 6. Camera animation controller
    this.cameraAnimation = new CameraAnimation(this.camera);
    this.cameraAnimation.setToRoomOverview();

    // 7. Clock
    this.clock = new Clock();

    // 8. Resize handler
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  /** Start the experience: fade out loading, start render loop. */
  start() {
    this.running = true;

    const loadingEl = document.getElementById('room-loading');

    gsap.to(loadingEl, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.inOut',
      onComplete: () => {
        loadingEl.style.display = 'none';
        this.state = 'active';
      },
    });

    this._tick();
  }

  _tick() {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(() => this._tick());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    if (this.roomScene) {
      this.roomScene.update(delta, elapsed);
    }

    // Keep camera lookAt in sync (scroll-driven GSAP updates position/proxy between frames)
    if (this.cameraAnimation) {
      this.cameraAnimation.updateLookAt();
    }

    // Always render both layers
    this.renderer.render(this.scene, this.camera);

    if (this.monitorRenderer) {
      this.monitorRenderer.render();
    }
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.monitorRenderer) {
      this.monitorRenderer.resize(w, h);
    }
  }

  destroy() {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this._onResize);
    if (this.roomScene) this.roomScene.dispose();
    if (this.monitorRenderer) this.monitorRenderer.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
