/* Reading aloud + listening for voice commands */
window.SA = window.SA || {};

SA.speech = (function () {
  const synth = window.speechSynthesis;
  let voice = null, enabled = true, onSpeakingChange = () => {}, ranked = [];

  /* Browsers ship anything from robotic to near-human voices. Rank them and pick the most natural. */
  const ROBOTIC = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|espeak)\b/i;
  function score(v) {
    const n = v.name.toLowerCase(); let s = 0;
    if (!/^en/i.test(v.lang)) return -1000;
    if (ROBOTIC.test(n)) s -= 200;
    if (/premium/.test(n)) s += 60;
    if (/natural|neural/.test(n)) s += 55;               // Edge / Windows "Online (Natural)" voices
    if (/enhanced/.test(n)) s += 45;
    if (/google/.test(n)) s += 30;                        // Chrome's cloud voices are smooth
    if (/\b(ava|zoe|samantha|allison|susan|serena|aria|jenny|sonia|libby|natasha|evan|nathan|tom)\b/.test(n)) s += 20;
    if (/en-in/i.test(v.lang)) s += 12;                   // Indian English, if a good one exists
    if (/en-(us|gb|au)/i.test(v.lang)) s += 6;
    if (v.localService === false) s += 5;
    if (v.default) s += 2;
    return s;
  }
  function pickVoice() {
    if (!synth) return;
    ranked = synth.getVoices().filter((v) => score(v) > -100).sort((a, b) => score(b) - score(a));
    let saved = null; try { saved = localStorage.getItem("sa.voice"); } catch (_) { }
    voice = ranked.find((v) => v.name === saved) || ranked[0] || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  /* Make text read like a person: no shouting ALL-CAPS, softer dashes, gentle sentence breaks */
  function humanize(text) {
    return SA.plainText(text)
      .replace(/\b([A-Z]{2,})\b/g, (w) => w.toLowerCase())
      .replace(/\s*[—–]\s*/g, ", ").replace(/\(([^)]*)\)/g, ", $1,").replace(/!+/g, "!").replace(/\s+/g, " ").trim();
  }

  function say(text, onEnd) {
    if (!synth || !enabled) { onEnd && setTimeout(onEnd, 400); return; }
    synth.cancel();
    // one utterance per sentence gives natural pauses (and avoids Chrome cutting long speech off)
    const parts = humanize(text).match(/[^.!?]+[.!?]*/g) || [text];
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p.trim());
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      const natural = voice && /premium|natural|neural|enhanced|google/i.test(voice.name);
      u.rate = natural ? 0.98 : 0.92; u.pitch = natural ? 1.05 : 1.12;
      if (i === 0) u.onstart = () => onSpeakingChange(true);
      if (i === parts.length - 1) u.onend = u.onerror = () => { onSpeakingChange(false); onEnd && onEnd(); };
      synth.speak(u);
    });
  }
  function stop() { if (synth) synth.cancel(); onSpeakingChange(false); }
  function setEnabled(on) { enabled = on; if (!on) stop(); }

  /* Cycle through the best few voices so a grown-up can pick the nicest one */
  function nextVoice() {
    if (!ranked.length) pickVoice();
    if (!ranked.length) return null;
    const top = ranked.slice(0, 8);
    const i = top.indexOf(voice);
    voice = top[(i + 1) % top.length];
    try { localStorage.setItem("sa.voice", voice.name); } catch (_) { }
    return voice.name;
  }
  const voiceName = () => (voice ? voice.name : "");

  /* ---- Voice commands ---- */
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false;
  function canListen() { return !!Rec; }
  function listen(onResult, onState) {
    if (!Rec) return false;
    if (listening) { rec.stop(); return true; }
    rec = new Rec();
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 3;
    rec.onstart = () => { listening = true; onState(true); };
    rec.onend = () => { listening = false; onState(false); };
    rec.onerror = () => { listening = false; onState(false); };
    rec.onresult = (e) => {
      const alts = [...e.results[0]].map((r) => r.transcript.toLowerCase());
      onResult(alts);
    };
    try { stop(); rec.start(); } catch (_) { return false; }
    return true;
  }

  return { say, stop, setEnabled, canListen, listen, nextVoice, voiceName, set onSpeaking(fn) { onSpeakingChange = fn; } };
})();
