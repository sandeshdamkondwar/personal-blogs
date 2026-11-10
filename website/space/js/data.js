/* Planet data — kid-friendly facts + real numbers used by the mini-labs */
window.SA = window.SA || {};

SA.BODIES = [
  {
    id: "sun", name: "The Sun", emoji: "☀️", color: 0xffc83d, kind: "sun",
    vis: { r: 9, orbit: 0 },
    real: { radiusKm: 696000, gravity: 27.9, yearDays: 0, dayHours: 609, moons: 0 },
    tag: "I'm a giant, hot, glowing STAR!",
    clue: "the big glowing star in the middle",
    welcome: "Whoa, it's hot here! Good thing our rocket has super heat shields.",
    facts: [
      ["⭐", "I'm not a planet — I'm a STAR! A giant ball of super-hot fire."],
      ["🔥", "I'm so big that one MILLION Earths could fit inside me!"],
      ["🌞", "My light and warmth help plants grow and keep you cozy."],
      ["🕗", "My light takes 8 minutes to zoom all the way to your house."],
      ["🚫", "Never look straight at me — I'm way too bright for your eyes!"],
      ["🎈", "Everything in the solar system goes round and round ME."],
    ],
  },
  {
    id: "mercury", name: "Mercury", emoji: "🪨", color: 0xbdb5ad, kind: "rocky",
    vis: { r: 1.0, orbit: 20 }, tilt: 0.03,
    real: { radiusKm: 2440, gravity: 0.38, yearDays: 88, dayHours: 1408, moons: 0 },
    tag: "I'm the smallest and the fastest!",
    clue: "the tiniest planet, closest to the Sun",
    welcome: "Welcome to Mercury! Careful — it's roasting in the day and freezing at night.",
    facts: [
      ["🏃", "I zoom around the Sun faster than ANY other planet — my year is only 88 days!"],
      ["🥵", "My days are super hot and my nights are freezing cold. Brrr!"],
      ["🌑", "I have no moons at all. I'm all alone!"],
      ["🕳️", "I'm covered in bumpy holes called craters, just like the Moon."],
      ["🤏", "I'm only a little bit bigger than Earth's Moon."],
    ],
  },
  {
    id: "venus", name: "Venus", emoji: "🌕", color: 0xf0c47a, kind: "venus",
    vis: { r: 1.55, orbit: 29 }, tilt: 3.1,
    real: { radiusKm: 6052, gravity: 0.91, yearDays: 225, dayHours: 5832, moons: 0 },
    tag: "I'm the HOTTEST planet of all!",
    clue: "the hottest planet, wrapped in thick yellow clouds",
    welcome: "Welcome to Venus! It's hotter than an oven under these clouds.",
    facts: [
      ["🌡️", "I'm hotter than an oven! Hot enough to melt metal."],
      ["☁️", "I'm wrapped in a thick, puffy blanket of yellow clouds."],
      ["🔄", "I spin BACKWARDS! On me, the Sun rises in the west."],
      ["🌟", "People call me the 'Evening Star' because I shine so bright in the sky."],
      ["🐌", "I spin so slowly that one of my days is longer than my whole year!"],
    ],
  },
  {
    id: "earth", name: "Earth", emoji: "🌍", color: 0x3fa7ff, kind: "earth",
    vis: { r: 1.65, orbit: 39 }, tilt: 0.41, clouds: true,
    real: { radiusKm: 6371, gravity: 1, yearDays: 365.25, dayHours: 24, moons: 1 },
    tag: "I'm YOUR home — the best planet ever!",
    clue: "our home — the blue and green planet",
    welcome: "Welcome home to Earth! Look at all that blue water.",
    facts: [
      ["🏠", "I'm the only planet where we know plants, animals and PEOPLE live!"],
      ["💧", "I'm mostly covered in water — that's why I look so blue."],
      ["🌙", "I have one Moon, and it follows me everywhere I go."],
      ["👌", "I'm not too hot and not too cold — just right for life!"],
      ["🔁", "I spin once every day, and that's why we have day and night."],
      ["🎂", "One trip around the Sun takes me a whole year — that's your birthday!"],
    ],
  },
  {
    id: "moon", name: "The Moon", emoji: "🌙", color: 0xd9d9d9, kind: "moon",
    vis: { r: 0.45, orbit: 3.6 }, parent: "earth", tilt: 0.1,
    real: { radiusKm: 1737, gravity: 0.166, yearDays: 27.3, dayHours: 708, moons: 0 },
    tag: "I'm Earth's best friend!",
    clue: "Earth's little grey Moon",
    welcome: "Welcome to the Moon! Bounce around — you're super light here.",
    facts: [
      ["👣", "Twelve astronauts have walked on me. Their footprints are still there!"],
      ["🤫", "I have no air, so there's no wind and no sound. Shhh."],
      ["🌗", "I look like I change shape, but I'm always round — you just see my sunny side."],
      ["🌊", "I pull on Earth's oceans and make the tides go in and out."],
      ["🐇", "On me you could jump six times higher than at home!"],
    ],
  },
  {
    id: "mars", name: "Mars", emoji: "🔴", color: 0xe5633b, kind: "mars",
    vis: { r: 1.2, orbit: 50 }, tilt: 0.44,
    real: { radiusKm: 3390, gravity: 0.38, yearDays: 687, dayHours: 24.6, moons: 2 },
    tag: "I'm the Red Planet!",
    clue: "the red, rusty planet",
    welcome: "Welcome to Mars! Everything is red and dusty. Say hi to the robots!",
    facts: [
      ["🟥", "I'm red because I'm covered in rusty dust, like an old bike!"],
      ["🤖", "Robot cars called rovers drive around on me, taking pictures."],
      ["🌋", "I have the TALLEST volcano in the whole solar system — Olympus Mons!"],
      ["🥔", "I have two tiny, lumpy moons shaped like potatoes."],
      ["🌪️", "Sometimes giant dust storms cover my whole body for weeks."],
      ["🧑‍🚀", "One day, astronauts might visit me. Maybe YOU!"],
    ],
  },
  {
    id: "jupiter", name: "Jupiter", emoji: "🟠", color: 0xe8a86b, kind: "gas",
    vis: { r: 4.6, orbit: 70 }, tilt: 0.05, spot: true,
    palette: ["#f7e3c4", "#dfb080", "#b9784a", "#f3d6ad", "#c98c5a", "#9c5c35", "#f6e0bf", "#d9a06e"],
    real: { radiusKm: 69911, gravity: 2.53, yearDays: 4333, dayHours: 9.9, moons: 95 },
    tag: "I'm the BIGGEST planet of all!",
    clue: "the biggest planet, with stripes and a big red spot",
    welcome: "Welcome to Jupiter! There's no ground — we're floating on clouds. Feel how heavy you are!",
    facts: [
      ["🐘", "I'm the biggest planet — more than 1,000 Earths could fit inside me!"],
      ["🌀", "That big red spot on me is a giant storm, bigger than Earth!"],
      ["💨", "I'm made of gas — there's no ground to stand on!"],
      ["🌙", "I have more than 90 moons. That's a LOT of moons!"],
      ["⚡", "I spin super fast — my day is only 10 hours long!"],
      ["🎨", "My stripes are made of swirling clouds in different colors."],
    ],
  },
  {
    id: "saturn", name: "Saturn", emoji: "🪐", color: 0xf0d59a, kind: "gas",
    vis: { r: 3.9, orbit: 92 }, tilt: 0.47,
    palette: ["#fbefd0", "#eed6a2", "#d9bb7a", "#f7e6bd", "#e4c98a", "#cfae6e"],
    ring: { inner: 1.22, outer: 2.32, color: "#e9d7ad", chunks: 2600 },
    real: { radiusKm: 58232, gravity: 1.07, yearDays: 10759, dayHours: 10.7, moons: 146 },
    tag: "Look at my beautiful rings!",
    clue: "the planet with big beautiful rings",
    welcome: "Welcome to Saturn! Look up — those rings are made of billions of ice chunks.",
    facts: [
      ["💍", "My rings are made of billions of pieces of ice and rock!"],
      ["🛁", "I'm so light that I could float in a giant bathtub!"],
      ["🌙", "I have more than 140 moons. One of them, Titan, has orange skies!"],
      ["📏", "My rings are super wide but thinner than a pancake."],
      ["🌬️", "My winds blow faster than any race car."],
    ],
  },
  {
    id: "uranus", name: "Uranus", emoji: "🧊", color: 0x9fe3f2, kind: "ice",
    vis: { r: 2.6, orbit: 112 }, tilt: 1.71,
    palette: ["#d8f6fb", "#b2ecf4", "#8fdde9", "#a9e9f1"],
    ring: { inner: 1.6, outer: 1.9, color: "#bfe9f5", thin: true },
    real: { radiusKm: 25362, gravity: 0.89, yearDays: 30687, dayHours: 17.2, moons: 28 },
    tag: "I roll on my side like a ball!",
    clue: "the blue-green planet that rolls on its side",
    welcome: "Welcome to Uranus! Hold your nose — it smells like rotten eggs here!",
    facts: [
      ["🤸", "I'm tipped over! I spin on my side, rolling like a ball."],
      ["🥶", "I'm the COLDEST planet — much colder than a freezer!"],
      ["💎", "Scientists think it might rain DIAMONDS inside me!"],
      ["🥚", "My clouds smell like rotten eggs. Pee-yew!"],
      ["🔭", "I was the first planet discovered with a telescope."],
    ],
  },
  {
    id: "neptune", name: "Neptune", emoji: "🔵", color: 0x3f6fe0, kind: "ice",
    vis: { r: 2.5, orbit: 130 }, tilt: 0.49,
    palette: ["#6f9cff", "#3f6fe0", "#2b55c9", "#4f7fe8", "#2f5bd0"],
    real: { radiusKm: 24622, gravity: 1.14, yearDays: 60190, dayHours: 16.1, moons: 16 },
    tag: "I'm the farthest and the windiest!",
    clue: "the deep-blue planet that's farthest from the Sun",
    welcome: "Welcome to Neptune! Hold on tight — the wind here is faster than a jet plane!",
    facts: [
      ["🏁", "I'm the farthest planet from the Sun. It's a looong trip to get here!"],
      ["🌬️", "I have the fastest winds in the whole solar system. Whoosh!"],
      ["🐢", "One of my years takes 165 Earth years. Nobody could have a birthday here!"],
      ["🧮", "People found me with MATH before anyone ever saw me!"],
      ["💙", "I'm deep blue, like the ocean on a sunny day."],
    ],
  },
  {
    id: "pluto", name: "Pluto", emoji: "💗", color: 0xe9c8b8, kind: "pluto",
    vis: { r: 0.6, orbit: 146 }, tilt: 2.1,
    real: { radiusKm: 1188, gravity: 0.063, yearDays: 90560, dayHours: 153, moons: 5 },
    tag: "I'm a tiny dwarf planet!",
    clue: "the tiny dwarf planet far, far away",
    welcome: "Welcome to Pluto! It's dark and icy out here, but look — a giant heart!",
    facts: [
      ["🤏", "I'm a DWARF planet — smaller than Earth's Moon!"],
      ["💗", "I have a giant heart shape on me! Awww."],
      ["❄️", "I'm made of ice and rock, and it's always freezing."],
      ["👧", "An 11-year-old girl named me after a Roman god. (Not the Disney dog!)"],
      ["🚀", "A spaceship called New Horizons flew past me and took my picture."],
    ],
  },
];

/* Real-size mode: radii relative to Earth = 1 (Sun is capped so it fits on screen) */
SA.REAL_SCALE = { sun: 16, mercury: 0.38, venus: 0.95, earth: 1, moon: 0.27, mars: 0.53,
  jupiter: 11.2, saturn: 9.4, uranus: 4.0, neptune: 3.9, pluto: 0.19 };

/* Little helpers used by UI */
SA.bodyById = (id) => SA.BODIES.find((b) => b.id === id);
SA.plainText = (s) => s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();

/* Real planet photo maps. Files live in img/planets/ (Solar System Scope, CC BY 4.0, based on NASA data).
   Anything listed here but missing simply falls back to the painted procedural texture. */
SA.REAL_TEXTURES = {
  mercury: "2k_mercury.jpg", venus: "2k_venus_atmosphere.jpg", earth: "2k_earth_daymap.jpg", earth_clouds: "2k_earth_clouds.jpg",
  moon: "2k_moon.jpg", mars: "2k_mars.jpg", jupiter: "2k_jupiter.jpg", saturn: "2k_saturn.jpg", saturn_ring: "2k_saturn_ring_alpha.png",
  uranus: "2k_uranus.jpg", neptune: "2k_neptune.jpg",
};
