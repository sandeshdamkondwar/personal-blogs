/* The rocket: flying, autopilot, landing and taking off */
window.SA = window.SA || {};

SA.rocket = (function () {
  let THREE, scene, group, inner, flame, trail = [], trailTimer = 0, pilotSprite = null;
  function setPilot(url) {
    if (!pilotSprite) return;
    new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; const old = pilotSprite.material.map; pilotSprite.material.map = t; pilotSprite.material.needsUpdate = true; old && old.dispose(); });
  }
  const S = {
    pos: null, vel: null, heading: 0, state: "flying", landedOn: null, landDir: null,
    autoTarget: null, thrust: 0, bank: 0, justLeft: null, justLeftT: 0, speed: 0,
  };
  const FLY_Y = 0.7, MAX_SPEED = 52, BOUNDS = 235;
  const listeners = { land: [], takeoff: [], arrive: [] };
  const on = (ev, fn) => listeners[ev].push(fn);
  const emit = (ev, ...a) => listeners[ev].forEach((f) => f(...a));

  function init(three, sc, startNear) {
    THREE = three; scene = sc;
    S.pos = new THREE.Vector3(); S.vel = new THREE.Vector3(); S.landDir = new THREE.Vector3(1, 0, 0);
    build();
    // Start parked next to Earth
    const earth = startNear;
    S.landDir.set(earth.pos.x, 0, earth.pos.z).normalize().multiplyScalar(-1);   // sunny side of Earth
    S.pos.copy(earth.pos).addScaledVector(S.landDir, earth.r + 0.9);
    S.state = "landed"; S.landedOn = earth; S.landT = 9;
    S.heading = Math.atan2(S.landDir.x, S.landDir.z);
    group.position.copy(S.pos);
  }

  let bodyTex = null, boosterFlames = [];

  /* Body paint: white with black roll-pattern bands, panel lines, and the kid's name down the side */
  function paintBody(name) {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 1024;
    const c = cv.getContext("2d");
    c.fillStyle = "#f3f4f7"; c.fillRect(0, 0, 512, 1024);
    const vy = (y) => 1024 * (1 - (y + 0.92) / 2.78);          // stack height -0.92 … 1.86 → canvas
    c.fillStyle = "#1d1f26"; c.fillRect(0, vy(-0.75), 512, vy(-0.86) - vy(-0.75));        // engine skirt band
    for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? "#1d1f26" : "#f3f4f7"; c.fillRect(i * 128, vy(0.52), 128, vy(0.4) - vy(0.52)); } // roll pattern
    c.fillStyle = "#1d1f26"; c.fillRect(0, vy(0.7), 512, vy(0.52) - vy(0.7));            // interstage
    c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 2;
    [-0.4, 0.0, 0.2, 0.95].forEach((y) => { c.beginPath(); c.moveTo(0, vy(y)); c.lineTo(512, vy(y)); c.stroke(); });
    for (let x = 0; x < 512; x += 64) { c.beginPath(); c.moveTo(x, vy(0.4)); c.lineTo(x, vy(-0.75)); c.stroke(); }
    // name, written vertically down the side that faces the camera most of the time
    const label = (String(name || "Explorer").toUpperCase() + "-1").slice(0, 14);
    c.save(); c.translate(128 + 40, vy(0.1)); c.rotate(-Math.PI / 2);
    c.font = "bold 46px Baloo 2, Fredoka, Arial Black, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#1b2a6b"; c.fillText(label, 0, 0); c.restore();
    c.save(); c.translate(384 + 40, vy(0.1)); c.rotate(-Math.PI / 2);
    c.font = "bold 46px Baloo 2, Fredoka, Arial Black, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#1b2a6b"; c.fillText(label, 0, 0); c.restore();
    // mission patch
    c.fillStyle = "#ff6b2c"; c.beginPath(); c.arc(128 - 50, vy(-0.45), 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fff"; c.font = "bold 30px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("★", 128 - 50, vy(-0.45) + 1);
    return cv;
  }
  function setName(name) {
    if (!bodyTex) return;
    bodyTex.image = paintBody(name); bodyTex.needsUpdate = true;
  }

  /* Exhaust: a hot white-blue core inside a flickering orange plume (additive, gradient-faded) */
  let flameTex = null;
  function makeFlame(radius, length) {
    if (!flameTex) {
      const cv = document.createElement("canvas"); cv.width = 8; cv.height = 128;
      const c = cv.getContext("2d"), g = c.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.45, "rgba(255,120,30,.55)"); g.addColorStop(0.85, "rgba(255,200,90,.95)"); g.addColorStop(1, "rgba(255,255,230,1)");
      c.fillStyle = g; c.fillRect(0, 0, 8, 128);
      flameTex = new THREE.CanvasTexture(cv);
    }
    const f = new THREE.Group();
    const mk = (r, l, color, op) => {
      const geo = new THREE.ConeGeometry(r, l, 20, 1, true); geo.rotateX(Math.PI); geo.translate(0, -l / 2, 0);
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: flameTex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    };
    f.add(mk(radius, length, 0xff8a2a, 0.9), mk(radius * 0.55, length * 0.55, 0xbfe4ff, 1));
    return f;
  }

  function build() {
    group = new THREE.Group();
    inner = new THREE.Group();
    inner.rotation.x = Math.PI / 2; // local +Y (nose) → world +Z (forward)
    const metal = new THREE.MeshStandardMaterial({ color: 0x3b3f4a, roughness: 0.35, metalness: 0.85 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.6, metalness: 0.4 });
    const whiteM = new THREE.MeshStandardMaterial({ color: 0xf2f3f6, roughness: 0.45, metalness: 0.15, emissive: 0x30333c });

    // Main stack: one smooth lathe profile (engine skirt → first stage → interstage → payload fairing → ogive nose)
    const prof = [[0.0, -0.92], [0.24, -0.92], [0.27, -0.86], [0.27, 0.52], [0.255, 0.58], [0.255, 0.64], [0.3, 0.7], [0.3, 1.08]];
    for (let i = 1; i <= 14; i++) { const t = i / 14; prof.push([0.3 * Math.pow(1 - Math.pow(t, 1.7), 0.62), 1.08 + t * 0.78]); }
    const stackGeo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48);
    bodyTex = new THREE.CanvasTexture(paintBody(SA.hasKidName() ? SA.kidName() : "Explorer")); bodyTex.colorSpace = THREE.SRGBColorSpace;
    const stack = new THREE.Mesh(stackGeo, new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.42, metalness: 0.18, emissive: 0xffffff, emissiveMap: bodyTex, emissiveIntensity: 0.16 }));
    inner.add(stack);

    // Four strap-on boosters (like ISRO's PSLV / GSLV)
    const bProf = [[0, -0.9], [0.075, -0.9], [0.085, -0.85], [0.085, -0.05]];
    for (let i = 1; i <= 8; i++) { const t = i / 8; bProf.push([0.085 * Math.pow(1 - t * t, 0.6), -0.05 + t * 0.26]); }
    const bGeo = new THREE.LatheGeometry(bProf.map(([r, y]) => new THREE.Vector2(r, y)), 20);
    const bellGeo = new THREE.LatheGeometry([[0.035, 0], [0.05, -0.04], [0.085, -0.17], [0.095, -0.2]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
    const smallBell = bellGeo.clone(); smallBell.scale(0.7, 0.7, 0.7);
    boosterFlames = [];
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
      const bx = Math.sin(a) * 0.36, bz = Math.cos(a) * 0.36;
      const bo = new THREE.Mesh(bGeo, whiteM); bo.position.set(bx, 0, bz); inner.add(bo);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.087, 0.087, 0.07, 20), dark); band.position.set(bx, -0.62, bz); inner.add(band);
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.12), metal); strut.position.set(Math.sin(a) * 0.3, -0.2, Math.cos(a) * 0.3); strut.rotation.y = a; inner.add(strut);
      const nb = new THREE.Mesh(smallBell, metal); nb.position.set(bx, -0.9, bz); inner.add(nb);
      const bf = makeFlame(0.06, 0.55); bf.position.set(bx, -1.03, bz); inner.add(bf); boosterFlames.push(bf);
    }

    // Three main engine bells
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const bell = new THREE.Mesh(bellGeo, metal); bell.position.set(Math.sin(a) * 0.11, -0.92, Math.cos(a) * 0.11); inner.add(bell);
    }

    // Window on the fairing, with HIM looking out (sprite = always faces the camera)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 10, 32), metal);
    rim.position.set(0, 0.9, -0.3); inner.add(rim);
    const pilot = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
    pilotSprite = pilot; setPilot(SA.kidStickers()[0]);
    pilot.position.set(0, 0.9, -0.34);   // local -Z points up after the inner group's rotation
    pilot.scale.setScalar(0.36);
    inner.add(pilot);

    flame = makeFlame(0.2, 1.25); flame.position.y = -1.12; inner.add(flame);
    group.add(inner);
    group.scale.setScalar(0.9);
    scene.add(group);

    // Exhaust trail sprites
    const tex = new THREE.CanvasTexture(SA.textures.glow("rgba(255,190,110,1)", "rgba(200,170,150,.35)", 64));
    for (let i = 0; i < 50; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      sp.visible = false; sp.userData.life = 0;
      scene.add(sp); trail.push(sp);
    }
  }

  const approachAngle = (a, target, maxStep) => {
    let d = ((target - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    if (Math.abs(d) <= maxStep) return a + d;
    return a + Math.sign(d) * maxStep;
  };
  const forward = (h) => new THREE.Vector3(Math.sin(h), 0, Math.cos(h));

  function update(dt, input, camYaw) {
    S.justLeftT += dt;
    let turnInput = 0;
    if (S.state === "landed") {
      const b = S.landedOn;
      const desired = b.pos.clone().addScaledVector(S.landDir, b.r + 0.9);
      S.landT = (S.landT || 0) + dt;
      if (S.landT > 0.6) S.pos.copy(desired);                 // rigidly attached: the planet can never leave the rocket behind
      else S.pos.lerp(desired, 1 - Math.exp(-12 * dt));
      group.position.copy(S.pos);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), S.landDir);
      group.quaternion.slerp(q, 1 - Math.exp(-7 * dt));
      S.thrust = 0; S.speed = 0;
      if (input.thrust > 0 || input.joy.active) takeOff();
    } else if (S.state === "auto") {
      const t = S.autoTarget;
      const dx = t.pos.x - S.pos.x, dz = t.pos.z - S.pos.z;
      const dist = Math.hypot(dx, dz);
      const desired = Math.atan2(dx, dz);
      const prev = S.heading;
      S.heading = approachAngle(S.heading, desired, 3.2 * dt);
      turnInput = Math.sign(S.heading - prev) * Math.min(1, Math.abs(S.heading - prev) / (3.2 * dt) || 0);
      const speed = Math.min(MAX_SPEED, Math.max(9, (dist - t.r) * 1.15));
      S.vel.copy(forward(S.heading)).multiplyScalar(speed);
      S.pos.addScaledVector(S.vel, dt);
      S.thrust = 1; S.speed = speed;
      if (dist < t.r + 1.5) { land(t); emit("arrive", t); }
      if (input.turn || input.thrust || input.joy.active) { S.state = "flying"; S.autoTarget = null; }
    } else {
      // Manual flight
      let thrust = input.thrust;
      if (input.joy.active) {
        const mag = Math.min(1, Math.hypot(input.joy.x, input.joy.y));
        if (mag > 0.15) {
          const desired = camYaw + Math.PI - Math.atan2(input.joy.x, input.joy.y);
          const prev = S.heading;
          S.heading = approachAngle(S.heading, desired, 4.2 * dt);
          turnInput = Math.sign(S.heading - prev) * Math.min(1, Math.abs(S.heading - prev) / (4.2 * dt));
          thrust = Math.max(thrust, mag);
        }
      } else if (input.turn) {
        S.heading += -input.turn * 2.4 * dt;
        turnInput = input.turn;
      }
      if (input.brake) S.vel.multiplyScalar(Math.max(0, 1 - 4 * dt));
      S.vel.addScaledVector(forward(S.heading), thrust * 48 * dt);
      S.vel.multiplyScalar(Math.max(0, 1 - 1.1 * dt));
      if (S.vel.length() > MAX_SPEED) S.vel.setLength(MAX_SPEED);
      S.pos.addScaledVector(S.vel, dt);
      S.thrust = thrust; S.speed = S.vel.length();

      // Soft wall at the edge of the map
      const far = Math.hypot(S.pos.x, S.pos.z);
      if (far > BOUNDS) { S.vel.addScaledVector(new THREE.Vector3(S.pos.x, 0, S.pos.z).normalize(), -60 * dt); S.outOfBounds = true; } else S.outOfBounds = false;

      // Bumping into a planet = landing
      SA.world.bodies.forEach((b) => {
        if (b === S.justLeft && S.justLeftT < 2.5) return;
        const d = Math.hypot(S.pos.x - b.pos.x, S.pos.z - b.pos.z);
        if (d < b.r + 1.0) land(b);
      });
    }

    if (S.state !== "landed") {
      S.pos.y = FLY_Y;
      group.position.copy(S.pos);
      group.rotation.set(0, S.heading, 0);
      S.bank += (-turnInput * 0.7 - S.bank) * Math.min(1, dt * 6);
      inner.rotation.y = S.bank;      // roll around the nose axis
    }

    // Flame + trail
    const flick = 0.85 + Math.random() * 0.3;
    const L = (0.12 + S.thrust * 1.1) * flick, W = 0.8 + S.thrust * 0.35;
    flame.scale.set(W, L, W);
    boosterFlames.forEach((bf, i) => { const k = 0.85 + Math.random() * 0.3; bf.scale.set(1, (0.1 + S.thrust * 1.0) * k, 1); bf.visible = flame.visible; });
    flame.visible = S.state !== "landed" || S.thrust > 0;
    updateTrail(dt);
    SA.audio.setThrust(S.state === "landed" ? 0 : S.thrust * 0.6 + Math.min(0.4, S.speed / MAX_SPEED) * 0.4);
  }

  function updateTrail(dt) {
    trailTimer -= dt;
    if (S.state !== "landed" && S.thrust > 0.15 && trailTimer <= 0) {
      trailTimer = 0.035;
      const sp = trail.find((s) => !s.visible);
      if (sp) {
        const back = forward(S.heading).multiplyScalar(-2.1);
        sp.position.copy(S.pos).add(back);
        sp.position.y = FLY_Y;
        sp.userData.life = 1; sp.visible = true;
      }
    }
    trail.forEach((sp) => {
      if (!sp.visible) return;
      sp.userData.life -= dt * 1.6;
      if (sp.userData.life <= 0) { sp.visible = false; return; }
      const l = sp.userData.life;
      sp.material.opacity = l * 0.8;
      sp.scale.setScalar(0.6 + (1 - l) * 2.2);
    });
  }

  function land(b) {
    if (S.state === "landed") return;
    S.landDir.set(S.pos.x - b.pos.x, 0, S.pos.z - b.pos.z);
    if (S.landDir.lengthSq() < 0.001) S.landDir.set(1, 0, 0);
    S.landDir.normalize();
    S.state = "landed"; S.landedOn = b; S.autoTarget = null; S.landT = 0;
    S.vel.set(0, 0, 0); S.thrust = 0;
    emit("land", b);
  }

  function takeOff() {
    if (S.state !== "landed") return;
    const b = S.landedOn;
    S.justLeft = b; S.justLeftT = 0;
    S.pos.copy(b.pos).addScaledVector(S.landDir, b.r + 1.8); S.pos.y = FLY_Y;
    S.heading = Math.atan2(S.landDir.x, S.landDir.z);
    S.vel.copy(S.landDir).multiplyScalar(14);
    S.state = "flying"; S.landedOn = null;
    group.rotation.set(0, S.heading, 0);
    emit("takeoff", b);
  }

  function flyTo(b) {
    if (S.state === "landed") {
      if (S.landedOn === b) return;
      takeOff();
    }
    S.state = "auto"; S.autoTarget = b;
  }

  return {
    init, update, flyTo, takeOff, on, setPilot, setName,
    get pos() { return S.pos; }, get heading() { return S.heading; }, get state() { return S.state; },
    get landedOn() { return S.landedOn; }, get autoTarget() { return S.autoTarget; }, get thrust() { return S.thrust; },
    get speed() { return S.speed; }, get outOfBounds() { return !!S.outOfBounds; }, get group() { return group; },
  };
})();
