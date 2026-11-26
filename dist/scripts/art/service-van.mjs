// Make delivery performance transparent: a glass delivery van. Cost, Work and Value ride in plain
// view while it is moving. Once a loop a near wheel meets a stone: the van rides over it on its
// springs, the load hops and the top crate slips, and the rider holding it eases it back into line.
// Everything is derived from the phase, so any moment can be drawn again exactly.
import { makeProjector, isoPrimitives, human3DMarkup, robotMarkup, PAPER, SHADE, GLASS, BLUE } from './thesis-cards.mjs?v=d7b3b861c46e';
import { tuckedElbows } from './service-figures.mjs?v=d7b3b861c46e';

const TAU = Math.PI * 2;
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const fixed = n => Number(n.toFixed(3));

/** Loop length in sixteenths of a second, and the calm cruising moment shown when nothing moves. */
export const VAN_STEPS = 256, VAN_STILL = .2;
const SECONDS = VAN_STEPS / 16;

// The same camera angle as the other service cards, centred on the van and a touch closer, so the
// load and its labels read at card size.
const p = makeProjector({ originX: 280, originY: 219, centerX: 104, centerY: 83, angle: -14, scale: 2.08, pitch: .43 });
const iso = isoPrimitives(p);

// The van, in its own frame: it heads along +x, so the camera sees its near side and its front.
// A glass load box, then a cab behind a raked windscreen, then a bonnet ahead of it, as a van has.
export const VAN = {
  rear: 44, pillar: 124, screenTop: 136, scuttle: 148, nose: 165, far: 62, near: 100,
  chassis: 7, floor: 11, hood: 29.5, waist: 32, roof: 59, rail: 56,
  axles: { rear: 62, front: 150 }, wheel: 6.5, tyre: 4.6, housing: 8.6,
};
export const ROAD = { from: 24, to: 194, far: 40, near: 126 };
export const STONE = { height: 3.2, track: 98.3 };
export const STACK = { x: 66, y: 73, length: 26, depth: 16, height: 11, labels: ['Value', 'Work', 'Cost'] };
export const RIDER = { id: 'van-rider', x: 56, y: 81, scale: 1, heading: Math.PI / 2 };
export const CATCHER = { id: 'van-catcher', x: 105.5, y: 81, scale: 1, heading: -Math.PI / 2 };
// The driver sits on the far side, as in a British van, clear of the near windscreen pillar.
export const DRIVER = { x: 131.5, y: 71, z: 6.2, scale: .86, heading: Math.PI / 2 };
export const HELM = { x: DRIVER.x + 15.9, y: DRIVER.y, z: 31.6, radius: 3.4, rake: 28 * Math.PI / 180 };

// The wheels turn a whole number of times a loop and the lane marks repeat exactly, so the road closes.
export const TURNS = 18, MARKS = 32;
export const SPEED = TURNS * TAU * VAN.wheel / SECONDS;
const MARK = SPEED * SECONDS / MARKS;
export const HIT = { front: 6, rear: 6 + (VAN.axles.front - VAN.axles.rear) / SPEED };

// A struck spring: it rings at its own pitch and dies away.
const ring = (since, hertz, damping) => since <= 0 ? 0 : Math.exp(-damping * TAU * hertz * since) * Math.sin(TAU * hertz * since);
// A short flight: up and back down within the span.
const hop = (since, span) => since <= 0 || since >= span ? 0 : Math.sin(Math.PI * since / span);
// How far a wheel is lifted as it rolls over the stone, from the distance between them.
const lifted = distance => Math.max(0, STONE.height - VAN.wheel + Math.sqrt(Math.max(0, VAN.wheel ** 2 - distance ** 2)));

/** The physical state at a phase: road, springs, load and every hand. Exported for the tests. */
export function vanPose(phase) {
  const t = (((phase % 1) + 1) % 1) * SECONDS;
  const stone = VAN.axles.front - SPEED * (t - HIT.front);
  const front = t - HIT.front, rear = t - HIT.rear;
  const lift = { front: lifted(stone - VAN.axles.front), rear: lifted(stone - VAN.axles.rear) };
  // A spring passes part of the climb straight to the body, which then rings on after the wheel
  // is back on the road. That keeps each wheel inside its housing as it rises.
  const body = { front: .4 * lift.front + 3.4 * ring(front + .05, 1.9, .28), rear: .4 * lift.rear + 3.8 * ring(rear + .05, 1.9, .28) };
  // Standing riders pitch forward as the floor is knocked back and up beneath them, then recover.
  const tilt = .05 * ring(front - .02, 1.15, .3) + .095 * ring(rear - .02, 1.15, .3);
  const squash = clamp(.03 * ring(front, 2.1, .45) + .06 * ring(rear, 2.1, .45), -.012, .08);
  // The top crate slips forward into the catcher's hands, is held, then eased back into line.
  const slide = .9 * smooth(front / .25) * (1 - smooth((front - .4) / .7))
    + 3.4 * smooth(rear / .3) * (1 - smooth((rear - .95) / 1.3));
  // The whole stack leaves the floor for an instant, the upper crates a little more.
  const hops = [.45, 1, 1.8].map(height => height * (.4 * hop(front, .3) + hop(rear, .34) + .25 * hop(rear - .34, .2)));
  const steer = 12 * Math.PI / 180 * ring(front, 1.3, .45);
  const top = VAN.floor + STACK.height * 2 + hops[2];
  // Hands, in the van's frame: the rider's far hand never leaves the rail, and the catcher's hands
  // stay flat on the top crate's leading face.
  const grip = [RIDER.x + 7, RIDER.y - 1.6, VAN.rail - .3];
  // The rider's near arm hangs from the shoulder and swings a little behind the body as it lurches.
  // It is given relative to the upright figure, like the shoulder it hangs from.
  const lean = tilt * 13, swing = -2.2 * tilt, arm = 15 * RIDER.scale;
  const loose = [RIDER.x + lean * .92 * RIDER.scale + Math.sin(swing) * arm + .6, RIDER.y + 4.9 * RIDER.scale, VAN.floor + 33.5 * RIDER.scale - Math.cos(swing) * arm];
  const face = STACK.x + STACK.length + slide + 1.25;
  const hold = [-1, 1].map(side => [face, CATCHER.y + side * 3.4, top + STACK.height * .5]);
  // The driver's hands turn with the wheel, a small correction after the stone.
  const helm = angle => [HELM.x - Math.sin(angle) * Math.sin(HELM.rake) * HELM.radius, HELM.y + Math.cos(angle) * HELM.radius, HELM.z + Math.sin(angle) * Math.cos(HELM.rake) * HELM.radius];
  return {
    // What drives the scene: time, distance travelled, wheel angle and where the stone is. These run
    // on through the loop; everything else returns to where it began.
    clock: { seconds: t, travel: SPEED * t, turn: -SPEED * t / VAN.wheel, stone },
    lift, body, tilt, squash, slide, hops, steer,
    rider: { lean, grip, loose },
    catcher: { lean: -lean, hold },
    driver: { hands: [helm(steer), helm(steer + Math.PI)], feet: [1, -1].map(side => [DRIVER.x + 9, DRIVER.y + side * 2.4 * DRIVER.scale, VAN.floor]) },
  };
}

// A projector seen through a movement: the van on its springs, or a rider swaying from the ankles.
function through(project, move) {
  const moved = (x, y, z = 0) => project(...move(x, y, z));
  moved.sphereOutline = (centre, radius, samples) => project.sphereOutline(move(...centre), radius, samples);
  return moved;
}
// The near wheels ride the stone, so the near side rises more than the far, and the body pitches
// about its axles. Angles are small, so the turn is taken as a lean.
function sprung({ front, rear }) {
  const span = VAN.axles.front - VAN.axles.rear, width = VAN.near - VAN.far;
  const pitch = (front - rear) / span * .7, roll = (front + rear) * .3 / width;
  return (x, y, z) => {
    const along = (x - VAN.axles.rear) / span, side = .4 + .6 * (y - VAN.far) / width;
    return [x - pitch * (z - VAN.wheel), y - roll * (z - VAN.wheel), z + (front * along + rear * (1 - along)) * side];
  };
}
// A standing figure sways from the ankles and gives at the knees. `sway` moves a point of the upright
// figure to where it is in the van; `upright` is its inverse, used to keep hands on what they hold.
const sway = ({ x }, tilt, squash) => (px, py, pz) => [px + tilt * (pz - VAN.floor), py, VAN.floor + (pz - VAN.floor) * (1 - squash)];
export const upright = (tilt, squash) => ([px, py, pz]) => {
  const height = (pz - VAN.floor) / (1 - squash);
  return [px - tilt * height, py, VAN.floor + height];
};

function hull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = list => { const out = []; for (const pt of list) { while (out.length > 1 && turn(out.at(-2), out.at(-1), pt) <= 0) out.pop(); out.push(pt); } return out.slice(0, -1); };
  return [...half(sorted), ...half(sorted.reverse())];
}
const circle = (project, x, y, z, radius, count = 20) => Array.from({ length: count }, (_, i) => project(x + Math.cos(i * TAU / count) * radius, y, z + Math.sin(i * TAU / count) * radius));

function wheel(x, outer, lift, turn) {
  const z = VAN.wheel + lift, rim = VAN.wheel * .6;
  let s = iso.polygon(hull([...circle(p, x, outer - VAN.tyre, z, VAN.wheel), ...circle(p, x, outer, z, VAN.wheel)]), SHADE, 'stroke-width=".8"');
  s += iso.polygon(circle(p, x, outer, z, VAN.wheel), PAPER, 'stroke-width="1"');
  s += iso.polygon(circle(p, x, outer, z, rim), PAPER, 'stroke-width=".7"');
  for (let spoke = 0; spoke < 5; spoke++) {
    const angle = turn + spoke * TAU / 5;
    s += iso.line(p(x + Math.cos(angle) * 1.1, outer, z + Math.sin(angle) * 1.1), p(x + Math.cos(angle) * rim, outer, z + Math.sin(angle) * rim), 'stroke-width=".8"');
  }
  return s + iso.polygon(circle(p, x, outer, z, 1.3, 10), BLUE, 'stroke="none"');
}

// Lane marks and the stone slide past beneath the van, and fade at the ends of the road.
const fade = x => clamp(Math.min(x - ROAD.from, ROAD.to - x) / 14);
function road(pose) {
  let s = iso.box(ROAD.from, ROAD.far, ROAD.to - ROAD.from, ROAD.near - ROAD.far, 2, PAPER, PAPER, SHADE, -2, 'stroke-opacity=".5"');
  const shift = pose.clock.travel % MARK;
  // One lane line, on the near side, so nothing crosses the load seen through the glass.
  for (let head = ROAD.to + MARK - shift; head > ROAD.from; head -= MARK) {
    const a = clamp(head - 10, ROAD.from, ROAD.to), b = clamp(head, ROAD.from, ROAD.to);
    const opacity = .55 * fade((a + b) / 2);
    if (b - a > .2 && opacity > .01) s += iso.planLine([[a, ROAD.near - 12, .05], [b, ROAD.near - 12, .05]], `stroke-width="1.1" stroke-opacity="${fixed(opacity)}"`);
  }
  return s;
}
function stone(pose) {
  const at = pose.clock.stone, opacity = fade(at);
  if (at <= ROAD.from || at >= ROAD.to || opacity <= .01) return '';
  const ring = (rx, ry, z, turn) => Array.from({ length: 9 }, (_, i) => p(at + Math.cos(i * TAU / 9 + turn) * rx, STONE.track + Math.sin(i * TAU / 9 + turn) * ry, z));
  return `<g opacity="${fixed(opacity)}">${iso.polygon(hull([...ring(2.9, 2, 0, 0), ...ring(1.5, 1, STONE.height, .4)]), SHADE, 'stroke-width=".8"')}`
    + `${iso.polygon(ring(1.5, 1, STONE.height, .4), PAPER, 'stroke-width=".6"')}</g>`;
}
// A few faint lines of air drawn back from the van, in the same hand as the sheen on its glass.
const STREAKS = [
  { y: VAN.far - 2, z: 47, start: .0, near: false }, { y: 81, z: VAN.roof + 3.5, start: .37, near: false },
  { y: VAN.near + 2, z: 43, start: .68, near: true }, { y: VAN.near + 2, z: 24, start: .21, near: true },
];
function streaks(pose, near) {
  let s = '';
  for (const streak of STREAKS) {
    if (streak.near !== near) continue;
    const u = (pose.clock.seconds / SECONDS * 10 + streak.start) % 1, glow = Math.sin(Math.PI * u) ** 1.2;
    const head = VAN.rear - 3 - 26 * u, length = 10 + 10 * Math.sin(Math.PI * u);
    if (glow > .02) s += iso.planLine([[head, streak.y, streak.z], [head - length, streak.y, streak.z]], `stroke-width="1.2" stroke-opacity="${fixed(.46 * glow)}"`);
  }
  return s;
}

function label(project, x, y, z, text) {
  const origin = project(x, y, z), across = project(x + 1, y, z), down = project(x, y, z - 1);
  return `<text transform="matrix(${fixed(across[0] - origin[0])} ${fixed(across[1] - origin[1])} ${fixed(down[0] - origin[0])} ${fixed(down[1] - origin[1])} ${origin[0]} ${origin[1]})" font-family="Instrument Sans, sans-serif" font-size="7.8" fill="${BLUE}" stroke="none">${text}</text>`;
}

export function vanMarkup(phase) {
  const pose = vanPose(phase);
  const van = through(p, sprung(pose.body)), body = isoPrimitives(van);
  const face = (points, fill, extra) => body.polygon(points.map(pt => van(...pt)), fill, extra);
  // One side of the van: the glass of the load box and cab window, the door below it, and the bonnet.
  const glass = y => [[VAN.rear, y, VAN.floor], [VAN.pillar, y, VAN.floor], [VAN.pillar, y, VAN.waist], [VAN.scuttle, y, VAN.waist], [VAN.screenTop, y, VAN.roof], [VAN.rear, y, VAN.roof]];
  const door = y => [[VAN.pillar, y, VAN.floor], [VAN.scuttle, y, VAN.floor], [VAN.scuttle, y, VAN.waist], [VAN.pillar, y, VAN.waist]];
  const wing = y => [[VAN.scuttle, y, VAN.floor], [VAN.nose, y, VAN.floor], [VAN.nose, y, VAN.hood], [VAN.scuttle, y, VAN.waist]];
  const { axles } = VAN, length = VAN.nose - VAN.rear, width = VAN.near - VAN.far, tall = VAN.roof - VAN.floor;

  let s = road(pose) + stone(pose) + streaks(pose, false);
  s += iso.surface(VAN.rear + 4, VAN.far + 4, length - 8, width - 5, .06, SHADE, 'stroke="none" fill-opacity=".6"');
  for (const x of [axles.rear, axles.front]) s += wheel(x, VAN.far + VAN.tyre, 0, pose.clock.turn);

  // Chassis and the far glass. The process stays visible inside.
  s += body.box(VAN.rear, VAN.far, length, width, VAN.floor - VAN.chassis, PAPER, PAPER, SHADE, VAN.chassis);
  s += body.box(VAN.nose, VAN.far + 2, 2, width - 4, 4.4, PAPER, PAPER, SHADE, VAN.chassis + .4, 'stroke-width=".8"');
  s += face(glass(VAN.far), GLASS, 'fill-opacity=".13" stroke-opacity=".5"');
  s += face(door(VAN.far), PAPER, 'stroke-opacity=".5"');
  s += body.panelY(VAN.rear, VAN.far, VAN.floor, width, tall, GLASS, 'fill-opacity=".11" stroke-opacity=".5"');
  s += body.planLine([[VAN.pillar, VAN.far, VAN.floor], [VAN.pillar, VAN.far, VAN.roof]], 'stroke-opacity=".4"');
  // The rail the rider holds, hung from the roof.
  s += body.planLine([[VAN.rear + 5, 81, VAN.rail], [VAN.pillar - 4, 81, VAN.rail]], 'stroke-width="1.3"');
  for (const x of [VAN.rear + 5, 86, VAN.pillar - 4]) s += body.planLine([[x, 81, VAN.rail], [x, 81, VAN.roof]], 'stroke-width=".7" stroke-opacity=".7"');

  // The rider behind the load: far hand on the rail, near arm free.
  const settle = upright(pose.tilt, pose.squash);
  const rider = human3DMarkup(through(van, sway(RIDER, pose.tilt, pose.squash)), {
    ...RIDER, z: VAN.floor, lean: pose.rider.lean, rightTarget: settle(pose.rider.grip), leftTarget: pose.rider.loose,
  });
  s += rider;

  // Cost, Work and Value, stacked in plain view.
  STACK.labels.forEach((text, i) => {
    const x = STACK.x + (i === 2 ? pose.slide : 0), z = VAN.floor + STACK.height * i + pose.hops[i];
    s += body.box(x, STACK.y, STACK.length, STACK.depth, STACK.height, PAPER, PAPER, SHADE, z, 'stroke-width=".95"');
    s += label(van, x + 2.5, STACK.y + STACK.depth + .05, z + 2.6, text);
  });

  // The catcher, both hands on the top crate.
  s += human3DMarkup(through(van, sway(CATCHER, pose.tilt, pose.squash)), {
    ...CATCHER, z: VAN.floor, lean: pose.catcher.lean, leftTarget: settle(pose.catcher.hold[0]), rightTarget: settle(pose.catcher.hold[1]),
  });

  // The cab: an agent at the wheel.
  s += body.box(DRIVER.x - 4.6, DRIVER.y - 5, 7.6, 10, 10.4, PAPER, PAPER, SHADE, VAN.floor, 'stroke-width=".8"');
  s += body.box(DRIVER.x - 5.4, DRIVER.y - 5, 1.6, 10, 16, PAPER, PAPER, SHADE, VAN.floor + 10.4, 'stroke-width=".8"');
  const rim = Array.from({ length: 16 }, (_, i) => {
    const angle = i * TAU / 16;
    return van(HELM.x - Math.sin(angle) * Math.sin(HELM.rake) * HELM.radius, HELM.y + Math.cos(angle) * HELM.radius, HELM.z + Math.sin(angle) * Math.cos(HELM.rake) * HELM.radius);
  });
  let helm = body.planLine([[HELM.x, HELM.y, HELM.z], [VAN.scuttle - .6, HELM.y, VAN.waist - 3]], 'stroke-width="1.2"');
  helm += body.polygon(rim, 'none', 'stroke-width="1.3"');
  for (const hand of pose.driver.hands) helm += body.planLine([[HELM.x, HELM.y, HELM.z], hand], 'stroke-width=".8"');
  const [leftHand, rightHand] = pose.driver.hands;
  s += robotMarkup(van, { ...DRIVER, leftTarget: leftHand, rightTarget: rightHand, footTargets: pose.driver.feet, held: helm, elbow: tuckedElbows });

  // The roof, windscreen and bonnet close over everything inside, and the driver's legs go under the bonnet.
  s += face([[VAN.rear, VAN.far, VAN.roof], [VAN.screenTop, VAN.far, VAN.roof], [VAN.screenTop, VAN.near, VAN.roof], [VAN.rear, VAN.near, VAN.roof]], GLASS, 'fill-opacity=".08" stroke-opacity=".5"');
  s += face([[VAN.scuttle, VAN.far, VAN.waist], [VAN.scuttle, VAN.near, VAN.waist], [VAN.screenTop, VAN.near, VAN.roof], [VAN.screenTop, VAN.far, VAN.roof]], GLASS, 'fill-opacity=".1" stroke-opacity=".65"');
  s += face([[VAN.scuttle, VAN.far, VAN.waist], [VAN.nose, VAN.far, VAN.hood], [VAN.nose, VAN.near, VAN.hood], [VAN.scuttle, VAN.near, VAN.waist]], PAPER, 'stroke-width=".9"');
  s += body.panelY(VAN.nose, VAN.far, VAN.floor, width, VAN.hood - VAN.floor, SHADE, 'stroke-width=".9"');
  for (const y of [VAN.far + 6.5, VAN.near - 6.5]) {
    s += body.polygon(Array.from({ length: 12 }, (_, i) => van(VAN.nose + .05, y + Math.cos(i * TAU / 12) * 2.8, 21.4 + Math.sin(i * TAU / 12) * 2.8)), PAPER, 'stroke-width=".8"');
  }
  for (const z of [19.8, 22.8]) s += body.planLine([[VAN.nose + .05, VAN.far + 13, z], [VAN.nose + .05, VAN.near - 13, z]], 'stroke-width=".7" stroke-opacity=".7"');
  // The near side: glass over the load and the cab window, a door below the window, and the wing.
  s += face(glass(VAN.near), GLASS, 'fill-opacity=".06" stroke-opacity=".75"');
  s += face(door(VAN.near), PAPER, 'stroke-width=".9"') + face(wing(VAN.near), PAPER, 'stroke-width=".9"');
  s += body.planLine([[VAN.pillar, VAN.near, VAN.waist], [VAN.pillar, VAN.near, VAN.roof]], 'stroke-opacity=".65"');
  s += body.planLine([[VAN.pillar + 2.6, VAN.near + .05, VAN.waist - 4], [VAN.pillar + 6.2, VAN.near + .05, VAN.waist - 4]], 'stroke-width="1.3"');
  for (const x of [VAN.rear + 6, VAN.rear + 13]) s += body.planLine([[x, VAN.near + .05, 30], [x + 7, VAN.near + .05, 53]], 'stroke-opacity=".19" stroke-width="1.6"');

  // Wheel housings move with the body; the wheels themselves follow the road.
  for (const [x, lift] of [[axles.rear, pose.lift.rear], [axles.front, pose.lift.front]]) {
    const arch = Array.from({ length: 15 }, (_, i) => {
      const angle = Math.PI * (i / 14);
      return van(x + Math.cos(angle) * VAN.housing, VAN.near + .03, Math.max(VAN.chassis, VAN.wheel + Math.sin(angle) * VAN.housing));
    });
    s += body.polygon(arch, PAPER, 'stroke-width=".9"');
    s += wheel(x, VAN.near + .7, lift, pose.clock.turn);
  }
  return s + streaks(pose, true);
}
