/* Boot everything and run the frame loop */
(function () {
  const canvas = document.getElementById("scene");
  const labelsEl = document.getElementById("labels");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02010c);
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 6000);

  SA.world.init(THREE, scene, renderer, labelsEl);
  SA.world.update(0, camera, false);                       // place planets before parking the rocket
  SA.rocket.init(THREE, scene, SA.world.byId.earth);
  SA.controls.init(THREE, canvas, camera,
    document.getElementById("joystick"), document.getElementById("joyKnob"), document.getElementById("btnThrust"),
    { onTap: (x, y) => SA.ui.onTap(x, y), onKey: (e) => SA.ui.onKey(e) });
  SA.ui.init({ THREE, camera });

  // Test / demo hooks:  ?test  skips the welcome,  ?land=mars  starts parked on Mars,  ?fly=saturn  starts flying there
  const q = new URLSearchParams(location.search);
  if (q.get("land")) {
    const b = SA.world.byId[q.get("land")];
    if (b) { SA.rocket.flyTo(b); }
  } else if (q.get("fly")) {
    const b = SA.world.byId[q.get("fly")];
    if (b) SA.rocket.flyTo(b);
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;   // never negative: the first rAF timestamp can predate "last"
    SA.world.update(dt, camera, SA.ui.labelsOn);
    SA.rocket.update(dt, SA.controls.input, SA.controls.cam.yaw);
    SA.controls.update(dt, SA.rocket);
    SA.ui.update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.SA.debug = { scene, camera, renderer };
})();
