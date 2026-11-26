import { makeProjector, isoPrimitives, human3DMarkup, robotMarkup, PAPER, SHADE, GLASS, BLUE, CORAL } from './thesis-cards.mjs?v=1fbc42b90f09';
import { tuckedElbows } from './service-figures.mjs?v=1fbc42b90f09';

// Redesign workflows for people and agents: the work-flow as real pipework. A planner points out
// the gap, the robot fits the missing section, a person throws the valve lever, and the flow runs
// through to the tank. Everything is derived from the phase, so any moment can be drawn again exactly.
const TAU = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => a.map((value, i) => mix(value, b[i], t));
const during = (time, [start, end]) => smooth((time - start) / (end - start));
// The same camera angle as the other service cards, a touch closer, as for the van beside it.
const p = makeProjector({ originX: 280, originY: 212, centerX: 100, centerY: 83, angle: -14, scale: 2.05, pitch: .43 });
const iso = isoPrimitives(p);
const SPLIT = '<!--service-hands-->';
// Hard hats take the one warm accent the homepage cards already use, for the welder's sparks,
// with a deeper tone for the brim and the side of the shell turned away from the light.
const HAT = '#FFD166', HAT_SHADE = '#EDB44A';

/** One loop, in sixteenths of a second, and the moment that stands for the scene when it is still. */
export const FLOW_STEPS = 256, FLOW_STILL = .56;
const LOOP = FLOW_STEPS / 16;

// The run: a standpipe with the valve at its head, an open gap for the missing section, then up a
// riser and over to a spout above the tank.
const Y = 90, Z = 20, R = 2.8;
const VALVE = 66, STUB = 88, JOIN = 116, RISER = 144.5, TOP = 40, ELBOW = 160, SPOUT = 35.4;
const TANK = { x: ELBOW - 12, y: Y - 12, w: 24, d: 24, h: 31, low: 8, high: 19 };
// The lever stands on the valve and is pulled down towards the person at the head of the line.
const PIVOT = [VALVE, Y, Z + 5.2], THROW = 55 * Math.PI / 180, GRIPS = [10, 12.6], LEVER = 14.2;
const SECTION = { x: (STUB + JOIN) / 2, half: (JOIN - STUB) / 2 - .4, grip: 7, carry: [9.5, 27] };
// The plan: a sheet held out in front of the planner, its far edge raised towards its reader.
const PLAN = { reach: 8.8, height: 27.4, tilt: 35 * Math.PI / 180, across: 6.2, along: 4.5 };

/** Who stands where. Tests use these to check that every hand stays within reach. */
export const FLOW_CAST = {
  robot: { x: SECTION.x, near: Y - 14, far: Y - 19, scale: 1, heading: 0 },
  operator: { id: 'flow-operator', x: VALVE - 15, y: Y, scale: 1.03, heading: Math.PI / 2, stride: -.3 },
  planner: { id: 'flow-planner', x: 46, y: 130, scale: 1.03, heading: 2.235, lean: .4 },
};

// Seconds within the loop. The robot seats the section and steps clear before the valve is opened.
const WALK_IN = [0, 1.4], SEAT = [1.4, 2.6], RELEASE = [2.6, 3.3], STEP_BACK = [3.3, 4.5];
const OPEN = [3.7, 5], CLOSE = [10.2, 11.4], SPEED = 40;
// Water travels the pipe: distances are measured along its centre line from the foot of the standpipe.
const COURSE = [[VALVE, Y, .6], [VALVE, Y, Z], [RISER, Y, Z], [RISER, Y, TOP], [ELBOW, Y, TOP], [ELBOW, Y, SPOUT]];
const MARKS = COURSE.reduce((marks, point, i) => [...marks, i ? marks[i - 1] + Math.hypot(...point.map((v, k) => v - COURSE[i - 1][k])) : 0], []);
const AT_VALVE = MARKS[1], AT_RISER = MARKS[3], LENGTH = MARKS.at(-1), REACH = LENGTH - AT_VALVE;
const passed = time => {
  const [o0, o1] = OPEN, [c0, c1] = CLOSE, opening = o1 - o0, closing = c1 - c0;
  if (time <= o0) return 0;
  if (time < o1) { const u = (time - o0) / opening; return SPEED * opening * (u ** 3 - u ** 4 / 2); }
  if (time <= c0) return SPEED * (opening / 2 + time - o1);
  const w = clamp((time - c0) / closing);
  return SPEED * (opening / 2 + c0 - o1 + closing * (w - w ** 3 + w ** 4 / 2));
};
// Once the valve shuts, what is already in the pipe runs on to the spout.
const drained = time => {
  const [c0, c1] = CLOSE, closing = c1 - c0;
  if (time <= c0) return 0;
  if (time < c1) { const w = (time - c0) / closing; return SPEED * closing * (w ** 3 - w ** 4 / 2); }
  return SPEED * (closing / 2 + time - c1);
};
const POUR_FROM = OPEN[1] + (REACH - SPEED * (OPEN[1] - OPEN[0]) / 2) / SPEED;
const DRY_AT = CLOSE[1] + (REACH - SPEED * (CLOSE[1] - CLOSE[0]) / 2) / SPEED;
const BEADS = 20, BEAD_GAP = passed(LOOP) / BEADS, GRAVITY = 170;
// The fitted section fades from the dry pipe as the next one appears in the robot's hands.
const LIFT_OUT = [DRY_AT + .15, DRY_AT + .9], NEXT_ARMS = [DRY_AT + .35, DRY_AT + 1.25], NEXT_IN = [DRY_AT + .7, DRY_AT + 1.4];
const DRIP = { forms: DRY_AT + 1.1, falls: DRY_AT + 2, lands: DRY_AT + 2 + Math.sqrt(2 * (Z - R - 1.2) / GRAVITY) };

const local = ({ x, y, scale, heading }, u, v, h) => [
  x + (Math.cos(heading) * u + Math.sin(heading) * v) * scale,
  y + (-Math.sin(heading) * u + Math.cos(heading) * v) * scale,
  h * scale,
];
const leverPoint = (angle, length) => [PIVOT[0] - Math.sin(angle) * length, Y, PIVOT[2] + Math.cos(angle) * length];
// A point on the plan: `u` across it towards the planner's right, `v` up its slope away from them.
function planPoint(u, v, lift = 0) {
  const { planner } = FLOW_CAST, cos = Math.cos(PLAN.tilt), sin = Math.sin(PLAN.tilt);
  return local(planner, u, PLAN.reach + planner.lean * .35 + v * cos - lift * sin, PLAN.height + v * sin + lift * cos);
}

const timeAt = phase => (((phase % 1) + 1) % 1) * LOOP;

/**
 * The physical state at one moment: where each figure, hand and part is, and where the water has got to.
 * `section` is the one the robot handles; after it lets go, that is the next one, which is not yet visible.
 * `front` and `tail` are distances along the pipe, and both rest at the valve when no water is beyond it.
 */
export function flowPose(phase) {
  const time = timeAt(phase);
  const { robot, planner } = FLOW_CAST;
  // Robot: one step in with the section, seat it, let go, and one step back to give the valve room.
  const robotY = mix(robot.far, robot.near, during(time, WALK_IN) - during(time, STEP_BACK));
  const robotStride = .6 * Math.sin((robotY - robot.far) / (robot.near - robot.far) * Math.PI);
  // The section in hand is lowered into the gap. Once the robot lets go, the one it handles is the next.
  const seated = time < RELEASE[1] ? during(time, SEAT) : 0;
  const carried = [SECTION.x, robotY + SECTION.carry[0], SECTION.carry[1]];
  const section = mix3(carried, [SECTION.x, Y, Z], seated);
  const holding = 1 - during(time, RELEASE) + during(time, NEXT_ARMS);
  const robotHands = [-1, 1].map(side => {
    const grip = [section[0] + side * SECTION.grip, section[1] - R - .7, section[2]];
    // Free hands hang at its sides, behind the run, and rise the same way to take the next section.
    return mix3([robot.x + side * 7.4, robotY + 5, 13.5], grip, smooth(holding));
  });
  // Operator: both hands stay on the lever. They reach forward to it and lean back as it comes down.
  const open = during(time, OPEN) - during(time, CLOSE);
  const lever = THROW * open;
  const operatorLean = mix(1.8, -.4, open);
  // Planner: both hands hold the plan; the near hand leaves it to point out the gap while the section goes in.
  const pointing = 1 - during(time, [2.4, 3.2]) + during(time, [LOOP - .9, LOOP - .2]);
  const nearShoulder = local(planner, -4.25, planner.lean * .92, 33.5);
  const aim = [SECTION.x, Y, Z + 2].map((value, i) => value - nearShoulder[i]);
  const aimLength = Math.hypot(...aim);
  const planNear = mix3(planPoint(-PLAN.across, -.4), nearShoulder.map((value, i) => value + aim[i] / aimLength * 14.3 * planner.scale), pointing);
  // Water: a front that leaves the valve as it opens, and a tail that runs off after it shuts.
  const dry = time < OPEN[0] || time >= DRY_AT;
  const front = dry ? AT_VALVE : Math.min(LENGTH, AT_VALVE + passed(time));
  const tail = dry ? AT_VALVE : Math.min(LENGTH, AT_VALVE + drained(time));
  const pouring = time >= POUR_FROM && time < DRY_AT ? 1 : 0;
  const level = pouring
    ? mix(TANK.low, TANK.high, (time - POUR_FROM) / (DRY_AT - POUR_FROM))
    : mix(TANK.high, TANK.low, ((time - DRY_AT + LOOP) % LOOP) / (LOOP - DRY_AT + POUR_FROM));
  return {
    robotY, robotStride, robotHold: clamp(holding), robotLeft: robotHands[0], robotRight: robotHands[1],
    section, seated, carriedOpacity: time < SEAT[1] ? 1 : during(time, NEXT_IN),
    fittedOpacity: time < SEAT[1] ? 0 : 1 - during(time, LIFT_OUT),
    open, lever, operatorLean, operatorNear: leverPoint(lever, GRIPS[1]), operatorFar: leverPoint(lever, GRIPS[0]),
    planNear, planFar: planPoint(PLAN.across, -.4), front, tail, pouring, level,
  };
}

// ---------------------------------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------------------------------
const LINE = `stroke="${BLUE}" stroke-width=".85"`;
function hull(points) {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = input => {
    const out = [];
    for (const point of input) {
      while (out.length > 1 && turn(out.at(-2), out.at(-1), point) <= 0) out.pop();
      out.push(point);
    }
    return out;
  };
  return [...half(sorted).slice(0, -1), ...half(sorted.reverse()).slice(0, -1)];
}
// A circle across a pipe that runs along one axis.
function ring(centre, axis, radius, count = 16) {
  const [u, v] = [0, 1, 2].filter(i => i !== axis);
  return Array.from({ length: count }, (_, i) => {
    const point = [...centre];
    point[u] += Math.cos(i * TAU / count) * radius; point[v] += Math.sin(i * TAU / count) * radius;
    return p(...point);
  });
}
// A length of pipe between two points on one axis. The end facing the viewer is closed with a cap,
// or shown as an open bore.
function tube(a, b, radius = R, { bore = false, extra = LINE } = {}) {
  const axis = [0, 1, 2].find(i => a[i] !== b[i]);
  const near = a[axis] > b[axis] ? a : b;
  let out = iso.polygon(hull([...ring(a, axis, radius), ...ring(b, axis, radius)]), PAPER, extra);
  out += iso.polygon(ring(near, axis, radius), PAPER, extra);
  if (bore) out += iso.polygon(ring(near, axis, radius - .95), GLASS, `stroke="${BLUE}" stroke-width=".6" stroke-opacity=".7"`);
  return out;
}
const flange = (x, width = 1.5) => tube([x, Y, Z], [x + width, Y, Z], R + 1.3);
const ball = (centre, radius) => iso.polygon(p.sphereOutline(centre, radius, 18), PAPER, LINE);
const post = x => iso.box(x - 1.1, Y - 1.1, 2.2, 2.2, Z - R - .3, PAPER, PAPER, SHADE, 0, 'stroke-width=".7"')
  + iso.box(x - 2.1, Y - 2.3, 4.2, 4.6, 1, PAPER, PAPER, SHADE, Z - R - 1.1, 'stroke-width=".7"');

// The point a given distance along the centre line the water follows.
function along(distance) {
  const d = Math.max(0, Math.min(LENGTH, distance));
  let leg = 0;
  while (leg < COURSE.length - 2 && d >= MARKS[leg + 1]) leg++;
  return mix3(COURSE[leg], COURSE[leg + 1], (d - MARKS[leg]) / (MARKS[leg + 1] - MARKS[leg]));
}
// The centre line between two distances, with every bend it passes on the way.
function stretch(from, to) {
  return [from, ...MARKS.filter(mark => mark > from && mark < to), to].map(along);
}

// The missing section, as its pipe and then its two flanges, so that water can be drawn inside it.
function section(centre, opacity, part) {
  if (opacity <= 0) return '';
  const [x, y, z] = centre, h = SECTION.half;
  const body = part === 'pipe' ? tube([x - h, y, z], [x + h, y, z], R, { bore: true })
    : tube([x - h, y, z], [x - h + 1.4, y, z], R + 1.3) + tube([x + h - 1.4, y, z], [x + h, y, z], R + 1.3, { bore: true });
  return `<g opacity="${opacity.toFixed(3)}">${body}</g>`;
}

// The water inside one stretch of the pipe, from one distance along it to another.
function water(pose, time, from, to) {
  const { front, tail } = pose;
  const width = 2 * 2.2 * R - 4.6;
  const band = (start, end) => Math.min(end, to) - Math.max(start, from) < .05 ? ''
    : iso.planLine(stretch(Math.max(start, from), Math.min(end, to)), `stroke="${BLUE}" stroke-opacity=".28" stroke-width="${width.toFixed(2)}" stroke-linecap="butt"`);
  // Water always stands behind the valve; beyond it, only between the tail and the front.
  let out = band(0, AT_VALVE) + band(tail, front);
  const moved = passed(time), run = drained(time);
  for (let k = -Math.ceil(AT_VALVE / BEAD_GAP) - 1; k <= BEADS; k++) {
    const set = AT_VALVE + moved - k * BEAD_GAP;
    const beyond = set > AT_VALVE + .01;
    const at = beyond ? set + run : set;
    if (at < from || at >= to) continue;
    if (at < 1.5 || at > LENGTH - .5 || (beyond && (at < tail || at > front))) continue;
    const [cx, cy] = p(...along(at));
    const fade = smooth((at - 1.5) / 4) * smooth((LENGTH - .5 - at) / 3);
    out += `<circle cx="${cx}" cy="${cy}" r="1.75" fill="${BLUE}" stroke="none" opacity="${(.78 * fade).toFixed(3)}"/>`;
  }
  return out;
}

function tankBack() {
  const { x, y, w, d, h } = TANK;
  return iso.panelX(x, y, 0, w, h, GLASS, 'fill-opacity=".12" stroke-opacity=".5"')
    + iso.panelY(x, y, 0, d, h, GLASS, 'fill-opacity=".1" stroke-opacity=".5"');
}
function tankWater(pose, time) {
  const { x, y, w, d } = TANK, { level } = pose;
  let out = iso.box(x + .4, y + .4, w - .8, d - .8, level - .2, BLUE, BLUE, BLUE, .2, 'stroke="none" fill-opacity=".15"');
  out += iso.surface(x + .4, y + .4, w - .8, d - .8, level, 'none', `stroke="${BLUE}" stroke-opacity=".45" stroke-width=".6"`);
  // The stream leaves the spout once the front arrives, and its last drops fall after the pipe runs dry.
  const fall = since => SPOUT - GRAVITY * since * since / 2;
  const top = time >= DRY_AT ? fall(time - DRY_AT) : SPOUT, bottom = time >= POUR_FROM ? Math.max(level, fall(time - POUR_FROM)) : SPOUT;
  if (time >= POUR_FROM && top > bottom + .2) {
    out += iso.planLine([[ELBOW, Y, top], [ELBOW, Y, bottom]], `stroke="${BLUE}" stroke-opacity=".55" stroke-width="1.7" stroke-linecap="butt"`);
    // Drops in the stream are spaced so that, at sixteen frames a second, they are seen to fall.
    for (let i = 0; i < 4; i++) {
      const z = fall(((time - POUR_FROM) % .19) + i * .19);
      if (z > bottom && z < top) { const [cx, cy] = p(ELBOW, Y, z); out += `<circle cx="${cx}" cy="${cy}" r="1.5" fill="${BLUE}" stroke="none" opacity=".8"/>`; }
    }
  }
  // Rings spread on the surface while the stream is landing.
  const landing = Math.sqrt(2 * (SPOUT - level) / GRAVITY);
  if (time >= POUR_FROM + landing && time < DRY_AT + landing) {
    for (let i = 0; i < 2; i++) {
      const u = (((time - POUR_FROM) / .9 + i / 2) % 1), radius = 1.2 + u * 7;
      const points = Array.from({ length: 16 }, (_, k) => p(ELBOW + Math.cos(k * TAU / 16) * radius, Y + Math.sin(k * TAU / 16) * radius, level + .05));
      out += iso.polygon(points, 'none', `stroke="${BLUE}" stroke-width=".7" stroke-opacity="${(.6 * (1 - u) ** 1.5).toFixed(3)}"`);
    }
  }
  return out;
}
function tankFront() {
  const { x, y, w, d, h } = TANK;
  return iso.panelY(x + w, y, 0, d, h, GLASS, 'fill-opacity=".09" stroke-opacity=".6"')
    + iso.panelX(x, y + d, 0, w, h, GLASS, 'fill-opacity=".07" stroke-opacity=".65"')
    + iso.planLine([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h], [x, y, h]], 'stroke-opacity=".7"');
}
// What the tank holds runs on through a small outlet at its foot.
function outlet() {
  const x = TANK.x + TANK.w, end = x + 7, z = 3.4, r = 1.9;
  return tube([x, Y, z], [end, Y, z], r) + tube([x, Y, z], [x + 1, Y, z], r + 1)
    + tube([end, Y, 0], [end, Y, z], r) + tube([end, Y, 0], [end, Y, .9], r + 1.1) + ball([end, Y, z], r * 1.25);
}

// With the gap open, what is left in the stub gathers at its lip and falls.
function drip(time) {
  const since = (time - DRIP.forms + LOOP) % LOOP, hang = DRIP.falls - DRIP.forms, drop = DRIP.lands - DRIP.falls;
  const lip = [STUB + .5, Y, Z - R - .9];
  let out = '';
  if (since < hang + drop) {
    const fallen = since < hang ? 0 : GRAVITY * (since - hang) ** 2 / 2;
    const [cx, cy] = p(lip[0], lip[1], lip[2] - fallen);
    out += `<circle cx="${cx}" cy="${cy}" r="${(.5 + 1.25 * smooth(since / hang)).toFixed(2)}" fill="${BLUE}" stroke="none" opacity=".8"/>`;
  } else if (since < hang + drop + 1.3) {
    const u = (since - hang - drop) / 1.3, radius = .8 + u * 5;
    const points = Array.from({ length: 16 }, (_, k) => p(lip[0] + Math.cos(k * TAU / 16) * radius, Y + Math.sin(k * TAU / 16) * radius, .1));
    out += iso.polygon(points, 'none', `stroke="${BLUE}" stroke-width=".7" stroke-opacity="${(.55 * (1 - u) ** 1.5).toFixed(3)}"`);
  }
  return out;
}

// A hard hat: a tall rounded shell worn low on the head, a narrow brim with a short peak to the
// front, and three ribs over the crown. The side turned from the light is toned, like every other
// solid in these scenes, so it reads as a dome and not a disc.
// `size` is half its width, half its depth and its height; `heading` is the way its wearer faces.
function hardHat(centre, [across, deep, tall], heading, stroke) {
  const forward = [Math.sin(heading), Math.cos(heading)], right = [Math.cos(heading), -Math.sin(heading)];
  const at = (u, v, h) => p(centre[0] + right[0] * u + forward[0] * v, centre[1] + right[1] * u + forward[1] * v, centre[2] + h);
  const brim = Array.from({ length: 24 }, (_, i) => {
    const angle = i * TAU / 24, reach = 1.15 + .34 * Math.max(0, Math.sin(angle)) ** 3;
    return at(Math.cos(angle) * across * reach, Math.sin(angle) * deep * reach, 0);
  });
  const shell = [], toned = [];
  for (const degrees of [0, 15, 30, 45, 60, 75, 88]) {
    const rise = degrees * Math.PI / 180;
    for (let i = 0; i < 20; i++) {
      const angle = i * TAU / 20, u = Math.cos(angle) * across * Math.cos(rise), v = Math.sin(angle) * deep * Math.cos(rise), h = tall * Math.sin(rise);
      const point = at(u, v, h), nu = u / across ** 2, nv = v / deep ** 2, nh = h / tall ** 2;
      shell.push(point);
      // Faces that look along +x are the shaded ones throughout the service scenes.
      if ((right[0] * nu + forward[0] * nv) / Math.hypot(nu, nv, nh) > .36) toned.push(point);
    }
  }
  const rib = offset => {
    const span = Math.sqrt(1 - offset * offset);
    return Array.from({ length: 9 }, (_, i) => { const a = (.1 + .8 * i / 8) * Math.PI; return at(offset * across, Math.cos(a) * deep * span, Math.sin(a) * tall * span).join(','); });
  };
  const line = `stroke="${stroke}" stroke-width=".9"`;
  return iso.polygon(brim, HAT_SHADE, line) + iso.polygon(hull(shell), HAT, line)
    + iso.polygon(hull(toned), HAT_SHADE, 'stroke="none" fill-opacity=".8"')
    + [-.5, 0, .5].map(offset => `<path d="M${rib(offset).join(' L')}" fill="none" stroke="${stroke}" stroke-width=".55" stroke-opacity="${offset ? .45 : .75}"/>`).join('')
    + iso.polygon(hull(shell), 'none', line);
}
// A person's head is a sphere of radius 3.35 above the shoulders; the hat comes down over its upper half.
function personHat(figure, lean) {
  const size = 3.35 * figure.scale, head = local(figure, 0, lean * 1.05 + .2, 40.8);
  return hardHat([head[0], head[1], head[2] + size * .1], [size * 1.09, size * 1.09, size * 1.28], figure.heading, CORAL);
}
// The robot's sits on its flat head, with the antenna's tip showing through the crown.
function robotHat(figure, y) {
  const s = figure.scale, [cx, cy] = p(figure.x, y, 47.4 * s);
  return hardHat([figure.x, y, 41.9 * s], [4.9 * s, 3.9 * s, 4.6 * s], figure.heading, BLUE)
    + `<circle cx="${cx}" cy="${cy}" r="${(1.45 * s).toFixed(2)}" fill="${GLASS}" stroke="${BLUE}" stroke-width=".95"/>`;
}

function lever(angle) {
  const tip = leverPoint(angle, LEVER), foot = leverPoint(angle, -.4);
  const [px, py] = p(...PIVOT), [tx, ty] = p(...tip);
  return iso.planLine([foot, tip], `stroke="${CORAL}" stroke-width="4"`)
    + iso.planLine([foot, tip], `stroke="${PAPER}" stroke-width="1.9"`)
    + `<circle cx="${tx}" cy="${ty}" r="3.1" fill="${PAPER}" stroke="${CORAL}" stroke-width="1.2"/>`
    + `<circle cx="${px}" cy="${py}" r="1.9" fill="${PAPER}" stroke="${CORAL}" stroke-width="1.2"/>`;
}

// The plan the planner holds: the run as a line with its gap, the valve marked in coral.
function plan() {
  const { across: a, along: l } = PLAN;
  const sheet = [[-a, -l], [a, -l], [a, l], [-a, l]].map(([u, v]) => p(...planPoint(u, v)));
  const mark = (points, extra) => `<path d="${points.map(([u, v], i) => `${i ? 'L' : 'M'}${p(...planPoint(u, v, .05)).join(',')}`).join(' ')}" fill="none" ${extra}/>`;
  const [vx, vy] = p(...planPoint(-3.6, .8, .05));
  return iso.polygon(sheet, PAPER, `stroke="${BLUE}" stroke-width=".9"`)
    + mark([[-3.6, .8], [-1.2, .8]], `stroke="${BLUE}" stroke-width="1.1"`)
    + mark([[.9, .8], [4, .8], [4, -1.6]], `stroke="${BLUE}" stroke-width="1.1"`)
    + mark([[-4.2, -2.6], [1.6, -2.6]], `stroke="${BLUE}" stroke-width=".6" stroke-opacity=".5"`)
    + `<circle cx="${vx}" cy="${vy}" r="1.3" fill="${CORAL}" stroke="none"/>`;
}

export function flowMarkup(phase) {
  const pose = flowPose(phase), time = timeAt(phase);
  const { robot, operator, planner } = FLOW_CAST;
  const person = human3DMarkup(p, { ...operator, lean: pose.operatorLean, leftTarget: pose.operatorNear, rightTarget: pose.operatorFar, held: SPLIT });
  const [personBack, personFront] = person.split(SPLIT).map((part, i) => i ? '<g>' + part : part + '</g>');
  const [robotBack, robotFront] = robotMarkup(p, { x: robot.x, y: pose.robotY, scale: robot.scale, heading: robot.heading,
    stride: pose.robotStride, leftTarget: pose.robotLeft, rightTarget: pose.robotRight, held: SPLIT, elbow: tuckedElbows }).split(SPLIT);

  let s = iso.box(20, 30, 165, 106, 2, PAPER, PAPER, SHADE, -2, 'stroke-opacity=".5"');
  for (const x of [STUB - 6, JOIN + 8, RISER - 7]) s += post(x);
  // Arms that are not holding the section hang behind the run, so the pipe passes in front of them.
  const armsBehind = pose.robotHold < .97;
  s += personBack + robotBack + robotHat(robot, pose.robotY) + (armsBehind ? robotFront : '');
  // The pipes first, then the water inside them, then the flanges and bends that sit around both.
  s += tube([VALVE, Y, 0], [VALVE, Y, 1.2], R + 1.3) + tube([VALVE, Y, 1.2], [VALVE, Y, Z]);
  s += tube([VALVE, Y, Z], [STUB, Y, Z], R, { bore: true });
  s += section([SECTION.x, Y, Z], pose.fittedOpacity, 'pipe');
  s += tube([JOIN, Y, Z], [RISER, Y, Z]) + tube([RISER, Y, Z], [RISER, Y, TOP]);
  s += water(pose, time, 0, AT_RISER);
  s += tube([STUB - 1.5, Y, Z], [STUB, Y, Z], R + 1.3, { bore: pose.fittedOpacity < 1 }) + flange(VALVE + 4.6, 1.3);
  s += ball([VALVE, Y, Z], R * 1.6) + tube([VALVE, Y, Z + 3.9], [VALVE, Y, Z + 4.9], 2.1);
  s += drip(time);
  s += lever(pose.lever) + personFront + personHat(operator, pose.operatorLean);
  s += section([SECTION.x, Y, Z], pose.fittedOpacity, 'flanges');
  s += section(pose.section, pose.carriedOpacity, 'pipe') + section(pose.section, pose.carriedOpacity, 'flanges');
  s += armsBehind ? '' : robotFront;
  s += flange(JOIN) + ball([RISER, Y, Z], R * 1.24);
  // The tank stands nearer than the riser; the pipe then crosses over its rim to the spout.
  s += tankBack() + tankWater(pose, time) + tankFront() + outlet();
  s += tube([RISER, Y, TOP], [ELBOW, Y, TOP]) + tube([ELBOW, Y, SPOUT], [ELBOW, Y, TOP]);
  s += water(pose, time, AT_RISER, LENGTH);
  s += tube([ELBOW, Y, SPOUT], [ELBOW, Y, SPOUT + 1.2], R + .9) + ball([RISER, Y, TOP], R * 1.24) + ball([ELBOW, Y, TOP], R * 1.24);
  s += human3DMarkup(p, { ...planner, leftTarget: pose.planNear, rightTarget: pose.planFar, held: plan() }) + personHat(planner, planner.lean);
  return s;
}
