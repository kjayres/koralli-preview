// Adapt & Grow, the third stage of the shared approach field. Some of what Build & Learn made falls
// into a soft blue heap at the foot of the frame, and a coral grows up from its top through grey grains still
// in the water. Every few seconds one grain becomes new evidence: a branch reaches out to it, and an old
// branch that no longer leads anywhere lets go. Everything is derived from the stage's age, so any
// moment can be drawn again exactly, and reduced motion shows one settled moment.
const TAU = Math.PI * 2;
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const BLUE = [36, 78, 255], GREY = [112, 119, 131], CORAL = [232, 120, 131];
// The heap is what Build & Learn made, so it keeps a soft share of that blue while the grains still
// in the water turn grey. It reads as material the coral grows from, not as a faded panel.
export const HEAP_TINT = [62, 93, 214];
// The heap has landed by about 1.2s and its top is steady from 1.6s. The root is lowered onto it
// from ROOT_SETTLE and the trunk sets off once it is resting there.
export const ROOT_SETTLE = 1.4, GROW_START = 2.6, GROW_DURATION = 3.1;
export const FIRST_EVENT = GROW_START + GROW_DURATION + 1.4, EVENT_INTERVAL = 6;
const EXTRA_BRANCHES = 2, RETREAT_EVERY = 3;
const EVIDENCE = .9, REACH = 1, PRUNE_START = 2.2, PRUNE = 1;
// How many grains fall into the heap, and how far either side of the middle they gather.
export const HEAP = { count: 560, halfWidth: .15, height: .072 };
const CANOPY = { left: .13, right: .87, top: .22, bottom: .74 };

// Growth sets off briskly and eases into its tips, as a shoot does. `reachedAt` is its inverse: the
// share of the growing time at which the branch arrives at a grain.
const EASE = 1.6;
const growthAt = share => 1 - (1 - clamp(share)) ** EASE;
const reachedAt = growth => 1 - (1 - clamp(growth)) ** (1 / EASE);
// Each growing branch carries a small bud at its tip. On arrival the bud swells into the grain,
// a touch past its size, and settles.
const BUD = .55;
function swell(since, from) {
  if (!(since < .6)) return 1;
  const u = clamp(since / .6);
  return mix(from, 1, smooth(since / .18)) * (1 + .22 * Math.sin(u * Math.PI) * (1 - u));
}

const css = rgb => `rgba(${rgb.map(Math.round).join(',')},`;
const colour = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
const gap = (a, b) => Math.hypot(a.u - b.u, a.v - b.v);
function segmentGap(p, a, b) {
  const du = b.u - a.u, dv = b.v - a.v, t = clamp(((p.u - a.u) * du + (p.v - a.v) * dv) / (du * du + dv * dv || 1));
  return Math.hypot(p.u - a.u - du * t, p.v - a.v - dv * t);
}
function crosses(a, b, c, d) {
  const turn = (p, q, r) => (q.u - p.u) * (r.v - p.v) - (q.v - p.v) * (r.u - p.u);
  return turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0;
}

// Where each heap grain gathers across the floor: most near the middle, a few out at the foot.
const heapOffset = id => ((random(id * 5.3 + 1) + random(id * 9.1 + 7)) - 1) * HEAP.halfWidth;

// A pre-stacked heap for reduced motion, packed from the floor up under a cone with a ragged top.
function stillHeap(count) {
  const spots = [], step = .0049;
  for (let row = 0; spots.length < count * 3 && row < 80; row++) {
    const v = .998 - row * step * .87;
    for (let u = .5 - HEAP.halfWidth + (row % 2) * step / 2; u <= .5 + HEAP.halfWidth; u += step) {
      const top = 1 - HEAP.height * 1.6 * Math.max(0, 1 - Math.abs(u - .5) / HEAP.halfWidth) * (1 + .12 * (random(u * 431) - .5));
      if (v >= top) spots.push({ u: u + (random(u * 97 + row) - .5) * .0012, v });
    }
  }
  // Filled from the floor up, the last row stops short: the top stays ragged, as sand does.
  return spots.slice(0, count);
}

/** Fixed roles for the stage: which grains form the rock, and the coral they start from. */
export function createAdaptGrow(locations, studies, reserved = new Set()) {
  const { study, ids } = studies[0];
  const coralIds = new Set(ids);
  const taken = new Set([...reserved, ...studies.flatMap(item => item.ids)]);
  // The heap draws its grains evenly from across the water, so the field thins without a gap.
  const pool = locations.map((_, id) => id).filter(id => !taken.has(id))
    .sort((a, b) => random(a * 3.7 + 11) - random(b * 3.7 + 11)).slice(0, HEAP.count);
  pool.sort((a, b) => heapOffset(a) - heapOffset(b));
  const still = stillHeap(pool.length).sort((a, b) => a.u - b.u);
  const rock = new Map(pool.map((id, i) => [id, { offset: heapOffset(id), still: still[i] }]));
  const base = study.nodes.map(([, , parent], i) => ({ id: ids[i], parent: parent < 0 ? -1 : ids[parent], arrival: study.arrivals[i] }));
  const candidates = locations.map((location, id) => ({ ...location, id }))
    .filter(({ id, u, v }) => !rock.has(id) && !coralIds.has(id)
      && u > CANOPY.left && u < CANOPY.right && v > CANOPY.top && v < CANOPY.bottom);
  const placed = locations.map((location, id) => coralIds.has(id) ? { u: .5 + (location.u - .5) * 1.08, v: .15 + (location.v - .20) * 1.15 } : location);
  return { rock, root: ids[0], coral: coralIds, base, parents: new Map(base.map(node => [node.id, node.parent])), candidates, locations: placed, events: [], dormant: [] };
}

function depthOf(nodes, id) {
  let depth = 0;
  for (let node = nodes.get(id); node && node.parent >= 0; node = nodes.get(node.parent)) depth++;
  return depth;
}

// Each event grows one branch towards a grain of evidence. The coral keeps its shape: growth
// beyond two extra branches lets the oldest of them go, and now and then one of the original twigs
// retreats, to regrow later where it was. Branches only reach upwards or sideways into open water.
function nextEvent(grow, nodes, index) {
  const recent = grow.events.slice(-4).flatMap(event => [event.add, event.prune]);
  const branches = [...nodes].filter(([, node]) => node.parent >= 0)
    .map(([id, node]) => ({ id, parent: node.parent, a: grow.locations[node.parent], b: grow.locations[id] }));
  const members = [...nodes.keys()].filter(id => depthOf(nodes, id) >= 2).map(id => ({ id, ...grow.locations[id] }));
  let choice = null;
  // A twig that retreated earlier grows back first, so the original form keeps returning.
  const regrow = grow.dormant.find(id => nodes.has(grow.parents.get(id)) && !recent.includes(id));
  if (regrow !== undefined) choice = { candidate: { id: regrow, ...grow.locations[regrow] }, parent: { id: grow.parents.get(regrow) } };
  else {
    const options = [];
    for (const candidate of grow.candidates) {
      if (nodes.has(candidate.id) || recent.includes(candidate.id)) continue;
      let parent = null, parentGap = Infinity, crowding = Infinity;
      for (const member of members) {
        const distance = gap(member, candidate);
        crowding = Math.min(crowding, distance);
        if (member.v >= candidate.v - .02 && distance < parentGap) { parent = member; parentGap = distance; }
      }
      for (const id of nodes.keys()) crowding = Math.min(crowding, gap(grow.locations[id], candidate));
      if (!parent || crowding < .04 || parentGap < .045 || parentGap > .12) continue;
      // New growth reaches into open water: clear of every branch, and crossing none of them.
      if (branches.some(({ a, b }) => segmentGap(candidate, a, b) < .035)) continue;
      if (branches.some(({ id, parent: from, a, b }) => id !== parent.id && from !== parent.id && crosses(parent, candidate, a, b))) continue;
      options.push({ candidate, parent });
    }
    if (options.length) choice = options[Math.floor(random(index * 7.31 + 3.17) * options.length)];
  }
  if (!choice) return { add: -1, parent: -1, prune: -1 };
  if (regrow !== undefined) grow.dormant.splice(grow.dormant.indexOf(regrow), 1);
  const children = new Set([...nodes.values()].map(node => node.parent));
  const leaves = [...nodes.keys()].filter(id => !children.has(id) && id !== choice.parent.id && id !== choice.candidate.id);
  const extra = leaves.filter(id => !grow.parents.has(id)).sort((a, b) => nodes.get(a).joined - nodes.get(b).joined);
  const added = [...nodes.keys()].filter(id => !grow.parents.has(id)).length + (grow.parents.has(choice.candidate.id) ? 0 : 1);
  let prune = -1;
  if (added > EXTRA_BRANCHES && extra.length) prune = extra[0];
  else if (index % RETREAT_EVERY === RETREAT_EVERY - 1) {
    const twigs = leaves.filter(id => grow.parents.has(id) && depthOf(nodes, id) >= 3 && !grow.dormant.includes(id));
    if (twigs.length) { prune = twigs[Math.floor(random(index * 3.1 + .7) * twigs.length)]; grow.dormant.push(prune); }
  }
  return { add: choice.candidate.id, parent: choice.parent.id, prune };
}

/** The coral as it stands once the given number of events have finished. */
function structureAfter(grow, count) {
  const nodes = new Map(grow.base.map(node => [node.id, { parent: node.parent, joined: node.arrival - 1 }]));
  for (let index = 0; index < count; index++) {
    if (!grow.events[index]) grow.events[index] = nextEvent(grow, nodes, index);
    const { add, parent, prune } = grow.events[index];
    if (add >= 0) nodes.set(add, { parent, joined: index });
    if (prune >= 0) nodes.delete(prune);
  }
  return nodes;
}

/** Caption, detail and every branch and coloured grain at this age. */
export function adaptGrowPresentation(grow, age, reducedMotion = false) {
  const seconds = reducedMotion ? FIRST_EVENT + EVENT_INTERVAL - .4 : Math.max(0, Number.isFinite(age) ? age : 0);
  const growth = reducedMotion ? 1 : growthAt((seconds - GROW_START) / GROW_DURATION);
  const event = seconds < FIRST_EVENT ? -1 : Math.floor((seconds - FIRST_EVENT) / EVENT_INTERVAL);
  const local = event < 0 ? 0 : seconds - FIRST_EVENT - event * EVENT_INTERVAL;
  const nodes = structureAfter(grow, Math.max(0, event));
  const current = event >= 0 ? (structureAfter(grow, event + 1), grow.events[event]) : null;
  const baseArrival = new Map(grow.base.map(node => [node.id, node.arrival]));
  // `edges` are the branches as far as they have grown. `shape` is the whole form each branch bends
  // within, with a weight for a branch still arriving or letting go, so curves ease as it changes.
  const edges = [], marks = [], shape = [];
  for (const [id, node] of nodes) {
    const arrival = baseArrival.get(id);
    const reached = arrival === undefined || (growth > 0 && growth >= arrival);
    const leaving = current && id === current.prune ? 1 - smooth((local - PRUNE_START) / PRUNE) : 1;
    if (node.parent >= 0) {
      const parentArrival = baseArrival.get(node.parent) ?? 0;
      const grown = arrival === undefined ? 1 : clamp((growth - parentArrival) / Math.max(1e-6, arrival - parentArrival));
      const progress = grown * leaving;
      shape.push({ from: node.parent, to: id, weight: leaving });
      if (progress > 0) edges.push({ from: node.parent, to: id, progress, tip: leaving < 1 ? leaving : grown < 1 ? 1 : 0 });
    }
    const alpha = reached ? leaving : 0;
    // Seconds since the growing branch reached this grain; the root simply appears as growth begins.
    const since = arrival === undefined || reducedMotion ? Infinity
      : Math.max(0, seconds - GROW_START - reachedAt(arrival) * GROW_DURATION);
    const scale = swell(since, node.parent < 0 ? 0 : BUD) * mix(BUD, 1, leaving);
    if (alpha > 0) marks.push({ id, rgb: colour(GREY, BLUE, leaving), alpha, ring: 0, scale });
  }
  let detail = growth < 1 ? 'Growing from what we built' : 'Learning from new evidence';
  if (current && current.add >= 0) {
    const reach = smooth((local - EVIDENCE) / REACH);
    const pulse = smooth(local / .25) * (1 - smooth((local - EVIDENCE - REACH) / .3));
    shape.push({ from: current.parent, to: current.add, weight: reach });
    if (reach > 0) edges.push({ from: current.parent, to: current.add, progress: reach, tip: reach < 1 ? 1 : 0 });
    // The evidence swells briefly as the branch arrives and it joins the coral.
    marks.push({ id: current.add, rgb: colour(CORAL, BLUE, smooth((local - EVIDENCE - REACH) / .3)), alpha: smooth(local / .25),
      ring: pulse, ringProgress: clamp((local % 1.2) / 1.1), scale: reducedMotion ? 1 : swell(local - EVIDENCE - REACH, 1) });
    if (local < EVIDENCE) detail = 'New evidence arrives';
    else if (local < EVIDENCE + REACH) detail = 'Growing towards it';
    else if (local >= PRUNE_START && local < PRUNE_START + PRUNE && current.prune >= 0) detail = 'Letting an old branch go';
  }
  return { caption: '03 / ADAPT & GROW', detail, edges, marks, shape, event, local, growth };
}

/** While the heap gathers, its grains are drawn gently towards the middle as they fall. */
export const heapPull = age => smooth(age / .5) * (1 - smooth((age - 2.7) / 1.1));

// The direction a branch is heading as it passes through each grain. A stem carries straight on
// through a fork, bends evenly through a single joint, and lifts a little at an open tip, so every
// branch leaves its parent along the stem before curving away. `carry` is how many tips a grain
// supports, which sets how firm the branch below it is drawn.
function headings(points, shape) {
  const children = new Map(), parent = new Map(), place = new Map(), heading = new Map(), load = new Map();
  const at = id => { if (!place.has(id)) place.set(id, points(id)); return place.get(id); };
  for (const { from, to, weight } of shape) {
    parent.set(to, from);
    if (!children.has(from)) children.set(from, []);
    children.get(from).push({ to, weight });
  }
  const unit = (x, y) => { const length = Math.hypot(x, y) || 1; return { x: x / length, y: y / length }; };
  const solve = id => {
    if (heading.has(id)) return heading.get(id);
    const here = at(id), from = parent.get(id);
    const into = from === undefined ? { x: 0, y: -1 } : unit(here.x - at(from).x, here.y - at(from).y);
    let x = into.x, y = into.y, held = 0;
    for (const { to, weight } of children.get(id) || []) {
      const out = unit(at(to).x - here.x, at(to).y - here.y);
      const aligned = Math.max(0, into.x * out.x + into.y * out.y) ** 2 * weight;
      x += out.x * aligned; y += out.y * aligned; held += weight;
    }
    y -= .22 * (1 - clamp(held));
    const result = unit(x, y);
    heading.set(id, result);
    return result;
  };
  const carry = id => {
    if (load.has(id)) return load.get(id);
    let tips = 0, held = 0;
    for (const { to, weight } of children.get(id) || []) { tips += weight * carry(to); held += weight; }
    // A grain with no branch beyond it is a tip; one whose branch is arriving or leaving is partly so.
    const result = tips + (1 - clamp(held));
    load.set(id, result);
    return result;
  };
  const root = shape.find(({ from }) => !parent.has(from))?.from;
  return { at, solve, share: id => root === undefined ? 1 : clamp(carry(id) / (carry(root) || 1)) };
}

/** The branch colour: the site blue laid softly on the paper, mixed so overlapping stems at a fork stay even. */
export const BRANCH = [243, 240, 232].map((paper, i) => Math.round(mix(paper, BLUE[i], .5)));
/** How firm a branch is drawn for the share of the coral's tips it carries: the trunk about twice a twig. */
export const branchWeight = share => 1 + 1.4 * clamp(share) ** .8;

/** Curved branches, firmer towards the trunk, then the grains the coral has joined, in colour. */
export function drawAdaptGrow(ctx, points, state, { width, height, opacity = 1 } = {}) {
  const radius = clamp(width * .0051, 1.35, 2.1), line = clamp(Math.min(width, height) / 480, .7, 1);
  const { at, solve, share } = headings(points, state.shape || state.edges.map(edge => ({ ...edge, weight: 1 })));
  const buds = [];
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = `${css(BRANCH)}${opacity.toFixed(3)})`;
  for (const { from, to, progress, tip } of state.edges) {
    const a = at(from), b = at(to), leave = solve(from), arrive = solve(to);
    const span = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // A branch that turns sharply keeps a shorter run along its stem, so a bend never bulges.
    const along = Math.max(0, (leave.x * (b.x - a.x) + leave.y * (b.y - a.y)) / span);
    const into = Math.max(0, (arrive.x * (b.x - a.x) + arrive.y * (b.y - a.y)) / span);
    const out = span * .34 * (.3 + .7 * along), back = span * .3 * (.4 + .6 * into);
    const c1 = { x: a.x + leave.x * out, y: a.y + leave.y * out }, c2 = { x: b.x - arrive.x * back, y: b.y - arrive.y * back };
    // Draw the curve only as far as it has grown, keeping its shape.
    const t = clamp(progress), between = (p, q) => ({ x: mix(p.x, q.x, t), y: mix(p.y, q.y, t) });
    const p01 = between(a, c1), p12 = between(c1, c2), p23 = between(c2, b);
    const p012 = between(p01, p12), p123 = between(p12, p23), end = between(p012, p123);
    ctx.lineWidth = line * branchWeight(share(to));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(p01.x, p01.y, p012.x, p012.y, end.x, end.y); ctx.stroke();
    if (tip > 0) buds.push({ ...end, alpha: tip });
  }
  for (const bud of buds) {
    ctx.fillStyle = `${css(BLUE)}${(.9 * bud.alpha * opacity).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(bud.x, bud.y, radius * BUD, 0, TAU); ctx.fill();
  }
  for (const mark of state.marks) {
    const p = at(mark.id), size = radius * (mark.scale ?? 1);
    if (mark.ring > 0) {
      ctx.strokeStyle = `${css(CORAL)}${(.24 * mark.ring * (1 - mark.ringProgress) ** 2 * opacity).toFixed(3)})`; ctx.lineWidth = .65;
      ctx.beginPath(); ctx.arc(p.x, p.y, mix(3, 9, mark.ringProgress) * Math.min(1, Math.min(width, height) / 360), 0, TAU); ctx.stroke();
    }
    if (!(size > .05)) continue;
    ctx.fillStyle = `${css(mark.rgb)}${(.95 * mark.alpha * opacity).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
