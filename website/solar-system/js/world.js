/* The 3D solar system: sun, planets, rings, moons, asteroid belt, stars, comet, labels */
window.SA = window.SA || {};

SA.world = (function () {
  let THREE, scene, renderer, labelsEl;
  const bodies = [];
  const byId = {};
  let sunBody, belt, comet = null, cometTimer = 12;
  let timeScale = 1, sizeMode = "toy";
  let sphereGeo, hitGeo;
  const EARTH_R_REAL = 0.8;   // in true-size mode Earth shrinks so Jupiter & Saturn fit between their neighbours

  function init(three, sc, rnd, labelsRoot) {
    THREE = three; scene = sc; renderer = rnd; labelsEl = labelsRoot;
    sphereGeo = new THREE.SphereGeometry(1, 56, 36);
    hitGeo = new THREE.SphereGeometry(1, 12, 8);

    scene.add(new THREE.AmbientLight(0x9aa7c8, 1.1));
    const sunLight = new THREE.PointLight(0xfff1d6, 3.4, 0, 0);
    scene.add(sunLight);

    makeStars();
    SA.BODIES.forEach((def) => addBody(def));
    makeBelt();
    makeSpacewalker();
  }

  /* A cartoon HIM floating in a spacesuit near Earth, waving at passing rockets */
  let walker = null;
  function makeSpacewalker() {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas"); cv.width = 240; cv.height = 350;
      cv.getContext("2d").drawImage(img, 0, 0, 240, 350);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sp.scale.set(1.5, 2.2, 1);
      scene.add(sp); walker = { sp, a: 0 };
    };
    img.src = SA.kidSVGUrl({ mood: "cheer" });
  }
  function updateWalker(dt) {
    if (!walker || !byId.earth) return;
    walker.a += dt * 0.25;
    const e = byId.earth.pos, R = byId.earth.r + 5.5;
    walker.sp.position.set(e.x + Math.cos(walker.a) * R, 1.4 + Math.sin(walker.a * 3) * 0.5, e.z + Math.sin(walker.a) * R);
    walker.sp.material.rotation = Math.sin(walker.a * 2) * 0.25;
    if (lastCamera) { const d = lastCamera.position.distanceTo(walker.sp.position); walker.sp.material.opacity = Math.min(1, Math.max(0, (d - 4) / 4)); }
  }
  let lastCamera = null;

  function makeTexture(canvas, srgb = true) {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }

  function addBody(def, isCustom = false) {
    const group = new THREE.Group();
    const r = def.vis.r;
    const b = {
      def, group, r, baseR: r, targetR: r, angle: Math.random() * Math.PI * 2,
      pos: new THREE.Vector3(), orbitR: def.vis.orbit, isCustom,
      periodSec: def.real.yearDays ? 55 * Math.pow(def.real.yearDays / 365, 0.42) : 0,
      spinRate: 0.35 * Math.pow(24 / Math.max(1, def.real.dayHours), 0.35) * (def.id === "venus" ? -1 : 1),
      parent: def.parent ? byId[def.parent] : null,
    };
    if (def.id === "sun") { b.angle = 0; }

    // Sphere
    let map = null, mat;
    if (def.kind === "sun") {
      b.fx = SA.sunFX.build(THREE, group, sphereGeo);
      mat = b.fx.material;
    } else {
      map = makeTexture(SA.textures.forBody(def));
      mat = new THREE.MeshStandardMaterial({ map, roughness: def.kind === "gas" || def.kind === "ice" ? 0.75 : 0.95, metalness: 0 });
      useRealTexture(def.id, mat);
    }
    const sphere = new THREE.Mesh(sphereGeo, mat);
    sphere.userData.bodyId = def.id;
    group.add(sphere);
    b.sphere = sphere; b.map = map;

    // Clouds (Earth)
    if (def.clouds) {
      const cmap = makeTexture(SA.textures.clouds());
      const cmat = new THREE.MeshStandardMaterial({ map: cmap, transparent: true, depthWrite: false, roughness: 1 });
      useRealTexture("earth_clouds", cmat);
      const clouds = new THREE.Mesh(sphereGeo, cmat);
      clouds.scale.setScalar(1.025);
      group.add(clouds); b.clouds = clouds;
    }

    // Rings
    if (def.ring) {
      const geo = new THREE.RingGeometry(def.ring.inner, def.ring.outer, 160, 1);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const d = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (d - def.ring.inner) / (def.ring.outer - def.ring.inner), 0.5);
      }
      const rmap = makeTexture(def.ring.chunks ? SA.textures.saturnRings() : SA.textures.ringTexture(def.ring.color, def.ring.thin));
      const ringMat = new THREE.MeshStandardMaterial({ map: rmap, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.85 });
      const ring = new THREE.Mesh(geo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      group.add(ring); b.ring = ring;
      if (def.ring.chunks) { b.chunks = makeRingChunks(def.ring); group.add(b.chunks); useRealTexture(def.id + "_ring", ringMat); }
    }

    // Sun glow
    if (def.kind === "sun") {
      const glowTex = makeTexture(SA.textures.glow("rgba(255,210,90,1)", "rgba(255,120,20,.35)"));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
      glow.scale.setScalar(3.6);
      group.add(glow); b.glow = glow;
      sunBody = b;
    }

    // Invisible, bigger hit target so tiny planets are easy to tap
    const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.userData.bodyId = def.id;
    group.add(hit); b.hit = hit;

    // Little decorative moons (custom planets)
    b.moonPivots = [];
    if (def.moonsVisual) {
      const mmat = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 1 });
      for (let i = 0; i < def.moonsVisual; i++) {
        const pivot = new THREE.Group();
        const m = new THREE.Mesh(sphereGeo, mmat);
        m.scale.setScalar(0.14 + i * 0.03);
        m.position.set(1.6 + i * 0.55, 0, 0);
        pivot.rotation.y = (i / def.moonsVisual) * Math.PI * 2;
        pivot.add(m); group.add(pivot); b.moonPivots.push(pivot);
      }
    }

    group.rotation.z = def.tilt || 0;
    group.scale.setScalar(r);
    scene.add(group);

    // Orbit line
    if (b.orbitR > 0) {
      const pts = [];
      for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * b.orbitR, 0, Math.sin(a) * b.orbitR)); }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: isCustom ? 0xff9ad5 : 0xffffff, transparent: true, opacity: b.parent ? 0.18 : 0.22 }));
      scene.add(line); b.orbitLine = line;
    }

    // Label
    const label = document.createElement("div");
    label.className = "label" + (isCustom ? " custom" : "");
    label.textContent = `${def.emoji} ${def.name}`;
    labelsEl.appendChild(label); b.label = label;

    applyRadius(b);
    bodies.push(b); byId[def.id] = b;
    return b;
  }

  /* Saturn's rings are really billions of chunks of ice and rock: show thousands of tumbling ones */
  function makeRingChunks(ring) {
    const n = ring.chunks;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, flatShading: true });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
    const bands = [[0.0, 0.18, 0.25], [0.2, 0.62, 1.0], [0.68, 0.9, 0.75], [0.92, 1.0, 0.45]];   // C, B, A ring densities (gap between = Cassini)
    for (let i = 0; i < n; i++) {
      let t;
      do { t = Math.random(); } while (!bands.some(([a, z, dens]) => t >= a && t <= z && Math.random() < dens));
      const rr = ring.inner + t * (ring.outer - ring.inner), a = Math.random() * Math.PI * 2;
      p.set(Math.cos(a) * rr, (Math.random() - 0.5) * 0.025, Math.sin(a) * rr);
      e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); q.setFromEuler(e);
      const size = 0.005 + Math.pow(Math.random(), 3) * 0.02;
      s.set(size * (0.7 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.5), size);
      m.compose(p, q, s); mesh.setMatrixAt(i, m);
      c.setHSL(0.1 + Math.random() * 0.03, 0.25 + Math.random() * 0.2, 0.62 + Math.random() * 0.3);
      mesh.setColorAt(i, c);
    }
    return mesh;
  }

  /* Real photo maps (NASA-based, from img/planets/) replace the painted ones when they're present */
  function useRealTexture(key, mat) {
    const file = SA.REAL_TEXTURES && SA.REAL_TEXTURES[key];
    if (!file) return;
    new THREE.TextureLoader().load("img/planets/" + file, (t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (key.endsWith("_ring")) t.wrapS = THREE.ClampToEdgeWrapping;
      if (key === "earth_clouds") { t.colorSpace = THREE.NoColorSpace; mat.alphaMap = t; mat.map = null; mat.color.set(0xffffff); }
      else mat.map = t;
      mat.needsUpdate = true;
    }, undefined, () => { /* missing file: keep the painted texture */ });
  }

  function removeBody(id) {
    const b = byId[id]; if (!b) return;
    scene.remove(b.group); if (b.orbitLine) scene.remove(b.orbitLine);
    b.label.remove();
    bodies.splice(bodies.indexOf(b), 1); delete byId[id];
  }

  function applyRadius(b) {
    b.group.scale.setScalar(b.r);
    const hitR = Math.max(1, 2.6 / b.r);
    b.hit.scale.setScalar(hitR);
  }

  function makeStars() {
    const sprite = makeTexture(SA.textures.starSprite(), false);
    const mk = (n, size, spread) => {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      const c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
        const rr = 1400 + Math.random() * 600;
        const s = Math.sqrt(1 - u * u);
        pos[i * 3] = rr * s * Math.cos(th); pos[i * 3 + 1] = rr * u; pos[i * 3 + 2] = rr * s * Math.sin(th);
        const t = Math.random();
        c.setHSL(t < 0.7 ? 0.6 : t < 0.85 ? 0.1 : 0.0, 0.3 + Math.random() * 0.4, 0.75 + Math.random() * 0.25);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const m = new THREE.PointsMaterial({ size, sizeAttenuation: false, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      scene.add(new THREE.Points(g, m));
    };
    mk(5000, 2.2); mk(500, 4.2); mk(60, 7);
  }

  function makeBelt() {
    const n = 700;
    const geo = new THREE.DodecahedronGeometry(0.22, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9a8f85, roughness: 1 });
    belt = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, rr = 55 + Math.random() * 6;
      p.set(Math.cos(a) * rr, (Math.random() - 0.5) * 2.2, Math.sin(a) * rr);
      e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); q.setFromEuler(e);
      s.setScalar(0.4 + Math.random() * 1.4);
      m.compose(p, q, s); belt.setMatrixAt(i, m);
    }
    scene.add(belt);
  }

  /* ---- Comet that visits now and then ---- */
  function spawnComet() {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdff6ff }));
    const glowTex = makeTexture(SA.textures.glow("rgba(200,240,255,1)", "rgba(120,200,255,.3)"));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(6);
    const tailGeo = new THREE.ConeGeometry(1.2, 16, 14, 1, true);
    tailGeo.translate(0, -8, 0); // apex at origin, base trailing down -Y
    const tail = new THREE.Mesh(tailGeo, new THREE.MeshBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    g.add(head, glow, tail);
    const a = Math.random() * Math.PI * 2;
    const start = new THREE.Vector3(Math.cos(a) * 240, (Math.random() - 0.5) * 40, Math.sin(a) * 240);
    const aim = new THREE.Vector3((Math.random() - 0.5) * 60, 0, (Math.random() - 0.5) * 60);
    const vel = aim.clone().sub(start).normalize().multiplyScalar(26);
    g.position.copy(start);
    scene.add(g);
    comet = { g, tail, vel, t: 0 };
  }
  function updateComet(dt) {
    if (!comet) {
      cometTimer -= dt;
      if (cometTimer <= 0) { spawnComet(); cometTimer = 35 + Math.random() * 40; }
      return;
    }
    comet.t += dt;
    comet.g.position.addScaledVector(comet.vel, dt * timeScale);
    const away = comet.g.position.clone().normalize(); // tail points away from the sun
    comet.tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), away);
    if (comet.g.position.length() > 300 || comet.t > 60) { scene.remove(comet.g); comet = null; }
  }

  /* ---- Per-frame update ---- */
  function update(dt, camera, labelsOn) {
    lastCamera = camera;
    const dts = dt * timeScale;
    bodies.forEach((b) => {
      if (b.periodSec > 0) b.angle += (Math.PI * 2 / b.periodSec) * dts;
      const cx = b.parent ? b.parent.pos.x : 0, cz = b.parent ? b.parent.pos.z : 0;
      b.pos.set(cx + Math.cos(b.angle) * b.orbitR, 0, cz + Math.sin(b.angle) * b.orbitR);
      b.group.position.copy(b.pos);
      if (b.orbitLine && b.parent) b.orbitLine.position.set(cx, 0, cz);
      b.sphere.rotation.y += b.spinRate * dts;
      if (b.clouds) b.clouds.rotation.y += b.spinRate * 1.25 * dts;
      b.moonPivots.forEach((p, i) => { p.rotation.y += (0.9 - i * 0.25) * dts; });
      if (b.fx) { b.fx.update(dts, renderer, b.r, camera); b.glow.material.opacity = 0.8 + Math.sin(performance.now() * 0.002) * 0.1; }
      if (b.chunks) b.chunks.rotation.y += 0.05 * dts;
      // size tween (toy ↔ real)
      if (Math.abs(b.r - b.targetR) > 0.001) { b.r += (b.targetR - b.r) * Math.min(1, dt * 3); applyRadius(b); }
    });
    belt.rotation.y += 0.004 * dts;
    updateWalker(dt);
    updateComet(dt);
    updateLabels(camera, labelsOn);
  }

  function updateLabels(camera, labelsOn) {
    const w = window.innerWidth, h = window.innerHeight;
    const v = new THREE.Vector3();
    const toSun = sunBody.pos.clone().sub(camera.position), sunDist = toSun.length();
    const sunAng = Math.asin(Math.min(1, (sunBody.r * 1.05) / Math.max(sunDist, 0.001)));
    toSun.normalize();
    bodies.forEach((b) => {
      if (!labelsOn) { b.label.style.display = "none"; return; }
      v.copy(b.pos); v.y += b.r + 0.6;
      v.project(camera);
      const dist = camera.position.distanceTo(b.pos);
      const behind = v.z > 1;
      const tooFarForMoon = b.parent && dist > 90;
      const behindSun = b !== sunBody && dist > sunDist && v.set(b.pos.x - camera.position.x, b.pos.y - camera.position.y, b.pos.z - camera.position.z).normalize().angleTo(toSun) < sunAng;
      v.copy(b.pos); v.y += b.r + 0.6; v.project(camera);
      if (behindSun) { b.label.style.display = "none"; return; }
      if (behind || tooFarForMoon || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { b.label.style.display = "none"; return; }
      b.label.style.display = "block";
      b.label.style.transform = `translate(-50%, -100%) translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`;
      b.label.style.opacity = dist > 260 ? 0.55 : 1;
    });
  }

  /* ---- Modes ---- */
  function setSizeMode(mode) {
    sizeMode = mode;
    bodies.forEach((b) => {
      const real = SA.REAL_SCALE[b.def.id];
      b.targetR = mode === "real" && real ? real * EARTH_R_REAL : b.baseR;
    });
  }
  function setTimeScale(t) { timeScale = t; }

  /* Nearest body to a point (distance to its surface, in the orbital plane) */
  function nearest(p, exclude) {
    let best = null, bestD = Infinity;
    bodies.forEach((b) => {
      if (b === exclude) return;
      const d = Math.hypot(p.x - b.pos.x, p.z - b.pos.z) - b.r;
      if (d < bestD) { bestD = d; best = b; }
    });
    return { body: best, dist: bestD };
  }

  function hitTargets() { return bodies.map((b) => b.hit); }
  function nextCustomOrbit() { return 160 + bodies.filter((b) => b.isCustom).length * 14; }

  return {
    init, update, addBody, removeBody, setSizeMode, setTimeScale, nearest, hitTargets, nextCustomOrbit,
    get bodies() { return bodies; }, get byId() { return byId; }, get timeScale() { return timeScale; }, get sizeMode() { return sizeMode; },
  };
})();
