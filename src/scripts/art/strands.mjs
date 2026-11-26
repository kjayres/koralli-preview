// Who We Are opening: separate strands laid into one rope. Fine strands, blue for researchers and
// coral for operators, come in loose and apart at one side, each on its own gentle curve, then gather
// and twist into a single rope that runs on across the opening. The twist is drawn as rope is seen:
// a strand passes over the others on the near side and under them on the far side. The lay travels
// slowly along the rope, as if it were being laid, and the loose ends sway a little.
// Everything is a pure function of the time, so any moment can be drawn again exactly.
const TAU = Math.PI * 2;
const PAPER = '#F3F0E8', COLOURS = { blue: '36,78,255', coral: '255,102,85' };
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const STRANDS = {
  colours: ['blue', 'coral', 'blue', 'coral', 'blue'],
  travel: 10,    // pixels a second that the lay moves along the rope
  still: 9,      // the moment shown when nothing moves
  // Strengths: a strand on the near side of the rope, one on the far side, one still loose, and the
  // most that may show under the copy.
  near: .92, far: .4, loose: .8, hush: .05,
};

// How much of a strand is let through at a point: nothing inside the copy's box, everything a short
// way clear of it, and less towards the top of the opening, where the navigation lies over it.
export function hush(x, y, quiet, feather = 36) {
  const header = .25 + .75 * smooth((y - 40) / 70);
  if (!quiet) return header;
  const dx = Math.max(quiet.x - x, 0, x - quiet.x - quiet.width), dy = Math.max(quiet.y - y, 0, y - quiet.y - quiet.height);
  return header * smooth(Math.hypot(dx, dy) / feather);
}

// Where the rope runs: through the open space between the navigation and the copy, on a long gentle
// curve. The strands begin to gather at `gather` and are one rope from `join` onwards.
export function ropeWalk(width, height, quiet) {
  const compact = width < 600;
  const top = Math.min(120, height * .2), floor = Math.max(top + 104, quiet ? quiet.y - 40 : height * .66);
  const depth = floor - top, radius = clamp(width * .0084, 6.5, 12.5);
  return {
    top, floor, depth, radius, compact,
    lay: radius * 11,                         // the length of one full turn of a strand
    gather: width * (compact ? .08 : .12), join: width * (compact ? .52 : .47),
    fan: depth * (compact ? .34 : .37),       // how far apart the loose strands come in, either side of the middle
    centre: x => top + depth * (.5 + .085 * Math.sin(x / width * 2.6 + .7)),
  };
}

// One strand at a place along the opening: its height on the page, how far round the rope it is
// (`depth` runs from -1 on the far side to 1 on the near side) and how far it has been laid in.
export function strandAt(walk, index, x, time) {
  const count = STRANDS.colours.length, own = random(index * 4.3 + 2);
  const laid = smooth((x - walk.gather) / (walk.join - walk.gather));
  // Loose, a strand comes in at its own height and eases down to the rope, swaying a little on the way.
  const eased = 1 - smooth(x / (walk.join * (.84 + .16 * own)));
  const apart = (index / (count - 1) - .5) * 2 * walk.fan * eased;
  const sway = walk.depth * .028 * eased * Math.sin(x / (150 + 60 * own) + index * 2.1 + time * (.28 + .1 * own));
  // The twist tightens as the strands gather: no turn at all where they are loose, the full lay once joined.
  const span = walk.join - walk.gather, u = clamp((x - walk.gather) / span);
  const turned = x <= walk.join ? span * (u ** 3 - u ** 4 / 2) : span / 2 + (x - walk.join);
  const angle = index * TAU / count + (turned - STRANDS.travel * time) * TAU / walk.lay;
  return { x, y: walk.centre(x) + apart + sway + walk.radius * laid * Math.sin(angle), depth: laid * Math.cos(angle), laid };
}

/**
 * Every strand of one moment, cut into runs that are wholly on the near side of the rope or wholly on
 * the far side, in the order they are drawn: far runs, then near runs over them.
 */
export function strandsFrame(width, height, seconds, { quiet = null, reducedMotion = false } = {}) {
  if (!(width > 0 && height > 0)) return { runs: [], walk: null };
  const time = reducedMotion ? STRANDS.still : Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const walk = ropeWalk(width, height, quiet), runs = [], step = 3;
  STRANDS.colours.forEach((colour, index) => {
    let run = null;
    const close = () => {
      if (!run || run.points.length < 2) return;
      const middle = run.points[run.points.length >> 1], laid = run.laid / run.points.length;
      const strength = mix(STRANDS.loose, run.near ? STRANDS.near : STRANDS.far, laid * laid);
      runs.push({ index, colour, near: run.near, laid, points: run.points.map(point => [point.x, point.y]), alpha: strength * hush(middle.x, middle.y, quiet) });
    };
    for (let x = -12; x <= width + 12; x += step) {
      const point = strandAt(walk, index, x, time), near = point.depth >= 0;
      if (run && run.near !== near) {
        // A strand changes side at the edge of the rope: the run it leaves ends there, and the next begins.
        run.points.push(point); run.laid += point.laid; close(); run = null;
      }
      if (!run) run = { near, points: [], laid: 0 };
      run.points.push(point); run.laid += point.laid;
    }
    close();
  });
  // Far runs first, then near runs, so every near strand is drawn over what passes behind it.
  runs.sort((a, b) => a.near - b.near || a.index - b.index);
  return { runs, walk, time };
}

function trace(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

/** The caller owns the canvas clear, DPR and visible animation clock. */
export function drawStrands(ctx, width, height, seconds, options = {}) {
  if (!(width > 0 && height > 0)) return;
  const { runs } = strandsFrame(width, height, seconds, options);
  ctx.save();
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const run of runs.filter(run => !run.near)) {
    if (run.alpha < .01) continue;
    ctx.globalAlpha = run.alpha; ctx.strokeStyle = `rgb(${COLOURS[run.colour]})`; ctx.lineWidth = 1.15;
    trace(ctx, run.points);
  }
  // Where a near strand crosses a far one, a little paper shows either side of it, as the gap between
  // two strands of a rope does. Loose strands do not cross, so they are given none.
  const near = runs.filter(run => run.near && run.alpha >= .01);
  for (const run of near) {
    if (run.laid < .05) continue;
    ctx.globalAlpha = Math.min(1, run.laid * 1.4) * Math.min(1, run.alpha / STRANDS.far); ctx.strokeStyle = PAPER; ctx.lineWidth = 4.4;
    trace(ctx, run.points);
  }
  for (const run of near) {
    ctx.globalAlpha = run.alpha; ctx.strokeStyle = `rgb(${COLOURS[run.colour]})`; ctx.lineWidth = 1.45;
    trace(ctx, run.points);
  }
  ctx.restore();
}
