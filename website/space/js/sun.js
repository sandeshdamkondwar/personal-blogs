/* ☀️ A living Sun: boiling plasma surface, sunspots, corona, looping prominences and erupting flare jets */
window.SA = window.SA || {};

SA.sunFX = (function () {
  const NOISE = `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
  float fbm(vec3 p){float s=0.0,a=0.5;for(int i=0;i<5;i++){s+=a*snoise(p);p*=2.03;a*=0.5;}return s;}`;

  function build(THREE, group, sphereGeo) {
    const uniforms = { uTime: { value: 0 } };

    /* ---- Surface ---- */
    const surfaceMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: NOISE + `uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){
          vec3 p = normalize(vP);
          float t = uTime * 0.06;
          float big = fbm(p * 2.2 + vec3(t, -t * 0.7, t * 0.4));                // large convection cells
          float gran = snoise(p * 18.0 + vec3(0.0, t * 3.0, 0.0)) * 0.5 + 0.5;  // fine granulation
          float heat = 0.55 + big * 0.45 + gran * 0.22;
          vec3 c = mix(vec3(0.75,0.18,0.0), vec3(1.0,0.55,0.05), smoothstep(0.2, 0.7, heat));
          c = mix(c, vec3(1.0,0.86,0.45), smoothstep(0.7, 1.05, heat));
          c = mix(c, vec3(1.0,0.98,0.85), smoothstep(1.0, 1.3, heat));
          float spot = fbm(p * 3.1 + vec3(7.0, t * 0.3, 2.0));                  // sunspots
          c *= mix(1.0, 0.28, smoothstep(0.42, 0.55, spot));
          float mu = clamp(dot(vN, vV), 0.0, 1.0);                               // limb darkening
          c *= 0.62 + 0.48 * pow(mu, 0.45);
          gl_FragColor = vec4(c * 1.15, 1.0);
        }`,
    });

    /* ---- Corona: a camera-facing sheet of fiery streamers licking out from the edge ---- */
    const corona = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: NOISE + `uniform float uTime; varying vec2 vUv;
        void main(){
          vec2 p = (vUv - 0.5) * 7.0;                 // in sun radii
          float d = length(p); if (d < 0.97) discard;
          float a = atan(p.y, p.x);
          vec2 ring = vec2(cos(a), sin(a));
          float t = uTime;
          // flames: noise that streams outward
          float f1 = snoise(vec3(ring * 3.0, d * 2.2 - t * 0.55)) * 0.5 + 0.5;
          float f2 = snoise(vec3(ring * 9.0, d * 5.0 - t * 1.3)) * 0.5 + 0.5;
          float flames = pow(f1, 1.6) * 0.9 + pow(f2, 3.0) * 0.6;
          float reach = 0.12 + flames * 0.55;                     // how far the flames lick out
          float edge = smoothstep(reach, 0.0, d - 1.0);
          float halo = exp(-(d - 1.0) * 2.4) * 0.35;
          float k = edge * (0.6 + flames) + halo;
          vec3 c = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.75, 0.25), clamp(edge * flames, 0.0, 1.0));
          c = mix(c, vec3(1.0, 0.95, 0.75), smoothstep(0.03, 0.0, d - 1.0));
          gl_FragColor = vec4(c * k, k);
        }`,
    }));
    corona.renderOrder = 2;
    group.add(corona);

    /* ---- Prominences: glowing plasma arches that rise, hang, and fade ---- */
    const promMat = () => new THREE.ShaderMaterial({
      uniforms: { uTime: uniforms.uTime, uGrow: { value: 0 }, uAlpha: { value: 0 }, uSeed: { value: Math.random() * 100 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: NOISE + `uniform float uTime, uGrow, uAlpha, uSeed; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float along = vUv.x; float fromFoot = min(along, 1.0 - along) * 2.0;   // 0 at the feet, 1 at the top
          if (fromFoot > uGrow) discard;
          float n = snoise(vec3(along * 14.0, vUv.y * 3.0, uTime * 1.6 + uSeed)) * 0.5 + 0.5;
          float edge = smoothstep(uGrow, uGrow - 0.08, fromFoot);
          float core = pow(abs(dot(normalize(vN), normalize(vV))), 2.0);   // bright middle, wispy soft edges
          float wisps = smoothstep(0.25, 0.85, snoise(vec3(along * 30.0, vUv.y * 6.0, uTime * 2.2 + uSeed)) * 0.5 + 0.5);
          vec3 c = mix(vec3(0.95, 0.12, 0.03), vec3(1.0, 0.62, 0.18), n * core);
          gl_FragColor = vec4(c, uAlpha * edge * core * (0.35 + wisps * 0.65 + n * 0.3)); }`,
    });
    const proms = [];
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), promMat());
      group.add(mesh);
      const p = { mesh, life: 0, dur: 1, delay: Math.random() * 6 };
      respawnProm(p, true);
      proms.push(p);
    }
    function respawnProm(p, first) {
      const n = new THREE.Vector3().randomDirection();
      const t = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0.3, 1, 0.2).normalize()).normalize();
      const span = 0.1 + Math.random() * 0.25, h = 0.25 + Math.random() * 0.6;
      const a = n.clone().addScaledVector(t, span).normalize().multiplyScalar(0.99);
      const b = n.clone().addScaledVector(t, -span).normalize().multiplyScalar(0.99);
      const lift = new THREE.Vector3().randomDirection().multiplyScalar(0.08);
      const c1 = a.clone().multiplyScalar(1 + h * 1.35).add(lift), c2 = b.clone().multiplyScalar(1 + h * 1.35).sub(lift);
      const curve = new THREE.CubicBezierCurve3(a, c1, c2, b);
      p.mesh.geometry.dispose();
      p.mesh.geometry = new THREE.TubeGeometry(curve, 64, 0.025 + Math.random() * 0.035, 10, false);
      p.dur = 7 + Math.random() * 8; p.life = first ? -p.delay * 0.4 : 0;
      p.mesh.scale.setScalar(1);
    }

    /* ---- Flare jets + eruptions: particles that blast out and arc back down ---- */
    const N = 1400;
    const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), age = new Float32Array(N), maxAge = new Float32Array(N);
    const aLife = new Float32Array(N), aSize = new Float32Array(N);
    for (let i = 0; i < N; i++) { age[i] = 1; maxAge[i] = 1; aLife[i] = 1; aSize[i] = 0; }
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pgeo.setAttribute("aLife", new THREE.BufferAttribute(aLife, 1));
    pgeo.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
    const pmat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aLife; attribute float aSize; uniform float uScale; varying float vLife;
        void main(){ vLife = aLife; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying float vLife;
        void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
          float soft = smoothstep(0.5, 0.0, r);
          vec3 c = mix(vec3(1.0,0.95,0.7), vec3(1.0,0.45,0.08), smoothstep(0.0, 0.5, vLife));
          c = mix(c, vec3(0.8,0.12,0.02), smoothstep(0.5, 1.0, vLife));
          gl_FragColor = vec4(c, soft * (1.0 - vLife) * 0.9); }`,
    });
    const points = new THREE.Points(pgeo, pmat);
    points.frustumCulled = false;
    group.add(points);

    let cursor = 0;
    const jets = Array.from({ length: 6 }, () => newJet());
    function newJet() { return { dir: new THREE.Vector3().randomDirection(), life: 2 + Math.random() * 5, rate: 40 + Math.random() * 90, acc: 0, power: 0.35 + Math.random() * 0.5 }; }
    const tmp = new THREE.Vector3(), side = new THREE.Vector3();
    function emit(dir, speed, spread, life, size) {
      const i = cursor; cursor = (cursor + 1) % N;
      tmp.copy(dir).addScaledVector(side.randomDirection(), spread).normalize();
      pos[i * 3] = tmp.x * 1.0; pos[i * 3 + 1] = tmp.y * 1.0; pos[i * 3 + 2] = tmp.z * 1.0;
      vel[i * 3] = tmp.x * speed; vel[i * 3 + 1] = tmp.y * speed; vel[i * 3 + 2] = tmp.z * speed;
      age[i] = 0; maxAge[i] = life; aSize[i] = size;
    }
    let eruptT = 4 + Math.random() * 6;
    function erupt() {                         // a big coronal-mass-ejection-style burst
      const d = new THREE.Vector3().randomDirection();
      for (let k = 0; k < 260; k++) emit(d, 0.6 + Math.random() * 0.9, 0.35, 2.5 + Math.random() * 2, 0.05 + Math.random() * 0.06);
    }

    function update(dt, renderer, worldR, camera) {
      uniforms.uTime.value += dt;
      if (camera) corona.quaternion.copy(camera.quaternion);
      pmat.uniforms.uScale.value = renderer.domElement.height * 0.96 * worldR;   // particle sizes are in sun radii
      // prominences
      proms.forEach((p) => {
        p.life += dt;
        if (p.life < 0) { p.mesh.material.uniforms.uAlpha.value = 0; return; }
        const k = p.life / p.dur;
        const u = p.mesh.material.uniforms;
        u.uGrow.value = Math.min(1, k / 0.3);
        u.uAlpha.value = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
        p.mesh.scale.setScalar(1 + Math.max(0, k - 0.5) * 0.12);             // slowly lifts away
        if (k >= 1) respawnProm(p);
      });
      // jets
      jets.forEach((j, idx) => {
        j.life -= dt; j.acc += j.rate * dt;
        while (j.acc >= 1) { j.acc -= 1; emit(j.dir, j.power * (0.6 + Math.random() * 0.6), 0.07, 1.6 + Math.random() * 1.6, 0.04 + Math.random() * 0.05); }
        if (j.life <= 0) jets[idx] = newJet();
      });
      eruptT -= dt; if (eruptT <= 0) { erupt(); eruptT = 7 + Math.random() * 9; }
      // integrate: fly out, the Sun's gravity pulls them back so they arc like fountains
      for (let i = 0; i < N; i++) {
        if (age[i] >= maxAge[i]) { aLife[i] = 1; continue; }
        age[i] += dt;
        const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
        const r = Math.sqrt(x * x + y * y + z * z) || 1;
        const g = 0.55 / (r * r);
        vel[i * 3] -= (x / r) * g * dt; vel[i * 3 + 1] -= (y / r) * g * dt; vel[i * 3 + 2] -= (z / r) * g * dt;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        aLife[i] = age[i] / maxAge[i];
        if (r < 0.985 && age[i] > 0.2) age[i] = maxAge[i];               // fell back in
      }
      pgeo.attributes.position.needsUpdate = true; pgeo.attributes.aLife.needsUpdate = true; pgeo.attributes.aSize.needsUpdate = true;
    }

    return { material: surfaceMat, update };
  }
  return { build };
})();
