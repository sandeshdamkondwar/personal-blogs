/* 👪 Parent setup: name + 2–3 photos → cartoon stickers, processed and stored only in this browser */
window.SA = window.SA || {};

SA.setup = (function () {
  const $ = (s) => document.querySelector(s);
  const RINGS = ["#ffd166", "#ff6b9d", "#4cc9f0"];
  const VIEW = 220;
  let items = [];          // { img, crop:{cx,cy,r}, canvas, url }
  let onSaved = () => {};

  function init(cb) {
    onSaved = cb;
    $("#setupFiles").addEventListener("change", (e) => addFiles([...e.target.files]));
    $("#btnSetupSave").addEventListener("click", save);
    $("#btnSetupClear").addEventListener("click", () => {
      SA.kidStore.savePhotos([]); items = []; render(); renderCurrent();
      status("Photos removed from this device."); onSaved();
    });
  }

  function open() {
    $("#setupName").value = SA.kidName();
    items = []; render(); renderCurrent(); status("");
    $("#setup").hidden = false;
  }

  function status(t, busy) { const s = $("#setupStatus"); s.textContent = t; s.classList.toggle("busy", !!busy); }

  function renderCurrent() {
    const cur = SA.kidStore.photos();
    $("#setupCurrent").innerHTML = cur.length
      ? `<div class="sc-label">Saved on this device:</div>` + cur.map((p) => `<img src="${p.sticker}" alt="" />`).join("")
      : `<div class="sc-label">No photos yet. The drawn astronaut is used until you add some.</div>`;
  }

  async function addFiles(files) {
    for (const f of files.slice(0, 3 - items.length)) {
      const url = URL.createObjectURL(f);
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }).catch(() => null);
      if (!img) { status("That file couldn't be opened as a picture."); continue; }
      const w = img.naturalWidth, h = img.naturalHeight;
      let crop = { cx: w / 2, cy: h * 0.33, r: Math.min(w, h) * 0.26 };
      try {                                                       // use the browser's face finder when it has one
        if ("FaceDetector" in window) {
          const faces = await new window.FaceDetector({ maxDetectedFaces: 1 }).detect(img);
          if (faces[0]) { const b = faces[0].boundingBox; crop = { cx: b.x + b.width / 2, cy: b.y + b.height * 0.45, r: Math.max(b.width, b.height) * 0.85 }; }
        }
      } catch (_) { }
      items.push({ img, crop, url });
    }
    $("#setupFiles").value = "";
    render();
    status(items.length ? "Drag each picture so the face fills the circle. Use the slider to zoom." : "");
  }

  function render() {
    const list = $("#cropList"); list.innerHTML = "";
    items.forEach((it, idx) => {
      const card = document.createElement("div"); card.className = "crop-card";
      card.innerHTML = `<canvas width="${VIEW * 2}" height="${VIEW * 2}"></canvas>
        <input type="range" min="0.08" max="0.7" step="0.01" aria-label="Zoom" />
        <button class="crop-remove" aria-label="Remove">✖</button>`;
      const cv = card.querySelector("canvas"), zoom = card.querySelector("input");
      const iw = it.img.naturalWidth, ih = it.img.naturalHeight, m = Math.min(iw, ih);
      zoom.value = it.crop.r / m;
      const draw = () => drawCrop(cv, it);
      zoom.addEventListener("input", () => { it.crop.r = +zoom.value * m; clampCrop(it); draw(); });
      let drag = null;
      cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY }; });
      cv.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const k = (it.crop.r * 2) / cv.getBoundingClientRect().width;  // image pixels per screen pixel
        it.crop.cx -= (e.clientX - drag.x) * k; it.crop.cy -= (e.clientY - drag.y) * k;
        drag = { x: e.clientX, y: e.clientY }; clampCrop(it); draw();
      });
      const up = () => (drag = null);
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      cv.addEventListener("wheel", (e) => { e.preventDefault(); zoom.value = Math.min(0.7, Math.max(0.08, +zoom.value * (1 + e.deltaY * 0.001))); zoom.dispatchEvent(new Event("input")); }, { passive: false });
      card.querySelector(".crop-remove").addEventListener("click", () => { URL.revokeObjectURL(it.url); items.splice(idx, 1); render(); });
      list.appendChild(card);
      clampCrop(it); draw();
    });
    $("#btnSetupSave").disabled = false;
    $("#setupAddLabel").hidden = items.length >= 3;
  }

  function clampCrop(it) {
    const iw = it.img.naturalWidth, ih = it.img.naturalHeight;
    it.crop.r = Math.min(it.crop.r, Math.min(iw, ih) / 2);
    it.crop.cx = Math.max(it.crop.r, Math.min(iw - it.crop.r, it.crop.cx));
    it.crop.cy = Math.max(it.crop.r, Math.min(ih - it.crop.r, it.crop.cy));
  }

  function drawCrop(cv, it) {
    const c = cv.getContext("2d"), S = cv.width, { cx, cy, r } = it.crop;
    c.clearRect(0, 0, S, S);
    c.drawImage(it.img, cx - r * 1.25, cy - r * 1.25, r * 2.5, r * 2.5, 0, 0, S, S);   // show a little around the circle
    c.fillStyle = "rgba(5,2,30,.6)";
    c.beginPath(); c.rect(0, 0, S, S); c.arc(S / 2, S / 2, S / 2.5, 0, Math.PI * 2, true); c.fill("evenodd");
    c.strokeStyle = "#ffd166"; c.lineWidth = 6; c.setLineDash([16, 10]);
    c.beginPath(); c.arc(S / 2, S / 2, S / 2.5, 0, Math.PI * 2); c.stroke();
  }

  const toURL = (cv, alpha) => {
    const w = cv.toDataURL("image/webp", 0.86);
    return w.startsWith("data:image/webp") ? w : cv.toDataURL(alpha ? "image/png" : "image/jpeg", 0.86);
  };

  async function save() {
    const name = $("#setupName").value.trim().slice(0, 18) || SA.KID.name;
    SA.kidStore.saveName(name);
    if (!items.length) { status(`Saved! The adventure now belongs to ${name}.`); onSaved(); return; }
    $("#btnSetupSave").disabled = true;
    const out = [];
    for (let i = 0; i < items.length; i++) {
      status(`✨ Turning photo ${i + 1} of ${items.length} into a cartoon…`, true);
      await new Promise((r) => setTimeout(r, 30));                  // let the status paint
      const it = items[i];
      out.push({ sticker: toURL(SA.cartoon.sticker(it.img, it.crop, RINGS[i % 3]), true), pose: toURL(SA.cartoon.pose(it.img, it.crop), false) });
    }
    if (!SA.kidStore.savePhotos(out)) { status("This browser is out of space for photos. Try smaller pictures."); $("#btnSetupSave").disabled = false; return; }
    items.forEach((it) => URL.revokeObjectURL(it.url)); items = [];
    render(); renderCurrent();
    status(`🎉 Done! ${name} is now in the game.`);
    onSaved();
  }

  return { init, open };
})();
