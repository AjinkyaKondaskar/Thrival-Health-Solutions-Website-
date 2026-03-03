import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Clock,
  AmbientLight,
  DirectionalLight,
  Color
} from 'three';

export class SceneManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element #${canvasId} not found`);
    }

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    this.scene = new Scene();

    // Warm ambient light
    this.ambientLight = new AmbientLight(0xc9ad86, 0.4);
    this.scene.add(this.ambientLight);

    // Gold-tinted directional light from upper-right
    this.directionalLight = new DirectionalLight(0xfff5e6, 0.8);
    this.directionalLight.position.set(3, 4, 2);
    this.scene.add(this.directionalLight);

    this.clock = new Clock();
    this.scenes = new Map();
    this.activeScene = null;
    this.nextScene = null;
    this.transitionProgress = 1;
    this.transitionDuration = 1.0;
    this.animationId = null;
    this.running = false;

    window.addEventListener('resize', () => this.resize());
  }

  registerScene(name, sceneModule) {
    this.scenes.set(name, sceneModule);
    // Add the scene group to the main scene but hide it
    if (sceneModule.group) {
      sceneModule.group.visible = false;
      this.scene.add(sceneModule.group);
    }
  }

  setActiveScene(name, duration = 1.0) {
    if (name === this.activeScene) return;
    if (!this.scenes.has(name)) return;

    this.transitionDuration = duration;
    this.transitionProgress = 0;
    this.nextScene = name;

    // Make the next scene visible immediately
    const nextModule = this.scenes.get(name);
    if (nextModule && nextModule.group) {
      nextModule.group.visible = true;
      nextModule.group.traverse((child) => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = 0;
        }
      });
    }
  }

  animate() {
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      this.animationId = requestAnimationFrame(tick);

      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Handle scene transitions
      if (this.transitionProgress < 1 && this.nextScene) {
        this.transitionProgress += delta / this.transitionDuration;
        if (this.transitionProgress >= 1) {
          this.transitionProgress = 1;
          this._completeTransition();
        } else {
          this._updateTransition(this.transitionProgress);
        }
      }

      // Update active scene
      if (this.activeScene) {
        const activeModule = this.scenes.get(this.activeScene);
        if (activeModule && activeModule.update) {
          activeModule.update(delta, elapsed);
        }
      }

      // Update next scene during transition
      if (this.nextScene && this.nextScene !== this.activeScene) {
        const nextModule = this.scenes.get(this.nextScene);
        if (nextModule && nextModule.update) {
          nextModule.update(delta, elapsed);
        }
      }

      this.renderer.render(this.scene, this.camera);
    };

    tick();
  }

  _updateTransition(progress) {
    // Fade out current scene
    if (this.activeScene) {
      const currentModule = this.scenes.get(this.activeScene);
      if (currentModule && currentModule.group) {
        const fadeOut = 1 - progress;
        currentModule.group.traverse((child) => {
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = fadeOut;
          }
        });
      }
    }

    // Fade in next scene
    if (this.nextScene) {
      const nextModule = this.scenes.get(this.nextScene);
      if (nextModule && nextModule.group) {
        nextModule.group.traverse((child) => {
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = progress;
          }
        });
      }
    }
  }

  _completeTransition() {
    // Hide the old scene
    if (this.activeScene) {
      const oldModule = this.scenes.get(this.activeScene);
      if (oldModule && oldModule.group) {
        oldModule.group.visible = false;
      }
    }

    // Fully show the new scene
    const newModule = this.scenes.get(this.nextScene);
    if (newModule && newModule.group) {
      newModule.group.traverse((child) => {
        if (child.material) {
          child.material.opacity = 1;
        }
      });
    }

    this.activeScene = this.nextScene;
    this.nextScene = null;
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  destroy() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Dispose all scenes
    this.scenes.forEach((sceneModule) => {
      if (sceneModule.dispose) {
        sceneModule.dispose();
      }
    });

    this.renderer.dispose();
  }
}
