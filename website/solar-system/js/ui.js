/* All the HUD, panels, mini-labs, passport, planet builder, game, tour, minimap */
window.SA = window.SA || {};

SA.ui = (function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { } },
  };
  const state = {
    captain: "Captain", stamps: new Set(), labelsOn: true, current: null, lastVisitWasNew: false,
    game: { active: false, target: null, score: 0 }, tour: { active: false, i: 0, timer: null },
    speeds: [1, 3, 10, 0], speedIdx: 0, THREE: null, camera: null,
  };
  let testMode = false;

  /* ============ Init ============ */
  function init({ THREE, camera }) {
    state.THREE = THREE; state.camera = camera;
    testMode = new URLSearchParams(location.search).has("test");
    state.captain = LS.get("sa.name", "");
    (LS.get("sa.stamps", [])).forEach((id) => state.stamps.add(id));
    (LS.get("sa.custom", [])).forEach((def) => SA.world.addBody(def, true));

    state.captain = SA.kidName();
    SA.applyKidImages();
    SA.setup.init(refreshKid);
    $("#weightFigure").innerHTML = SA.kidSVG({ helmet: true, wave: false });
    $("#jumper").innerHTML = SA.kidSVG({ mood: "cheer" });
    $("#welcomeKid").innerHTML = SA.kidSVG({ mood: "grin" });
    applyNameText();
    buildDock(); buildPassport(); updateStampCount();
    bindButtons(); bindPanel(); bindBuilder(); bindWelcome(); setupCTA();
    SA.speech.onSpeaking = (on) => $("#btnRead").classList.toggle("speaking", on);

    SA.rocket.on("land", onLand);
    SA.rocket.on("takeoff", onTakeoff);

    if (testMode) startMission(state.captain);
    else $("#welcome").hidden = false;
  }

  /* ============ Welcome ============ */
  function bindWelcome() {
    $("#btnBlastOff").addEventListener("click", () => {
      if (!SA.hasKidName()) {
        const n = $("#welcomeName").value.trim().slice(0, 18);
        if (!n) { $("#welcomeName").focus(); $("#askName").classList.add("nudge"); setTimeout(() => $("#askName").classList.remove("nudge"), 600); return; }
        SA.kidStore.saveName(n); state.captain = n; refreshKid();
      }
      startMission(state.captain);
    });
    $("#welcomeName").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#btnBlastOff").click(); });
    $("#btnWelcomeSetup").addEventListener("click", () => SA.setup.open());
  }
  function setupCTA() {
    const h = (SA.CTA.xHandle || "").replace(/^@/, "");
    const follow = $("#ctaLink"), share = $("#ctaShare");
    if (h) { follow.href = `https://x.com/${encodeURIComponent(h)}`; $("#ctaLabel").innerHTML = `Follow<span class="cta-handle"> @${h}</span>`; }
    else follow.hidden = true;
    const url = location.origin + location.pathname;                     // never share the kid's name from ?kid=
    share.href = "https://x.com/intent/post?text=" + encodeURIComponent(`My kid just flew a rocket to Saturn 🚀🪐 A free 3D space adventure that stars YOUR kid${h ? ` by @${h}` : ""}`) + "&url=" + encodeURIComponent(url);
    [follow, share].forEach((a) => a.addEventListener("click", () => SA.audio.tick()));
    ["#ctaSetup", "#ctaSetupShort"].forEach((s) => $(s).addEventListener("click", () => { closeOverlays(); SA.setup.open(); }));
    // dismissable: remembered in this browser
    if (LS.get("sa.ctaHidden", false)) document.body.classList.add("cta-hidden");
    $("#ctaClose").addEventListener("click", () => { document.body.classList.add("cta-hidden"); LS.set("sa.ctaHidden", true); SA.audio.tick(); });
  }
  function applyNameText() {
    const n = state.captain;
    document.title = `🚀 ${n}'s Space Adventure`;
    $(".brand h1").textContent = `${n}'s Space Adventure`;
    $("#captainName").textContent = `🚀 Built only for ${n}`;
    const named = SA.hasKidName();
    $("#askName").hidden = named;
    $("#onlyFor").textContent = named ? `⭐ Built only for ${n} ⭐` : "⭐ Built only for you ⭐";
    $("#welcomeTitle").textContent = named ? `${n}'s Space Adventure` : "Your Space Adventure";
    $("#welcomeText").textContent = named
      ? `This rocket was built ONLY for ${n}! Fly to every planet, collect passport stamps, and find out how much you'd weigh on Jupiter!`
      : "Fly your own rocket to every planet, collect passport stamps, and find out how much you'd weigh on Jupiter!";
    if (!named) { document.title = "🚀 Space Adventure"; $(".brand h1").textContent = "Space Adventure"; $("#captainName").textContent = "🚀 Built only for you"; }
    SA.rocket.setName(named ? n : "Explorer");
    updateStampCount();
  }
  /* Called after the parent setup saves */
  function refreshKid() {
    state.captain = SA.kidName();
    SA.applyKidImages(); applyNameText(); buildPassport();
    SA.rocket.setPilot(SA.kidStickers()[0]); SA.rocket.setName(state.captain);
  }
  function startMission(name) {
    state.captain = name;
    $("#welcome").hidden = true;
    applyNameText();
    SA.audio.unlock(); SA.audio.startEngine();
    setHint("🌍 You're home on Earth! Press 🚀 or ⬆️ to take off, or tap a planet!");
    if (!testMode) SA.speech.say(`Hi Captain ${name}! This is your very own rocket. Tap a planet to fly there, or use the arrows to steer.`);
    setTimeout(() => postcard(SA.kidPoses()[0], `Captain ${name} is ready for lift off!`, "🚀"), 600);
    burst(window.innerWidth / 2, window.innerHeight / 2, "🚀");
  }

  /* ============ HUD ============ */
  function setHint(text, mood) {
    const h = $("#hint");
    h.textContent = text; h.className = "hint" + (mood ? " " + mood : "");
  }
  let toastTimer;
  function toast(text, ms = 2600) {
    const t = $("#toast");
    t.textContent = text; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  }

  function bindButtons() {
    $("#btnOverview").addEventListener("click", () => { SA.controls.overview(); SA.audio.tick(); toast("🗺️ The whole solar system!"); });
    $("#btnLabels").addEventListener("click", (e) => { state.labelsOn = !state.labelsOn; e.currentTarget.classList.toggle("active", state.labelsOn); SA.audio.tick(); });
    $("#btnSize").addEventListener("click", (e) => {
      const real = SA.world.sizeMode !== "real";
      SA.world.setSizeMode(real ? "real" : "toy");
      e.currentTarget.classList.toggle("active", real);
      SA.audio.tick();
      if (real) { toast("🔬 TRUE sizes! Jupiter is 11 Earths wide. The Sun is really 109 Earths wide — too big for the screen!", 5000); SA.speech.say("These are the true sizes! Look how tiny Earth is next to Jupiter."); }
      else toast("🧸 Toy sizes — easier to see the little ones!");
    });
    $("#btnSpeed").addEventListener("click", () => {
      state.speedIdx = (state.speedIdx + 1) % state.speeds.length;
      const s = state.speeds[state.speedIdx];
      SA.world.setTimeScale(s);
      $("#speedVal").textContent = s === 0 ? "⏸" : s + "x";
      toast(s === 0 ? "⏸️ The planets are taking a nap" : s === 1 ? "▶️ Normal speed" : `⏩ ${s}x faster — watch them zoom!`);
      SA.audio.tick();
    });
    $("#btnSound").addEventListener("click", (e) => {
      const on = !SA.audio.isEnabled();
      SA.audio.setEnabled(on); SA.speech.setEnabled(on);
      e.currentTarget.classList.toggle("active", on); e.currentTarget.textContent = on ? "🔊" : "🔇";
    });
    $("#btnVoice").addEventListener("click", voiceCommand);
    $("#btnVoicePick").addEventListener("click", () => {
      const n = SA.speech.nextVoice();
      if (!n) { toast("🗣️ No voices found in this browser."); return; }
      toast(`🗣️ Voice: ${n}`);
      SA.speech.say(`Hi ${state.captain}! Do you like my voice?`);
    });
    $("#btnPassport").addEventListener("click", () => openOverlay("#passport"));
    $("#btnSetup").addEventListener("click", () => { closeOverlays(); SA.setup.open(); });
    $("#btnBuild").addEventListener("click", () => { openOverlay("#builder"); startPreview(); });
    $("#btnGame").addEventListener("click", () => (state.game.active ? stopGame() : startGame()));
    $("#btnTour").addEventListener("click", () => (state.tour.active ? stopTour() : startTour()));
    $("#btnLand").addEventListener("click", landOrTakeoff);
    $$("[data-close]").forEach((b) => b.addEventListener("click", () => closeOverlays()));
    $$(".overlay").forEach((o) => o.addEventListener("pointerdown", (e) => { if (e.target === o) closeOverlays(); }));
    $("#panelClose").addEventListener("click", () => SA.rocket.takeOff());
  }
  function openOverlay(sel) { closeOverlays(); $(sel).hidden = false; SA.audio.tick(); }
  function closeOverlays() { $$(".overlay").forEach((o) => { if (o.id !== "welcome") o.hidden = true; }); stopPreview(); }
  // the setup's ✖ / backdrop should close only the setup (the welcome may still be behind it)

  function onKey(e) {
    if (e.code === "Space") landOrTakeoff();
    if (e.code === "Escape") { closeOverlays(); }
    if (e.code === "KeyP") openOverlay("#passport");
  }
  function landOrTakeoff() {
    if (SA.rocket.state === "landed") { SA.rocket.takeOff(); return; }
    const n = SA.world.nearest(SA.rocket.pos);
    if (n.body && n.dist < 9) { SA.rocket.flyTo(n.body); setHint(`🛬 Landing on ${n.body.def.name}…`); }
    else toast("🛬 Get closer to a planet first!");
  }

  /* Tap on the 3D scene */
  const raycaster = { r: null };
  function onTap(nx, ny) {
    const THREE = state.THREE;
    raycaster.r = raycaster.r || new THREE.Raycaster();
    raycaster.r.setFromCamera(new THREE.Vector2(nx, ny), state.camera);
    const hits = raycaster.r.intersectObjects(SA.world.hitTargets(), false);
    if (!hits.length) return;
    const b = SA.world.byId[hits[0].object.userData.bodyId];
    if (b) goTo(b);
  }
  function goTo(b) {
    if (SA.rocket.landedOn === b) { openPanel(b); return; }
    SA.rocket.flyTo(b);
    SA.audio.blip(600, 0.2, "triangle");
    setHint(`🚀 Flying to ${b.def.name}… hold on!`);
    if (!state.tour.active) SA.speech.say(`Flying to ${b.def.name}!`);
  }

  /* ============ Dock ============ */
  function buildDock() {
    const dock = $("#dock"); dock.innerHTML = "";
    SA.world.bodies.forEach((b) => {
      const chip = document.createElement("button");
      chip.className = "chip" + (b.isCustom ? " custom" : ""); chip.dataset.id = b.def.id;
      chip.innerHTML = `<span class="ce">${b.def.emoji}</span><span class="cn">${b.def.name.replace("The ", "")}</span>`;
      chip.addEventListener("click", () => goTo(b));
      dock.appendChild(chip);
    });
    refreshDock();
  }
  function refreshDock() {
    $$("#dock .chip").forEach((c) => {
      c.classList.toggle("visited", state.stamps.has(c.dataset.id));
      c.classList.toggle("here", !!SA.rocket.landedOn && SA.rocket.landedOn.def.id === c.dataset.id);
      c.classList.toggle("target", !!SA.rocket.autoTarget && SA.rocket.autoTarget.def.id === c.dataset.id);
    });
  }

  /* ============ Landing / panel ============ */
  function onLand(b) {
    state.current = b;
    SA.audio.land();
    SA.controls.closeUp();
    const isNew = !state.stamps.has(b.def.id);
    state.lastVisitWasNew = isNew;
    if (isNew) { state.stamps.add(b.def.id); LS.set("sa.stamps", [...state.stamps]); updateStampCount(); buildPassport(); }
    refreshDock();
    openPanel(b, isNew);

    if (state.game.active) { checkGame(b); return; }
    if (isNew) { burst(window.innerWidth * 0.5, window.innerHeight * 0.35, b.def.emoji); toast(`📘 New passport stamp: ${b.def.name}!`); }
    postcard(SA.pick(SA.kidPoses()), landCaption(b), b.def.emoji);
    setHint(`🛬 You landed on ${b.def.name}! Press ⬆️ or 🚀 to take off.`, "celebrate");
    const say = `Captain ${state.captain}! ${b.def.welcome} ${b.def.facts.slice(0, 2).map((f) => f[1]).join(" ")}`;
    SA.speech.say(say, () => { if (state.tour.active) scheduleTourNext(); });
    checkAllStamps();
  }
  function onTakeoff(b) {
    $("#panel").hidden = true; state.current = null; document.body.classList.remove("panel-open");
    refreshDock();
    SA.audio.blip(300, 0.4, "sawtooth", 0.08);
    SA.controls.zoomTo(30, 0.42);
    if (!state.game.active) setHint("🚀 Lift off! Tap a planet or steer with ⬅️ ⬆️ ➡️");
  }

  function openPanel(b, isNew = false) {
    const p = $("#panel");
    p.hidden = false; document.body.classList.add("panel-open");
    p.style.setProperty("--pc", "#" + b.def.color.toString(16).padStart(6, "0"));
    $("#panelEmoji").textContent = b.def.emoji;
    $("#panelName").textContent = b.def.name;
    $("#panelTag").textContent = b.def.tag;
    $("#panelStamp").hidden = !isNew;
    $("#btnRemovePlanet").hidden = !b.isCustom;
    showTab("facts");
    renderFacts(b);
    renderLabs(b);
  }
  function bindPanel() {
    $$(".tab").forEach((t) => t.addEventListener("click", () => { showTab(t.dataset.tab); SA.audio.tick(); }));
    $("#btnRead").addEventListener("click", () => {
      const b = state.current; if (!b) return;
      const shown = $$("#facts li span.t").map((s) => s.textContent);
      SA.speech.say(`${b.def.name}. ${b.def.tag} ${shown.join(" ")}`);
    });
    $("#btnMoreFact").addEventListener("click", () => {
      const b = state.current; if (!b) return;
      b.factIdx = (b.factIdx ?? 2) + 1;
      const f = b.def.facts[b.factIdx % b.def.facts.length];
      const li = factLi(f, true);
      const list = $("#facts");
      if (list.children.length >= 4) list.firstElementChild.remove();
      list.appendChild(li);
      SA.audio.blip(700, 0.15, "triangle"); SA.speech.say(f[1]);
    });
    $("#btnTakeOff").addEventListener("click", () => SA.rocket.takeOff());
    $("#btnNextPlanet").addEventListener("click", () => {
      const list = SA.world.bodies; const i = list.indexOf(state.current);
      goTo(list[(i + 1) % list.length]);
    });
    $("#btnRemovePlanet").addEventListener("click", () => {
      const b = state.current; if (!b || !b.isCustom) return;
      removeCustom(b.def.id);
    });
    const relabs = () => { if (state.current) renderLabs(state.current); };
    $("#weightIn").addEventListener("input", relabs);
    $("#ageIn").addEventListener("input", relabs);
  }
  function showTab(name) {
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    $$(".tabpane").forEach((p) => (p.hidden = p.dataset.pane !== name));
    if (name === "jump") restartJump();
  }
  function factLi([emoji, text], fresh) {
    const li = document.createElement("li");
    if (fresh) li.className = "fresh";
    li.innerHTML = `<span class="e">${emoji}</span><span class="t">${text}</span>`;
    return li;
  }
  function renderFacts(b) {
    const list = $("#facts"); list.innerHTML = "";
    b.factIdx = 2;
    b.def.facts.slice(0, 3).forEach((f) => list.appendChild(factLi(f)));
  }

  /* ---- Mini-labs: weigh, birthday, jump ---- */
  function renderLabs(b) {
    const g = b.def.real.gravity, name = b.def.name;
    const kg = +$("#weightIn").value, age = +$("#ageIn").value;
    $("#weightVal").textContent = kg;
    const here = kg * g;
    $("#weightOut").textContent = here >= 100 ? Math.round(here) : here.toFixed(here < 10 ? 1 : 0);
    $("#weightWhere").textContent = name;
    $("#weightMsg").textContent =
      g > 5 ? "😵 You'd be squished flat! Nobody can stand here." :
      g > 1.8 ? "🐘 Whoa, super heavy! Like carrying a friend on your back." :
      g > 1.05 ? "🏋️ A little heavier than at home." :
      g > 0.8 ? "😊 Almost the same as home!" :
      g > 0.3 ? "🎈 Light as a balloon! You could lift your dad." :
      "🪶 Light as a feather! One hop and you'd float away.";
    const figure = $("#weightFigure");
    figure.style.transform = `scaleY(${Math.max(0.45, Math.min(1.25, 1 / Math.sqrt(g)))}) scaleX(${Math.max(0.8, Math.min(1.6, Math.sqrt(g)))})`;

    $("#ageVal").textContent = age;
    const yd = b.def.real.yearDays;
    if (yd) {
      const there = age * 365.25 / yd;
      const txt = there >= 10 ? Math.round(there) : there >= 1 ? there.toFixed(1) : there.toFixed(2);
      $("#ageOut").innerHTML = `On <b>${name}</b> you'd be <b class="big">${txt}</b> years old!`;
      const years = (yd / 365.25);
      $("#ageDetail").textContent =
        yd < 365 ? `A year on ${name} is only ${Math.round(yd)} days — you'd have birthdays all the time! 🎉` :
        yd < 1000 ? `A year on ${name} lasts ${Math.round(yd)} Earth days — almost ${years.toFixed(1)} Earth years.` :
        `A year on ${name} is ${Math.round(years)} Earth years long. You might never get a birthday cake! 🎂`;
      const cakes = Math.max(0, Math.floor(there));
      $("#cakes").textContent = cakes === 0 ? "🍼 (not even one!)" : "🎂".repeat(Math.min(cakes, 30)) + (cakes > 30 ? ` ×${cakes}` : "");
    } else {
      $("#ageOut").innerHTML = `The Sun doesn't go around anything — <b>it's the boss!</b> ☀️`;
      $("#ageDetail").textContent = "Everything else goes around the Sun, so the Sun has no birthdays.";
      $("#cakes").textContent = "";
    }
    const dh = b.def.real.dayHours;
    $("#dayDetail").textContent = dh < 20 ? `A day here is only ${dh} hours — super short!` : dh <= 25 ? `A day here is about ${Math.round(dh)} hours, like home.` : `One day here lasts ${Math.round(dh / 24)} Earth days — what a long bedtime!`;

    const jump = Math.round(30 / g);
    $("#jumpOut").textContent = jump >= 100 ? (jump / 100).toFixed(1) + " metres" : jump + " cm";
    $("#jumpWhere").textContent = name;
    $("#jumpMsg").textContent =
      jump < 5 ? "😅 Barely off the ground!" : jump < 25 ? "🙂 A tiny hop." : jump < 40 ? "😀 Just like at home!" :
      jump < 100 ? "🤩 Higher than a table!" : jump < 300 ? "🚀 Over your house's roof!" : "🌟 Over a tree! You'd fly like a superhero!";
    $("#jumpBox").style.setProperty("--h", Math.min(170, 20 + Math.log2(1 + jump) * 22) + "px");
    restartJump();
  }
  function restartJump() {
    const j = $("#jumper"); j.classList.remove("go"); void j.offsetWidth; j.classList.add("go");
  }

  /* ============ Passport ============ */
  function updateStampCount() {
    const total = SA.world.bodies.length;
    const have = SA.world.bodies.filter((b) => state.stamps.has(b.def.id)).length;
    $("#stampCount").textContent = `${have}/${total}`;
    $("#passportTitle").textContent = `Captain ${state.captain}'s Passport`;
  }
  function buildPassport() {
    const grid = $("#stampGrid"); grid.innerHTML = "";
    SA.world.bodies.forEach((b) => {
      const has = state.stamps.has(b.def.id);
      const card = document.createElement("button");
      card.className = "stamp" + (has ? " got" : "") + (b.isCustom ? " custom" : "");
      card.innerHTML = `<span class="se">${b.def.emoji}</span><span class="sn">${b.def.name}</span>${has ? '<span class="mark">VISITED</span>' : '<span class="q">?</span>'}`;
      card.addEventListener("click", () => { closeOverlays(); goTo(b); });
      grid.appendChild(card);
    });
    updateStampCount();
  }
  function checkAllStamps() {
    const base = SA.BODIES.every((d) => state.stamps.has(d.id));
    if (base && !LS.get("sa.superExplorer", false)) {
      LS.set("sa.superExplorer", true);
      setTimeout(() => {
        burst(window.innerWidth / 2, window.innerHeight / 2, "🏆"); SA.audio.cheer();
        toast(`🏆 Captain ${state.captain} is a SUPER EXPLORER — every planet visited!`, 6000);
        SA.speech.say(`Amazing! Captain ${state.captain}, you visited every planet. You are a super explorer!`);
      }, 1500);
    }
  }

  /* ============ Find-it game ============ */
  function startGame() {
    state.game.active = true; state.game.score = 0;
    $("#btnGame").classList.add("active");
    stopTour();
    nextQuestion();
  }
  function nextQuestion() {
    const pool = SA.world.bodies.filter((b) => !b.isCustom && b !== state.game.target && b !== SA.rocket.landedOn);
    state.game.target = pool[Math.floor(Math.random() * pool.length)];
    const q = `🎯 Fly to ${state.game.target.def.clue}!`;
    setHint(q, "game"); SA.speech.say(`Can you fly to ${state.game.target.def.clue}?`);
  }
  function checkGame(b) {
    if (b === state.game.target) {
      state.game.score++;
      $("#gameScore").textContent = "⭐".repeat(Math.min(5, state.game.score)) + (state.game.score > 5 ? ` ${state.game.score}` : "");
      setHint(`🎉 YES ${state.captain}! That's ${b.def.name}! You're a space genius!`, "celebrate");
      postcard(SA.pick(SA.kidStickers()), `Space genius ${state.captain}! ⭐`, "🎉");
      SA.audio.cheer(); burst(window.innerWidth / 2, window.innerHeight / 3, "🎉");
      SA.speech.say(`Yes ${state.captain}! That's ${b.def.name}! Great job!`, () => { if (state.game.active) setTimeout(nextQuestion, 800); });
    } else {
      setHint(`🤔 That's ${b.def.name}. Try again — fly to ${state.game.target.def.clue}!`, "oops");
      SA.audio.oops(); SA.speech.say(`That's ${b.def.name}. Try again!`);
    }
  }
  function stopGame() {
    if (!state.game.active) return;
    state.game.active = false; $("#btnGame").classList.remove("active");
    setHint("👉 Tap a planet to fly there!");
  }

  /* ============ Tour ============ */
  function startTour() {
    stopGame();
    state.tour.active = true; state.tour.i = 0;
    $("#btnTour").classList.add("active");
    toast("🎢 Grand tour! Sit back — the rocket will visit every planet.");
    tourStep();
  }
  function tourStep() {
    if (!state.tour.active) return;
    const b = SA.world.byId[SA.BODIES[state.tour.i % SA.BODIES.length].id];
    state.tour.i++;
    goTo(b);
  }
  function scheduleTourNext() {
    clearTimeout(state.tour.timer);
    state.tour.timer = setTimeout(tourStep, 1800);
  }
  function stopTour() {
    if (!state.tour.active) return;
    state.tour.active = false; clearTimeout(state.tour.timer);
    $("#btnTour").classList.remove("active");
  }

  /* ============ Voice ============ */
  function voiceCommand() {
    if (!SA.speech.canListen()) { toast("🎤 Voice isn't available in this browser. Try Chrome!"); return; }
    const ok = SA.speech.listen((alts) => {
      toast(`🎤 I heard: "${alts[0]}"`);
      const text = alts.join(" ");
      const target = SA.world.bodies.find((b) => text.includes(b.def.name.toLowerCase().replace("the ", "")))
        || (/\bhome\b/.test(text) ? SA.world.byId.earth : null);
      if (target) { goTo(target); return; }
      if (/passport/.test(text)) openOverlay("#passport");
      else if (/faster|speed/.test(text)) $("#btnSpeed").click();
      else if (/tour/.test(text)) startTour();
      else if (/take ?off|go up|fly/.test(text)) SA.rocket.takeOff();
      else if (/everything|overview|map/.test(text)) SA.controls.overview();
      else SA.speech.say("Try saying a planet's name, like Mars!");
    }, (on) => $("#btnVoice").classList.toggle("listening", on));
    if (ok) toast("🎤 Say a planet name… like \"Jupiter!\"");
  }

  /* ============ Planet builder ============ */
  let preview = null, previewTimer = null;
  function bindBuilder() {
    $$("#builder input, #builder select").forEach((el) => el.addEventListener("input", schedulePreview));
    $("#btnLaunchPlanet").addEventListener("click", launchPlanet);
    $("#btnRandomPlanet").addEventListener("click", () => {
      const rc = () => "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
      $("#bName").value = ["Zorbo", "Pinkle", "Bloop", "Candy", "Sparkle", "Mango", "Dino", "Jelly", "Zoomy"][Math.floor(Math.random() * 9)] + " " + ["World", "Land", "Planet", "Ball", "Star"][Math.floor(Math.random() * 5)];
      $("#bC1").value = rc(); $("#bC2").value = rc();
      $("#bStyle").value = ["swirly", "stripes", "spots", "craters"][Math.floor(Math.random() * 4)];
      $("#bSize").value = (0.7 + Math.random() * 2.5).toFixed(1);
      $("#bRing").checked = Math.random() > 0.5; $("#bRingColor").value = rc();
      $("#bMoons").value = Math.floor(Math.random() * 4);
      schedulePreview();
    });
  }
  function builderDef() {
    const name = ($("#bName").value.trim() || "My Planet").slice(0, 20);
    const size = +$("#bSize").value, moons = +$("#bMoons").value, ring = $("#bRing").checked;
    const c1 = $("#bC1").value, c2 = $("#bC2").value;
    return {
      id: "custom-" + Date.now().toString(36), name, emoji: ring ? "🪐" : "🔮", color: parseInt(c1.slice(1), 16), kind: "custom",
      c1, c2, style: $("#bStyle").value, seed: Math.floor(Math.random() * 100000),
      vis: { r: size, orbit: SA.world.nextCustomOrbit() }, tilt: 0.25, moonsVisual: moons,
      ring: ring ? { inner: 1.4, outer: 2.2, color: $("#bRingColor").value } : undefined,
      real: { radiusKm: Math.round(6371 * size / 1.65), gravity: +(0.25 + size * 0.5).toFixed(2), yearDays: 120000 + Math.floor(Math.random() * 90000), dayHours: 20, moons },
      tag: `A brand-new planet made by Captain ${state.captain}!`,
      clue: `the planet called ${name}`,
      welcome: `Welcome to ${name}! You built this planet all by yourself!`,
      facts: [
        ["🧑‍🎨", `${name} was invented by Captain ${state.captain}. Nobody else has one!`],
        ["📏", size < 1.2 ? `${name} is a little planet — smaller than Earth.` : size < 2.5 ? `${name} is a medium planet, a bit bigger than Earth.` : `${name} is a GIANT planet, like Jupiter!`],
        ["💍", ring ? `${name} has a beautiful ring made of sparkly ice.` : `${name} has no rings — it likes to keep things simple.`],
        ["🌙", moons === 0 ? `${name} has no moons. It's never lonely though — you can visit!` : `${name} has ${moons} little moon${moons > 1 ? "s" : ""} going round and round.`],
        ["🏁", `${name} lives way out past Pluto, at the edge of the map.`],
      ],
    };
  }
  function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(updatePreview, 120); }
  function startPreview() {
    const THREE = state.THREE;
    if (!preview) {
      const canvas = $("#buildPreview");
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(220, 220, false);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50); camera.position.set(0, 1.2, 4.2); camera.lookAt(0, 0, 0);
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const l = new THREE.DirectionalLight(0xffffff, 2.5); l.position.set(3, 2, 4); scene.add(l);
      const group = new THREE.Group(); scene.add(group);
      preview = { renderer, scene, camera, group, running: false };
    }
    preview.running = true; updatePreview(); renderPreview();
  }
  function updatePreview() {
    if (!preview) return;
    const THREE = state.THREE, def = builderDef();
    const g = preview.group;
    while (g.children.length) { const c = g.children.pop(); c.geometry?.dispose(); c.material?.map?.dispose(); c.material?.dispose(); }
    const tex = new THREE.CanvasTexture(SA.textures.forBody(def)); tex.colorSpace = THREE.SRGBColorSpace;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    g.add(ball);
    if (def.ring) {
      const geo = new THREE.RingGeometry(def.ring.inner, def.ring.outer, 96);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - def.ring.inner) / (def.ring.outer - def.ring.inner), 0.5);
      const rt = new THREE.CanvasTexture(SA.textures.ringTexture(def.ring.color)); rt.colorSpace = THREE.SRGBColorSpace;
      const ring = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: rt, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2 + 0.35; g.add(ring);
    }
    for (let i = 0; i < def.moonsVisual; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.14 + i * 0.03, 16, 12), new THREE.MeshStandardMaterial({ color: 0xcfcfcf }));
      m.userData.a = (i / def.moonsVisual) * Math.PI * 2; m.userData.r = 1.6 + i * 0.4; g.add(m);
    }
    const s = 0.42 + Math.min(1, def.vis.r / 3.5) * 0.36;
    g.scale.setScalar(s);
    $("#bSizeVal").textContent = def.vis.r < 1.2 ? "small" : def.vis.r < 2.5 ? "medium" : "GIANT";
  }
  function renderPreview() {
    if (!preview || !preview.running) return;
    const t = performance.now() * 0.001;
    preview.group.children.forEach((c) => {
      if (c.userData.r) { c.position.set(Math.cos(t * (1.2 - c.userData.r * 0.2) + c.userData.a) * c.userData.r, 0, Math.sin(t * (1.2 - c.userData.r * 0.2) + c.userData.a) * c.userData.r); }
      else if (c.geometry.type === "SphereGeometry") c.rotation.y = t * 0.4;
    });
    preview.renderer.render(preview.scene, preview.camera);
    requestAnimationFrame(renderPreview);
  }
  function stopPreview() { if (preview) preview.running = false; }
  function launchPlanet() {
    const def = builderDef();
    const custom = LS.get("sa.custom", []); custom.push(def); LS.set("sa.custom", custom);
    const b = SA.world.addBody(def, true);
    buildDock(); buildPassport(); closeOverlays();
    SA.audio.cheer(); burst(window.innerWidth / 2, window.innerHeight / 2, "🪐");
    toast(`🪐 ${def.name} joined the solar system!`);
    SA.speech.say(`${def.name} is born! Let's go visit it.`);
    goTo(b);
  }
  function removeCustom(id) {
    SA.rocket.takeOff();
    SA.world.removeBody(id);
    LS.set("sa.custom", LS.get("sa.custom", []).filter((d) => d.id !== id));
    state.stamps.delete(id); LS.set("sa.stamps", [...state.stamps]);
    buildDock(); buildPassport(); toast("💨 Poof! Planet removed.");
  }

  /* ============ Postcards of him ============ */
  let pcTimer;
  function landCaption(b) {
    const n = state.captain, p = b.def.name.replace("The ", "the ");
    const lines = {
      sun: `${n} is too cool for the Sun! 😎`, mercury: `${n} zooms on speedy Mercury!`, venus: `${n} is sweating on Venus! 🥵`,
      earth: `${n} is home sweet home! 🏠`, moon: `${n} is bouncing on the Moon! 🐇`, mars: `${n} says hi to the Mars robots! 🤖`,
      jupiter: `${n} vs the giant storm! 🌀`, saturn: `${n} is ring surfing on Saturn! 💍`, uranus: `${n} smells rotten eggs! 🥚😝`,
      neptune: `${n} is blown away on Neptune! 🌬️`, pluto: `${n} found Pluto's heart! 💗`,
    };
    return lines[b.def.id] || `${n} landed on ${p}!`;
  }
  function postcard(src, text, planetEmoji) {
    const pc = $("#postcard");
    $("#postcardImg").src = src;
    $("#postcardImg").classList.toggle("drawn", src.startsWith("data:image/svg"));
    $("#postcardText").textContent = text;
    $("#postcardPlanet").textContent = planetEmoji || "⭐";
    pc.classList.remove("show"); void pc.offsetWidth; pc.classList.add("show");
    clearTimeout(pcTimer); pcTimer = setTimeout(() => pc.classList.remove("show"), 4200);
  }

  /* ============ Confetti ============ */
  function burst(x, y, emoji = "⭐") {
    const layer = $("#confetti"); const pieces = ["⭐", "✨", "🌟", emoji, emoji];
    for (let i = 0; i < 22; i++) {
      const s = document.createElement("span"); s.className = "confetti"; s.textContent = pieces[i % pieces.length];
      const ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 160;
      s.style.left = x + "px"; s.style.top = y + "px";
      s.style.setProperty("--dx", Math.cos(ang) * dist + "px"); s.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      s.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
      layer.appendChild(s); setTimeout(() => s.remove(), 1100);
    }
  }

  /* ============ Per-frame: compass + minimap + buttons ============ */
  const mm = { ctx: null };
  function update(dt) {
    const r = SA.rocket;
    // Compass
    const comp = $("#compass");
    if (r.state === "landed") comp.hidden = true;
    else {
      let b = r.autoTarget, label = "";
      if (!b) { const n = SA.world.nearest(r.pos); b = n.body; label = `${b.def.emoji} ${b.def.name} · ${Math.max(0, Math.round(n.dist))} away`; }
      else label = `🚀 to ${b.def.emoji} ${b.def.name}`;
      comp.hidden = false;
      const theta = Math.atan2(b.pos.x - r.pos.x, b.pos.z - r.pos.z);
      const screen = theta - (SA.controls.cam.yaw + Math.PI);
      $("#compassArrow").style.transform = `rotate(${-90 - screen * 180 / Math.PI}deg)`;
      $("#compassText").textContent = r.outOfBounds ? "🧭 Turn around — nothing out there!" : label;
    }
    // Land button label
    const lb = $("#btnLand");
    if (r.state === "landed") lb.innerHTML = "🚀<small>Take off</small>";
    else { const n = SA.world.nearest(r.pos); lb.innerHTML = n.dist < 9 ? "🛬<small>Land</small>" : "🛬<small>Land</small>"; lb.classList.toggle("ready", n.dist < 9); }
    // Tour abandoned by manual flying?
    if (state.tour.active && r.state === "flying" && !r.autoTarget && SA.controls.input.anyManual) stopTour();
    drawMinimap();
  }
  function drawMinimap() {
    const cv = $("#minimap"); mm.ctx = mm.ctx || cv.getContext("2d");
    const ctx = mm.ctx, W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    const maxR = Math.max(150, ...SA.world.bodies.map((b) => b.orbitR + (b.parent ? b.parent.orbitR : 0))) + 12;
    const k = (W / 2 - 6) / maxR;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(5,2,30,.75)"; ctx.beginPath(); ctx.arc(cx, cy, W / 2 - 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1;
    SA.world.bodies.forEach((b) => {
      if (!b.orbitR || b.parent) return;
      ctx.beginPath(); ctx.arc(cx, cy, b.orbitR * k, 0, Math.PI * 2); ctx.stroke();
    });
    SA.world.bodies.forEach((b) => {
      const x = cx + b.pos.x * k, y = cy + b.pos.z * k;
      ctx.fillStyle = "#" + b.def.color.toString(16).padStart(6, "0");
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, b.r * k * (b.def.kind === "sun" ? 0.6 : 1.6)), 0, Math.PI * 2); ctx.fill();
      if (b === SA.rocket.autoTarget || (state.game.active && false)) { ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); }
    });
    // rocket
    const p = SA.rocket.pos, h = SA.rocket.heading;
    const x = cx + p.x * k, y = cy + p.z * k;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-h + Math.PI / 2);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-5, 4); ctx.lineTo(-3, 0); ctx.lineTo(-5, -4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  return { init, update, onTap, onKey, get labelsOn() { return state.labelsOn; }, goTo, toast };
})();
