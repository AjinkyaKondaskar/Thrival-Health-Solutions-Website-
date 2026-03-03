import {
  Group,
  Vector3,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  PlaneGeometry,
  TorusGeometry,
  MeshPhysicalMaterial,
  MeshBasicMaterial,
  Mesh
} from 'three';

export class RoomScene {
  constructor() {
    this.group = new Group();
    this.monitorScreenPosition = new Vector3(0, 0.5, 0);
    this.monitorScreenSize = { width: 1.52, height: 0.855 };
    this._foliageMeshes = [];
    this._build();
  }

  _build() {
    this._buildDesk();
    this._buildMonitor();
    this._buildKeyboard();
    this._buildMouse();
    this._buildPlant();
    this._buildMug();
    this._buildBooks();
  }

  _buildDesk() {
    const woodMat = new MeshPhysicalMaterial({
      color: 0x3d2b1a,
      roughness: 0.7,
      metalness: 0.1
    });

    // Tabletop
    const top = new Mesh(new BoxGeometry(2.4, 0.06, 1.0), woodMat);
    top.position.y = 0;
    this.group.add(top);

    // 4 legs
    const legGeo = new BoxGeometry(0.06, 0.7, 0.06);
    const legPositions = [
      [-1.1, -0.35, -0.4],
      [1.1, -0.35, -0.4],
      [-1.1, -0.35, 0.4],
      [1.1, -0.35, 0.4]
    ];
    for (const [x, y, z] of legPositions) {
      const leg = new Mesh(legGeo, woodMat);
      leg.position.set(x, y, z);
      this.group.add(leg);
    }
  }

  _buildMonitor() {
    const frameMat = new MeshPhysicalMaterial({
      color: 0x1a1a1a,
      roughness: 0.3,
      metalness: 0.8
    });

    const monitorGroup = new Group();

    // Frame dimensions
    const innerW = 1.52;
    const innerH = 0.855;
    const bezel = 0.04;
    const depth = 0.03;

    // Top bar
    const topBar = new Mesh(
      new BoxGeometry(innerW + bezel * 2, bezel, depth),
      frameMat
    );
    topBar.position.set(0, innerH / 2 + bezel / 2, 0);
    monitorGroup.add(topBar);

    // Bottom bar
    const bottomBar = new Mesh(
      new BoxGeometry(innerW + bezel * 2, bezel, depth),
      frameMat
    );
    bottomBar.position.set(0, -(innerH / 2 + bezel / 2), 0);
    monitorGroup.add(bottomBar);

    // Left bar
    const leftBar = new Mesh(
      new BoxGeometry(bezel, innerH, depth),
      frameMat
    );
    leftBar.position.set(-(innerW / 2 + bezel / 2), 0, 0);
    monitorGroup.add(leftBar);

    // Right bar
    const rightBar = new Mesh(
      new BoxGeometry(bezel, innerH, depth),
      frameMat
    );
    rightBar.position.set(innerW / 2 + bezel / 2, 0, 0);
    monitorGroup.add(rightBar);

    // Screen plane — invisible but writes to depth buffer for CSS3D passthrough
    const screenMat = new MeshBasicMaterial({ colorWrite: false, depthWrite: true });
    const screen = new Mesh(new PlaneGeometry(innerW, innerH), screenMat);
    screen.renderOrder = -1; // Render first so depth buffer blocks objects behind
    screen.position.set(0, 0, depth / 2 + 0.002);
    monitorGroup.add(screen);

    // Stand neck
    const neck = new Mesh(
      new CylinderGeometry(0.03, 0.03, 0.25, 8),
      frameMat
    );
    neck.position.set(0, -(innerH / 2 + bezel + 0.125), 0);
    monitorGroup.add(neck);

    // Stand base
    const base = new Mesh(
      new CylinderGeometry(0.15, 0.18, 0.02, 16),
      frameMat
    );
    base.position.set(0, -(innerH / 2 + bezel + 0.25 + 0.01), 0);
    monitorGroup.add(base);

    // Position entire monitor group so screen center is at (0, 0.5, 0)
    // The screen is at local (0,0,0) inside monitorGroup, so we offset the group
    monitorGroup.position.set(0, 0.5, 0);
    this.group.add(monitorGroup);
  }

  _buildKeyboard() {
    const kbMat = new MeshPhysicalMaterial({
      color: 0x2a2a2a,
      roughness: 0.5,
      metalness: 0.3
    });
    const kb = new Mesh(new BoxGeometry(0.6, 0.02, 0.22), kbMat);
    kb.position.set(0, 0.04, 0.25);
    this.group.add(kb);
  }

  _buildMouse() {
    const mouseMat = new MeshPhysicalMaterial({
      color: 0x2a2a2a,
      roughness: 0.5,
      metalness: 0.3
    });
    const mouse = new Mesh(new BoxGeometry(0.05, 0.015, 0.08), mouseMat);
    mouse.position.set(0.45, 0.04, 0.3);
    this.group.add(mouse);
  }

  _buildPlant() {
    // Pot
    const potMat = new MeshPhysicalMaterial({
      color: 0xc47a4a,
      roughness: 0.8,
      metalness: 0.05
    });
    const pot = new Mesh(new CylinderGeometry(0.06, 0.05, 0.08, 8), potMat);
    pot.position.set(-0.9, 0.07, 0.1);
    this.group.add(pot);

    // Foliage — 3 small spheres clustered above pot
    const leafMat = new MeshPhysicalMaterial({
      color: 0x4a7a4a,
      roughness: 0.6,
      metalness: 0.1
    });
    const leafGeo = new SphereGeometry(0.04, 8, 6);
    const leafOffsets = [
      [0, 0.15, 0],
      [-0.03, 0.13, 0.02],
      [0.03, 0.14, -0.02]
    ];
    for (const [dx, dy, dz] of leafOffsets) {
      const leaf = new Mesh(leafGeo, leafMat);
      leaf.position.set(-0.9 + dx, dy, 0.1 + dz);
      this._foliageMeshes.push(leaf);
      this.group.add(leaf);
    }
  }

  _buildMug() {
    const mugMat = new MeshPhysicalMaterial({
      color: 0xf5f0e8,
      roughness: 0.4,
      metalness: 0.05
    });

    // Body
    const body = new Mesh(
      new CylinderGeometry(0.04, 0.035, 0.07, 12),
      mugMat
    );
    body.position.set(0.85, 0.065, -0.1);
    this.group.add(body);

    // Handle — torus rotated to form a C-shape on the side
    const handle = new Mesh(
      new TorusGeometry(0.02, 0.005, 8, 12),
      mugMat
    );
    handle.position.set(0.85 + 0.045, 0.065, -0.1);
    handle.rotation.y = Math.PI / 2;
    this.group.add(handle);
  }

  _buildBooks() {
    const bookColors = [0x7d5f43, 0x4a6a7a, 0x8b6b4a];
    const bookGeo = new BoxGeometry(0.18, 0.03, 0.12);

    for (let i = 0; i < bookColors.length; i++) {
      const mat = new MeshPhysicalMaterial({
        color: bookColors[i],
        roughness: 0.7,
        metalness: 0.05
      });
      const book = new Mesh(bookGeo, mat);
      book.position.set(
        -0.85 + i * 0.02,
        0.045 + i * 0.03,
        -0.2
      );
      book.rotation.y = i * 0.05;
      this.group.add(book);
    }
  }

  getMonitorScreenTransform() {
    return {
      position: this.monitorScreenPosition.clone(),
      width: this.monitorScreenSize.width,
      height: this.monitorScreenSize.height
    };
  }

  update(delta, time) {
    // Gentle plant leaf sway
    for (let i = 0; i < this._foliageMeshes.length; i++) {
      const leaf = this._foliageMeshes[i];
      const phase = time * 1.5 + i * 2.1;
      leaf.position.x = -0.9 + [0, -0.03, 0.03][i] + Math.sin(phase) * 0.003;
      leaf.position.z = 0.1 + [0, 0.02, -0.02][i] + Math.cos(phase) * 0.002;
    }
  }

  dispose() {
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
