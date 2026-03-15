import gsap from 'gsap';
import { Vector3 } from 'three';

export class CameraAnimation {
  constructor(camera) {
    this.camera = camera;

    // Room overview: slightly elevated, looking down at desk
    this.roomOverviewPos = new Vector3(0, 1.8, 4.5);
    this.roomOverviewTarget = new Vector3(0, 0.3, 0);

    // Monitor close-up: directly in front of monitor at screen center height
    this.monitorClosePos = new Vector3(0, 0.78, 1.35);
    this.monitorCloseTarget = new Vector3(0, 0.78, 0);

    // lookAt proxy — used to smoothly interpolate the camera's look target
    this._lookProxy = {
      x: this.roomOverviewTarget.x,
      y: this.roomOverviewTarget.y,
      z: this.roomOverviewTarget.z,
    };
  }

  /** Snap camera to room overview position. */
  setToRoomOverview() {
    this.camera.position.copy(this.roomOverviewPos);
    this._lookProxy.x = this.roomOverviewTarget.x;
    this._lookProxy.y = this.roomOverviewTarget.y;
    this._lookProxy.z = this.roomOverviewTarget.z;
    this.camera.lookAt(this.roomOverviewTarget);
  }

  /**
   * Create a GSAP timeline that animates from room overview to monitor close-up.
   * Does NOT include a ScrollTrigger — the caller attaches scrub externally.
   * @returns {gsap.core.Timeline}
   */
  createZoomTimeline() {
    const camera = this.camera;
    const proxy = this._lookProxy;

    // Reset proxy to current (room overview) state
    proxy.x = this.roomOverviewTarget.x;
    proxy.y = this.roomOverviewTarget.y;
    proxy.z = this.roomOverviewTarget.z;

    const tl = gsap.timeline({ paused: true });

    // Animate camera position toward monitor
    tl.to(
      camera.position,
      {
        x: this.monitorClosePos.x,
        y: this.monitorClosePos.y,
        z: this.monitorClosePos.z,
        duration: 1,
        ease: 'none',
      },
      0
    );

    // Animate look target from room overview target to monitor center
    tl.to(
      proxy,
      {
        x: this.monitorCloseTarget.x,
        y: this.monitorCloseTarget.y,
        z: this.monitorCloseTarget.z,
        duration: 1,
        ease: 'none',
      },
      0
    );

    return tl;
  }

  /** Update camera lookAt from current proxy values (call in render loop). */
  updateLookAt() {
    this.camera.lookAt(this._lookProxy.x, this._lookProxy.y, this._lookProxy.z);
  }
}
