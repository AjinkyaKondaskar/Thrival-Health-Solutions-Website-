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
  Mesh,
  DoubleSide,
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  Points,
  CanvasTexture
} from 'three';

export class RoomScene {
  constructor() {
    this.group = new Group();
    this.monitorScreenPosition = new Vector3(0, 0.78, 0);
    this.monitorScreenSize = { width: 1.52, height: 0.855 };
    this._foliageMeshes = [];
    this._godRayMeshes = [];
    this._dustPoints = null;
    this._dustPositions = null;
    this._dustVelocities = null;
    this._build();
  }

  _build() {
    this._buildRoom();
    this._buildWindow();
    this._buildGodRays();
    this._buildDustParticles();
    this._buildDesk();
    this._buildMonitor();
    this._buildKeyboard();
    this._buildMouse();
    this._buildPlant();
    this._buildMug();
    this._buildBooks();

    // Shadows: room surfaces receive only, desk items cast + receive
    this.group.traverse((child) => {
      if (!child.isMesh) return;
      const mat = child.material;
      if (mat.blending === AdditiveBlending) return;
      if (mat.colorWrite === false) return;
      if (mat.isMeshBasicMaterial) return;
      child.receiveShadow = true;
      // Room structure (walls/floor/ceiling) should NOT cast shadows —
      // the light represents sunlight already past them through the window.
      if (!child.userData.isRoom) {
        child.castShadow = true;
      }
    });
  }

  /* ── Room environment ─────────────────────────────── */

  _buildRoom() {
    // Floor — warm wood, receives shadows
    const floorMat = new MeshPhysicalMaterial({
      color: 0x4a3d30,
      roughness: 0.72,
      metalness: 0.02,
    });
    const floor = new Mesh(new PlaneGeometry(10, 8), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.7;
    floor.userData.isRoom = true;
    this.group.add(floor);

    // Wall material — mid-tone so GI bounce reads naturally
    const wallMat = new MeshPhysicalMaterial({
      color: 0x443830,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Back wall
    const backWall = new Mesh(new PlaneGeometry(10, 4.5), wallMat);
    backWall.position.set(0, 1.55, -2.5);
    backWall.userData.isRoom = true;
    this.group.add(backWall);

    // Left wall (window is at x=-3.5, y=2.2)
    const leftWall = new Mesh(new PlaneGeometry(8, 4.5), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-3.5, 1.55, 0);
    leftWall.userData.isRoom = true;
    this.group.add(leftWall);

    // Right wall
    const rightWall = new Mesh(new PlaneGeometry(8, 4.5), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(3.5, 1.55, 0);
    rightWall.userData.isRoom = true;
    this.group.add(rightWall);

    // Ceiling
    const ceilingMat = new MeshPhysicalMaterial({
      color: 0x3a3230,
      roughness: 0.88,
      metalness: 0.0,
    });
    const ceiling = new Mesh(new PlaneGeometry(10, 8), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3.8;
    ceiling.userData.isRoom = true;
    this.group.add(ceiling);
  }

  _buildWindow() {
    const windowGroup = new Group();

    // Bright sky pane (the light source visible through the window)
    const skyMat = new MeshBasicMaterial({ color: 0xfff4e0 });
    const skyPane = new Mesh(new PlaneGeometry(1.1, 1.5), skyMat);
    windowGroup.add(skyPane);

    // Frame material — dark wood
    const frameMat = new MeshPhysicalMaterial({
      color: 0x2a1f14,
      roughness: 0.65,
      metalness: 0.1,
    });

    const fw = 1.25, fh = 1.65, ft = 0.05, fd = 0.06;

    const bar = (w, h, x, y) => {
      const m = new Mesh(new BoxGeometry(w, h, fd), frameMat);
      m.position.set(x, y, 0.02);
      return m;
    };

    // Outer frame
    windowGroup.add(bar(fw, ft, 0, fh / 2));          // top
    windowGroup.add(bar(fw, ft, 0, -fh / 2));         // bottom
    windowGroup.add(bar(ft, fh + ft, -fw / 2, 0));    // left
    windowGroup.add(bar(ft, fh + ft, fw / 2, 0));     // right

    // Cross mullions
    const mV = new Mesh(new BoxGeometry(0.035, fh - ft, fd), frameMat);
    mV.position.z = 0.02;
    windowGroup.add(mV);

    const mH = new Mesh(new BoxGeometry(fw - ft, 0.035, fd), frameMat);
    mH.position.z = 0.02;
    windowGroup.add(mH);

    // Position on left wall, slightly in front to avoid z-fighting with wall plane
    windowGroup.rotation.y = Math.PI / 2;
    windowGroup.position.set(-3.47, 2.2, 0);
    this.group.add(windowGroup);
  }

  _createRayTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 128, 256);

    // Soft radial gradient — fades on ALL edges, no hard cutoffs
    const g = ctx.createRadialGradient(64, 110, 0, 64, 128, 120);
    g.addColorStop(0, 'rgba(255,242,214,1)');
    g.addColorStop(0.25, 'rgba(255,238,208,0.7)');
    g.addColorStop(0.55, 'rgba(255,235,200,0.3)');
    g.addColorStop(0.8, 'rgba(255,230,190,0.08)');
    g.addColorStop(1, 'rgba(255,225,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 256);
    return new CanvasTexture(c);
  }

  _buildGodRays() {
    const tex = this._createRayTexture();
    const baseMat = new MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.045,
      blending: AdditiveBlending,
      side: DoubleSide,
      depthWrite: false,
      fog: false,
    });

    // Aligned to DirectionalLight direction: (-4,3,1) → (1,-0.5,0)
    // Direction vector (5,-3.5,-1), XY angle ≈ 0.96 rad from +y axis.
    // God rays follow the same path the sunlight takes into the room.
    const rz = 0.96; // matches light angle
    const rays = [
      // Main beam — center, strongest
      { w: 2.2, h: 5.5, x: -1.4, y: 0.75, z: -0.1, rz, ry: 0.03,  op: 0.06 },
      // Upper shaft — through top panes
      { w: 1.4, h: 5.0, x: -1.6, y: 0.9,  z: -0.5, rz, ry: 0.08,  op: 0.04 },
      // Lower shaft — through bottom panes
      { w: 1.4, h: 5.0, x: -1.1, y: 0.5,  z: 0.3,  rz, ry: -0.05, op: 0.04 },
    ];

    for (const r of rays) {
      const mat = baseMat.clone();
      mat.opacity = r.op;
      const mesh = new Mesh(new PlaneGeometry(r.w, r.h), mat);
      mesh.position.set(r.x, r.y, r.z);
      mesh.rotation.set(0, r.ry, r.rz);
      mesh.userData.baseOpacity = r.op;
      mesh.userData.baseRz = r.rz;
      this._godRayMeshes.push(mesh);
      this.group.add(mesh);
    }
  }

  _buildDustParticles() {
    const count = 100;
    const positions = new Float32Array(count * 3);
    this._dustVelocities = new Float32Array(count * 3);
    this._dustPhases = new Float32Array(count); // per-particle phase for wobble

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3]     = -3 + Math.random() * 5;
      positions[i3 + 1] = -0.5 + Math.random() * 3.5;
      positions[i3 + 2] = -1.5 + Math.random() * 3;

      this._dustVelocities[i3]     = (Math.random() - 0.5) * 0.012;
      this._dustVelocities[i3 + 1] = Math.random() * 0.004 + 0.001;
      this._dustVelocities[i3 + 2] = (Math.random() - 0.5) * 0.012;
      this._dustPhases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new BufferGeometry();
    const posAttr = new Float32BufferAttribute(positions, 3);
    geo.setAttribute('position', posAttr);

    const mat = new PointsMaterial({
      color: 0xfff5e0,
      size: 0.025,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    this._dustPoints = new Points(geo, mat);
    // Reference the attribute's internal array so updates reach the GPU
    this._dustPositions = posAttr.array;
    this.group.add(this._dustPoints);
  }

  /* ── Desk items ───────────────────────────────────── */

  _buildDesk() {
    const woodMat = new MeshPhysicalMaterial({
      color: 0x5a4030,
      roughness: 0.65,
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
    screen.renderOrder = -1;
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

    monitorGroup.position.set(0, 0.78, 0);
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

    // Foliage
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

    const body = new Mesh(
      new CylinderGeometry(0.04, 0.035, 0.07, 12),
      mugMat
    );
    body.position.set(0.85, 0.065, -0.1);
    this.group.add(body);

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

  /* ── Public API ───────────────────────────────────── */

  getMonitorScreenTransform() {
    return {
      position: this.monitorScreenPosition.clone(),
      width: this.monitorScreenSize.width,
      height: this.monitorScreenSize.height
    };
  }

  update(delta, time) {
    // Plant leaf sway
    for (let i = 0; i < this._foliageMeshes.length; i++) {
      const leaf = this._foliageMeshes[i];
      const phase = time * 1.5 + i * 2.1;
      leaf.position.x = -0.9 + [0, -0.03, 0.03][i] + Math.sin(phase) * 0.003;
      leaf.position.z = 0.1 + [0, 0.02, -0.02][i] + Math.cos(phase) * 0.002;
    }

    // God ray shimmer — opacity pulse + gentle sway
    for (let i = 0; i < this._godRayMeshes.length; i++) {
      const ray = this._godRayMeshes[i];
      const base = ray.userData.baseOpacity;
      const slow = Math.sin(time * 0.8 + i * 1.7) * 0.4;
      const fast = Math.sin(time * 2.1 + i * 3.3) * 0.15;
      ray.material.opacity = base * (1 + slow + fast);
      // Gentle sway
      ray.rotation.z = ray.userData.baseRz + Math.sin(time * 0.3 + i * 0.9) * 0.015;
    }

    // Dust particle drift with sinusoidal wobble
    if (this._dustPoints) {
      const pos = this._dustPositions;
      const vel = this._dustVelocities;
      const phases = this._dustPhases;
      const count = pos.length / 3;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const wobble = Math.sin(time * 1.5 + phases[i]) * 0.004;
        pos[i3]     += vel[i3] + wobble;
        pos[i3 + 1] += vel[i3 + 1];
        pos[i3 + 2] += vel[i3 + 2] + Math.cos(time * 1.2 + phases[i]) * 0.003;

        if (pos[i3] > 2 || pos[i3] < -3.5 ||
            pos[i3 + 1] > 3.5 || pos[i3 + 1] < -0.7 ||
            pos[i3 + 2] > 1.5 || pos[i3 + 2] < -1.5) {
          pos[i3]     = -3 + Math.random() * 5;
          pos[i3 + 1] = -0.5 + Math.random() * 3.5;
          pos[i3 + 2] = -1.5 + Math.random() * 3;
        }
      }
      this._dustPoints.geometry.attributes.position.needsUpdate = true;
    }
  }

  dispose() {
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }
}
