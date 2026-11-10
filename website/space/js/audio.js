/* Tiny synthesized sounds — no audio files needed */
window.SA = window.SA || {};

SA.audio = (function () {
  let ctx = null, enabled = true, engine = null, engineGain = null;

  function ensure() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { ctx = null; }
    return ctx;
  }
  function unlock() { const c = ensure(); if (c && c.state === "suspended") c.resume(); }

  function blip(freq = 440, dur = 0.25, type = "sine", vol = 0.12) {
    const c = ensure(); if (!c || !enabled) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, c.currentTime + dur * 0.5);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  function cheer() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.3, "triangle", 0.15), i * 110)); }
  function land() { blip(330, 0.35, "triangle", 0.15); setTimeout(() => blip(440, 0.4, "triangle", 0.15), 150); }
  function oops() { blip(220, 0.3, "sawtooth", 0.06); setTimeout(() => blip(180, 0.35, "sawtooth", 0.06), 120); }
  function tick() { blip(900, 0.08, "square", 0.04); }

  /* Rocket engine rumble: filtered noise whose loudness follows the thrust */
  function startEngine() {
    const c = ensure(); if (!c || engine) return;
    const size = c.sampleRate * 2;
    const buf = c.createBuffer(1, size, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
    engine = c.createBufferSource(); engine.buffer = buf; engine.loop = true;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320;
    engineGain = c.createGain(); engineGain.gain.value = 0;
    engine.connect(lp).connect(engineGain).connect(c.destination);
    engine.start();
  }
  function setThrust(t) {
    if (!engineGain) return;
    const target = enabled ? Math.min(0.35, t * 0.35) : 0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
  }
  function setEnabled(on) { enabled = on; if (!on) setThrust(0); }
  const isEnabled = () => enabled;

  return { unlock, blip, cheer, land, oops, tick, startEngine, setThrust, setEnabled, isEnabled };
})();
