import {
  Group,
  SphereGeometry,
  CylinderGeometry,
  MeshPhysicalMaterial,
  Mesh,
  Vector3
} from 'three';

export class MoleculeGrid {
  constructor() {
    this.group = new Group();
    this.molecules = [];
    this.mouseX = 0;
    this.mouseY = 0;

    this._build();
  }

  _build() {
    const moleculeConfigs = [
      { pos: [-2.0, 1.0, 0], bonds: 3 },
      { pos: [0.0, 1.2, -0.5], bonds: 4 },
      { pos: [2.0, 0.8, 0.3], bonds: 2 },
      { pos: [-1.5, -0.8, 0.2], bonds: 3 },
      { pos: [0.5, -1.0, -0.3], bonds: 4 },
      { pos: [2.2, -0.5, 0], bonds: 2 },
      { pos: [-0.5, 0.0, 0.5], bonds: 3 },
      { pos: [1.2, 0.2, -0.4], bonds: 2 }
    ];

    const centralGeo = new SphereGeometry(0.12, 12, 8);
    const bondedGeo = new SphereGeometry(0.07, 10, 6);
    const bondGeo = new CylinderGeometry(0.015, 0.015, 1, 6);

    const centralMat = new MeshPhysicalMaterial({
      color: 0xc9ad86,
      metalness: 0.3,
      roughness: 0.5,
      transparent: true
    });

    const bondedMat = new MeshPhysicalMaterial({
      color: 0x9b805f,
      metalness: 0.3,
      roughness: 0.5,
      transparent: true
    });

    const bondMat = new MeshPhysicalMaterial({
      color: 0x7d5f43,
      metalness: 0.2,
      roughness: 0.6,
      transparent: true
    });

    moleculeConfigs.forEach((config) => {
      const molGroup = new Group();
      molGroup.position.set(config.pos[0], config.pos[1], config.pos[2]);

      // Central atom
      const central = new Mesh(centralGeo, centralMat.clone());
      molGroup.add(central);

      // Bonded atoms
      const bondCount = config.bonds;
      for (let i = 0; i < bondCount; i++) {
        const angle = (i / bondCount) * Math.PI * 2;
        const bondLength = 0.3 + Math.random() * 0.15;
        const bx = Math.cos(angle) * bondLength;
        const by = Math.sin(angle) * bondLength;
        const bz = (Math.random() - 0.5) * 0.2;

        // Bonded atom
        const bonded = new Mesh(bondedGeo, bondedMat.clone());
        bonded.position.set(bx, by, bz);
        molGroup.add(bonded);

        // Bond cylinder
        const bond = new Mesh(bondGeo, bondMat.clone());
        const midX = bx / 2;
        const midY = by / 2;
        const midZ = bz / 2;
        bond.position.set(midX, midY, midZ);

        const dist = Math.sqrt(bx * bx + by * by + bz * bz);
        bond.scale.y = dist;

        // Orient cylinder to connect center to bonded atom
        const dir = new Vector3(bx, by, bz).normalize();
        const up = new Vector3(0, 1, 0);
        bond.quaternion.setFromUnitVectors(up, dir);

        molGroup.add(bond);
      }

      // Store animation data
      molGroup.userData.baseY = config.pos[1];
      molGroup.userData.bobSpeed = 0.3 + Math.random() * 0.4;
      molGroup.userData.bobPhase = Math.random() * Math.PI * 2;
      molGroup.userData.rotSpeed = 0.1 + Math.random() * 0.2;

      this.group.add(molGroup);
      this.molecules.push(molGroup);
    });
  }

  update(delta, time) {
    this.molecules.forEach((mol) => {
      // Independent bobbing
      const bobOffset = Math.sin(time * mol.userData.bobSpeed + mol.userData.bobPhase) * 0.1;
      mol.position.y = mol.userData.baseY + bobOffset;

      // Slow rotation
      mol.rotation.y += mol.userData.rotSpeed * delta;
      mol.rotation.x += mol.userData.rotSpeed * delta * 0.3;

      // Mouse influence - molecules near cursor react
      const dx = mol.position.x / 3 - this.mouseX;
      const dy = mol.position.y / 2 - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.8) {
        const pushStrength = (0.8 - dist) * 0.02;
        mol.position.x += dx * pushStrength;
        mol.position.y += dy * pushStrength;
        mol.rotation.y += delta * 0.5;
      }
    });
  }

  setMouseInfluence(x, y) {
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
