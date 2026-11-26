// A research submersible crosses the open water of the Views from the Reef opening, a lamp lighting
// the water ahead. At its controls, behind the glass sphere, sits the same agent that works through
// the homepage and the service cards: it is drawn by the same function, in the same projection and
// with the same solid panels and clean outlines as those scenes, only in the colours of deep water.
// It says where we are: not on the reef any more, but down where things have to be gone and looked at.
// The drawing is built as the cards build theirs, then painted to the canvas; all of it follows from time.
import { makeProjector, isoPrimitives, robotMarkup, PAPER, SHADE, GLASS, BLUE } from './thesis-cards.mjs';
import { tuckedElbows } from './service-figures.mjs';

const TAU = Math.PI * 2;
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const wrap = (value, span) => ((value % span) + span) % span;
const mix = (a, b, t) => a + (b - a) * t;
const hash = n => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return value - Math.floor(value); };

/** One pass every `cycle` seconds, taking `crossing` of them; the page opens with the craft already in view. */
export const SUBMERSIBLE = { cycle: 62, crossing: 44, lead: 13, still: 2, beam: 2.3, slope: 20 * Math.PI / 180 };
// The cards' paper, shade, glass and line, as they appear by lamplight at depth.
export const DEEP = { [PAPER]: '#16305A', [SHADE]: '#102648', [GLASS]: '#2A5596', [BLUE]: '#B4C5F4' };

// The cards' projection, turned a little further side-on so the craft's length runs across the page.
const p = makeProjector({ originX: 0, originY: 0, centerX: 0, centerY: 0, angle: -30, scale: 1, pitch: .43 });
const iso = isoPrimitives(p);
// The pilot sits half turned towards the viewer, as the agents on the cards are seen, so its visor
// and the screen on its chest can be read through the glass.
const SPHERE = { centre: [4, 0, 27], radius: 25 }, PILOT = { x: 1, y: -1, z: 0, scale: 1, heading: Math.PI * .27 };
const FORWARD = [Math.sin(PILOT.heading), Math.cos(PILOT.heading)], RIGHT = [Math.cos(PILOT.heading), -Math.sin(PILOT.heading)];
const seated = (across, ahead, up) => [PILOT.x + RIGHT[0] * across + FORWARD[0] * ahead, PILOT.y + RIGHT[1] * across + FORWARD[1] * ahead, up];
const LAMP = [22.5, 19.5, 10.5], DUCTS = [[-95, -12.5, 26], [-95, 12.5, 26]];
const MIDDLE = p(-26, 0, 27), SPAN = 196;

const flat = (points, fill, extra = '') => iso.polygon(points.map(point => p(...point)), fill, extra);
// Circles: across the craft's length (a lens, the mouth of a duct), on its near side (a port), or lying level (a hatch).
const hoop = ([x, y, z], radius, count = 18) => Array.from({ length: count }, (_, i) => [x, y + Math.cos(i * TAU / count) * radius, z + Math.sin(i * TAU / count) * radius]);
const port = ([x, y, z], radius, count = 14) => Array.from({ length: count }, (_, i) => [x + Math.cos(i * TAU / count) * radius, y, z + Math.sin(i * TAU / count) * radius]);
const level = ([x, y, z], radius, count = 18) => Array.from({ length: count }, (_, i) => [x + Math.cos(i * TAU / count) * radius, y + Math.sin(i * TAU / count) * radius, z]);
function hull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = list => { const out = []; for (const point of list) { while (out.length > 1 && turn(out.at(-2), out.at(-1), point) <= 0) out.pop(); out.push(point); } return out.slice(0, -1); };
  return [...half(sorted), ...half(sorted.reverse())];
}
// A short duct lying along the craft: its body, then the rim of the mouth that faces forward.
const duct = ([x, y, z], radius, length) => iso.polygon(hull([...hoop([x, y, z], radius), ...hoop([x + length, y, z], radius)].map(point => p(...point))), PAPER, 'stroke-width=".8"')
  + flat(hoop([x + length, y, z], radius), SHADE, 'stroke-width=".8"') + flat(hoop([x + length, y, z], radius * .22, 8), BLUE, 'stroke="none"');
const pod = (y, length) => iso.box(-70, y, length, 7, 8, PAPER, PAPER, SHADE, 0, 'stroke-width=".85"')
  + iso.planLine([[-62, y + 7.05, 4], [-78 + length, y + 7.05, 4]], 'stroke-width=".6" stroke-opacity=".55"');

// Everything that never moves, in the order it is painted: far side first, near side last.
function craft() {
  // The far pod stops short of the sphere, so nothing shows through the glass but the pilot.
  let behind = pod(-23, 56) + duct(DUCTS[0], 7.5, 6);
  for (const x of [-58, -18]) behind += iso.planLine([[x, -19, 8], [x, -15, 12]], 'stroke-width="1.1"');
  // The hull: a pressure-proof body with its fairing, hatch, mast and a tail carrying the thrusters.
  behind += iso.box(-91, -9, 14, 18, 17, PAPER, PAPER, SHADE, 18, 'stroke-width=".85"');
  behind += iso.box(-78, -15, 64, 30, 32, PAPER, PAPER, SHADE, 10);
  behind += iso.planLine([[-78, 15.05, 26], [-14, 15.05, 26]], 'stroke-width=".6" stroke-opacity=".6"');
  for (const x of [-62, -46]) behind += flat(port([x, 15.05, 34], 4), GLASS, 'stroke-width=".75" fill-opacity=".7"');
  behind += iso.panelX(-34, 15.05, 30, 12, 7, PAPER, 'stroke-width=".6" stroke-opacity=".7"');
  for (const z of [32.3, 34.6]) behind += iso.planLine([[-32, 15.1, z], [-24.5, 15.1, z]], 'stroke-width=".55" stroke-opacity=".6"');
  behind += iso.box(-66, -9, 40, 18, 5, PAPER, PAPER, SHADE, 42, 'stroke-width=".85"');
  behind += flat(level([-50, 0, 47.05], 5.5), SHADE, 'stroke-width=".7"') + flat(level([-50, 0, 47.1], 2.2, 10), PAPER, 'stroke-width=".55"');
  behind += iso.planLine([[-34, 0, 47], [-34, 0, 66]], 'stroke-width="1"') + iso.planLine([[-34, 0, 60], [-27, 0, 60]], 'stroke-width=".7"');
  for (const y of [-9, 9]) behind += iso.planLine([[-64, y, 47], [-64, y, 51], [-30, y, 51], [-30, y, 47]], 'stroke-width=".65" stroke-opacity=".8"');
  // The sphere's far half, with the pilot's seat inside it.
  const rim = p.sphereOutline(SPHERE.centre, SPHERE.radius, 28);
  behind += iso.polygon(rim, GLASS, 'fill-opacity=".34" stroke-width=".9"');
  behind += flat(level(SPHERE.centre, SPHERE.radius, 28), 'none', 'stroke-width=".55" stroke-opacity=".4"');
  behind += flat(level([PILOT.x, PILOT.y, 5], 9, 16), SHADE, 'stroke-width=".7"') + iso.box(PILOT.x - 4.5, PILOT.y - 4.5, 9, 9, 12, PAPER, PAPER, SHADE, 5, 'stroke-width=".75"');
  // In front of the pilot: the near glass with its highlight, then the near pod, lamp and duct.
  let ahead = iso.polygon(rim, GLASS, 'fill-opacity=".08" stroke-width="1"');
  ahead += `<path d="M${rim.slice(15, 21).map(point => point.map(n => n.toFixed(2)).join(',')).join(' L')}" fill="none" stroke="${PAPER}" stroke-width="1.6" stroke-opacity=".5"/>`;
  for (const x of [-58, -18]) ahead += iso.planLine([[x, 19, 8], [x, 15, 12]], 'stroke-width="1.1"');
  ahead += pod(16, 88) + duct(DUCTS[1], 7.5, 6);
  ahead += iso.box(LAMP[0] - 6.5, 17, 6.5, 5, 5, PAPER, PAPER, SHADE, 8, 'stroke-width=".8"') + flat(hoop([LAMP[0] + .05, LAMP[1], LAMP[2]], 2, 10), GLASS, 'stroke-width=".6"');
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
const STILL_PARTS = (() => { const { behind, ahead } = craft(); return { behind: displayList(behind), ahead: displayList(ahead) }; })();

// The pilot, with a hand on each stick. Its hands ease the sticks about; the pose is kept for a moment
// at a time so the figure is built a few times a second, not on every frame.
const pilots = new Map();
export function pilotPose(time) {
  const beat = Math.round(time * 8) / 8, push = 1.1 * Math.sin(beat * .7) + .5 * Math.sin(beat * 1.9 + 1);
  // Left and right as the figure counts them: its left hand is on the side its `right` vector points away from.
  return { beat, hands: [seated(-5.6, 9.6 + push, 25.5), seated(5.6, 9.6 - push * .8, 25.5)], sticks: [seated(-5.6, 9.2, 13), seated(5.6, 9.2, 13)],
    feet: [seated(-2.4, 10.5, 5), seated(2.4, 10.5, 5)] };
}
/** The pilot as the cards would draw it: the shared agent, seated, hands on the sticks. */
export function pilotMarkup(time) {
  const pose = pilotPose(time);
  // Two control sticks rise in front of it, between its body and its arms.
  let sticks = '';
  pose.hands.forEach((hand, i) => { sticks += iso.planLine([pose.sticks[i], hand], 'stroke-width="1.3"'); });
  return robotMarkup(p, { ...PILOT, leftTarget: pose.hands[0], rightTarget: pose.hands[1], footTargets: pose.feet, held: sticks, elbow: tuckedElbows });
}
function pilot(time) {
  const key = pilotPose(time).hands[0][0].toFixed(2);
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
  const size = clamp(width / 1440, .66, 1.18), length = compact ? 150 : 250 * size, margin = length * .7;
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
    pitch: -.07 + .014 * Math.sin(time * .27 + 1.1) + .008 * Math.sin(time * .9),
    alpha: .92,
    // The whole drawing lies within this distance above and below its depth. The lamp beam reaches
    // furthest: its length down its slope, plus its spread, from a lamp at the craft's foot.
    reach: length * (.3 + SUBMERSIBLE.beam * (Math.sin(SUBMERSIBLE.slope + .12) + .25)) + 16,
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
      if (item.stroke && item.stroke !== 'none') { ctx.strokeStyle = item.stroke; ctx.lineWidth = Math.max(.5, item.width * scale); ctx.globalAlpha = pose.alpha * item.strokeAlpha; ctx.stroke(); }
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

  // What moves on the craft: a propeller in each duct, the folded arm at its bow, and its lights.
  ctx.strokeStyle = DEEP[BLUE]; ctx.globalAlpha = pose.alpha; ctx.lineWidth = Math.max(.6, .8 * scale);
  ctx.beginPath();
  for (const [dx, dy, dz] of DUCTS) for (let blade = 0; blade < 3; blade++) {
    const angle = time * 4.2 + blade * TAU / 3, hub = at([dx + 6, dy, dz]), tip = at([dx + 6, dy + Math.cos(angle) * 6.4, dz + Math.sin(angle) * 6.4]);
    ctx.moveTo(hub[0], hub[1]); ctx.lineTo(tip[0], tip[1]);
  }
  ctx.stroke();
  const ease = 1.6 * Math.sin(time * .35), joints = [[20, 9, 6], [33, 11, 15 + ease], [43, 10, 8 + ease * 1.5]].map(at);
  for (const [colour, weight] of [[DEEP[PAPER], 3.1], [DEEP[BLUE], 1.4]]) {
    ctx.strokeStyle = colour; ctx.lineWidth = Math.max(.7, weight * scale); ctx.beginPath();
    ctx.moveTo(joints[0][0], joints[0][1]); ctx.lineTo(joints[1][0], joints[1][1]); ctx.lineTo(joints[2][0], joints[2][1]); ctx.stroke();
  }
  ctx.lineWidth = Math.max(.6, 1.05 * scale); ctx.beginPath();
  for (const lift of [-2.4, 2.6]) { const jaw = at([47, 10, 8 + ease * 1.5 + lift]); ctx.moveTo(joints[2][0], joints[2][1]); ctx.lineTo(jaw[0], jaw[1]); }
  ctx.stroke();
  for (const joint of joints) { ctx.fillStyle = DEEP[PAPER]; ctx.beginPath(); ctx.arc(joint[0], joint[1], Math.max(.9, 1.6 * scale), 0, TAU); ctx.fill(); ctx.lineWidth = Math.max(.5, .95 * scale); ctx.stroke(); }
  ctx.fillStyle = '#E3EBFF';
  const light = (point, radius, alpha) => { const centre = at(point); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(centre[0], centre[1], Math.max(.8, radius * scale), 0, TAU); ctx.fill(); };
  light([LAMP[0] + .1, LAMP[1], LAMP[2]], 1.5, .55 + .4 * pose.lit);
  light([-34, 0, 66], 1.2, .55 + .35 * (Math.sin(time * 2.1) > .86 ? 1 : 0));
  // A few bubbles rise from the stern and fall behind.
  ctx.strokeStyle = DEEP[BLUE]; ctx.lineWidth = .55;
  const stern = at([-96, 0, 30]);
  for (let i = 0; i < 6; i++) {
    const age = wrap(time * .3 + i / 6, 1);
    ctx.globalAlpha = .5 * (1 - age);
    ctx.beginPath(); ctx.arc(stern[0] + (6 + age * 58) * scale + 3 * Math.sin(time * 1.3 + i * 2), stern[1] - age * 52 * scale - 3, (1 + 1.7 * age) * scale + .3, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
