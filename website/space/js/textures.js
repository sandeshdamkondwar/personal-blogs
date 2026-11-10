/* Procedural planet textures — no image files needed, everything is painted with noise */
window.SA = window.SA || {};

SA.textures = (function () {
  const TAU = Math.PI * 2;

  /* ---- Perlin noise with a seeded shuffle ---- */
  function Noise(seed) {
    let s = seed >>> 0 || 1;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + (b - a) * t;
    const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
    function noise2(x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const A = perm[X] + Y, B = perm[X + 1] + Y;
      return lerp(
        lerp(grad(perm[A], x, y), grad(perm[B], x - 1, y), u),
        lerp(grad(perm[A + 1], x, y - 1), grad(perm[B + 1], x - 1, y - 1), u), v);
    }
    function fbm(x, y, oct = 5, lac = 2, gain = 0.5) {
      let a = 1, f = 1, sum = 0, norm = 0;
      for (let i = 0; i < oct; i++) { sum += a * noise2(x * f, y * f); norm += a; a *= gain; f *= lac; }
      return sum / norm; // roughly -1..1
    }
    /* Tileable around the planet (u wraps at 1) */
    function tfbm(u, v, sx, sy, oct = 5) {
      const x = u * sx, y = v * sy;
      return fbm(x, y, oct) * (1 - u) + fbm(x - sx, y, oct) * u;
    }
    return { rnd, noise2, fbm, tfbm };
  }

  /* ---- Color helpers ---- */
  const hex = (h) => {
    if (typeof h === "number") return [(h >> 16) & 255, (h >> 8) & 255, h & 255];
    h = h.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  function mix(a, b, t, out) {
    t = clamp01(t);
    out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t;
    return out;
  }
  function palette(cols, t, out) { // cols: array of [r,g,b], t in 0..1 (wraps smoothly)
    const n = cols.length;
    const x = ((t % 1) + 1) % 1 * n;
    const i = Math.floor(x), f = x - i;
    return mix(cols[i % n], cols[(i + 1) % n], f * f * (3 - 2 * f), out);
  }
  function shade(out, k) { out[0] = clamp01(out[0] / 255 * k) * 255; out[1] = clamp01(out[1] / 255 * k) * 255; out[2] = clamp01(out[2] / 255 * k) * 255; }

  function paint(w, h, shader) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const out = [0, 0, 0, 255];
    for (let y = 0; y < h; y++) {
      const v = (y + 0.5) / h;
      for (let x = 0; x < w; x++) {
        const u = (x + 0.5) / w;
        out[3] = 255;
        shader(u, v, out);
        const i = (y * w + x) * 4;
        d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2]; d[i + 3] = out[3];
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  /* ---- Craters ---- */
  function makeCraters(n, N, rmin, rmax) {
    const list = [];
    for (let i = 0; i < n; i++) {
      const r = rmin + Math.pow(N.rnd(), 2.2) * (rmax - rmin);
      list.push({ u: N.rnd(), v: 0.06 + N.rnd() * 0.88, r });
    }
    return list;
  }
  function craterShade(list, u, v) {
    let s = 0;
    const stretch = 1 / Math.max(0.25, Math.sin(v * Math.PI)); // map is squashed near poles
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      let du = Math.abs(u - c.u); if (du > 0.5) du = 1 - du;
      du /= stretch;
      const dv = v - c.v;
      const d = Math.sqrt(du * du + dv * dv) / c.r;
      if (d < 1.2) {
        if (d < 0.8) s -= 0.32 * (1 - d * 0.6);
        else s += 0.28 * (1 - Math.abs(d - 1) / 0.2);
      }
    }
    return s;
  }

  /* ---- Shaders per planet kind ---- */
  const seeds = { sun: 7, mercury: 11, venus: 13, earth: 17, moon: 19, mars: 23, jupiter: 29, saturn: 31, uranus: 37, neptune: 41, pluto: 43 };

  function sun() {
    const N = Noise(seeds.sun);
    const a = hex("#ff7a00"), b = hex("#ffd23f"), c = hex("#fff6c2");
    return paint(512, 256, (u, v, o) => {
      const n = N.tfbm(u, v, 6, 3, 5) * 0.5 + 0.5;
      const n2 = N.tfbm(u + 0.3, v, 12, 6, 3) * 0.5 + 0.5;
      mix(a, b, n * 1.1, o);
      if (n2 > 0.62) mix(o, c, (n2 - 0.62) * 3, o);
    });
  }

  function rocky(baseHex, darkHex, seed, craterCount, rmax) {
    const N = Noise(seed);
    const base = hex(baseHex), dark = hex(darkHex);
    const cr = makeCraters(craterCount, N, 0.008, rmax);
    return paint(512, 256, (u, v, o) => {
      const n = N.tfbm(u, v, 5, 2.5, 5) * 0.5 + 0.5;
      mix(dark, base, 0.35 + n * 0.7, o);
      shade(o, 1 + craterShade(cr, u, v));
    });
  }

  function mars() {
    const N = Noise(seeds.mars);
    const cols = [hex("#c1440e"), hex("#e5633b"), hex("#f0a070"), hex("#8f2f10")];
    const cr = makeCraters(40, N, 0.01, 0.05);
    return paint(512, 256, (u, v, o) => {
      const n = N.tfbm(u, v, 5, 2.5, 5) * 0.5 + 0.5;
      const n2 = N.tfbm(u + 0.5, v + 0.2, 3, 1.5, 3) * 0.5 + 0.5;
      mix(cols[0], cols[1], n, o);
      if (n2 > 0.6) mix(o, cols[3], (n2 - 0.6) * 1.6, o);   // dark basalt patches
      if (n < 0.35) mix(o, cols[2], (0.35 - n) * 1.5, o);   // light dust
      shade(o, 1 + craterShade(cr, u, v) * 0.6);
      const cap = Math.max(0, Math.abs(v - 0.5) - 0.42 + N.tfbm(u, v, 8, 1, 2) * 0.03);
      if (cap > 0) mix(o, [255, 250, 245], cap * 14, o);
    });
  }

  function venus() {
    const N = Noise(seeds.venus);
    const a = hex("#c98a2a"), b = hex("#f1c56c"), c = hex("#fff0c8");
    return paint(512, 256, (u, v, o) => {
      const swirl = N.tfbm(u, v, 3, 2, 3) * 0.08;
      const n = N.tfbm(u + swirl, v * 1.5 + swirl, 4, 6, 4) * 0.5 + 0.5;
      mix(a, b, n * 1.2, o);
      if (n > 0.6) mix(o, c, (n - 0.6) * 1.5, o);
    });
  }

  function earth() {
    const N = Noise(seeds.earth);
    const deep = hex("#0b3d91"), shallow = hex("#1f8be6"), green = hex("#2e8b3d"), forest = hex("#1f6b2a"),
      sand = hex("#d9c38a"), rock = hex("#8c7a5b"), ice = [245, 250, 255];
    return paint(1024, 512, (u, v, o) => {
      const warp = N.tfbm(u + 0.2, v, 3, 1.5, 2) * 0.06;
      const land = N.tfbm(u + warp, v + warp, 3.2, 1.8, 6);     // continents
      const detail = N.tfbm(u * 1.0, v, 14, 7, 4) * 0.5 + 0.5;
      const lat = Math.abs(v - 0.5) * 2;                          // 0 equator → 1 pole
      if (land > 0.05) {
        const h = (land - 0.05) * 3;                               // height above sea
        if (h < 0.12) mix(sand, green, h / 0.12, o);
        else mix(green, forest, detail, o);
        if (h > 0.45) mix(o, rock, (h - 0.45) * 2, o);
        if (lat > 0.55) mix(o, ice, (lat - 0.55) * 2.5 + (detail - 0.5) * 0.4, o);
      } else {
        mix(shallow, deep, (0.05 - land) * 4, o);
        if (lat > 0.88 + (detail - 0.5) * 0.05) mix(o, ice, (lat - 0.88) * 12, o);
      }
    });
  }

  function clouds() {
    const N = Noise(99);
    return paint(1024, 512, (u, v, o) => {
      const n = N.tfbm(u, v, 5, 2.5, 5) * 0.5 + 0.5;
      const n2 = N.tfbm(u + 0.4, v + 0.1, 11, 5.5, 3) * 0.5 + 0.5;
      const a = clamp01((n - 0.42) * 3) * clamp01(n2 * 1.4);
      o[0] = o[1] = o[2] = 255; o[3] = a * 230;
    });
  }

  function gas(paletteHex, seed, spot) {
    const N = Noise(seed);
    const cols = paletteHex.map(hex);
    const spotCol = hex("#d8553a");
    return paint(1024, 512, (u, v, o) => {
      const turb = N.tfbm(u, v * 2, 5, 3, 4) * 0.035 + N.tfbm(u + 0.5, v * 4, 20, 10, 2) * 0.012;
      palette(cols, (v + turb) * 1.6, o);
      const n = N.tfbm(u * 2, v, 30, 14, 3);
      shade(o, 1 + n * 0.12);
      if (spot) {
        let du = (u - 0.33); if (du > 0.5) du -= 1; if (du < -0.5) du += 1;
        const dv = v - 0.64;
        const d = Math.sqrt((du * du) / (0.075 * 0.075) + (dv * dv) / (0.045 * 0.045));
        if (d < 1.15) {
          const k = clamp01((1.15 - d) / 0.35);
          const swirl = 0.5 + 0.5 * Math.sin(d * 9 + Math.atan2(dv, du) * 2);
          mix(o, spotCol, k * (0.75 + swirl * 0.25), o);
          if (d > 0.9 && d < 1.15) mix(o, [250, 240, 220], 0.3 * clamp01((d - 0.9) / 0.25), o);
        }
      }
    });
  }

  function ice(paletteHex, seed) {
    const N = Noise(seed);
    const cols = paletteHex.map(hex);
    return paint(512, 256, (u, v, o) => {
      const turb = N.tfbm(u, v * 2, 3, 2, 3) * 0.05;
      palette(cols, (v + turb) * 1.1, o);
      shade(o, 1 + N.tfbm(u, v, 8, 4, 3) * 0.06);
    });
  }

  function pluto() {
    const N = Noise(seeds.pluto);
    const base = hex("#d7b8a3"), dark = hex("#6f4e3f"), heart = hex("#f7e7dc");
    const cr = makeCraters(25, N, 0.01, 0.04);
    return paint(512, 256, (u, v, o) => {
      const n = N.tfbm(u, v, 4, 2, 5) * 0.5 + 0.5;
      mix(dark, base, 0.3 + n * 0.8, o);
      shade(o, 1 + craterShade(cr, u, v) * 0.6);
      // Tombaugh Regio — the heart!
      const x = (u - 0.3) * 4.2, y = (0.55 - v) * 4.2 + 0.2;
      const f = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
      if (f < 0) mix(o, heart, 0.85, o);
    });
  }

  function custom(c1, c2, style, seed) {
    const N = Noise(seed);
    const a = hex(c1), b = hex(c2);
    const cr = makeCraters(30, N, 0.01, 0.05);
    return paint(512, 256, (u, v, o) => {
      if (style === "stripes") {
        const turb = N.tfbm(u, v * 2, 5, 3, 4) * 0.04;
        palette([a, b, a, b, a, b], (v + turb) * 1.0, o);
      } else if (style === "spots") {
        const n = N.tfbm(u, v, 10, 5, 3);
        mix(a, b, n > 0.15 ? 1 : 0, o);
        shade(o, 1 + N.tfbm(u, v, 4, 2, 3) * 0.1);
      } else if (style === "craters") {
        const n = N.tfbm(u, v, 5, 2.5, 5) * 0.5 + 0.5;
        mix(a, b, n, o);
        shade(o, 1 + craterShade(cr, u, v));
      } else { // swirly
        const n = N.tfbm(u, v, 4, 2, 5) * 0.5 + 0.5;
        mix(a, b, n, o);
      }
    });
  }

  function ringTexture(colorHex, thin) {
    const N = Noise(5);
    const c = hex(colorHex);
    const w = 512;
    const cv = document.createElement("canvas"); cv.width = w; cv.height = 4;
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(w, 4);
    for (let x = 0; x < w; x++) {
      const t = x / w;
      const bands = 0.55 + 0.45 * Math.sin(t * 60) * Math.sin(t * 17 + 1) + N.fbm(t * 40, 0, 3) * 0.3;
      let a = clamp01(bands) * 0.9;
      if (t < 0.03 || t > 0.97) a *= (t < 0.03 ? t / 0.03 : (1 - t) / 0.03);
      if (t > 0.6 && t < 0.66) a *= 0.25;                       // Cassini-style gap
      if (thin) a = (t > 0.45 && t < 0.55) ? 0.5 : 0.08;
      for (let y = 0; y < 4; y++) {
        const i = (y * w + x) * 4;
        img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  /* Saturn: faint C ring, bright B ring, dark Cassini division, A ring with the Encke gap */
  function saturnRings() {
    const w = 1024, cv = document.createElement("canvas"); cv.width = w; cv.height = 4;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(w, 4), N = Noise(9);
    for (let x = 0; x < w; x++) {
      const t = x / w;
      let a, col;
      if (t < 0.18) { a = 0.18 + 0.1 * Math.sin(t * 300); col = [150, 130, 105]; }
      else if (t < 0.62) { a = 0.78 + 0.18 * Math.sin(t * 190) * Math.sin(t * 37); col = [232, 214, 176]; }
      else if (t < 0.68) { a = 0.05; col = [80, 70, 60]; }
      else if (t < 0.9) { a = 0.6 + 0.12 * Math.sin(t * 240); col = [214, 196, 160]; }
      else { a = 0.3 * (1 - (t - 0.9) / 0.1); col = [190, 175, 145]; }
      if (t > 0.855 && t < 0.865) a = 0.04;
      a = clamp01(a + N.fbm(t * 90, 0.5, 3) * 0.15);
      if (t < 0.01) a *= t / 0.01;
      for (let y = 0; y < 4; y++) { const i = (y * w + x) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = a * 255; }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  function glow(inner, outer, size = 256) {
    const cv = document.createElement("canvas"); cv.width = cv.height = size;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner); g.addColorStop(0.25, inner); g.addColorStop(0.5, outer); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    return cv;
  }

  function starSprite() {
    const cv = document.createElement("canvas"); cv.width = cv.height = 32;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, "rgba(255,255,255,.8)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
    return cv;
  }

  /* Build the texture canvas for a body definition */
  function forBody(def) {
    switch (def.kind) {
      case "sun": return sun();
      case "rocky": return rocky("#d6cfc7", "#5a544f", seeds.mercury, 70, 0.06);
      case "moon": return rocky("#e2e2e2", "#6b6b6b", seeds.moon, 60, 0.07);
      case "venus": return venus();
      case "earth": return earth();
      case "mars": return mars();
      case "gas": return gas(def.palette, seeds[def.id] || 3, !!def.spot);
      case "ice": return ice(def.palette, seeds[def.id] || 5);
      case "pluto": return pluto();
      case "custom": return custom(def.c1, def.c2, def.style, def.seed || 77);
      default: return rocky("#cccccc", "#555555", 1, 30, 0.05);
    }
  }

  return { forBody, clouds, ringTexture, saturnRings, glow, starSprite, custom };
})();
