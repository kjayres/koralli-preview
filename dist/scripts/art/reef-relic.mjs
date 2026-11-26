// A maker's mark on the reef, for those who look. A worn block of cut stone lies half buried in the
// sand, fallen against the limestone slab at the front of the reef. It is the same mesh and the same
// blue as the rock around it, so it reads as part of the seabed. A signature is cut into its face as
// Greek craftsmen signed their work, the maker's name and ΕΠΟΙΗΣΕΝ, "made this". The letters are
// shallow and still: faintly readable to someone who looks, and nothing that draws the eye. Nothing
// else in the reef is moved to make room for it.
import { reefFloorHeight } from './reef-terrain.mjs?v=6e3097a890fa';

const TAU = Math.PI * 2;
const WATER = [12, 22, 48], PALE = [143, 165, 255];
const blend = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgb = colour => `rgb(${colour.map(Math.round).join(',')})`;
const random = seed => { const value = Math.sin(seed * 91.73 + 17.19) * 41738.31; return value - Math.floor(value); };

/** The signature, a line to each row of the stone. */
export const INSCRIPTION = { wide: ['ΚΙΕΡΑΝ ΑΥΡΕΣ', 'ΕΠΟΙΗΣΕΝ'], compact: ['ΚΙΕΡΑΝ', 'ΑΥΡΕΣ', 'ΕΠΟΙΗΣΕΝ'] };
/** How visible a cut letter is, as a share of the reef's line colour: about as strong as the rock's own mesh. */
export const RESTING = .34;

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

// The block, in units of the reef: its size, how far it leans back against the slab, how it has
// turned and settled, and how deep it lies in the sand. The compact reef has a narrower slab, so
// its block is taller and carries the signature on three lines.
const SHAPES = {
  wide: { outcrop: 2, along: .66, width: 76, height: 27, thick: 13, lean: 16, turn: -4, settle: 3.2, buried: 4.5, columns: 8, pitch: 5.4, cap: 5.4, leading: 2.6 },
  compact: { outcrop: 1, along: .5, width: 50, height: 32, thick: 11, lean: 14, turn: 3, settle: -2.6, buried: 4, columns: 5, pitch: 5.4, cap: 5.4, leading: 2.3 },
};

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => { const length = Math.hypot(...a) || 1; return a.map(value => value / length); };
const normal = (a, b, c) => unit(cross(b.map((v, i) => v - a[i]), c.map((v, i) => v - a[i])));

/**
 * Where the block lies and everything cut into it. `rocks` are the reef's limestone fragments: the
 * block rests in the sand in front of the front slab and leans back against it.
 */
export function reefRelic(rocks, compact = false) {
  const shape = SHAPES[compact ? 'compact' : 'wide'], rock = rocks.find(candidate => candidate.name === `Limestone outcrop ${shape.outcrop}`);
  if (!rock) return null;
  const [low, high] = rock.bounds, { width, height, thick, buried } = shape, degrees = Math.PI / 180;
  const x = low[0] + (high[0] - low[0]) * shape.along;
  // The slab's face where the block meets it: the nearest the slab comes to the viewer along the block's width.
  const facing = rock.vertices.filter(vertex => Math.abs(vertex[0] - x) < width / 2);
  const slabFace = facing.length ? Math.min(...facing.map(vertex => vertex[1])) : low[1];
  // The block's own directions: along its width, up its face, and out of its face towards the viewer.
  const lean = shape.lean * degrees, turn = shape.turn * degrees, settle = shape.settle * degrees;
  const across = unit([Math.cos(turn), Math.sin(turn), Math.sin(settle)]);
  const upright = [0, Math.sin(lean), Math.cos(lean)], shared = upright.reduce((sum, v, i) => sum + v * across[i], 0);
  const rise = unit(upright.map((v, i) => v - across[i] * shared)), out = cross(across, rise);
  // Its top back edge rests just inside the slab; its foot lies below the sand.
  const y = slabFace + 1.5 - rise[1] * height + out[1] * thick;
  const foot = [x, y, reefFloorHeight(x, y / 3.1, compact) - buried];
  const at = (a, b, proud = 0) => [0, 1, 2].map(i => foot[i] + across[i] * (a - width / 2) + rise[i] * b + out[i] * proud);
  // A worn face: a grid whose edge is chipped, most at one upper corner, and whose surface is uneven.
  const columns = shape.columns, rows = 3, vertices = [], faces = [];
  const worn = (i, j) => {
    const seed = i * 17 + j * 131 + (compact ? 900 : 0), edge = i === 0 || i === columns || j === rows;
    let a = i / columns * width, b = j / rows * height;
    if (i === 0) a += .4 + random(seed) * 1.6;
    if (i === columns) a -= .4 + random(seed + 3) * 1.6;
    if (j === rows) b -= random(seed + 5) * 1.5;
    if (i === 0 && j === rows) { a += 3.2; b -= 3.4; }
    if (i === columns && j === rows) { a -= 1.2; b -= 1.4; }
    return { a, b, proud: edge ? -.5 - random(seed + 7) * .5 : (random(seed + 9) - .5) * .7 };
  };
  const index = (i, j, back = 0) => back * (columns + 1) * (rows + 1) + j * (columns + 1) + i;
  for (const back of [0, 1]) for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
    const { a, b, proud } = worn(i, j);
    vertices.push(at(a, b, back ? -thick - (random(i * 29 + j * 7) - .5) : proud));
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const a = index(i, j), b = index(i + 1, j), c = index(i, j + 1), d = index(i + 1, j + 1);
    // Alternate the diagonal so the face reads as broken stone and not as ruled paper.
    if ((i + j) % 2) faces.push([a, b, c], [b, d, c]); else faces.push([a, b, d], [a, d, c]);
  }
  for (let i = 0; i < columns; i++) faces.push([index(i, rows), index(i + 1, rows), index(i, rows, 1)], [index(i + 1, rows), index(i + 1, rows, 1), index(i, rows, 1)]);
  for (let j = 0; j < rows; j++) for (const i of [0, columns]) {
    const a = index(i, j), b = index(i, j + 1), c = index(i, j, 1), d = index(i, j + 1, 1);
    if (i) faces.push([a, c, b], [b, c, d]); else faces.push([a, b, c], [b, d, c]);
  }
  const mesh = { name: 'Signed stone', material: 'limestone', vertices, faces, nodes: [], coral: false, motion: false, subdivide: false, anchor: null,
    normals: faces.map(triangle => normal(...triangle.map(id => vertices[id]))) };
  // The signature, centred on the part of the face that stands clear of the sand.
  const lines = INSCRIPTION[compact ? 'compact' : 'wide'], { pitch, cap, leading } = shape, strokes = [];
  const block = lines.length * cap + (lines.length - 1) * leading, first = buried + 1.2 + (height - buried - 1.2 - block) / 2 + block - cap;
  const baselines = lines.map((_, row) => first - row * (cap + leading));
  lines.forEach((line, row) => {
    const start = width / 2 - line.length * pitch / 2, baseline = baselines[row];
    [...line].forEach((letter, column) => {
      const middle = start + column * pitch + pitch / 2;
      if (letter === ' ') {
        for (const up of [.3, .7]) strokes.push({ across: middle / width, point: true, points: [[middle - .28, baseline + cap * up], [middle + .28, baseline + cap * up]] });
        return;
      }
      const glyph = GLYPHS[letter];
      if (!glyph) throw new Error(`No inscription letter for ${letter}`);
      const origin = middle - glyph.width * cap / 2;
      for (const stroke of glyph.strokes) strokes.push({ across: middle / width, points: stroke.map(([u, v]) => [origin + u * cap, baseline + v * cap]) });
    });
  });
  const extent = axis => [Math.min(...vertices.map(vertex => vertex[axis])), Math.max(...vertices.map(vertex => vertex[axis]))];
  return {
    x, foot, width, height, thick, buried, lean, slabFace, lines, cap, baselines, strokes, meshes: [mesh],
    // A point on the face: across it from its left edge, up it from its foot, and proud of its surface.
    at, bounds: [[extent(0)[0], extent(1)[0], extent(2)[0]], [extent(0)[1], extent(1)[1], extent(2)[1]]],
  };
}

/**
 * The cut letters, drawn over the stone once the reef's solids are painted. Each is a shallow groove,
 * in shadow, with a faint lower edge that catches what light there is. They never move or change.
 * Only straight strokes, so the still export can hold it.
 */
export function paintRelic(ctx, cam, relic) {
  if (!relic) return;
  const trace = (points, dx = 0, dy = 0) => {
    ctx.beginPath();
    points.forEach(([a, b], i) => { const p = cam.project(relic.at(a, b, .8)); if (i) ctx.lineTo(p.x + dx, p.y + dy); else ctx.moveTo(p.x + dx, p.y + dy); });
    ctx.stroke();
  };
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const cut of relic.strokes) {
    ctx.strokeStyle = rgb(blend(WATER, PALE, .012)); ctx.lineWidth = cut.point ? 1.2 : 1;
    trace(cut.points);
    ctx.strokeStyle = rgb(blend(WATER, PALE, RESTING)); ctx.lineWidth = cut.point ? .85 : .6;
    trace(cut.points, .4, .45);
  }
  ctx.restore();
}
