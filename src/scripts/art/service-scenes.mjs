import { makeProjector, isoPrimitives, human3DMarkup, robotMarkup, PAPER, SHADE, GLASS, BLUE, CORAL } from './thesis-cards.mjs';
import { courseMarkup, coursePose } from './service-course.mjs';
import { vanMarkup, vanPose, VAN_STEPS, VAN_STILL } from './service-van.mjs';

const TAU = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const key = (t, frames) => {
  for (let i = 1; i < frames.length; i++) {
    const [a, x] = frames[i - 1], [b, y] = frames[i];
    if (t <= b) return mix(x, y, smooth((t - a) / (b - a)));
  }
  return frames.at(-1)[1];
};
// The same camera as the homepage relay, framed a little closer for three cards.
const p = makeProjector({ originX: 280, originY: 218, centerX: 100, centerY: 83, angle: -14, scale: 1.9, pitch: .43 });
const iso = isoPrimitives(p);
const { box, panelX, planLine } = iso;
const group = body => `<g stroke="${BLUE}" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
const floor = () => box(20, 30, 165, 106, 2, PAPER, PAPER, SHADE, -2, 'stroke-opacity=".5"');
const table = (x, y, w, d, h = 23) => {
  let s = '';
  for (const lx of [x + 2, x + w - 4]) for (const ly of [y + 2, y + d - 4]) s += box(lx, ly, 2, 2, h - 2);
  return s + box(x, y, w, d, 2, PAPER, PAPER, SHADE, h - 2);
};
const SPLIT = '<!--service-hands-->';
const splitFigure = markup => {
  const [back, front] = markup.split(SPLIT);
  return [back + '</g>', '<g>' + front];
};

// Export the physical state as well as the renderer, so tests can check loops,
// foot motion and reachable hand targets independently.
export function servicePose(index, phase) {
  const t = ((phase % 1) + 1) % 1;
  if (index === 0) {
    const change = key(t, [[0, 0], [.17, 0], [.42, 1], [.78, 1], [1, 0]]);
    return { change, chip: [93, 73, 24 + 8 * (1 - change)] };
  }
  if (index === 1) return vanPose(t);
  return coursePose(t);
}

function workflow(t) {
  const state = servicePose(0, t);
  let s = floor();
  const hand = side => [state.chip[0] + side * 4, state.chip[1], state.chip[2] + 3];
  const planner = human3DMarkup(p, { id: 'service-planner', x: 93, y: 59, scale: 1.03, heading: 0, lean: .8, leftTarget: hand(-1), rightTarget: hand(1), held: SPLIT });
  const robot = robotMarkup(p, { x: 123, y: 57, scale: 1, heading: 0, target: [123, 73, state.chip[2] + 3], held: SPLIT });
  const [plannerBack, plannerFront] = splitFigure(planner);
  const [robotBack, robotFront] = robot.split(SPLIT);
  s += plannerBack + robotBack + table(45, 64, 112, 37, 24);
  const oldRoute = [[57, 83], [70, 83], [70, 70], [88, 70], [88, 92], [121, 92], [121, 83], [146, 83]];
  const newRoute = [[57, 83], [70, 83], [70, 73], [88, 73], [100, 73], [121, 73], [130, 83], [146, 83]];
  s += planLine(oldRoute.map(v => [...v, 24.2]), `stroke="${CORAL}" stroke-width="1.65" opacity="${1 - state.change}"`);
  s += planLine(newRoute.map(v => [...v, 24.2]), `stroke="${BLUE}" stroke-width="1.65" opacity="${state.change}"`);
  for (const x of [57, 146]) {
    s += iso.polygon([[x - 4, 83, 24.4], [x, 79, 24.4], [x + 4, 83, 24.4], [x, 87, 24.4]].map(v => p(...v)), PAPER, `stroke="${CORAL}" stroke-width="1.5"`);
  }
  // Orange judgement points stay in the workflow as blue agent stations are fitted.
  for (const x of [93, 123]) {
    const z = state.chip[2];
    s += box(x - 6, 68, 12, 10, 6, GLASS, PAPER, SHADE, z, 'stroke-width="1.1"');
    s += panelX(x - 4, 78.05, z + 1.6, 8, 3, BLUE, 'stroke="none" fill-opacity=".8"');
    for (const ex of [x - 2.5, x + 1]) s += panelX(ex, 78.1, z + 2.4, 1.5, 1.1, PAPER, 'stroke="none"');
    s += planLine([[x, 73, z + 6], [x, 73, z + 8.5]], 'stroke-width="1"');
  }
  for (let i = 0; i < 3; i++) {
    const u = (t * 2 + i / 3) % 1, part = u * 7, j = Math.min(6, Math.floor(part)), a = part - j;
    const route = oldRoute.map((point, k) => point.map((v, axis) => mix(v, newRoute[k][axis], state.change)));
    const xy = route[j].map((v, axis) => mix(v, route[j + 1][axis], a));
    const [cx, cy] = p(...xy, 24.5);
    s += `<circle cx="${cx}" cy="${cy}" r="2.1" fill="${state.change > .5 ? BLUE : CORAL}" stroke="none" opacity="${smooth(u / .07) * smooth((1 - u) / .07)}"/>`;
  }
  s += robotFront + plannerFront;
  s += human3DMarkup(p, { id: 'service-reviewer', x: 150, y: 113, scale: 1.03, heading: Math.PI, holdingBoard: true, leftTarget: [153, 105, 25], rightTarget: [147, 102, 29 + Math.sin(t * TAU) * 1.5], lean: .4 });
  return s;
}

const scenes = [workflow, vanMarkup, courseMarkup];
// Loop length of each scene in sixteenths of a second, and the moment shown when nothing moves:
// the first paint, and the whole card under reduced motion.
export const SERVICE_STEPS = [224, VAN_STEPS, 384];
export const SERVICE_STILL = [.2, VAN_STILL, .2];
export function serviceSceneMarkup(index, phase = SERVICE_STILL[index]) {
  return group(scenes[index](((phase % 1) + 1) % 1));
}
export function serviceArtwork(index) {
  return `<svg viewBox="0 0 560 330" fill="none" aria-hidden="true" focusable="false" data-service-scene="${index}">${serviceSceneMarkup(index)}</svg>`;
}
