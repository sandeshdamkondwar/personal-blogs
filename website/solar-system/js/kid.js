/* ⭐ Everything that makes this HIS adventure: name, cartoon photos, and a drawn astronaut version of him */
window.SA = window.SA || {};

SA.KID = {
  name: "",                       // default kid name (empty = ask on first visit). A link like ?kid=Swaraj presets it.
};

/* Bottom bar: follow / share on X */
SA.CTA = {
  xHandle: "sandydamy",
};

/* Photos are NEVER stored in the repo. A parent adds them in the browser (⚙️ Parent setup),
   they're cartoonified on the device and kept only in this browser's localStorage. */
SA.kidStore = (function () {
  const KEY = "sa.kid.photos", NKEY = "sa.kid.name";
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } };
  return {
    photos: () => get(KEY, []),                       // [{ sticker: dataURL, pose: dataURL }]
    savePhotos: (list) => set(KEY, list),
    name: () => {
      const fromLink = new URLSearchParams(location.search).get("kid");      // ?kid=Swaraj
      if (fromLink && fromLink.trim()) { const n = fromLink.trim().slice(0, 18); set(NKEY, n); return n; }
      return get(NKEY, "") || SA.KID.name || "";
    },
    saveName: (n) => set(NKEY, n),
  };
})();
SA.kidName = () => SA.kidStore.name() || "Astronaut";
SA.hasKidName = () => !!SA.kidStore.name();

/* Cartoon astronaut drawn to look like him: short black hair, big dark eyes, huge grin.
   mood: "grin" | "wow" | "cheer"   helmet: true/false */
SA.kidSVG = function ({ mood = "grin", helmet = true, wave = true } = {}) {
  const skin = "#8a573a", skinDark = "#6e4229", hair = "#17110d";
  const mouth = mood === "wow"
    ? `<ellipse cx="60" cy="76" rx="6" ry="7.5" fill="#3a1410"/><ellipse cx="60" cy="79" rx="4" ry="3" fill="#e0646e"/>`
    : `<path d="M45 70 Q60 92 75 70 Q60 75 45 70Z" fill="#3a1410"/>
       <path d="M46.5 70.6 Q60 74.5 73.5 70.6 L72.3 73.4 Q60 76.4 47.7 73.4Z" fill="#fff"/>
       <path d="M53 84 Q60 87.5 67 84 Q60 81.5 53 84Z" fill="#e0646e"/>`;
  const armL = mood === "cheer" ? `<path d="M30 116 Q14 98 16 82" stroke="#eef0f7" stroke-width="13" stroke-linecap="round" fill="none"/><circle cx="16" cy="80" r="7" fill="#ff6b9d"/>`
                                : `<path d="M30 118 Q18 132 22 146" stroke="#eef0f7" stroke-width="13" stroke-linecap="round" fill="none"/><circle cx="22" cy="147" r="7" fill="#ff6b9d"/>`;
  const armR = (wave || mood === "cheer") ? `<path d="M90 116 Q106 98 104 82" stroke="#eef0f7" stroke-width="13" stroke-linecap="round" fill="none"/><circle cx="104" cy="80" r="7" fill="#ff6b9d"/>`
                                          : `<path d="M90 118 Q102 132 98 146" stroke="#eef0f7" stroke-width="13" stroke-linecap="round" fill="none"/><circle cx="98" cy="147" r="7" fill="#ff6b9d"/>`;
  return `<svg viewBox="0 0 120 175" xmlns="http://www.w3.org/2000/svg" class="kid-svg">
  <!-- suit -->
  ${armL}${armR}
  <rect x="31" y="100" width="58" height="56" rx="20" fill="#eef0f7" stroke="#c9cde0" stroke-width="2"/>
  <rect x="44" y="114" width="32" height="20" rx="5" fill="#4361ee"/>
  <circle cx="52" cy="124" r="3.2" fill="#ffd166"/><circle cx="60" cy="124" r="3.2" fill="#ff6b9d"/><circle cx="68" cy="124" r="3.2" fill="#7bf1a8"/>
  <rect x="38" y="152" width="16" height="18" rx="6" fill="#d6d9e8"/><rect x="66" y="152" width="16" height="18" rx="6" fill="#d6d9e8"/>
  <!-- head -->
  <circle cx="31.5" cy="62" r="6.5" fill="${skin}"/><circle cx="88.5" cy="62" r="6.5" fill="${skin}"/>
  <circle cx="31.5" cy="62" r="3" fill="${skinDark}"/><circle cx="88.5" cy="62" r="3" fill="${skinDark}"/>
  <ellipse cx="60" cy="62" rx="28" ry="30" fill="${skin}"/>
  <!-- short black hair with a little front fringe -->
  <path d="M32 58 Q30 30 60 28 Q90 30 88 58 Q86 46 80 42 Q74 47 64 44 Q56 48 48 44 Q40 47 36 44 Q33 50 32 58Z" fill="${hair}"/>
  <path d="M48 44 Q52 38 57 45 M63 44 Q67 37 72 44" stroke="${hair}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- eyebrows + big dark eyes -->
  <path d="M42 50 Q48 46 54 49 M66 49 Q72 46 78 50" stroke="${hair}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="48.5" cy="59" rx="6" ry="6.8" fill="#1a0f0a"/><ellipse cx="71.5" cy="59" rx="6" ry="6.8" fill="#1a0f0a"/>
  <circle cx="50.5" cy="56.5" r="2.3" fill="#fff"/><circle cx="73.5" cy="56.5" r="2.3" fill="#fff"/>
  <circle cx="46.5" cy="61.5" r="1" fill="#fff"/><circle cx="69.5" cy="61.5" r="1" fill="#fff"/>
  <!-- nose + cheeks -->
  <path d="M57 66 Q60 69 63 66" stroke="${skinDark}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="39" cy="70" rx="5" ry="3" fill="#ff8a8a" opacity=".45"/><ellipse cx="81" cy="70" rx="5" ry="3" fill="#ff8a8a" opacity=".45"/>
  ${mouth}
  ${helmet ? `<!-- helmet -->
  <circle cx="60" cy="60" r="44" fill="rgba(160,220,255,.16)" stroke="#e8f4ff" stroke-width="4"/>
  <path d="M30 40 Q38 22 58 20" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".75"/>
  <circle cx="83" cy="30" r="3" fill="#fff" opacity=".8"/>
  <rect x="38" y="98" width="44" height="9" rx="4.5" fill="#c9cde0"/>` : ""}
</svg>`;
};

/* As an <img>-friendly data URL (for canvas textures) */
SA.kidSVGUrl = (opts) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SA.kidSVG(opts));
SA.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* Round "sticker" of the drawn astronaut face, used until real photos are added */
SA.kidFaceSVGUrl = function (ring = "#ffd166") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="#fff"/><circle cx="60" cy="60" r="57" fill="${ring}"/><circle cx="60" cy="60" r="53" fill="#2a1b6e"/>
  <g transform="translate(0,6)">${SA.kidSVG({ helmet: false }).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace(/<!-- suit -->[\s\S]*?<!-- head -->/, "")}</g></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};
SA.kidStickers = () => { const p = SA.kidStore.photos(); return p.length ? p.map((x) => x.sticker) : [SA.kidFaceSVGUrl("#ffd166"), SA.kidFaceSVGUrl("#ff6b9d"), SA.kidFaceSVGUrl("#4cc9f0")]; };
SA.kidPoses = () => { const p = SA.kidStore.photos(); return p.length ? p.map((x) => x.pose) : [SA.kidSVGUrl({ mood: "cheer" }), SA.kidSVGUrl({ mood: "grin" }), SA.kidSVGUrl({ mood: "wow" })]; };

/* Put his pictures everywhere marked data-kid="sticker|pose" with data-i */
SA.applyKidImages = function () {
  const st = SA.kidStickers(), po = SA.kidPoses();
  document.querySelectorAll("[data-kid]").forEach((el) => {
    const list = el.dataset.kid === "pose" ? po : st;
    el.src = list[(+el.dataset.i || 0) % list.length];
  });
  document.body.classList.toggle("has-photos", SA.kidStore.photos().length > 0);
};
