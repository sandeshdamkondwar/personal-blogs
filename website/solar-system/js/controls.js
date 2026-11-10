/* Camera + input: keyboard, mouse/touch orbit, pinch zoom, on-screen joystick, tap-to-fly */
window.SA = window.SA || {};

SA.controls = (function () {
  let THREE, canvas, camera, onTap;
  const input = { turn: 0, thrust: 0, brake: false, joy: { x: 0, y: 0, active: false }, anyManual: false };
  const keys = new Set();
  const cam = { yaw: 0.8, pitch: 1.0, dist: 250, distT: 250, pitchT: 1.0, target: null, focusSun: true, userRotatedT: 99 };
  let thrustBtnDown = false, pilotingStarted = false;
  const pointers = new Map();
  let drag = null, pinchDist = 0;

  function init(three, cv, cameraObj, joyEl, knobEl, thrustBtn, callbacks) {
    THREE = three; canvas = cv; camera = cameraObj; onTap = callbacks.onTap;
    cam.target = new THREE.Vector3();

    window.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea")) return;
      keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      callbacks.onKey && callbacks.onKey(e);
    });
    window.addEventListener("keyup", (e) => keys.delete(e.code));
    window.addEventListener("blur", () => keys.clear());

    // Orbit / pinch / tap on the 3D canvas
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, t: performance.now() };
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y); drag = null; }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist) setDist(cam.dist * (pinchDist / d));
        pinchDist = d; return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
      if (drag.moved) {
        cam.yaw -= dx * 0.006;
        cam.pitch = cam.pitchT = Math.min(1.45, Math.max(0.08, cam.pitch + dy * 0.005));
        cam.userRotatedT = 0;
      }
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (drag && !drag.moved && performance.now() - drag.t < 500 && pointers.size === 0) {
        onTap(((e.clientX / window.innerWidth) * 2 - 1), -((e.clientY / window.innerHeight) * 2 - 1));
      }
      if (pointers.size === 0) drag = null;
      pinchDist = 0;
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", (e) => { e.preventDefault(); setDist(cam.dist * (1 + e.deltaY * 0.0012)); }, { passive: false });

    // Joystick
    const R = 44;
    let joyId = null;
    const joyMove = (e) => {
      const rect = joyEl.getBoundingClientRect();
      let dx = e.clientX - (rect.left + rect.width / 2), dy = e.clientY - (rect.top + rect.height / 2);
      const m = Math.hypot(dx, dy);
      if (m > R) { dx *= R / m; dy *= R / m; }
      knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
      input.joy.x = dx / R; input.joy.y = -dy / R; input.joy.active = true;
    };
    joyEl.addEventListener("pointerdown", (e) => { joyId = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyEl.classList.add("active"); joyMove(e); e.preventDefault(); });
    joyEl.addEventListener("pointermove", (e) => { if (e.pointerId === joyId) joyMove(e); });
    const joyUp = (e) => {
      if (e.pointerId !== joyId) return;
      joyId = null; joyEl.classList.remove("active");
      knobEl.style.transform = ""; input.joy.x = input.joy.y = 0; input.joy.active = false;
    };
    joyEl.addEventListener("pointerup", joyUp); joyEl.addEventListener("pointercancel", joyUp);

    // Hold-to-boost button
    thrustBtn.addEventListener("pointerdown", (e) => { thrustBtnDown = true; thrustBtn.setPointerCapture(e.pointerId); e.preventDefault(); });
    const tUp = () => { thrustBtnDown = false; };
    thrustBtn.addEventListener("pointerup", tUp); thrustBtn.addEventListener("pointercancel", tUp);
  }

  function setDist(d) { cam.dist = cam.distT = Math.min(330, Math.max(4.5, d)); }

  function update(dt, rocket) {
    const k = keys;
    input.turn = (k.has("ArrowLeft") || k.has("KeyA") ? 1 : 0) - (k.has("ArrowRight") || k.has("KeyD") ? 1 : 0);
    input.thrust = (k.has("ArrowUp") || k.has("KeyW") || thrustBtnDown) ? 1 : 0;
    input.brake = k.has("ArrowDown") || k.has("KeyS");
    input.anyManual = !!(input.turn || input.thrust || input.joy.active);

    cam.userRotatedT += dt;
    const moving = rocket.state === "auto" || input.anyManual || rocket.speed > 2;
    if (moving && !pilotingStarted) { pilotingStarted = true; cam.distT = 30; cam.pitchT = 0.42; cam.focusSun = false; }
    if (input.anyManual || rocket.state === "auto") cam.focusSun = false;

    // Follow target
    const want = cam.focusSun ? new THREE.Vector3(0, 0, 0) : rocket.pos;
    cam.target.lerp(want, 1 - Math.exp(-5 * dt));

    // Camera swings behind the rocket while it flies, unless the kid is dragging the view
    if (moving && cam.userRotatedT > 2.5 && rocket.state !== "landed") {
      const want = rocket.heading + Math.PI;
      let d = ((want - cam.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      cam.yaw += d * Math.min(1, dt * 2.2);
    }
    cam.dist += (cam.distT - cam.dist) * Math.min(1, dt * 3);
    cam.pitch += (cam.pitchT - cam.pitch) * Math.min(1, dt * 3);

    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    camera.position.set(
      cam.target.x + Math.sin(cam.yaw) * cp * cam.dist,
      cam.target.y + sp * cam.dist,
      cam.target.z + Math.cos(cam.yaw) * cp * cam.dist);
    camera.lookAt(cam.target.x, cam.target.y + 0.5, cam.target.z);
  }

  function overview() { cam.focusSun = true; cam.distT = 250; cam.pitchT = 1.05; cam.userRotatedT = 0; }
  function zoomTo(dist, pitch) { cam.distT = dist; if (pitch !== undefined) cam.pitchT = pitch; cam.focusSun = false; }
  function closeUp() { cam.distT = 8.5; cam.pitchT = 0.32; cam.focusSun = false; cam.userRotatedT = 0; }

  return { init, update, overview, zoomTo, closeUp, input, cam, get pilotingStarted() { return pilotingStarted; } };
})();
