// A research submersible crosses the open water of the Views from the Reef opening, a lamp lighting
// the water ahead. It is a rounded craft: a glass sphere at the bow, a teardrop hull behind it, a
// sail, fins and a ducted propeller, all turned or curved and none of it boxed. In the sphere sits
// the same agent that works through the homepage and the service cards, drawn by the same function
// in the same projection, in a pilot's seat, facing the way the craft is going, both hands on the yoke.
// It says where we are: not on the reef any more, but down where things have to be gone and looked at.
// The drawing is built as the cards build theirs, then painted to the canvas; all of it follows from time.
import { makeProjector, isoPrimitives, robotMarkup, PAPER, SHADE, GLASS, BLUE } from './thesis-cards.mjs?v=a4b692340dda';
import { tuckedElbows } from './service-figures.mjs?v=a4b692340dda';

const TAU = Math.PI * 2;
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const wrap = (value, span) => ((value % span) + span) % span;
const mix = (a, b, t) => a + (b - a) * t;
const hash = n => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return value - Math.floor(value); };

/** One pass every `cycle` seconds, taking `crossing` of them; the page opens with the craft already in view. */
export const SUBMERSIBLE = { cycle: 62, crossing: 44, lead: 13, still: 2, beam: 1.75, slope: 20 * Math.PI / 180 };
// The cards' paper, shade, glass and line, as they appear by lamplight at depth.
export const DEEP = { [PAPER]: '#16305A', [SHADE]: '#102648', [GLASS]: '#2A5596', [BLUE]: '#B4C5F4' };
// Its lines keep to the weight and the strength of the animals of this water, whatever size the craft
// is drawn at: the usual outline is the squid's and the fishes' strong line, a little over half a
// pixel, and far fainter than a card's ink. Only the lines are quietened; the shapes are as they were.
export const LINE = { weight: .58 / .9, least: .38, strength: .4 };
const BODY = new Set([DEEP[PAPER], DEEP[SHADE], DEEP[GLASS]]);

// The cards' projection, turned a little further side-on so the craft's length runs across the page.
const p = makeProjector({ originX: 0, originY: 0, centerX: 0, centerY: 0, angle: -28, scale: 1, pitch: .43 });
const iso = isoPrimitives(p);

// The craft in its own units. Its length runs along x with the bow at +x; y is across it, the near
// side at +y; z is up. Everything round is turned about the centreline, at the height AXIS.
const AXIS = 30;
export const CRAFT = { sphere: { centre: [5, 0, AXIS], radius: 25 }, bow: -15, stern: -112, girth: 20, floor: AXIS - 19, forward: [1, 0, 0] };
/** The hull's radius along its length: full behind the sphere, drawn in to a blunt tail. */
export const girth = x => { const t = clamp((CRAFT.bow - x) / (CRAFT.bow - CRAFT.stern)); return 3.6 + (CRAFT.girth - 3.6) * Math.sqrt(1 - t ** 2.4); };
// The pilot: the cards' agent at the size the sphere allows, seated so that its feet rest on the cabin floor.
const PILOT = { x: CRAFT.sphere.centre[0] - 2.5, y: 0, z: CRAFT.floor - 7.2, scale: 1, heading: Math.atan2(CRAFT.forward[0], CRAFT.forward[1]) };
const body = (across, ahead, up) => [
  PILOT.x + (Math.cos(PILOT.heading) * across + Math.sin(PILOT.heading) * ahead) * PILOT.scale,
  PILOT.y + (-Math.sin(PILOT.heading) * across + Math.cos(PILOT.heading) * ahead) * PILOT.scale, PILOT.z + up * PILOT.scale];
const LAMP = [19, 13, 7.6], MAST = [-52, 0, AXIS + 46], RUNNER = 13;
const MIDDLE = p(-42, 0, AXIS), SPAN = 190;

// Where the craft's length, width and height point on the page, and from them the two things a
// turned body needs: the angle round the centreline at which its underside meets its outline, and
// the angle round an upright at which its wall turns out of sight.
const ZERO = p(0, 0, 0), heading = point => { const q = p(...point); return [q[0] - ZERO[0], q[1] - ZERO[1]]; };
const ALONG = heading([1, 0, 0]), ACROSS = heading([0, 1, 0]), UP = heading([0, 0, 1]);
const square = ([x, y]) => y * ALONG[0] - x * ALONG[1];
const LIMB = Math.atan2(square(UP), square(ACROSS));
const turn = (rx, ry) => Math.atan2(ACROSS[0] / rx, ALONG[0] / ry);

function hull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const bend = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = list => { const out = []; for (const point of list) { while (out.length > 1 && bend(out.at(-2), out.at(-1), point) <= 0) out.pop(); out.push(point); } return out.slice(0, -1); };
  return [...half(sorted), ...half(sorted.reverse())];
}
const flat = (points, fill, extra = '') => iso.polygon(points.map(point => p(...point)), fill, extra);
const outline = points => hull(points.map(point => p(...point)));
// A ring round the centreline (or round a line beside it), and a level oval.
const around = (x, radius, { from = 0, to = TAU, count = 20, y = 0, z = AXIS } = {}) => Array.from({ length: count + 1 }, (_, i) => {
  const a = from + (to - from) * i / count; return [x, y + radius * Math.cos(a), z + radius * Math.sin(a)];
});
const oval = ([x, y, z], rx, ry = rx, { from = 0, to = TAU, count = 20 } = {}) => Array.from({ length: count + 1 }, (_, i) => {
  const a = from + (to - from) * i / count; return [x + rx * Math.cos(a), y + ry * Math.sin(a), z];
});
/** A body turned about the craft's length: lit from above, in shade along its belly, one clean outline. */
function turned(sections, { extra = 'stroke-width=".9"', lit = .7, y = 0, z = AXIS } = {}) {
  const from = LIMB + lit, whole = outline(sections.flatMap(([x, radius]) => around(x, radius, { count: 44, y, z })));
  const above = outline(sections.flatMap(([x, radius]) => around(x, radius, { from, to: from + Math.PI, count: 12, y, z })));
  return iso.polygon(whole, SHADE, 'stroke="none"') + iso.polygon(above, PAPER, 'stroke="none"') + iso.polygon(whole, 'none', extra);
}
/** An upright rounded body, narrowing or not: the part of its wall that faces forward is in shade. */
function upright(foot, height, [rx, ry], [tx, ty] = [rx, ry], extra = 'stroke-width=".8"') {
  const top = [foot[0], foot[1], foot[2] + height], edge = turn(rx, ry), whole = outline([...oval(foot, rx, ry), ...oval(top, tx, ty)]);
  const facing = [...oval(foot, rx, ry, { from: edge, to: edge + 1.05, count: 8 }), ...oval(top, tx, ty, { from: edge + 1.05, to: edge, count: 8 })];
  return iso.polygon(whole, PAPER, 'stroke="none"') + flat(facing, SHADE, 'stroke="none"') + flat(oval(top, tx, ty), PAPER, extra) + iso.polygon(whole, 'none', extra);
}
const tube = (a, b, radius, extra = 'stroke-width=".8"') => iso.polygon(hull([...p.sphereOutline(a, radius, 14), ...p.sphereOutline(b, radius, 14)]), PAPER, extra);
// A round window set into the hull's skin, so it curves with it.
const porthole = (x0, angle, radius) => Array.from({ length: 14 }, (_, i) => {
  const a = i * TAU / 14, x = x0 + radius * Math.cos(a), r = girth(x), q = angle + radius * Math.sin(a) / r; return [x, r * Math.cos(q), AXIS + r * Math.sin(q)];
});
// One of four tail fins, swept back from the hull to carry the propeller's duct.
const DUCT = { from: CRAFT.stern - 9, to: CRAFT.stern - 1, radius: 13.5 };
const FIN = [[-86, null], [-99, 23], [-102.5, 25], [-109.5, 25], [-113, 22.5], [DUCT.to, DUCT.radius], [-107, null]];
const fin = (cy, cz, fill) => flat(FIN.map(([x, out]) => { const d = out ?? girth(x) - 1; return [x, cy * d, AXIS + cz * d]; }), fill, 'stroke-width=".8"');
const strut = (x, side) => iso.planLine([[x, side * RUNNER, 5], [x, side * RUNNER * .8, AXIS - Math.sqrt(girth(x) ** 2 - (RUNNER * .8) ** 2) + .5]], 'stroke-width="1.2"');

/** Everything that never moves, in the order it is painted: far side first, near side last. */
export function craftMarkup() {
  const { sphere, bow, stern, floor } = CRAFT;
  const sections = Array.from({ length: 17 }, (_, i) => { const x = bow + (stern - bow) * (1 - (1 - i / 16) ** 2); return [x, girth(x)]; });
  // Under and behind the hull: the far runner, the two fins on the far side, and the propeller's duct.
  let behind = tube([-80, -RUNNER, 3], [-30, -RUNNER, 3], 2.6);
  for (const x of [-64, -36]) behind += strut(x, -1);
  behind += fin(-1, 0, SHADE) + fin(0, -1, SHADE);
  behind += turned([[DUCT.from, DUCT.radius], [DUCT.to, DUCT.radius]], { extra: 'stroke-width=".8"' }) + flat(around(DUCT.to, DUCT.radius - 1.4), SHADE, 'stroke-width=".7"');
  // The hull, its seams and windows, the two fins that show, and the sail with its hatch and mast.
  behind += turned(sections);
  for (const x of [-27, -80]) behind += iso.planLine(around(x, girth(x), { from: LIMB, to: LIMB + Math.PI, count: 16 }), 'stroke-width=".6" stroke-opacity=".5"');
  for (const x of [-38, -57]) behind += flat(porthole(x, .32, 4.2), GLASS, 'stroke-width=".75" fill-opacity=".75"');
  behind += fin(0, 1, PAPER) + fin(1, 0, PAPER);
  behind += upright([-47, 0, AXIS + 18], 13, [13, 6.5], [10.5, 5.2]);
  behind += flat(oval([-44.5, 0, AXIS + 31.05], 4.6, 2.4, { count: 14 }), SHADE, 'stroke-width=".6"');
  behind += iso.planLine([[MAST[0], 0, AXIS + 31], MAST], 'stroke-width="1"') + iso.planLine([[MAST[0], 0, MAST[2] - 5], [MAST[0] + 5.5, 0, MAST[2] - 5]], 'stroke-width=".7"');
  // The collar that holds the sphere, then the glass itself and the cabin inside it: floor and seat.
  behind += turned([[bow - 5.5, 21.4], [bow + .5, 21.4]], { extra: 'stroke-width=".85"' }) + flat(around(bow + .5, 21.4), SHADE, 'stroke-width=".7"');
  const rim = p.sphereOutline(sphere.centre, sphere.radius, 32), centre = p(...sphere.centre);
  behind += iso.polygon(rim, GLASS, 'fill-opacity=".34" stroke="none"');
  behind += flat(oval([sphere.centre[0], 0, floor], Math.sqrt(sphere.radius ** 2 - (AXIS - floor) ** 2) - .3), SHADE, 'stroke-width=".6" stroke-opacity=".7"');
  const seat = body(0, -.6, 17.8), back = body(0, -4.6, 0)[0];
  behind += flat([[back, 6.2, seat[2] - 1], ...Array.from({ length: 11 }, (_, i) => [back, 6.2 * Math.cos(i * Math.PI / 10), seat[2] + 12 + 5.5 * Math.sin(i * Math.PI / 10)]), [back, -6.2, seat[2] - 1]], PAPER, 'stroke-width=".7"');
  behind += iso.planLine([[seat[0], 0, floor], [seat[0], 0, seat[2] - 2]], 'stroke-width="1.6"');
  behind += upright([seat[0], 0, seat[2] - 2.2], 2.2, [5.6, 5.4], [5.6, 5.4], 'stroke-width=".7"');
  // In front of the pilot: the near glass with the light on it, then the near runner and the lamp.
  let ahead = iso.polygon(rim, GLASS, 'fill-opacity=".08" stroke-width="1.05"');
  ahead += `<path d="M${rim.slice(25, 30).map(([x, y]) => `${(centre[0] + (x - centre[0]) * .86).toFixed(2)},${(centre[1] + (y - centre[1]) * .86).toFixed(2)}`).join(' L')}" fill="none" stroke="#DCE6FF" stroke-width="1.3" stroke-opacity=".42"/>`;
  for (const x of [-64, -22]) ahead += strut(x, 1);
  ahead += tube([-80, RUNNER, 3], [LAMP[0] - 6, RUNNER, 3], 2.6);
  ahead += turned([[LAMP[0] - 6.5, 3], [LAMP[0], 3.7]], { y: LAMP[1], z: LAMP[2], extra: 'stroke-width=".8"' }) + flat(around(LAMP[0] + .05, 2.8, { y: LAMP[1], z: LAMP[2], count: 12 }), GLASS, 'stroke-width=".6"');
  return { behind, ahead };
}

// The scenes' markup uses a small vocabulary: filled polygons, straight paths and circles. Read it
// once into a list the canvas can paint, with each colour taken down to deep water.
const attribute = (text, name) => { const found = text.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`)); return found ? found[1] : undefined; };
const deep = colour => colour === undefined || colour === 'none' ? colour : DEEP[colour.toUpperCase()] || colour;
export function displayList(markup) {
  const items = [];
  for (const [, tag, text] of markup.matchAll(/<(polygon|path|circle)\b([^>]*?)\/?>/g)) {
    const item = { fill: deep(attribute(text, 'fill')), stroke: deep(attribute(text, 'stroke') ?? BLUE), width: Number(attribute(text, 'stroke-width') ?? .9),
      fillAlpha: Number(attribute(text, 'fill-opacity') ?? 1), strokeAlpha: Number(attribute(text, 'stroke-opacity') ?? 1) };
    if (tag === 'circle') item.circle = [Number(attribute(text, 'cx')), Number(attribute(text, 'cy')), Number(attribute(text, 'r'))];
    else {
      const numbers = (attribute(text, tag === 'polygon' ? 'points' : 'd') || '').match(/-?\d*\.?\d+(?:e-?\d+)?/g) || [];
      item.points = [];
      for (let i = 0; i + 1 < numbers.length; i += 2) item.points.push([Number(numbers[i]), Number(numbers[i + 1])]);
      item.closed = tag === 'polygon' || /Z\s*$/i.test(attribute(text, 'd') || '');
      if (tag === 'path' && item.fill === undefined) item.fill = 'none';
      if (item.points.length < 2) continue;
    }
    items.push(item);
  }
  return items;
}
const STILL_PARTS = (() => { const { behind, ahead } = craftMarkup(); return { behind: displayList(behind), ahead: displayList(ahead) }; })();

// The pilot sits square in its seat and steers: the yoke rocks a little one way and the other, and
// its hands go with it. The pose is held for a moment at a time, so the figure is built a few
// times a second and not on every frame.
const pilots = new Map();
export function pilotPose(time) {
  const beat = Math.round(time * 8) / 8, rock = Math.round((1.1 * Math.sin(beat * .7) + .5 * Math.sin(beat * 1.9 + 1)) * 8) / 8;
  const grip = body(0, 11.6, 25), column = [body(0, 14.2, 0)[0], 0, CRAFT.floor];
  return {
    beat, rock, heading: PILOT.heading, hips: body(0, 0, 18.2), seat: body(0, -.6, 17.8)[2],
    // Near hand, then far hand: one rises as the other falls.
    hands: [[grip[0], 4.6, grip[2] + rock], [grip[0], -4.6, grip[2] - rock]], yoke: [column, grip],
    feet: [body(-2.4, 9.2, 7.2), body(2.4, 9.2, 7.2)],
  };
}
/** The pilot as the cards would draw it: the shared agent, seated, hands on the yoke. */
export function pilotMarkup(time) {
  const pose = pilotPose(time);
  // The yoke stands between the pilot's knees: a column from the floor and a bar across its top.
  const yoke = iso.planLine(pose.yoke, 'stroke-width="1.5"') + iso.planLine([pose.hands[0], pose.yoke[1], pose.hands[1]], 'stroke-width="1.5"');
  return robotMarkup(p, { x: PILOT.x, y: PILOT.y, z: PILOT.z, scale: PILOT.scale, heading: PILOT.heading,
    leftTarget: pose.hands[0], rightTarget: pose.hands[1], footTargets: pose.feet, held: yoke, elbow: tuckedElbows });
}
function pilot(time) {
  const key = pilotPose(time).rock;
  if (!pilots.has(key)) {
    if (pilots.size > 48) pilots.clear();
    pilots.set(key, displayList(pilotMarkup(time)));
  }
  return pilots.get(key);
}

/** Where the craft is and whether it is in the water at this moment. */
export function submersiblePose(width, height, seconds = 0, { compact = width < 700, reducedMotion = false, screen } = {}) {
  const elapsed = Number(seconds), time = reducedMotion ? SUBMERSIBLE.still : Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const phase = wrap(time + SUBMERSIBLE.lead, SUBMERSIBLE.cycle), progress = phase / SUBMERSIBLE.crossing;
  const size = clamp(width / 1440, .66, 1.18), length = compact ? 172 : 290 * size, margin = length * .7;
  // It keeps to the open water between the navigation and the title, which sits at the foot of the
  // first screen: a little above the middle of that screen, with the slow rise and fall of a craft
  // trimming itself. `screen` is the height of the window; without it a usual laptop is assumed.
  const tall = Number.isFinite(screen) && screen > 0 ? screen : 800;
  const depth = Math.min(height * .2, clamp(tall * .36, compact ? 215 : 225, compact ? 300 : 340));
  const active = reducedMotion || phase <= SUBMERSIBLE.crossing;
  // The lamp comes up as the craft arrives and is dimmed before it leaves, so nothing appears or vanishes at once.
  const lit = reducedMotion ? 1 : smooth(phase / 3) * smooth((SUBMERSIBLE.crossing - phase) / 2.5);
  return {
    x: mix(width + margin, -margin, Math.min(progress, 1)), y: depth + 6 * Math.sin(time * .31 + .6) + 2 * Math.sin(time * .83 + 2),
    length, time, phase, progress, active, lit, compact,
    // Nose a touch down, as a craft holds itself when it is looking at the bottom.
    pitch: -.05 + .012 * Math.sin(time * .27 + 1.1) + .006 * Math.sin(time * .9),
    alpha: .92,
    // The whole drawing lies within this distance above and below its depth. The lamp beam reaches
    // furthest: its length down its slope, plus its spread, from a lamp at the craft's foot.
    reach: length * (.34 + SUBMERSIBLE.beam * (Math.sin(SUBMERSIBLE.slope + .12) + .25)) + 16,
  };
}

/** The craft, its pilot, its lamp beam and the water the beam lights. */
export function drawJournalSubmersible(ctx, width, height, seconds = 0, options = {}) {
  if (!ctx || !Number.isFinite(width + height) || width <= 0 || height <= 0) return;
  const pose = submersiblePose(width, height, seconds, options);
  if (!pose.active) return;
  const { viewport } = options;
  if (viewport && (pose.y + pose.reach < viewport.top || pose.y - pose.reach > viewport.bottom)) return;
  const { x, y, length, time } = pose, scale = length / SPAN, cos = Math.cos(pose.pitch), sin = Math.sin(pose.pitch);
  // The drawing faces right; the craft travels to the left, so it is mirrored about its middle.
  const place = ([px, py]) => { const u = px - MIDDLE[0], v = py - MIDDLE[1]; return [x - (u * cos - v * sin) * scale, y + (u * sin + v * cos) * scale]; };
  const at = point => place(p(...point));
  const paint = items => {
    for (const item of items) {
      ctx.beginPath();
      if (item.circle) { const centre = place(item.circle); ctx.arc(centre[0], centre[1], Math.max(.3, item.circle[2] * scale), 0, TAU); }
      else {
        const first = place(item.points[0]); ctx.moveTo(first[0], first[1]);
        for (let i = 1; i < item.points.length; i++) { const next = place(item.points[i]); ctx.lineTo(next[0], next[1]); }
        if (item.closed) ctx.closePath();
      }
      if (item.fill && item.fill !== 'none') { ctx.fillStyle = item.fill; ctx.globalAlpha = pose.alpha * item.fillAlpha; ctx.fill(); }
      if (item.stroke && item.stroke !== 'none') {
        // A stroke in a body colour is the gap an arm keeps from what is behind it, so it stays solid.
        ctx.strokeStyle = item.stroke; ctx.lineWidth = Math.max(LINE.least, item.width * LINE.weight);
        ctx.globalAlpha = pose.alpha * item.strokeAlpha * (BODY.has(item.stroke) ? 1 : LINE.strength); ctx.stroke();
      }
    }
  };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // The beam: a soft cone ahead and below, strongest at the lamp.
  const origin = at(LAMP), slope = SUBMERSIBLE.slope + .03 * Math.sin(time * .4) - pose.pitch;
  const aim = [-Math.cos(slope), Math.sin(slope)], across = [-aim[1], aim[0]], far = SUBMERSIBLE.beam * length;
  const along = (s, w) => [origin[0] + aim[0] * far * s + across[0] * far * s * w, origin[1] + aim[1] * far * s + across[1] * far * s * w];
  if (pose.lit > .01) {
    const end = along(1, 0), cones = [[.215, .03], [.165, .028], [.115, .032], [.07, .036], [.032, .042]];
    if (typeof ctx.createLinearGradient === 'function') {
      for (const [spread, strength] of cones) {
        const fade = ctx.createLinearGradient(origin[0], origin[1], end[0], end[1]);
        fade.addColorStop(0, `rgba(201,216,255,${(strength * pose.lit).toFixed(4)})`);
        fade.addColorStop(.55, `rgba(201,216,255,${(strength * pose.lit * .32).toFixed(4)})`);
        fade.addColorStop(1, 'rgba(201,216,255,0)');
        ctx.fillStyle = fade; ctx.globalAlpha = 1;
        const b = along(1, -spread), c = along(1, spread);
        ctx.beginPath(); ctx.moveTo(origin[0], origin[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath(); ctx.fill();
      }
    } else {
      // Without gradients, the same cones in steps.
      ctx.fillStyle = '#C9D8FF';
      for (const [spread, strength] of cones) for (let step = 0; step < 8; step++) {
        const from = step / 8, to = (step + 1) / 8;
        ctx.globalAlpha = strength * pose.lit * (1 - from) ** 1.6;
        ctx.beginPath();
        const a = along(from, -spread), b = along(to, -spread), c = along(to, spread), d = along(from, spread);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
      }
    }
    // Marine snow caught in the beam, drifting back past the craft.
    ctx.fillStyle = '#DCE6FF';
    for (let i = 0; i < (pose.compact ? 9 : 15); i++) {
      const s = wrap(hash(i * 13 + 5) - time * (.012 + hash(i * 13 + 6) * .01), 1) * .9 + .06, w = (hash(i * 13 + 7) * 2 - 1) * .18;
      const speck = along(s, w + .02 * Math.sin(time * .5 + i));
      ctx.globalAlpha = pose.lit * .5 * (1 - s) ** .7 * (1 - Math.abs(w) / .22);
      ctx.beginPath(); ctx.arc(speck[0], speck[1], .55 + hash(i * 13 + 8) * .6, 0, TAU); ctx.fill();
    }
  }

  // Far side, then the pilot inside the sphere, then the near side over them.
  paint(STILL_PARTS.behind);
  paint(pilot(time));
  paint(STILL_PARTS.ahead);

  // What moves on the craft: the propeller in its duct, and its lights.
  ctx.strokeStyle = DEEP[BLUE]; ctx.globalAlpha = pose.alpha * LINE.strength; ctx.lineWidth = Math.max(LINE.least, .85 * LINE.weight);
  ctx.beginPath();
  const hub = at([DUCT.to - .5, 0, AXIS]);
  for (let blade = 0; blade < 3; blade++) {
    const angle = time * 4.2 + blade * TAU / 3, tip = at([DUCT.to - .5, Math.cos(angle) * (DUCT.radius - 2.2), AXIS + Math.sin(angle) * (DUCT.radius - 2.2)]);
    ctx.moveTo(hub[0], hub[1]); ctx.lineTo(tip[0], tip[1]);
  }
  ctx.stroke();
  ctx.fillStyle = '#E3EBFF';
  const light = (point, radius, alpha) => { const centre = at(point); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(centre[0], centre[1], Math.max(.8, radius * scale), 0, TAU); ctx.fill(); };
  light([LAMP[0] + .1, LAMP[1], LAMP[2]], 1.6, .55 + .4 * pose.lit);
  light(MAST, 1.2, .55 + .35 * (Math.sin(time * 2.1) > .86 ? 1 : 0));
  // A few bubbles rise from the propeller and fall behind.
  ctx.strokeStyle = DEEP[BLUE]; ctx.lineWidth = .42;
  const stern = at([DUCT.from - 1, 0, AXIS + 4]);
  for (let i = 0; i < 6; i++) {
    const age = wrap(time * .3 + i / 6, 1);
    ctx.globalAlpha = .8 * LINE.strength * (1 - age);
    ctx.beginPath(); ctx.arc(stern[0] + (6 + age * 58) * scale + 3 * Math.sin(time * 1.3 + i * 2), stern[1] - age * 52 * scale - 3, (1 + 1.7 * age) * scale + .3, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
