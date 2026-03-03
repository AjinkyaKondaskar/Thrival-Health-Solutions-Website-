import {
  Group,
  SphereGeometry,
  CylinderGeometry,
  MeshPhysicalMaterial,
  Mesh,
  Vector3
} from 'three';

export class DnaHelix {
  constructor() {
    this.group = new Group();
    this.spheres = [];
    this.rungs = [];
    this.mouseX = 0;
    this.mouseY = 0;

    this._build();
  }

  _build() {
    const sphereGeo = new SphereGeometry(0.06, 12, 8);
    const rungGeo = new CylinderGeometry(0.015, 0.015, 1, 6);

    const sphereMat = new MeshPhysicalMaterial({
      color: 0xc9ad86,
      metalness: 0.3,
      roughness: 0.5,
      transparent: true
    });

    const rungMat = new MeshPhysicalMaterial({
      color: 0x9b805f,
      metalness: 0.3,
      roughness: 0.5,
      transparent: true
    });

    const pairCount = 40;
    const helixHeight = 4;
    const helixRadius = 0.6;
    const turns = 3;

    for (let i = 0; i < pairCount; i++) {
      const t = i / (pairCount - 1);
      const angle = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * helixHeight;

      // Strand A
      const xA = Math.cos(angle) * helixRadius;
      const zA = Math.sin(angle) * helixRadius;
      const sphereA = new Mesh(sphereGeo, sphereMat.clone());
      sphereA.position.set(xA, y, zA);
      this.group.add(sphereA);
      this.spheres.push(sphereA);

      // Strand B (offset by PI)
      const xB = Math.cos(angle + Math.PI) * helixRadius;
      const zB = Math.sin(angle + Math.PI) * helixRadius;
      const sphereB = new Mesh(sphereGeo, sphereMat.clone());
      sphereB.position.set(xB, y, zB);
      this.group.add(sphereB);
      this.spheres.push(sphereB);

      // Rung connecting the pair
      const rung = new Mesh(rungGeo, rungMat.clone());
      const midX = (xA + xB) / 2;
      const midZ = (zA + zB) / 2;
      rung.position.set(midX, y, midZ);

      // Calculate rung length and orientation
      const dx = xB - xA;
      const dz = zB - zA;
      const dist = Math.sqrt(dx * dx + dz * dz);
      rung.scale.y = dist;
      rung.rotation.z = Math.PI / 2;
      rung.rotation.y = Math.atan2(dz, dx);

      this.group.add(rung);
      this.rungs.push(rung);
    }
  }

  update(delta, time) {
    // Slow rotation around Y axis
    this.group.rotation.y += 0.15 * delta;

    // Gentle float up/down
    this.group.position.y = Math.sin(time * 0.5) * 0.15;

    // Individual sphere pulsing
    for (let i = 0; i < this.spheres.length; i++) {
      const sphere = this.spheres[i];
      const pulse = 1 + Math.sin(time * 2 + i * 0.3) * 0.08;
      sphere.scale.setScalar(pulse);
    }

    // Apply mouse influence
    this.group.rotation.x += (this.mouseY * 0.1 - this.group.rotation.x) * 0.05;
    this.group.rotation.z += (-this.mouseX * 0.1 - this.group.rotation.z) * 0.05;
  }

  setMouseInfluence(x, y) {
    // x, y expected in range -1 to 1
    this.mouseX = x;
    this.mouseY = y;
  }

  dispose() {
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
