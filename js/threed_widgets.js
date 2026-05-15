/* ═══════════════════════════════════════════════════════
   DentCare Pro — 3D Widgets (Three.js r128)
   Requires: three.min.js loaded before this file
   Widgets:
     1. JawChart3D   — patients page (clickable 32-tooth jaw)
     2. DnaWidget    — patient profile header
     3. CoinStack3D  — finance page
     4. OrbWidget    — waiting room
     5. Molecule3D   — inventory page
     6. BarChart3D   — analytics page (revenue bars)
   Each widget has:
     .mount(containerId, data?)  — build & start render loop
     .destroy()                  — cancel loop, dispose renderer
   ═══════════════════════════════════════════════════════ */

/* ── shared helpers ──────────────────────────────────── */
function _mkRenderer(canvas, w, h) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setSize(w, h);
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.setClearColor(0x000000, 0);
  return r;
}
function _mkCamera(w, h, fov, z) {
  const c = new THREE.PerspectiveCamera(fov, w / h, 0.1, 200);
  c.position.z = z;
  return c;
}
function _stdLights(scene, accent) {
  scene.add(new THREE.AmbientLight(0x334455, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(accent || 0x00d4ff, 0.4);
  rim.position.set(-3, -2, -3);
  scene.add(rim);
}
function _dragRotate(canvas, group, opts) {
  opts = opts || {};
  let drag = false, px = 0, py = 0;
  let autoSpin = opts.autoSpin !== false;
  canvas.style.cursor = 'grab';
  canvas.addEventListener('mousedown', e => {
    drag = true; autoSpin = false;
    px = e.clientX; py = e.clientY;
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('mousemove', e => {
    if (!drag) return;
    group.rotation.y += (e.clientX - px) * 0.008;
    if (!opts.lockX) group.rotation.x += (e.clientY - py) * 0.008;
    px = e.clientX; py = e.clientY;
  });
  const stop = () => { drag = false; autoSpin = true; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('mouseup', stop);
  canvas.addEventListener('mouseleave', stop);
  canvas.addEventListener('touchstart', e => {
    drag = true; autoSpin = false;
    px = e.touches[0].clientX; py = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (!drag) return;
    group.rotation.y += (e.touches[0].clientX - px) * 0.008;
    if (!opts.lockX) group.rotation.x += (e.touches[0].clientY - py) * 0.008;
    px = e.touches[0].clientX; py = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', () => { drag = false; autoSpin = true; });
  return { isAuto: () => autoSpin };
}

/* ══════════════════════════════════════════════════════
   1. JAW CHART 3D  — patients page
      mount(containerId, { onToothClick(toothIndex) })
   ══════════════════════════════════════════════════════ */
const JawChart3D = {
  _animId: null,
  _renderer: null,
  _selected: -1,
  _meshes: [],

  mount(containerId, opts) {
    this.destroy();
    opts = opts || {};
    const wrap = document.getElementById(containerId);
    if (!wrap || typeof THREE === 'undefined') return;

    const W = wrap.offsetWidth || 460, H = 220;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = `width:100%;height:${H}px;display:block;border-radius:8px;
      background:radial-gradient(ellipse at center, rgba(0,30,50,.9) 0%, rgba(5,8,15,.95) 100%);
      cursor:pointer`;
    wrap.innerHTML = '';
    wrap.appendChild(canvas);

    const renderer = _mkRenderer(canvas, W, H);
    this._renderer = renderer;
    const scene = new THREE.Scene();
    const camera = _mkCamera(W, H, 42, 7);
    camera.position.set(0, 1.2, 7);
    camera.lookAt(0, 0, 0);
    _stdLights(scene, 0x00d4ff);

    /* Materials */
    const normalMat  = () => new THREE.MeshPhongMaterial({ color: 0xe8f4ff, shininess: 140, specular: 0x88ccee });
    const selectedMat= () => new THREE.MeshPhongMaterial({ color: 0x00d4ff, shininess: 200, specular: 0xffffff, emissive: 0x003344 });
    const rootMat    = () => new THREE.MeshPhongMaterial({ color: 0xbbd8ee, shininess: 60 });

    const group = new THREE.Group();
    this._meshes = [];

    /* 16 upper teeth on arch */
    const buildArch = (yOff, flipZ) => {
      const count = 16;
      const archR = 3.0;
      for (let i = 0; i < count; i++) {
        const t = (i / (count - 1)) * Math.PI;
        const x = -Math.cos(t) * archR * 0.85;
        const baseZ = Math.sin(t) * 0.7 * (flipZ ? -1 : 1);

        /* size varies: molars wider, incisors narrower */
        const isMolar  = i < 3 || i > 12;
        const isPremol = (i >= 3 && i <= 5) || (i >= 10 && i <= 12);
        const cW = isMolar ? 0.32 : isPremol ? 0.26 : 0.22;
        const cH = isMolar ? 0.55 : isPremol ? 0.65 : 0.75;
        const cD = isMolar ? 0.28 : 0.22;

        const crownGeo = new THREE.BoxGeometry(cW, cH, cD, 2, 2, 2);
        const crown = new THREE.Mesh(crownGeo, normalMat());
        crown.position.set(x, yOff + cH / 2, baseZ - (flipZ ? -0.2 : 0.2));
        crown._toothIdx = this._meshes.length;
        crown._isCrown  = true;
        group.add(crown);
        this._meshes.push(crown);

        /* root */
        const rootH = isMolar ? 0.4 : 0.55;
        const root = new THREE.Mesh(
          new THREE.CylinderGeometry(cW * 0.35, cW * 0.12, rootH, 8),
          rootMat()
        );
        root.position.set(x, yOff - rootH / 2 + 0.05, baseZ - (flipZ ? -0.2 : 0.2));
        group.add(root);

        /* cusp bumps on top */
        const cuspCount = isMolar ? 4 : isPremol ? 2 : 1;
        const cuspR = cW * 0.22;
        for (let c = 0; c < cuspCount; c++) {
          const cx = x + (cuspCount > 1 ? (c / (cuspCount - 1) - 0.5) * cW * 0.7 : 0);
          const cz = baseZ - (flipZ ? -0.2 : 0.2);
          const cusp = new THREE.Mesh(
            new THREE.SphereGeometry(cuspR, 8, 8),
            new THREE.MeshPhongMaterial({ color: 0xf5fbff, shininess: 200 })
          );
          cusp.position.set(cx, yOff + cH - 0.02, cz);
          group.add(cusp);
        }
      }
    };

    buildArch( 0.4, false); /* upper jaw */
    buildArch(-0.4, true);  /* lower jaw (flipped) */

    /* Jaw bone arches (thin torus segments) */
    const jawMat = new THREE.MeshPhongMaterial({ color: 0x2a3a4a, shininess: 30 });
    const upperJaw = new THREE.Mesh(new THREE.TorusGeometry(2.56, 0.12, 8, 32, Math.PI), jawMat);
    upperJaw.rotation.y = Math.PI;
    upperJaw.position.y = 0.35;
    group.add(upperJaw);
    const lowerJaw = new THREE.Mesh(new THREE.TorusGeometry(2.56, 0.12, 8, 32, Math.PI), jawMat);
    lowerJaw.position.y = -0.35;
    group.add(lowerJaw);

    scene.add(group);

    /* Drag rotate */
    _dragRotate(canvas, group, { lockX: true });

    /* Click → highlight tooth */
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / W) * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / H) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(this._meshes);
      if (!hits.length) return;
      const idx = hits[0].object._toothIdx;
      /* reset old */
      if (this._selected >= 0 && this._meshes[this._selected]) {
        this._meshes[this._selected].material = normalMat();
      }
      this._selected = idx;
      this._meshes[idx].material = selectedMat();
      if (opts.onToothClick) opts.onToothClick(idx, hits[0].object);
    });

    /* Render loop */
    const self = this;
    let t = 0;
    function loop() {
      self._animId = requestAnimationFrame(loop);
      t += 0.006;
      group.rotation.y = Math.sin(t * 0.4) * 0.35;
      renderer.render(scene, camera);
    }
    loop();
  },

  destroy() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    if (this._renderer) { this._renderer.dispose(); this._renderer = null; }
    this._meshes = [];
    this._selected = -1;
  }
};

/* ══════════════════════════════════════════════════════
   2. DNA WIDGET  — patient profile / header
      mount(containerId)
   ══════════════════════════════════════════════════════ */
const DnaWidget = {
  _animId: null,
  _renderer: null,

  mount(containerId) {
    this.destroy();
    const wrap = document.getElementById(containerId);
    if (!wrap || typeof THREE === 'undefined') return;

    const W = wrap.offsetWidth || 320, H = 120;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = `width:100%;height:${H}px;display:block;border-radius:8px;
      background:transparent;pointer-events:none`;
    wrap.innerHTML = '';
    wrap.appendChild(canvas);

    const renderer = _mkRenderer(canvas, W, H);
    this._renderer = renderer;
    const scene = new THREE.Scene();
    const camera = _mkCamera(W, H, 50, 5.5);
    scene.add(new THREE.AmbientLight(0x112233, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(2, 3, 2); scene.add(dl);
    const rl = new THREE.DirectionalLight(0x00ffb3, 0.5); rl.position.set(-2, -1, -2); scene.add(rl);

    const group = new THREE.Group();
    const n = 30;
    const m1 = new THREE.MeshPhongMaterial({ color: 0x00d4ff, shininess: 180 });
    const m2 = new THREE.MeshPhongMaterial({ color: 0x06d6a0, shininess: 180 });
    const mb = new THREE.MeshPhongMaterial({ color: 0x334466, shininess: 60 });

    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 5;
      const y = (i / n) * 4.5 - 2.25;
      const x1 = Math.cos(angle) * 0.75, z1 = Math.sin(angle) * 0.75;
      const x2 = Math.cos(angle + Math.PI) * 0.75, z2 = Math.sin(angle + Math.PI) * 0.75;

      const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), m1);
      b1.position.set(x1, y, z1); group.add(b1);
      const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), m2);
      b2.position.set(x2, y, z2); group.add(b2);

      if (i % 4 === 0) {
        const len = new THREE.Vector3(x1, y, z1).distanceTo(new THREE.Vector3(x2, y, z2));
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 6), mb);
        rung.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
        rung.lookAt(new THREE.Vector3(x1, y, z1));
        rung.rotateX(Math.PI / 2);
        group.add(rung);
      }
    }
    scene.add(group);

    const self = this;
    function loop() {
      self._animId = requestAnimationFrame(loop);
      group.rotation.y += 0.014;
      renderer.render(scene, camera);
    }
    loop();
  },

  destroy() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    if (this._renderer) { this._renderer.dispose(); this._renderer = null; }
  }
};

/* ══════════════════════════════════════════════════════
   3. COIN STACK 3D  — finance page
      mount(containerId, monthlyData)
      monthlyData = array of 12 numbers (monthly revenue)
   ══════════════════════════════════════════════════════ */
const CoinStack3D = {
  _animId: null,
  _renderer: null,

  mount(containerId, monthlyData) {
    this.destroy();
    const wrap = document.getElementById(containerId);
    if (!wrap || typeof THREE === 'undefined') return;

    const W = wrap.offsetWidth || 460, H = 180;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = `width:100%;height:${H}px;display:block;border-radius:8px;
      background:radial-gradient(ellipse at center, rgba(15,12,5,.95) 0%, rgba(5,8,15,.97) 100%);
      cursor:grab`;
    wrap.innerHTML = '';
    wrap.appendChild(canvas);

    const renderer = _mkRenderer(canvas, W, H);
    this._renderer = renderer;
    const scene = new THREE.Scene();
    const camera = _mkCamera(W, H, 42, 10);
    camera.position.set(0, 3.5, 10);
    camera.lookAt(0, 0.5, 0);
    scene.add(new THREE.AmbientLight(0x443322, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(4, 8, 5); scene.add(dl);
    const yl = new THREE.DirectionalLight(0xffcc44, 0.6); yl.position.set(-3, -2, -3); scene.add(yl);

    const data = monthlyData && monthlyData.length
      ? monthlyData
      : [1.5, 2.1, 1.8, 2.6, 2.0, 3.2, 2.4, 2.8, 1.9, 3.5, 2.7, 3.8];

    const maxV = Math.max(...data, 1);
    const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    const group = new THREE.Group();

    const coinGold = new THREE.MeshPhongMaterial({ color: 0xf6c90e, shininess: 220, specular: 0xffee88 });
    const coinEdge = new THREE.MeshPhongMaterial({ color: 0xd4a800, shininess: 120 });
    const topCapMat = new THREE.MeshPhongMaterial({ color: 0xffe966, shininess: 300, specular: 0xffffff });

    data.forEach((v, i) => {
      const normH = (v / maxV);
      const coinCount = Math.max(1, Math.round(normH * 12));
      const x = (i - 5.5) * 0.82;

      for (let c = 0; c < coinCount; c++) {
        const coin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.36, 0.10, 18),
          c % 3 === 0 ? coinEdge : coinGold
        );
        coin.position.set(x, c * 0.11, 0);
        group.add(coin);
      }
      /* shiny top cap */
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.37, 0.37, 0.04, 18),
        topCapMat
      );
      cap.position.set(x, coinCount * 0.11 + 0.02, 0);
      group.add(cap);

      /* month label plane — simple sprite via canvas texture */
      const lc = document.createElement('canvas');
      lc.width = 64; lc.height = 32;
      const lctx = lc.getContext('2d');
      lctx.fillStyle = 'rgba(0,0,0,0)';
      lctx.fillRect(0, 0, 64, 32);
      lctx.fillStyle = '#f6c90e';
      lctx.font = 'bold 18px sans-serif';
      lctx.textAlign = 'center';
      lctx.fillText(months[i], 32, 22);
      const tex = new THREE.CanvasTexture(lc);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.3),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      );
      label.position.set(x, -0.3, 0.01);
      group.add(label);
    });

    scene.add(group);
    _dragRotate(canvas, group, { lockX: true });

    const self = this;
    function loop() {
      self._animId = requestAnimationFrame(loop);
      group.rotation.y += 0.005;
      renderer.render(scene, camera);
    }
    loop();
  },

  destroy() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    if (this._renderer) { this._renderer.dispose(); this._renderer = null; }
  }
};

/* ══════════════════════════════════════════════════════
   4. ORB WIDGET  — waiting room
      mount(containerId, queueCount)
      queueCount: number of patients waiting
   ══════════════════════════════════════════════════════ */
const OrbWidget = {
  _animId: null,
  _renderer: null,

  mount(containerId, queueCount) {
    this.destroy();
    const wrap = document.getElementById(containerId);
    if (!wrap || typeof THREE === 'undefined') return;

    const count = typeof queueCount === 'number' ? queueCount : 0;
    const W = Math.min(wrap.offsetWidth || 220, 220), H = 160;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = `width:${W}px;height:${H}px;display:block;border-radius:8px;
      background:transparent;pointer-events:none`;
    wrap.innerHTML = '';
    wrap.appendChild(canvas);

    /* color by urgency: 0 → calm cyan, 1-3 → teal, 4-6 → orange, 7+ → red */
    const orbColor  = count === 0 ? 0x001133 : count <= 3 ? 0x002211 : count <= 6 ? 0x221100 : 0x220000;
    const glowColor = count === 0 ? 0x00d4ff : count <= 3 ? 0x06d6a0 : count <= 6 ? 0xff8c42 : 0xff4466;
    const ringColor = glowColor;
    const pulseSpeed = count === 0 ? 0.8 : count <= 3 ? 1.2 : count <= 6 ? 2.0 : 3.2;

    const renderer = _mkRenderer(canvas, W, H);
    this._renderer = renderer;
    const scene = new THREE.Scene();
    const camera = _mkCamera(W, H, 45, 4.2);
    scene.add(new THREE.AmbientLight(0x111122, 1));
    const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(2, 3, 3); scene.add(dl);
    const gl = new THREE.PointLight(glowColor, 1.4, 8); gl.position.set(0, 0, 1.5); scene.add(gl);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 32, 32),
      new THREE.MeshPhongMaterial({
        color: orbColor, shininess: 280, specular: new THREE.Color(glowColor),
        transparent: true, opacity: 0.88
      })
    );
    scene.add(orb);

    /* rings */
    const ringMat = new THREE.MeshPhongMaterial({ color: ringColor, shininess: 160 });
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.035, 8, 48), ringMat);
    r1.rotation.x = Math.PI / 2; scene.add(r1);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.022, 8, 48), ringMat.clone());
    r2.rotation.x = Math.PI / 3; scene.add(r2);

    /* small floating particle orbs */
    const particleGroup = new THREE.Group();
    const pMat = new THREE.MeshPhongMaterial({ color: glowColor, shininess: 200 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), pMat.clone());
      p.position.set(Math.cos(angle) * 1.7, Math.sin(angle * 0.5) * 0.4, Math.sin(angle) * 1.7);
      particleGroup.add(p);
    }
    scene.add(particleGroup);

    const self = this;
    let t = 0;
    function loop() {
      self._animId = requestAnimationFrame(loop);
      t += 0.016;
      const pulse = 1 + Math.sin(t * pulseSpeed) * 0.06;
      orb.scale.setScalar(pulse);
      gl.intensity = 1.2 + Math.sin(t * pulseSpeed) * 0.5;
      r1.rotation.z += 0.008;
      r2.rotation.y += 0.012;
      particleGroup.rotation.y += 0.018;
      renderer.render(scene, camera);
    }
    loop();
  },

  destroy() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    if (this._renderer) { this._renderer.dispose(); this._renderer = null; }
  }
};

/* ══════════════════════════════════════════════════════
   5. MOLECULE 3D  — inventory page
      mount(containerId, categories)
      categories: array of { name, count, color }
   ══════════════════════════════════════════════════════ */
const Molecule3D = {
  _animId: null,
  _renderer: null,

  mount(containerId, categories) {
    this.destroy();
    const wrap = document.getElementById(containerId);
    if (!wrap || typeof THREE === 'undefined') return;

    const W = Math.min(wrap.offsetWidth || 260, 260), H = 160;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = `width:${W}px;height:${H}px;display:block;border-radius:8px;
      background:transparent;cursor:grab`;
    wrap.innerHTML = '';
    wrap.appendChild(canvas);

    const renderer = _mkRenderer(canvas, W, H);
    this._renderer = renderer;
    const scene = new THREE.Scene();
    const camera = _mkCamera(W, H, 48, 5.5);
    _stdLights(scene, 0x06d6a0);

    const cats = categories && categories.length ? categories : [
      { name: 'Tools',      color: 0x06d6a0, r: 0.44 },
      { name: 'Meds',       color: 0x00d4ff, r: 0.3 },
      { name: 'Consumable', color: 0xff8c42, r: 0.3 },
      { name: 'Implants',   color: 0xb388ff, r: 0.28 },
      { name: 'Hygiene',    color: 0xffd166, r: 0.28 },
      { name: 'X-Ray',      color: 0xff4466, r: 0.26 },
    ];

    const group = new THREE.Group();
    const bondMat = new THREE.MeshPhongMaterial({ color: 0x445566, shininess: 60 });

    /* central nucleus */
    const nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 20, 20),
      new THREE.MeshPhongMaterial({ color: cats[0].color, shininess: 180, specular: 0xffffff })
    );
    group.add(nucleus);

    /* orbital atoms */
    const orbits = [
      { r: 1.35, y: 0.3,  angle: 0 },
      { r: 1.35, y: -0.3, angle: Math.PI / 3 * 1 },
      { r: 1.35, y: 0.2,  angle: Math.PI / 3 * 2 },
      { r: 1.35, y: -0.2, angle: Math.PI / 3 * 3 },
      { r: 1.35, y: 0.3,  angle: Math.PI / 3 * 4 },
    ];

    orbits.forEach((o, i) => {
      const cat = cats[(i + 1) % cats.length];
      const size = cat.r || 0.28;
      const atom = new THREE.Mesh(
        new THREE.SphereGeometry(size, 14, 14),
        new THREE.MeshPhongMaterial({ color: cat.color, shininess: 160, specular: 0xffffff })
      );
      const px = Math.cos(o.angle) * o.r;
      const pz = Math.sin(o.angle) * o.r;
      atom.position.set(px, o.y, pz);
      group.add(atom);

      /* bond */
      const from = new THREE.Vector3(0, 0, 0);
      const to   = new THREE.Vector3(px, o.y, pz);
      const len  = from.distanceTo(to);
      const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 8), bondMat);
      bond.position.copy(from.clone().lerp(to, 0.5));
      bond.lookAt(to);
      bond.rotateX(Math.PI / 2);
      group.add(bond);
    });

    scene.add(group);
    _dragRotate(canvas, group);

    const self = this;
    function loop() {
      self._animId = requestAnimationFrame(loop);
      group.rotation.y += 0.010;
      group.rotation.x  = Math.sin(Date.now() * 0.0005) * 0.15;
      renderer.render(scene, camera);
    }
    loop();
  },

  destroy() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    if (this._renderer) { this._renderer.dispose(); this._renderer = null; }
  }
};

/* ══════════════════════════════════════════════════════
   6. BAR CHART 3D  — analytics page
      mount(containerId, { labels, values, color })
   ══════════════════════════════════════════════════════ */
const BarChart3D = {
  _animId: null,
  _renderer: null,

  mount(containerId, opts) {
    this.destroy();
    const wrap = document.getElementById(containerId);
    if (!wrap || typeof THREE === 'undefined') return;

    opts = opts || {};
    const W = wrap.offsetWidth || 460, H = 220;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = `width:100%;height:${H}px;display:block;border-radius:8px;
      background:radial-gradient(ellipse at center, rgba(0,12,24,.95) 0%, rgba(3,6,14,.97) 100%);
      cursor:grab`;
    wrap.innerHTML = '';
    wrap.appendChild(canvas);

    const renderer = _mkRenderer(canvas, W, H);
    this._renderer = renderer;
    const scene = new THREE.Scene();
    const camera = _mkCamera(W, H, 42, 11);
    camera.position.set(0, 3.5, 11);
    camera.lookAt(0, 0.5, 0);
    scene.add(new THREE.AmbientLight(0x223344, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(4, 8, 5); scene.add(dl);
    const rl = new THREE.DirectionalLight(0x00d4ff, 0.45); rl.position.set(-4, -2, -4); scene.add(rl);

    const labels = opts.labels || ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const values = opts.values || [1.2, 2.1, 1.8, 2.6, 2.0, 3.2, 2.4, 2.8, 1.9, 3.5, 2.7, 3.8];
    const barColorHex = opts.color || 0x00d4ff;
    const maxV = Math.max(...values, 1);
    const group = new THREE.Group();

    const barMat  = new THREE.MeshPhongMaterial({ color: barColorHex, shininess: 160, specular: 0xaaffff });
    const capMat  = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 300 });
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x0a1a2a, shininess: 20 });

    /* floor grid */
    const floorGeo = new THREE.PlaneGeometry(values.length * 1.1, 3);
    const floor = new THREE.Mesh(floorGeo, baseMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.55;
    group.add(floor);

    values.forEach((v, i) => {
      const normH = (v / maxV) * 3.0;
      const x = (i - (values.length - 1) / 2) * 1.05;

      /* animate grow from 0 */
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, normH, 16),
        barMat.clone()
      );
      bar._targetH = normH;
      bar.scale.y = 0.01;
      bar.position.set(x, 0, 0);
      group.add(bar);

      /* glowing cap */
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.07, 16), capMat);
      cap._bar = bar;
      cap._normH = normH;
      cap.position.set(x, normH, 0);
      cap.scale.y = 0.01;
      group.add(cap);

      /* label */
      const lc = document.createElement('canvas');
      lc.width = 64; lc.height = 32;
      const lctx = lc.getContext('2d');
      lctx.fillStyle = 'rgba(0,0,0,0)';
      lctx.fillRect(0, 0, 64, 32);
      lctx.fillStyle = '#7b84a3';
      lctx.font = 'bold 16px sans-serif';
      lctx.textAlign = 'center';
      lctx.fillText(labels[i] || '', 32, 22);
      const tex = new THREE.CanvasTexture(lc);
      const lbl = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.4),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      );
      lbl.position.set(x, -0.65, 0.01);
      group.add(lbl);
    });

    scene.add(group);
    _dragRotate(canvas, group, { lockX: true });

    /* grow animation */
    const startTime = performance.now();
    const GROW_DUR  = 1200;

    const self = this;
    let autoT = 0;
    function loop() {
      self._animId = requestAnimationFrame(loop);
      autoT += 0.006;

      /* grow bars */
      const elapsed = performance.now() - startTime;
      const prog = Math.min(elapsed / GROW_DUR, 1);
      const ease = 1 - Math.pow(1 - prog, 3);

      group.children.forEach(obj => {
        if (obj._targetH !== undefined) {
          obj.scale.y = Math.max(ease, 0.01);
          obj.position.y = (obj._targetH * ease) / 2 - 0.52;
        }
        if (obj._bar) {
          obj.scale.y = Math.max(ease, 0.01);
          obj.position.y = obj._normH * ease - 0.52;
        }
      });

      group.rotation.y = Math.sin(autoT * 0.3) * 0.4;
      renderer.render(scene, camera);
    }
    loop();
  },

  destroy() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
    if (this._renderer) { this._renderer.dispose(); this._renderer = null; }
  }
};
