/* In-browser cartoon filter. Photos never leave the device: everything happens on a <canvas>. */
window.SA = window.SA || {};

SA.cartoon = (function () {
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  /* Kuwahara filter: flattens areas into paint-like patches but keeps edges crisp */
  function kuwahara(src, w, h, r) {
    const out = new Uint8ClampedArray(src.length);
    // integral images of r,g,b and luminance (and luminance^2) for O(1) region stats
    const W = w + 1, n = W * (h + 1);
    const sR = new Float64Array(n), sG = new Float64Array(n), sB = new Float64Array(n), sL = new Float64Array(n), sL2 = new Float64Array(n);
    for (let y = 0; y < h; y++) {
      let aR = 0, aG = 0, aB = 0, aL = 0, aL2 = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, R = src[i], G = src[i + 1], B = src[i + 2], L = 0.299 * R + 0.587 * G + 0.114 * B;
        aR += R; aG += G; aB += B; aL += L; aL2 += L * L;
        const j = (y + 1) * W + x + 1, k = y * W + x + 1;
        sR[j] = sR[k] + aR; sG[j] = sG[k] + aG; sB[j] = sB[k] + aB; sL[j] = sL[k] + aL; sL2[j] = sL2[k] + aL2;
      }
    }
    const box = (S, x0, y0, x1, y1) => S[(y1 + 1) * W + x1 + 1] - S[y0 * W + x1 + 1] - S[(y1 + 1) * W + x0] + S[y0 * W + x0];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let best = Infinity, bR = 0, bG = 0, bB = 0;
        for (let q = 0; q < 4; q++) {
          const x0 = Math.max(0, q & 1 ? x : x - r), x1 = Math.min(w - 1, q & 1 ? x + r : x);
          const y0 = Math.max(0, q & 2 ? y : y - r), y1 = Math.min(h - 1, q & 2 ? y + r : y);
          const cnt = (x1 - x0 + 1) * (y1 - y0 + 1);
          const mL = box(sL, x0, y0, x1, y1) / cnt;
          const v = box(sL2, x0, y0, x1, y1) / cnt - mL * mL;
          if (v < best) { best = v; bR = box(sR, x0, y0, x1, y1) / cnt; bG = box(sG, x0, y0, x1, y1) / cnt; bB = box(sB, x0, y0, x1, y1) / cnt; }
        }
        const i = (y * w + x) * 4;
        out[i] = bR; out[i + 1] = bG; out[i + 2] = bB; out[i + 3] = 255;
      }
    }
    return out;
  }

  /* k-means colour quantisation → flat cel-shaded colours */
  function quantize(px, k = 16, iters = 7) {
    const n = px.length / 4, step = Math.max(1, Math.floor(n / 6000));
    const cents = [];
    for (let c = 0; c < k; c++) { const i = Math.floor(((c + 0.5) / k) * n) * 4; cents.push([px[i], px[i + 1], px[i + 2]]); }
    const assign = (i) => { let b = 0, bd = Infinity; for (let c = 0; c < k; c++) { const d = (px[i] - cents[c][0]) ** 2 + (px[i + 1] - cents[c][1]) ** 2 + (px[i + 2] - cents[c][2]) ** 2; if (d < bd) { bd = d; b = c; } } return b; };
    for (let it = 0; it < iters; it++) {
      const acc = cents.map(() => [0, 0, 0, 0]);
      for (let p = 0; p < n; p += step) { const i = p * 4, c = assign(i); acc[c][0] += px[i]; acc[c][1] += px[i + 1]; acc[c][2] += px[i + 2]; acc[c][3]++; }
      acc.forEach((a, c) => { if (a[3]) cents[c] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
    }
    const out = new Uint8ClampedArray(px.length);
    for (let p = 0; p < n; p++) { const i = p * 4, c = cents[assign(i)]; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255; }
    return out;
  }

  function blurGray(g, w, h, radius) {           // 3 box blurs ≈ gaussian
    let a = Float32Array.from(g), b = new Float32Array(g.length);
    const r = Math.max(1, Math.round(radius));
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * w + Math.min(w - 1, Math.max(0, x))];
        for (let x = 0; x < w; x++) { b[y * w + x] = s / (2 * r + 1); s += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]; } }
      for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y++) { a[y * w + x] = s / (2 * r + 1); s += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; } }
    }
    return a;
  }

  /* Main: draw → cartoon. Returns a canvas of size w×h. */
  function toon(img, sx, sy, sw, sh, w, h) {
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h), px = data.data;
    const smooth = kuwahara(px, w, h, Math.max(2, Math.round(w / 110)));
    const flat = quantize(smooth, 18);
    // difference-of-gaussians ink lines
    const g = new Float32Array(w * h);
    for (let p = 0; p < w * h; p++) g[p] = 0.299 * px[p * 4] + 0.587 * px[p * 4 + 1] + 0.114 * px[p * 4 + 2];
    const g1 = blurGray(g, w, h, w / 300), g2 = blurGray(g, w, h, w / 140);
    const ink = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) ink[p] = g2[p] - g1[p] > 6.5 ? 1 : 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {   // drop lonely specks
      const p = y * w + x; if (!ink[p]) continue;
      let nb = ink[p - 1] + ink[p + 1] + ink[p - w] + ink[p + w] + ink[p - w - 1] + ink[p - w + 1] + ink[p + w - 1] + ink[p + w + 1];
      if (nb < 2) ink[p] = 0;
    }
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      let r = flat[i] * 0.72 + smooth[i] * 0.28, gg = flat[i + 1] * 0.72 + smooth[i + 1] * 0.28, b = flat[i + 2] * 0.72 + smooth[i + 2] * 0.28;
      const l = 0.299 * r + 0.587 * gg + 0.114 * b;                    // saturation 1.35
      r = l + (r - l) * 1.35; gg = l + (gg - l) * 1.35; b = l + (b - l) * 1.35;
      r = (r - 128) * 1.1 + 128 + 8; gg = (gg - 128) * 1.1 + 128 + 8; b = (b - 128) * 1.1 + 128 + 8;   // contrast + brightness
      const k = ink[p] ? 0.18 : 1;
      px[i] = clamp(r * k); px[i + 1] = clamp(gg * k); px[i + 2] = clamp(b * k);
    }
    ctx.putImageData(data, 0, 0);
    return cv;
  }

  /* Round sticker with white edge + coloured ring */
  function sticker(img, crop, ring = "#ffd166", size = 360) {
    const pad = Math.round(size * 0.045), inner = size - pad * 2;
    const t = toon(img, crop.cx - crop.r, crop.cy - crop.r, crop.r * 2, crop.r * 2, inner, inner);
    const cv = document.createElement("canvas"); cv.width = cv.height = size;
    const c = cv.getContext("2d");
    c.fillStyle = "#fff"; c.beginPath(); c.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = ring; c.beginPath(); c.arc(size / 2, size / 2, size / 2 - size * 0.018, 0, Math.PI * 2); c.fill();
    c.save(); c.beginPath(); c.arc(size / 2, size / 2, inner / 2, 0, Math.PI * 2); c.clip(); c.drawImage(t, pad, pad); c.restore();
    return cv;
  }

  /* Postcard: a taller crop around the face so more of him shows */
  function pose(img, crop, w = 300) {
    const h = Math.round(w * 1.25);
    let sw = Math.min(img.naturalWidth || img.width, crop.r * 4.4), sh = sw * 1.25;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (sh > ih) { sh = ih; sw = sh / 1.25; }
    let sx = crop.cx - sw / 2, sy = crop.cy - crop.r * 1.5;
    sx = Math.max(0, Math.min(iw - sw, sx)); sy = Math.max(0, Math.min(ih - sh, sy));
    return toon(img, sx, sy, sw, sh, w, h);
  }

  return { toon, sticker, pose };
})();
