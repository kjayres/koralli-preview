// The three service cards on Our Work. Each scene is drawn by its own module, from a phase between
// 0 and 1, with the same line, paper and figures as the homepage cards:
// the work-flow as pipework, the glass delivery van, and the agent on the trial course.
import { BLUE } from './thesis-cards.mjs?v=a4b692340dda';
import { flowMarkup, flowPose, FLOW_STEPS, FLOW_STILL } from './service-flow.mjs?v=a4b692340dda';
import { vanMarkup, vanPose, VAN_STEPS, VAN_STILL } from './service-van.mjs?v=a4b692340dda';
import { courseMarkup, coursePose } from './service-course.mjs?v=a4b692340dda';

const wrap = phase => ((phase % 1) + 1) % 1;
const group = body => `<g stroke="${BLUE}" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
const scenes = [flowMarkup, vanMarkup, courseMarkup], poses = [flowPose, vanPose, coursePose];

// Export the physical state as well as the renderer, so tests can check loops,
// foot motion and reachable hand targets independently.
export function servicePose(index, phase) {
  return poses[index](wrap(phase));
}
// Loop length of each scene in sixteenths of a second, and the moment shown when nothing moves:
// the first paint, and the whole card under reduced motion.
export const SERVICE_STEPS = [FLOW_STEPS, VAN_STEPS, 384];
export const SERVICE_STILL = [FLOW_STILL, VAN_STILL, .2];
export function serviceSceneMarkup(index, phase = SERVICE_STILL[index]) {
  return group(scenes[index](wrap(phase)));
}
export function serviceArtwork(index) {
  return `<svg viewBox="0 0 560 330" fill="none" aria-hidden="true" focusable="false" data-service-scene="${index}">${serviceSceneMarkup(index)}</svg>`;
}
