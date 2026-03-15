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
  DirectionalLight,
  PointLight,
  FogExp2,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  PCFSoftShadowMap,
  PMREMGenerator,
  CameraHelper,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import GUI from 'lil-gui';
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
    // 1. WebGL Renderer — physically-based pipeline
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
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // Shadow mapping
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    // 2. Camera
    this.camera = new PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    // 3. Scene
    this.scene = new Scene();

    // 4. Minimal environment map — just enough for reflections, not illumination
    const pmrem = new PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.08).texture;
    this.scene.environment = envMap;
    this.scene.environmentIntensity = 0.13;
    pmrem.dispose();

    // Subtle fog for atmospheric depth
    this.scene.fog = new FogExp2(0x0a0908, 0.1);

    // ── Only two light sources ──────────────────────────

    // Sun — DirectionalLight through window
    this.sunLight = new DirectionalLight(0xfff0d4, 1);
    this.sunLight.position.set(-6, 3.3, -2.7);
    this.sunLight.target.position.set(-0.4, -2, 0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.left = -4.5;
    this.sunLight.shadow.camera.right = 6.5;
    this.sunLight.shadow.camera.top = 5;
    this.sunLight.shadow.camera.bottom = -0.5;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 10;
    this.sunLight.shadow.bias = 0.0035;
    this.sunLight.shadow.radius = 4.5;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Shadow camera helper (toggled via debug UI)
    this._shadowHelper = new CameraHelper(this.sunLight.shadow.camera);
    this._shadowHelper.visible = false;
    this.scene.add(this._shadowHelper);

    // Monitor glow — only other light source
    this.monitorGlow = new PointLight(0xe8e4ff, 1.5, 3, 2);
    this.monitorGlow.position.set(0, 0.78, 0.5);
    this.scene.add(this.monitorGlow);

    // 5. Build room geometry
    this.roomScene = new RoomScene();
    this.scene.add(this.roomScene.group);

    // 6. CSS3D monitor renderer
    const screenTransform = this.roomScene.getMonitorScreenTransform();
    this.monitorRenderer = new MonitorRenderer(this.camera, this.scene);
    this.monitorRenderer.init(screenTransform);

    // 7. Camera animation controller
    this.cameraAnimation = new CameraAnimation(this.camera);
    this.cameraAnimation.setToRoomOverview();

    // 8. Clock
    this.clock = new Clock();

    // 9. Resize handler
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    // 10. Debug UI
    this._initDebugUI();
  }

  _initDebugUI() {
    const gui = new GUI({ title: 'Lighting Debug' });
    this._gui = gui;

    // ── Renderer
    const rendererFolder = gui.addFolder('Renderer');
    rendererFolder.add(this.renderer, 'toneMappingExposure', 0.1, 3, 0.05).name('Exposure');
    rendererFolder.add(this.scene, 'environmentIntensity', 0, 1, 0.01).name('Env Intensity');
    rendererFolder.close();

    // ── Sun light
    const sunFolder = gui.addFolder('Sun (DirectionalLight)');
    sunFolder.add(this.sunLight, 'intensity', 0, 5, 0.1).name('Intensity');
    sunFolder.add(this.sunLight.position, 'x', -6, 4, 0.1).name('Pos X');
    sunFolder.add(this.sunLight.position, 'y', -2, 8, 0.1).name('Pos Y');
    sunFolder.add(this.sunLight.position, 'z', -4, 4, 0.1).name('Pos Z');
    sunFolder.add(this.sunLight.target.position, 'x', -4, 4, 0.1).name('Target X');
    sunFolder.add(this.sunLight.target.position, 'y', -2, 4, 0.1).name('Target Y');
    sunFolder.add(this.sunLight.target.position, 'z', -4, 4, 0.1).name('Target Z');

    // Shadow sub-folder
    const shadowFolder = sunFolder.addFolder('Shadows');
    shadowFolder.add(this._shadowHelper, 'visible').name('Show Helper');
    shadowFolder.add(this.sunLight.shadow, 'bias', -0.01, 0.01, 0.0005).name('Bias');
    shadowFolder.add(this.sunLight.shadow, 'radius', 0, 10, 0.5).name('Radius');
    const shadowCam = this.sunLight.shadow.camera;
    const updateShadow = () => {
      shadowCam.updateProjectionMatrix();
      this._shadowHelper.update();
    };
    shadowFolder.add(shadowCam, 'left', -10, 0, 0.5).name('Left').onChange(updateShadow);
    shadowFolder.add(shadowCam, 'right', 0, 10, 0.5).name('Right').onChange(updateShadow);
    shadowFolder.add(shadowCam, 'top', 0, 10, 0.5).name('Top').onChange(updateShadow);
    shadowFolder.add(shadowCam, 'bottom', -10, 0, 0.5).name('Bottom').onChange(updateShadow);
    shadowFolder.close();

    // ── Monitor glow
    const monitorFolder = gui.addFolder('Monitor Glow');
    monitorFolder.add(this.monitorGlow, 'intensity', 0, 3, 0.1).name('Intensity');
    monitorFolder.add(this.monitorGlow, 'distance', 0, 10, 0.5).name('Distance');
    monitorFolder.close();

    // ── Fog
    const fogFolder = gui.addFolder('Fog');
    fogFolder.add(this.scene.fog, 'density', 0, 0.1, 0.001).name('Density');
    fogFolder.close();

    // ── Export button — logs current values to console
    gui.add({
      exportValues: () => {
        console.log('=== Current Lighting Values ===');
        console.log(`Sun intensity: ${this.sunLight.intensity}`);
        console.log(`Sun position: (${this.sunLight.position.x}, ${this.sunLight.position.y}, ${this.sunLight.position.z})`);
        console.log(`Sun target: (${this.sunLight.target.position.x}, ${this.sunLight.target.position.y}, ${this.sunLight.target.position.z})`);
        console.log(`Shadow bias: ${this.sunLight.shadow.bias}`);
        console.log(`Shadow radius: ${this.sunLight.shadow.radius}`);
        console.log(`Shadow camera: L=${shadowCam.left} R=${shadowCam.right} T=${shadowCam.top} B=${shadowCam.bottom}`);
        console.log(`Exposure: ${this.renderer.toneMappingExposure}`);
        console.log(`Env intensity: ${this.scene.environmentIntensity}`);
        console.log(`Monitor intensity: ${this.monitorGlow.intensity}`);
        console.log(`Fog density: ${this.scene.fog.density}`);
      }
    }, 'exportValues').name('Log Values to Console');
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

    if (this.cameraAnimation) {
      this.cameraAnimation.updateLookAt();
    }

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
    if (this._gui) this._gui.destroy();
    if (this.roomScene) this.roomScene.dispose();
    if (this.monitorRenderer) this.monitorRenderer.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
