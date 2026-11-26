import { makeProjector, isoPrimitives, human3DMarkup, robotMarkup, PAPER, SHADE, BLUE, CORAL } from './thesis-cards.mjs';
import { tuckedElbows } from './service-figures.mjs';

const TAU = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => a.map((value, i) => mix(value, b[i], t));
const p = makeProjector({ originX: 280, originY: 210, centerX: 108, centerY: 83, angle: -14, scale: 1.9, pitch: .43 });
const iso = isoPrimitives(p);
const BAR = 72, SCALE = .96, Y = 74;
const contacts = [[44, 44], [54, 44], [54, 64], [74, 64], [74, 84], [94, 84], [94, 104], [104, 104]];
const footY = side => Y - side * 2.4 * SCALE;
const feetAt = (x, z) => [-1, 1].map(side => [x, footY(side), z]);
const restHand = (pose, side) => [pose.x + 8, Y - side * 6 * SCALE, pose.z + 23];
// Walking, the arms hang by the sides and swing against the legs: the near arm goes back as the
// near leg comes forward, and each hand lifts a little at the end of its swing.
const hangHand = (pose, side) => [pose.x + .6 + side * pose.stride * 4.5, Y - side * 7.2 * SCALE, pose.z + (12.6 + Math.abs(pose.stride) * 1.2) * SCALE];
const handAt = (x, side, z = BAR) => [x, Y - side * 6 * SCALE, z];
// Forward reach, height and lateral spread, relative to the body. The crouch
// draws the arms back before both swing upwards to help the take-off.
const crouchArms = [[0, [8, 23, 6]], [.55, [-5, 21, 6.7]], [1, [10, 31, 7]]];
const flightArms = [[0, [10, 31, 7]], [.28, [12, 35, 8.5]], [.55, [8, 33, 9]], [.82, [6, 26, 7]], [1, [8, 23, 6]]];

function swingArms(pose, progress, keys) {
  const next = keys.findIndex(([at]) => at >= progress);
  const to = keys[next < 0 ? keys.length - 1 : next];
  const from = keys[Math.max(0, (next < 0 ? keys.length - 1 : next) - 1)];
  const u = to[0] === from[0] ? 0 : smooth((progress - from[0]) / (to[0] - from[0]));
  const [forward, height, spread] = mix3(from[1], to[1], u);
  [pose.left, pose.right] = [-1, 1].map(side => [pose.x + forward, Y - side * spread * SCALE, pose.z + height]);
}

// The first rung is out of standing reach. The robot stops, crouches as its arms swing back, springs,
// and catches the bar at the top of the jump. It swings once beneath the rung and settles to a hang.
export const JUMP = { from: 41, floor: 8, crouch: .14, spring: .40, catch: .64, hang: [42, 26] };
function jumpToBar(pose, u) {
  const rise = clamp((u - JUMP.spring) / (JUMP.catch - JUMP.spring)), hang = clamp((u - JUMP.catch) / (1 - JUMP.catch));
  const settle = 1 - smooth((hang - .7) / .3);
  pose.stage = 'reach';
  if (u < JUMP.spring) {
    pose.x = JUMP.from;
    pose.z = JUMP.floor - 3.6 * smooth((u - JUMP.crouch) / (JUMP.spring - JUMP.crouch));
  } else if (u < JUMP.catch) {
    pose.x = JUMP.from + smooth(rise);
    pose.z = JUMP.floor - 3.6 + (JUMP.hang[1] + 1.2 - JUMP.floor + 3.6) * Math.sin(rise * Math.PI / 2);
  } else {
    pose.x = JUMP.hang[0] + 2.2 * Math.exp(-2.5 * hang) * Math.sin(hang * TAU * 1.25) * settle;
    pose.z = JUMP.hang[1] + 1.2 * Math.exp(-3 * hang) * Math.cos(hang * TAU * 1.2) * settle;
  }
  // Feet stay on the platform until the legs are straight, then trail beneath and tuck into the hang.
  const air = smooth((u - .43) / .47), straight = pose.z - .85;
  const footX = mix(JUMP.from, pose.x - 2, air) - .9 * (pose.x - JUMP.hang[0]) * (u < JUMP.catch ? 0 : 1);
  pose.feet = feetAt(footX, Math.max(JUMP.floor, mix(straight, pose.z + 2, air)));
  [pose.left, pose.right] = [-1, 1].map(side => {
    const hung = hangHand(pose, side), back = [pose.x - 5.5, Y - side * 7.4 * SCALE, pose.z + 17];
    const low = [pose.x + 7, Y - side * 6.2 * SCALE, pose.z + 24], rung = handAt(44, side);
    if (u < JUMP.spring) return mix3(hung, back, smooth((u - .1) / .24));
    if (u < .5) return mix3(back, low, smooth((u - JUMP.spring) / (.5 - JUMP.spring)));
    return u < JUMP.catch ? mix3(low, rung, smooth((u - .5) / (JUMP.catch - .5))) : rung;
  });
  pose.grips = [u >= JUMP.catch, u >= JUMP.catch];
}

export function coursePose(phase) {
  const t = ((phase % 1) + 1) % 1;
  const pose = { x: 30, y: Y, z: 8, scale: SCALE, heading: Math.PI / 2, stride: 0, opacity: 1, stage: 'start', grips: [false, false], feet: feetAt(30, 8) };
  if (t < .1) {
    const u = t / .1;
    pose.x = mix(30, JUMP.from, smooth(u));
    pose.stride = Math.sin(pose.x * TAU / 7) * Math.sin(u * Math.PI);
    pose.feet = null;
    pose.opacity = smooth((t - .01) / .03);
    pose.left = hangHand(pose, -1); pose.right = hangHand(pose, 1);
  } else if (t < .16) {
    jumpToBar(pose, (t - .1) / .06);
  } else if (t < .55) {
    const travel = (t - .16) / .39 * 7;
    const step = Math.min(6, Math.floor(travel)), local = travel - step;
    const u = smooth(local), from = contacts[step], to = contacts[step + 1];
    const hands = from.map((x, i) => handAt(mix(x, to[i], u), i ? 1 : -1, BAR - (x !== to[i] ? Math.sin(local * Math.PI) * 6 : 0)));
    pose.stage = 'monkey-bars';
    pose.grips = from.map((x, i) => x === to[i] || local === 0 || local === 1);
    pose.left = hands[0]; pose.right = hands[1];
    pose.x = (hands[0][0] + hands[1][0]) / 2 - 2;
    pose.z = 26 + Math.sin(local * Math.PI) * .8;
    const kick = Math.sin(travel * TAU) * 3.5;
    pose.feet = [-1, 1].map(side => [pose.x - 2 + side * kick, footY(side), pose.z + 2 + Math.abs(kick) * .35]);
  } else if (t < .63) {
    const u = (t - .55) / .08, eased = smooth(u);
    pose.stage = 'dismount';
    pose.x = mix(102, 118, eased); pose.z = mix(26, 12, u) + Math.sin(u * Math.PI) * 7;
    pose.left = mix3(handAt(104, -1), restHand(pose, -1), smooth(u * 2));
    pose.right = mix3(handAt(104, 1), restHand(pose, 1), smooth(u * 2));
    pose.feet = feetAt(pose.x + Math.sin(u * Math.PI) * 2, pose.z);
  } else {
    const hops = [
      { wait: .63, start: .66, end: .73, a: 118, b: 136, za: 12, zb: 16 },
      { wait: .73, start: .76, end: .83, a: 136, b: 154, za: 16, zb: 12 },
      { wait: .83, start: .86, end: .92, a: 154, b: 176, za: 12, zb: 8 },
    ];
    const hop = hops.find(h => t < h.end);
    if (hop && t < hop.start) {
      const u = (t - hop.wait) / (hop.start - hop.wait);
      pose.stage = 'settle'; pose.x = hop.a;
      pose.z = hop.za - Math.sin(u * Math.PI) * 2.2;
      pose.feet = feetAt(hop.a, hop.za);
      swingArms(pose, u, crouchArms);
    } else if (hop) {
      const u = (t - hop.start) / (hop.end - hop.start);
      pose.stage = 'hop'; pose.x = mix(hop.a, hop.b, smooth(u));
      pose.z = mix(hop.za, hop.zb, u) + Math.sin(u * Math.PI) * 10;
      pose.feet = feetAt(pose.x + Math.sin(u * Math.PI) * 2, pose.z);
      swingArms(pose, u, flightArms);
    } else {
      const u = (t - .92) / .08;
      pose.stage = 'finish'; pose.x = mix(176, 209, smooth(u));
      pose.stride = Math.sin(pose.x * TAU / 7) * Math.sin(u * Math.PI);
      pose.feet = null;
      pose.opacity = 1 - smooth((t - .94) / .04);
      // The arms come down from the landing and swing with the walk off the course.
      [pose.left, pose.right] = [-1, 1].map(side => mix3(restHand(pose, side), hangHand(pose, side), smooth(u / .3)));
    }
  }
  pose.left ||= restHand(pose, -1);
  pose.right ||= restHand(pose, 1);
  return pose;
}

export function courseActors(phase) {
  const actor = coursePose(phase);
  // Reset at the entrance only while absent. The exit finishes at .98 and the
  // next entry starts after .01, leaving a clean gap across the loop boundary.
  return actor.opacity > 0 ? [actor] : [];
}

// Two people watch from the near side, half turned to the course and to each other. The note-taker
// faces left, so the writing arm is the near one and body, board, hand and pen are drawn in true order.
// The other talks the run through: an open hand towards the course while a robot is on it, lowered
// between runs. The far figure is listed first so the nearer one is painted over it.
export const WATCHERS = {
  talker: { id: 'course-talker', x: 106, y: 123, scale: 1.03, heading: Math.PI * .72, lean: .5 },
  writer: { id: 'course-observer', x: 131, y: 119, scale: 1.03, heading: -Math.PI * .66, lean: .5 },
};
export function courseWatchers(phase) {
  const t = ((phase % 1) + 1) % 1, { talker, writer } = WATCHERS;
  const forward = [Math.sin(talker.heading), Math.cos(talker.heading)], right = [Math.cos(talker.heading), -Math.sin(talker.heading)];
  const local = (u, v, h) => [talker.x + (right[0] * u + forward[0] * v) * talker.scale, talker.y + (right[1] * u + forward[1] * v) * talker.scale, h * talker.scale];
  const telling = smooth((t - .06) / .08) * (1 - smooth((t - .9) / .07));
  const open = local(3.4, 10.5, 30 + 1.6 * Math.sin(t * TAU * 3)), down = local(5, .8, 18.6);
  return [{ ...talker, rightTarget: mix3(down, open, telling) }, { ...writer, holdingBoard: { phase: t } }];
}

function steppingPost(x, y, radius, height) {
  const corners = Array.from({ length: 12 }, (_, i) => [x + Math.cos(i * TAU / 12) * radius, y + Math.sin(i * TAU / 12) * radius]);
  const faces = corners.map((a, i) => {
    const b = corners[(i + 1) % corners.length];
    return { depth: p((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0)[1], markup: iso.polygon([p(...a, 0), p(...b, 0), p(...b, height), p(...a, height)], i % 3 ? PAPER : SHADE, `stroke="${BLUE}" stroke-width=".6"`) };
  }).sort((a, b) => a.depth - b.depth);
  return faces.map(face => face.markup).join('') + iso.polygon(corners.map(pt => p(...pt, height)), PAPER, `stroke="${BLUE}" stroke-width=".75"`) + iso.line(p(x - radius / 2, y, height + .1), p(x + radius / 2, y, height + .1), `stroke="${BLUE}" stroke-opacity=".5" stroke-width=".55"`);
}

function platform(x, width) {
  let s = iso.box(x, 61, width, 26, 8, PAPER, PAPER, SHADE, 0, `stroke="${BLUE}" stroke-width=".7"`);
  for (let bx = x + 6; bx < x + width; bx += 6) s += iso.planLine([[bx, 61, 8.1], [bx, 87, 8.1]], `stroke="${BLUE}" stroke-opacity=".5" stroke-width=".5"`);
  return s;
}

export function courseMarkup(phase) {
  let s = iso.box(15, 35, 193, 102, 2, PAPER, PAPER, SHADE, -2, 'stroke-opacity=".4"');
  s += platform(17, 27) + platform(166, 39);
  for (const [x, z] of [[118, 12], [136, 16], [154, 12]]) s += steppingPost(x, Y, 5.3, z);
  // Back uprights, rails and rungs. Near uprights are painted after the robots.
  for (const x of [42, 104]) s += iso.box(x - 1.6, 59, 3.2, 3.2, BAR + 1.6, PAPER, PAPER, SHADE, 0, `stroke="${BLUE}" stroke-width=".7"`);
  s += iso.planLine([[42, 60.6, BAR], [104, 60.6, BAR]], `stroke="${BLUE}" stroke-width="3"`);
  for (let x = 44; x <= 104; x += 10) s += iso.planLine([[x, 61, BAR], [x, 87, BAR]], `stroke="${BLUE}" stroke-width="2.1"`);
  // Finish flag makes the destination legible without explaining the metaphor.
  s += iso.planLine([[192, 61, 8], [192, 61, 43]], 'stroke-width="1.3"');
  s += iso.panelX(192, 61, 34, 10, 8, CORAL, 'stroke="none"');
  for (const actor of courseActors(phase)) {
    s += `<g opacity="${actor.opacity.toFixed(3)}">` + robotMarkup(p, { ...actor, leftTarget: actor.left, rightTarget: actor.right, footTargets: actor.feet, elbow: tuckedElbows }) + '</g>';
  }
  for (const x of [42, 104]) s += iso.box(x - 1.6, 86, 3.2, 3.2, BAR + 1.6, PAPER, PAPER, SHADE, 0, `stroke="${BLUE}" stroke-width=".7"`);
  s += iso.planLine([[42, 87.6, BAR], [104, 87.6, BAR]], `stroke="${BLUE}" stroke-width="3"`);
  for (const watcher of courseWatchers(phase)) s += human3DMarkup(p, watcher);
  return s;
}
