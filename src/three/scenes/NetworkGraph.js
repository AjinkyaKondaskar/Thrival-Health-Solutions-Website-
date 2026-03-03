import {
  Group,
  SphereGeometry,
  OctahedronGeometry,
  MeshPhysicalMaterial,
  Mesh,
  BufferGeometry,
  LineBasicMaterial,
  Line,
  Float32BufferAttribute,
  Vector3
} from 'three';

export class NetworkGraph {
  constructor() {
    this.group = new Group();
    this.nodes = [];
    this.edges = [];
    this.pulses = [];
    this.litCount = 0;

    this._build();
  }

  _build() {
    // Approximate US geographic distribution (x: -3 to 3, y: -1.5 to 1.5)
    const nodePositions = [
      // Northeast
      { x: 2.2, y: 1.0 }, { x: 2.5, y: 0.8 }, { x: 2.0, y: 0.6 },
      // Southeast
      { x: 1.8, y: -0.3 }, { x: 1.5, y: -0.8 }, { x: 2.0, y: -0.5 },
      // Midwest
      { x: 0.5, y: 0.6 }, { x: 0.2, y: 0.3 }, { x: -0.2, y: 0.5 },
      { x: 0.8, y: 0.2 },
      // South Central
      { x: 0.3, y: -0.5 }, { x: -0.3, y: -0.7 }, { x: 0.0, y: -0.3 },
      // Mountain West
      { x: -1.2, y: 0.4 }, { x: -1.5, y: 0.1 }, { x: -1.0, y: -0.2 },
      // Pacific
      { x: -2.5, y: 0.8 }, { x: -2.7, y: 0.3 }, { x: -2.3, y: -0.2 },
      // Southwest
      { x: -1.5, y: -0.6 }
    ];

    const nodeGeoSphere = new SphereGeometry(0.06, 10, 6);
    const nodeGeoOct = new OctahedronGeometry(0.07, 0);

    const nodeMat = new MeshPhysicalMaterial({
      color: 0xc9ad86,
      metalness: 0.3,
      roughness: 0.5,
      emissive: 0xc9ad86,
      emissiveIntensity: 0,
      transparent: true
    });

    // Create nodes (alternate between sphere and octahedron)
    nodePositions.forEach((pos, i) => {
      const geo = i % 2 === 0 ? nodeGeoSphere : nodeGeoOct;
      const node = new Mesh(geo, nodeMat.clone());
      node.position.set(pos.x, pos.y, 0);
      node.userData.lit = false;
      node.userData.targetEmissive = 0;
      this.group.add(node);
      this.nodes.push(node);
    });

    // Connect nearby nodes with edges
    const edgeMat = new LineBasicMaterial({
      color: 0x9b805f,
      transparent: true,
      opacity: 0.4
    });

    const maxDist = 1.3;
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dist = this.nodes[i].position.distanceTo(this.nodes[j].position);
        if (dist < maxDist) {
          const positions = new Float32BufferAttribute([
            this.nodes[i].position.x, this.nodes[i].position.y, this.nodes[i].position.z,
            this.nodes[j].position.x, this.nodes[j].position.y, this.nodes[j].position.z
          ], 3);
          const geo = new BufferGeometry();
          geo.setAttribute('position', positions);
          const line = new Line(geo, edgeMat.clone());
          line.userData.nodeA = i;
          line.userData.nodeB = j;
          this.group.add(line);
          this.edges.push(line);
        }
      }
    }

    // Create pulse particles that travel along edges
    const pulseGeo = new SphereGeometry(0.035, 8, 6);
    const pulseMat = new MeshPhysicalMaterial({
      color: 0xc9ad86,
      emissive: 0xc9ad86,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2,
      transparent: true
    });

    const pulseCount = 6;
    for (let i = 0; i < pulseCount; i++) {
      const pulse = new Mesh(pulseGeo, pulseMat.clone());
      const edgeIdx = Math.floor(Math.random() * this.edges.length);
      pulse.userData.edgeIndex = edgeIdx;
      pulse.userData.t = Math.random();
      pulse.userData.speed = 0.3 + Math.random() * 0.3;
      pulse.userData.forward = Math.random() > 0.5;
      this.group.add(pulse);
      this.pulses.push(pulse);
    }
  }

  update(delta, time) {
    // Gentle overall rotation
    this.group.rotation.y = Math.sin(time * 0.1) * 0.1;

    // Animate node emissive glow
    this.nodes.forEach((node) => {
      const current = node.material.emissiveIntensity;
      node.material.emissiveIntensity += (node.userData.targetEmissive - current) * 0.05;
    });

    // Move pulses along edges
    this.pulses.forEach((pulse) => {
      const edge = this.edges[pulse.userData.edgeIndex];
      if (!edge) return;

      const aIdx = edge.userData.nodeA;
      const bIdx = edge.userData.nodeB;
      const posA = this.nodes[aIdx].position;
      const posB = this.nodes[bIdx].position;

      if (pulse.userData.forward) {
        pulse.userData.t += pulse.userData.speed * delta;
      } else {
        pulse.userData.t -= pulse.userData.speed * delta;
      }

      // When pulse reaches the end, pick a new random edge
      if (pulse.userData.t >= 1 || pulse.userData.t <= 0) {
        pulse.userData.t = Math.max(0, Math.min(1, pulse.userData.t));
        pulse.userData.edgeIndex = Math.floor(Math.random() * this.edges.length);
        pulse.userData.forward = !pulse.userData.forward;
        pulse.userData.t = pulse.userData.forward ? 0 : 1;
      }

      const t = pulse.userData.t;
      pulse.position.lerpVectors(posA, posB, t);

      // Pulse scale animation
      const scale = 1 + Math.sin(time * 6 + t * Math.PI) * 0.3;
      pulse.scale.setScalar(scale);
    });
  }

  setActiveCount(n) {
    // Light up n nodes (from index 0 upward)
    const count = Math.min(n, this.nodes.length);
    this.litCount = count;

    this.nodes.forEach((node, i) => {
      if (i < count) {
        node.userData.lit = true;
        node.userData.targetEmissive = 0.7;
      } else {
        node.userData.lit = false;
        node.userData.targetEmissive = 0;
      }
    });
  }

  dispose() {
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
