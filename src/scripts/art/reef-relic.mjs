// A maker's mark on the reef. On the limestone slab at the front of the reef stands a carved stone,
// and on it a fragment of the Antikythera mechanism: the oldest known computing device, and one
// that was found on a seabed. Its wheels turn very slowly. The stone is signed as Greek craftsmen
// signed their work, with the maker's name and ΕΠΟΙΗΣΕΝ, "made this". Every seven seconds light
// passes over the letters. Nothing about the reef itself is moved to make room for it.
const TAU = Math.PI * 2;
const WATER = [12, 22, 48], PALE = [143, 165, 255], GOLD = [238, 206, 142], BRONZE = [206, 168, 106];
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

/** The signature, a line to each row of the stone, and how often and for how long the light crosses it. */
export const INSCRIPTION = { wide: ['ΚΙΕΡΑΝ ΑΥΡΕΣ', 'ΕΠΟΙΗΣΕΝ'], compact: ['ΚΙΕΡΑΝ', 'ΑΥΡΕΣ', 'ΕΠΟΙΗΣΕΝ'] };
export const SHIMMER_EVERY = 7, SHIMMER_LASTS = 1.5;

// Letters cut as plain strokes, each in a cell one unit high, set on a square grid as in a
// stoichedon inscription. A word break is marked with two points, as early inscriptions did.
const round = Array.from({ length: 13 }, (_, i) => [.37 + Math.cos(i * TAU / 12) * .37, .5 + Math.sin(i * TAU / 12) * .46]);
const GLYPHS = {
  'Κ': { width: .72, strokes: [[[0, 0], [0, 1]], [[.72, 1], [0, .48], [.72, 0]]] },
  'Ι': { width: .1, strokes: [[[.05, 0], [.05, 1]]] },
  'Ε': { width: .62, strokes: [[[.62, 1], [0, 1], [0, 0], [.62, 0]], [[0, .52], [.48, .52]]] },
  'Ρ': { width: .64, strokes: [[[0, 0], [0, 1], [.44, 1], [.64, .86], [.64, .64], [.44, .5], [0, .5]]] },
  'Α': { width: .8, strokes: [[[0, 0], [.4, 1], [.8, 0]], [[.15, .36], [.65, .36]]] },
  'Ν': { width: .7, strokes: [[[0, 0], [0, 1], [.7, 0], [.7, 1]]] },
  'Υ': { width: .76, strokes: [[[0, 1], [.38, .5], [.76, 1]], [[.38, .5], [.38, 0]]] },
  'Σ': { width: .66, strokes: [[[.66, 1], [0, 1], [.38, .5], [0, 0], [.66, 0]]] },
  'Π': { width: .7, strokes: [[[0, 0], [0, 1], [.7, 1], [.7, 0]]] },
  'Ο': { width: .74, strokes: [round] },
  'Η': { width: .7, strokes: [[[0, 0], [0, 1]], [[.7, 0], [.7, 1]], [[0, .5], [.7, .5]]] },
};

// The stone and the fragment, in units of the reef. The compact reef has a narrower slab, so its
// stone is taller and carries the signature on three lines.
const SHAPES = {
  wide: { outcrop: 2, along: .73, width: 72, depth: 20, height: 22, pitch: 5.4, cap: 5.5, leading: 2.4, plate: 1 },
  compact: { outcrop: 1, along: .5, width: 48, depth: 16, height: 28, pitch: 5.4, cap: 5.5, leading: 2.3, plate: .82 },
};
// The fragment's broken outline and its wheels, from its foot: [across, up].
const PLATE = [[-15, 0], [-17, 9.5], [-14.5, 18.5], [-16, 26.5], [-9, 31], [0, 29.5], [6, 31.5], [13, 28], [17, 19.5], [15, 11.5], [16.5, 4.5], [9, 0]];
const WHEELS = [
  { at: [.5, 16], radius: 10.2, teeth: 40, spokes: 4 }, { at: [9.6, 24.1], radius: 4.3, teeth: 18, spokes: 3 },
  { at: [-9.8, 8.1], radius: 3.6, teeth: 15, spokes: 3 }, { at: [-8.6, 24.7], radius: 5.2, teeth: 22, spokes: 3 },
];
// Age: a crack running in from the broken edge, and a few pits where the bronze has corroded.
const CRACK = [[17, 19.5], [12.4, 17.6], [10.8, 14.2], [6.6, 12.1]];
const PITS = [[-12.6, 15.4], [12.2, 6.3], [3.4, 27.2], [-4.6, 3.1], [13.1, 17.9]];
/** Seconds for the great wheel to turn once; the others turn against it, faster as they are smaller. */
export const WHEEL_TURNS_IN = 50;

function normal(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], length = Math.hypot(...n) || 1;
  return n.map(value => value / length);
}
// A flat outline in the plane facing the viewer, given thickness away from them.
function slab(name, material, outline, face, depth) {
  const count = outline.length, vertices = [], faces = [];
  for (const y of [face, face + depth]) for (const [x, z] of outline) vertices.push([x, y, z]);
  const centre = outline.reduce((sum, point) => [sum[0] + point[0] / count, sum[1] + point[1] / count], [0, 0]);
  const front = vertices.push([centre[0], face, centre[1]]) - 1, back = vertices.push([centre[0], face + depth, centre[1]]) - 1;
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    faces.push([i, next, front], [count + next, count + i, back], [i, count + i, next], [next, count + i, count + next]);
  }
  return { name, material, vertices, faces, nodes: [], coral: false, motion: false, subdivide: false, anchor: null,
    normals: faces.map(triangle => normal(...triangle.map(index => vertices[index]))) };
}

/**
 * Where the stone stands and everything drawn on it. `rocks` are the reef's limestone fragments:
 * the stone is seated on the existing slab at the front, sunk a little into its uneven top.
 */
export function reefRelic(rocks, compact = false) {
  const shape = SHAPES[compact ? 'compact' : 'wide'], rock = rocks.find(candidate => candidate.name === `Limestone outcrop ${shape.outcrop}`);
  if (!rock) return null;
  const [low, high] = rock.bounds, { width, depth, height } = shape;
  const x = low[0] + (high[0] - low[0]) * shape.along, y = (low[1] + high[1]) / 2, face = y - depth / 2;
  // The lowest part of the slab's top under the stone, so that it never floats over a dip.
  const under = rock.vertices.filter(([vx, vy, vz]) => Math.abs(vx - x) < width / 2 && Math.abs(vy - y) < depth / 2 && vz > high[2] - (high[2] - low[2]) * .45);
  const base = (under.length ? Math.min(...under.map(vertex => vertex[2])) : high[2] - (high[2] - low[2]) * .2) - 1.2;
  const left = x - width / 2, right = x + width / 2, top = base + height;
  // A squared block, a touch narrower at the top, with one corner broken away.
  const stone = [[left, base], [right, base], [right - .9, top - 5], [right - 6, top], [left + .9, top]];
  const scale = shape.plate, foot = top - .7, centre = x + (compact ? 0 : 3);
  const plate = PLATE.map(([across, up]) => [centre + across * scale, foot + up * scale]);
  const plateFace = face + depth * .42;
  // The signature, centred on the stone: every stroke of every letter, with where it sits across the stone.
  const lines = INSCRIPTION[compact ? 'compact' : 'wide'], { pitch, cap, leading } = shape, strokes = [];
  const block = lines.length * cap + (lines.length - 1) * leading, first = base + (height - block) / 2 + block - cap + .3;
  lines.forEach((line, row) => {
    const start = x - line.length * pitch / 2, baseline = first - row * (cap + leading);
    [...line].forEach((letter, column) => {
      const cell = start + column * pitch, middle = cell + pitch / 2;
      if (letter === ' ') {
        for (const up of [.3, .7]) strokes.push({ across: (middle - left) / width, points: [[middle - .28, baseline + cap * up], [middle + .28, baseline + cap * up]], point: true });
        return;
      }
      const glyph = GLYPHS[letter];
      if (!glyph) throw new Error(`No inscription letter for ${letter}`);
      const origin = middle - glyph.width * cap / 2;
      for (const stroke of glyph.strokes) strokes.push({ across: (middle - left) / width, points: stroke.map(([u, v]) => [origin + u * cap, baseline + v * cap]) });
    });
  });
  const onPlate = ([across, up]) => [centre + across * scale, foot + up * scale];
  const wheels = WHEELS.map(wheel => ({ ...wheel, at: onPlate(wheel.at), radius: wheel.radius * scale }));
  return {
    x, y, base, top, face, plateFace, width, depth, height, stone, plate, wheels, strokes, lines,
    crack: CRACK.map(onPlate), pits: PITS.map(onPlate), cap, baselines: lines.map((_, row) => first - row * (cap + leading)),
    bounds: [[Math.min(left, centre - 17 * scale), face, base], [Math.max(right, centre + 17 * scale), face + depth, foot + 31.5 * scale]],
    meshes: [slab('Carved stone', 'stele', stone, face, depth), slab('Mechanism fragment', 'bronze', plate, plateFace, 3 * scale)],
  };
}

/** How brightly a letter is lit, from 0 to 1, by where it sits across the stone (0 to 1) and the time. */
export function shimmer(seconds, across) {
  const since = ((seconds % SHIMMER_EVERY) + SHIMMER_EVERY) % SHIMMER_EVERY, band = .22;
  if (since >= SHIMMER_LASTS) return 0;
  const front = -band + since / SHIMMER_LASTS * (1 + 2 * band);
  return clamp(1 - Math.abs(across - front) / band) ** 2;
}
/** The angle of each wheel at a time: neighbours turn against the great wheel, in proportion. */
export function wheelAngles(relic, seconds) {
  const great = TAU * seconds / WHEEL_TURNS_IN;
  return relic.wheels.map((wheel, index) => index ? -great * relic.wheels[0].radius / wheel.radius : great);
}

/**
 * The fine work, drawn over the reef once its solids are painted: the stone's edges, the fragment
 * and its turning wheels, and the cut letters. Only straight strokes, so the still export can hold it.
 */
export function paintRelic(ctx, cam, relic, seconds = 0) {
  if (!relic) return;
  const stroke = (points, colour, alpha, width, y, closed = false) => {
    ctx.strokeStyle = mix(WATER, colour, alpha); ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach(([x, z], i) => { const p = cam.project([x, y, z]); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    if (closed) ctx.closePath();
    ctx.stroke();
  };
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // The stone: its face, and the edge of the side that turns towards the viewer.
  const { stone, face, depth } = relic, near = relic.x > 0 ? 0 : 1, corner = stone[near], upper = relic.x > 0 ? stone[4] : stone[2];
  stroke(stone, PALE, .62, .85, face, true);
  ctx.strokeStyle = mix(WATER, PALE, .4); ctx.lineWidth = .7; ctx.beginPath();
  for (const [x, z] of [corner, upper]) { const a = cam.project([x, face, z]), b = cam.project([x, face + depth, z]); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
  ctx.stroke();
  // The fragment, a crack across it, and its wheels.
  const front = relic.plateFace - .2;
  stroke(relic.plate, BRONZE, .78, .9, front, true);
  stroke(relic.crack, BRONZE, .5, .6, front);
  ctx.fillStyle = mix(WATER, BRONZE, .42);
  for (const [x, z] of relic.pits) { const pit = cam.project([x, front, z]); ctx.beginPath(); ctx.arc(pit.x, pit.y, .75, 0, TAU); ctx.fill(); }
  const angles = wheelAngles(relic, seconds);
  relic.wheels.forEach((wheel, index) => {
    const [cx, cz] = wheel.at, r = wheel.radius, turn = angles[index], tooth = Math.max(.7, r * .11);
    const sides = Math.max(18, wheel.teeth);
    const rim = Array.from({ length: sides }, (_, i) => [cx + Math.cos(i * TAU / sides) * r, cz + Math.sin(i * TAU / sides) * r]);
    stroke(rim, BRONZE, .8, .7, front, true);
    stroke(rim.map(([x, z]) => [cx + (x - cx) * .2, cz + (z - cz) * .2]), BRONZE, .7, .6, front, true);
    ctx.strokeStyle = mix(WATER, BRONZE, .7); ctx.lineWidth = .55; ctx.beginPath();
    const spoke = (angle, from, to) => {
      const a = cam.project([cx + Math.cos(angle) * from, front, cz + Math.sin(angle) * from]), b = cam.project([cx + Math.cos(angle) * to, front, cz + Math.sin(angle) * to]);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    };
    for (let i = 0; i < wheel.teeth; i++) spoke(turn + i * TAU / wheel.teeth, r, r + tooth);
    for (let i = 0; i < wheel.spokes; i++) spoke(turn + i * TAU / wheel.spokes, r * .2, r);
    ctx.stroke();
  });
  // The signature. Cut letters sit a little dim until the light crosses them.
  for (const cut of relic.strokes) {
    const light = shimmer(seconds, cut.across);
    stroke(cut.points, GOLD, .5 + .5 * light, (cut.point ? 1 : .8) + .45 * light, face - .15);
  }
  ctx.restore();
}
