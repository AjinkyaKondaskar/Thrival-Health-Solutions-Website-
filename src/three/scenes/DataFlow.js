import {
  Group,
  IcosahedronGeometry,
  SphereGeometry,
  MeshPhysicalMaterial,
  Mesh,
  CubicBezierCurve3,
  Vector3
} from 'three';

export class DataFlow {
  constructor() {
    this.group = new Group();
    this.nodes = [];
    this.particles = [];
    this.curves = [];
    this.activeStep = 0;

    this._build();
  }

  _build() {
    // 4 nodes spread horizontally representing workflow steps
    const nodePositions = [
      new Vector3(-3, 0, 0),
      new Vector3(-1, 0, 0),
      new Vector3(1, 0, 0),
      new Vector3(3, 0, 0)
    ];

    const nodeGeo = new IcosahedronGeometry(0.25, 1);
    const nodeMat = new MeshPhysicalMaterial({
      color: 0xc9ad86,
      metalness: 0.3,
      roughness: 0.5,
      wireframe: true,
      transparent: true
    });

    nodePositions.forEach((pos) => {
      const node = new Mesh(nodeGeo, nodeMat.clone());
      node.position.copy(pos);
      node.userData.baseEmissive = 0;
      this.group.add(node);
      this.nodes.push(node);
    });

    // Create bezier curves between consecutive nodes
    for (let i = 0; i < nodePositions.length - 1; i++) {
      const start = nodePositions[i];
      const end = nodePositions[i + 1];
      const mid = start.clone().lerp(end, 0.5);

      const curve = new CubicBezierCurve3(
        start.clone(),
        new Vector3(start.x + 0.5, 0.5, 0.3),
        new Vector3(end.x - 0.5, -0.5, 0.3),
        end.clone()
      );
      this.curves.push(curve);
    }

    // Create flow particles
    const particleGeo = new SphereGeometry(0.04, 8, 6);
    const particleMat = new MeshPhysicalMaterial({
      color: 0xc9ad86,
      metalness: 0.5,
      roughness: 0.3,
      emissive: 0xc9ad86,
      emissiveIntensity: 0.3,
      transparent: true
    });

    const particleCount = 18;
    for (let i = 0; i < particleCount; i++) {
      const particle = new Mesh(particleGeo, particleMat.clone());
      particle.userData.curveIndex = Math.floor(Math.random() * this.curves.length);
      particle.userData.t = Math.random();
      particle.userData.speed = 0.2 + Math.random() * 0.15;
      this.group.add(particle);
      this.particles.push(particle);
    }
  }

  update(delta, time) {
    // Rotate nodes gently
    this.nodes.forEach((node, i) => {
      node.rotation.x += delta * 0.3;
      node.rotation.y += delta * 0.5;

      // Glow effect for active step
      const isActive = i === this.activeStep;
      const targetEmissive = isActive ? 0.6 : 0;
      node.userData.baseEmissive += (targetEmissive - node.userData.baseEmissive) * 0.05;
      node.material.emissiveIntensity = node.userData.baseEmissive;
      node.material.emissive = node.material.color;
    });

    // Move particles along curves
    this.particles.forEach((particle) => {
      const curve = this.curves[particle.userData.curveIndex];
      particle.userData.t += particle.userData.speed * delta;

      if (particle.userData.t >= 1) {
        particle.userData.t = 0;
        particle.userData.curveIndex = (particle.userData.curveIndex + 1) % this.curves.length;
      }

      const point = curve.getPointAt(particle.userData.t);
      particle.position.copy(point);

      // Pulse particle size
      const pulse = 1 + Math.sin(time * 4 + particle.userData.t * Math.PI * 2) * 0.2;
      particle.scale.setScalar(pulse);
    });
  }

  setProgress(progress) {
    // progress 0-1 maps to step 0-3
    this.activeStep = Math.min(3, Math.floor(progress * 4));
  }

  dispose() {
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
