/*
 * Word Snap colour routes (颜色路线): the colour a set earns.
 *
 * - Each set draws one route of seven hues (晚霞, 极光, 糖果, 果园, 海湾, 彩虹), in a
 *   random direction with a small hue nudge, never the same route twice in a row.
 * - A clean set keeps all seven colours; every miss takes one away, never below two.
 * - Colours arrive as the set goes on: the bar, the matched cards and the end ring
 *   only ever show the colours earned so far.
 * - Every colour is OKLCH at a fixed lightness per role, so the mix stays even and
 *   ink text stays readable on any of them (tests check the contrast).
 * - Home's goal card gathers today's routes: `today` keeps the day's sets (hues and
 *   how many colours each earned) for the mesh behind the card.
 *
 * Pure functions, no DOM; loaded as a classic script (WordSnapRoutes) and
 * as a CommonJS module for Node tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordSnapRoutes = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const lin = v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const gam = x => x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;

  function toLinRgb(L, C, h) {
    const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
  }
  const inGamut = c => c.every(v => v >= -1e-4 && v <= 1 + 1e-4);

  /** OKLCH → hex, lowering chroma until the colour fits sRGB. */
  function oklch(L, C, h) {
    let rgb = toLinRgb(L, C, h);
    if (!inGamut(rgb)) {
      let lo = 0, hi = C;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (inGamut(toLinRgb(L, mid, h))) lo = mid; else hi = mid;
      }
      rgb = toLinRgb(L, lo, h);
    }
    return "#" + rgb.map(v => Math.round(Math.min(1, Math.max(0, gam(v))) * 255).toString(16).padStart(2, "0")).join("");
  }

  /** Seven colours each, as hues. `hues: null` is the rainbow: an evenly spaced wheel from a random start. */
  const ROUTES = [
    { id: "dusk", zh: "晚霞", en: "Dusk", hues: [55, 28, 2, 335, 305, 275, 252] },
    { id: "aurora", zh: "极光", en: "Aurora", hues: [150, 172, 195, 222, 255, 292, 330] },
    { id: "candy", zh: "糖果", en: "Candy", hues: [355, 40, 95, 150, 200, 250, 305] },
    { id: "orchard", zh: "果园", en: "Orchard", hues: [22, 45, 75, 105, 135, 160, 190] },
    { id: "lagoon", zh: "海湾", en: "Lagoon", hues: [262, 232, 205, 180, 150, 60, 25] },
    { id: "rainbow", zh: "彩虹", en: "Rainbow", hues: null }
  ];
  const N_COLOURS = 7;

  /** A route for one set: a palette, a random direction and a nudge of hue, so no two sets look alike. */
  function pickRoute(rand = Math.random, avoid = "") {
    let r = ROUTES[Math.floor(rand() * ROUTES.length) % ROUTES.length];
    if (r.id === avoid) r = ROUTES[(ROUTES.indexOf(r) + 1 + Math.floor(rand() * (ROUTES.length - 1))) % ROUTES.length];
    const dir = rand() < 0.5 ? 1 : -1, nudge = (rand() - 0.5) * 20;
    const hues = r.hues
      ? (dir > 0 ? r.hues : [...r.hues].reverse()).map(h => h + nudge)
      : (start => Array.from({ length: N_COLOURS }, (_, i) => start + dir * i * 360 / N_COLOURS))(rand() * 360);
    return { id: r.id, zh: r.zh, en: r.en, hues: hues.map(h => Math.round(((h % 360) + 360) % 360 * 10) / 10) };
  }

  /** Lightness and chroma per use. Light roles carry ink text; `bar` and `text` are marks. */
  const ROLE = {
    bar: [0.74, 0.2], text: [0.55, 0.16], card: [0.9, 0.085], glow: [0.87, 0.12], mesh: [0.86, 0.13],
    barDark: [0.78, 0.17], textDark: [0.82, 0.12], cardDark: [0.4, 0.085], meshDark: [0.42, 0.1]
  };
  const colourOf = (hue, role = "bar") => oklch(ROLE[role][0], ROLE[role][1], hue);

  /** How many colours are in the mix: all seven for a clean set, one fewer per miss, never fewer than two. */
  const available = miss => Math.max(2, N_COLOURS - Math.max(0, miss | 0));
  /** How many have come in so far: they arrive as the set goes on. */
  function shown(got, total, miss) {
    const k = available(miss);
    if (!(total > 0)) return 1;
    return Math.max(1, Math.min(k, 1 + Math.round(got / total * (k - 1))));
  }
  /** The colour of the set's nth match (0-based): it walks the colours earned so far. */
  function matchHue(route, n, total, miss) {
    const k = shown(n + 1, total, miss);
    return route.hues[n % k];
  }

  /** CSS gradient stops through the first k hues, eased through OKLCH so the in-betweens stay bright. */
  function stops(hues, k = hues.length, role = "bar", loop = false) {
    const hs = hues.slice(0, Math.max(1, k));
    if (loop && hs.length > 1) hs.push(hs[0]);
    if (hs.length === 1) return `${colourOf(hs[0], role)} 0%, ${colourOf(hs[0], role)} 100%`;
    const out = [], seg = hs.length - 1;
    for (let i = 0; i < seg; i++) {
      let d = hs[i + 1] - hs[i];
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      for (let j = 0; j < 4; j++) out.push(`${colourOf(hs[i] + d * j / 4, role)} ${((i + j / 4) / seg * 100).toFixed(1)}%`);
    }
    out.push(`${colourOf(hs[seg], role)} 100%`);
    return out.join(", ");
  }

  // ---- Today's colours, for Home's goal card ----
  const MAX_SETS = 8;
  /** Today's sets from a stored value: only today's survive. */
  function today(stored, day) {
    if (!stored || stored.day !== day || !Array.isArray(stored.sets)) return { day, sets: [] };
    const sets = stored.sets
      .filter(s => s && Array.isArray(s.hues) && s.hues.every(Number.isFinite) && Number.isFinite(s.k))
      .slice(-MAX_SETS);
    return { day, sets };
  }
  /** Add a finished set: its route and how many colours it earned. */
  function addSet(stored, day, route, miss) {
    const t = today(stored, day);
    t.sets.push({ id: route.id, hues: route.hues.slice(0, N_COLOURS), k: available(miss) });
    t.sets = t.sets.slice(-MAX_SETS);
    return t;
  }
  /** Every colour today earned, in order. */
  const todayHues = t => t.sets.flatMap(s => s.hues.slice(0, s.k));

  const SPOTS = [[20, 24], [80, 18], [62, 76], [24, 80], [48, 46], [90, 56], [8, 50], [40, 12], [70, 36], [32, 62], [86, 86], [56, 94], [12, 30], [94, 30]];
  const hexA = (hex, a) => hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
  /**
   * Soft blobs of the colours earned; more progress (`p`, 0..1) makes them bigger and stronger.
   * `scale` grows the blobs for a whole screen (1 = a 340 px card); `floor` is the weakest alpha.
   */
  function mesh(hues, p, dark = false, { scale = 1, floor = 0.55 } = {}) {
    if (!hues.length) return "none";
    const role = dark ? "meshDark" : "mesh", q = Math.max(0, Math.min(1, p));
    const r = Math.round((70 + 60 * q) * scale), a = floor + (1 - floor) * q;
    return hues.slice(-SPOTS.length).map((h, i) => {
      const [x, y] = SPOTS[i], c = colourOf(h, role);
      return `radial-gradient(circle ${r}px at ${x}% ${y}%, ${hexA(c, a)} 0%, ${hexA(c, 0)} 100%)`;
    }).join(", ");
  }

  return { oklch, lin, ROUTES, N_COLOURS, ROLE, pickRoute, colourOf, available, shown, matchHue, stops, today, addSet, todayHues, mesh };
});
