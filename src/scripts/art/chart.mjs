// Our Work opening: a chart being surveyed. The paper is the chart, ruled with a faint graticule.
// A survey track, a fine dashed line with a small ring at its head, works its way across the open
// part of the opening in long passes. Behind it the seabed appears, as depth contours and scattered
// sounding marks, only as far as the track has been. Ahead of it the chart is still blank. What is
// known grows as the work goes on; then the chart clears and the survey begins again.
// Everything is a pure function of the time, so any moment can be drawn again exactly.
const TAU = Math.PI * 2;
const BLUE = '36,78,255', CORAL = '255,102,85';
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const CHART = {
  loop: 96,        // seconds for one whole survey
  sets: 1.5,       // the track sets out
  lands: 80,       // and reaches the end of its last pass
  clears: [87, 93.5], // the finished chart is held, then fades over these seconds
  lead: 43,        // the page opens part-way through, with a good half already surveyed
  // Strengths. Nothing is ever stronger than these, and almost nothing shows under the copy.
  contour: .3, index: .5, sounding: .42, grid: .09, track: .55, head: .9, hush: .05,
};

// How much of a mark is let through at a point. The chart lies on the open paper above the copy: it
// thins out as it nears the copy and is not drawn level with it or below it, and it is lighter
// towards the top of the opening, where the navigation lies over it.
export function hush(x, y, quiet, feather = 110) {
  const header = .25 + .75 * smooth((y - 40) / 80);
  return quiet ? header * smooth((quiet.y - y) / feather) : header;
}

// The seabed: broad swells of several sizes laid over a gentle slope, so the contours run in long
// curves with a few closed shoals and hollows among them. `scale` is the size of its features.
function seabed(scale) {
  const swells = [2.6, 2.05, 1.6, 1.25, 1, .82, .68].map((size, i) => {
    const bearing = random(i * 3.7 + 2) * TAU, length = size * scale;
    return { kx: Math.cos(bearing) * TAU / length, ky: Math.sin(bearing) * TAU / length, phase: random(i * 5.1 + 9) * TAU, height: .34 * size ** .9 };
  });
  return (x, y) => {
    let depth = .95 * y / scale - .3 * x / scale;
    for (const swell of swells) depth += swell.height * Math.sin(x * swell.kx + y * swell.ky + swell.phase);
    return depth;
  };
}

// The course the survey sails: long passes across the open part of the opening, each a little lower
// than the last and joined by a half-turn, never quite ruler-straight.
export function surveyCourse(width, height, quiet) {
  const compact = width < 600;
  // It keeps to the paper above the copy: three passes where there is room, fewer where there is not.
  const top = Math.min(122, height * .2), floor = quiet ? Math.max(top + 96, quiet.y - 44) : height * .72;
  const passes = floor - top > 330 ? 3 : floor - top > 132 ? 2 : 1, gap = (floor - top) / passes, turn = Math.min(gap / 2, 90);
  const inset = passes > 1 ? turn : 0, left = width * (compact ? .1 : .065) + inset, right = width * (compact ? .9 : .935) - inset;
  const points = [];
  for (let pass = 0; pass < passes; pass++) {
    const y = top + gap * (pass + .5), eastward = pass % 2 === 0, wander = Math.min(13, gap * .085);
    const steps = Math.max(2, Math.ceil((right - left) / 6));
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, x = eastward ? mix(left, right, u) : mix(right, left, u);
      points.push([x, y + wander * Math.sin(u * Math.PI) * Math.sin(x * TAU / 470 + pass * 1.9)]);
    }
    if (pass === passes - 1) break;
    const x = eastward ? right : left, arcs = Math.max(6, Math.ceil(Math.PI * turn / 6));
    for (let i = 1; i < arcs; i++) {
      const angle = -Math.PI / 2 + Math.PI * i / arcs;
      points.push([x + (eastward ? 1 : -1) * Math.cos(angle) * turn, y + gap / 2 + Math.sin(angle) * gap / 2]);
    }
  }
  const run = [0];
  for (let i = 1; i < points.length; i++) run.push(run[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  // The survey reveals the seabed this far either side of the track, so neighbouring passes meet.
  return { points, run, length: run.at(-1), reach: Math.max(70, gap * .78), top, floor, gap, passes };
}

// Everything that does not change from one moment to the next: the graticule, every piece of every
// contour within reach of the course, and the sounding marks, each with the distance along the
// course at which the survey first reaches it and how near the track ever comes.
let chart = null;
function survey(width, height, quiet) {
  const key = [width, height, quiet?.x, quiet?.y, quiet?.width, quiet?.height].map(n => Math.round(n ?? -1)).join(':');
  if (chart?.key === key) return chart;
  const compact = width < 600, course = surveyCourse(width, height, quiet), { points, run, reach } = course;
  const scale = clamp(width * .32, 300, 470), depthAt = seabed(scale);
  // When the track first comes within reach of a point, and the nearest it ever comes.
  const found = (x, y) => {
    let first = -1, near = Infinity;
    for (let i = 0; i < points.length; i += 2) {
      const d = Math.hypot(points[i][0] - x, points[i][1] - y);
      if (d < near) near = d;
      if (first < 0 && d <= reach) first = run[i];
    }
    return first < 0 ? null : { first, shown: (1 - smooth((near - reach * .38) / (reach * .62))) * hush(x, y, quiet) };
  };
  // Contours by marching squares over a fine grid: each cell gives up to two short pieces a level.
  const step = compact ? 7 : 8, columns = Math.ceil(width / step), rows = Math.ceil(height / step), interval = .36;
  const depths = [];
  for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) depths.push(depthAt(column * step, row * step));
  const contours = [];
  const cross = (level, ax, ay, a, bx, by, b) => { const t = (level - a) / (b - a); return [mix(ax, bx, t), mix(ay, by, t)]; };
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const i = row * (columns + 1) + column, x = column * step, y = row * step;
    const nw = depths[i], ne = depths[i + 1], sw = depths[i + columns + 1], se = depths[i + columns + 2];
    const low = Math.min(nw, ne, sw, se), high = Math.max(nw, ne, sw, se);
    for (let n = Math.ceil(low / interval); n * interval < high; n++) {
      const level = n * interval + 1e-7, edges = [];
      if ((nw < level) !== (ne < level)) edges.push(cross(level, x, y, nw, x + step, y, ne));
      if ((ne < level) !== (se < level)) edges.push(cross(level, x + step, y, ne, x + step, y + step, se));
      if ((sw < level) !== (se < level)) edges.push(cross(level, x, y + step, sw, x + step, y + step, se));
      if ((nw < level) !== (sw < level)) edges.push(cross(level, x, y, nw, x, y + step, sw));
      // A saddle is joined the way its middle falls, so neighbouring contours never touch.
      if (edges.length === 4 && ((nw + ne + sw + se) / 4 < level) === (nw < level)) edges.push(edges.shift());
      for (let e = 0; e + 1 < edges.length; e += 2) {
        const [a, b] = [edges[e], edges[e + 1]];
        // A contour that clips the very corner of a cell leaves a piece of no length there; it is not drawn.
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < .6) continue;
        const at = found((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        if (at && at.shown > .01) contours.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1], index: n % 4 === 0, ...at });
      }
    }
  }
  // Sounding marks: one to a cell of a loose grid, shifted within it. Small dots, and now and then a cross.
  const soundings = [], spacing = compact ? 34 : 42;
  for (let row = 0; row * spacing < height; row++) for (let column = 0; column * spacing < width; column++) {
    const id = column * 131 + row * 1009 + 7;
    if (random(id) > .72) continue;
    const x = (column + .15 + .7 * random(id + 1)) * spacing, y = (row + .15 + .7 * random(id + 2)) * spacing, at = found(x, y);
    if (at && at.shown > .01) soundings.push({ x, y, cross: random(id + 3) < .16, ...at });
  }
  // The graticule, in short pieces so that it too can thin out towards the copy.
  const grid = [], rule = clamp(width / 8, 118, 188), piece = 34;
  const ruled = (x1, y1, x2, y2) => { const strength = CHART.grid * hush((x1 + x2) / 2, (y1 + y2) / 2, quiet); if (strength > .004) grid.push({ x1, y1, x2, y2, alpha: strength }); };
  for (let x = rule * .62; x < width; x += rule) for (let y = 0; y < height; y += piece) ruled(x, y, x, Math.min(height, y + piece));
  for (let y = rule * .44; y < height; y += rule) for (let x = 0; x < width; x += piece) ruled(x, y, Math.min(width, x + piece), y);
  return chart = { key, course, contours, soundings, grid };
}

/** Where the survey has got to at a time within the loop: how far along its course, and how much of the chart is left showing. */
export function surveyProgress(seconds, reducedMotion = false) {
  const time = reducedMotion ? CHART.lead : (((Number.isFinite(seconds) ? seconds : 0) + CHART.lead) % CHART.loop + CHART.loop) % CHART.loop;
  const sailed = clamp((time - CHART.sets) / (CHART.lands - CHART.sets));
  return {
    time,
    // The track eases away from its start and into its end.
    along: mix(sailed, smooth(sailed), .3),
    showing: 1 - smooth((time - CHART.clears[0]) / (CHART.clears[1] - CHART.clears[0])),
    setting: smooth(time / CHART.sets),
  };
}

/** Every mark of one moment as data: the graticule, the contours and soundings found so far, the track and its head. */
export function chartFrame(width, height, seconds, { quiet = null, reducedMotion = false } = {}) {
  if (!(width > 0 && height > 0)) return { grid: [], contours: [], soundings: [], track: null, head: null };
  const { course, contours, soundings, grid } = survey(width, height, quiet);
  const progress = surveyProgress(seconds, reducedMotion), sailed = progress.along * course.length, arriving = course.reach * .9;
  // A piece of the seabed comes up gradually once the track is within reach of it.
  const found = mark => mark.shown * smooth((sailed - mark.first) / arriving) * progress.showing;
  const frame = { grid, contours: [], soundings: [], track: null, head: null, course, progress };
  for (const piece of contours) {
    const alpha = (piece.index ? CHART.index : CHART.contour) * found(piece);
    if (alpha > .004) frame.contours.push({ x1: piece.x1, y1: piece.y1, x2: piece.x2, y2: piece.y2, index: piece.index, alpha });
  }
  for (const mark of soundings) {
    const alpha = CHART.sounding * found(mark);
    if (alpha > .004) frame.soundings.push({ x: mark.x, y: mark.y, cross: mark.cross, alpha });
  }
  // The track as far as it has been sailed, ending exactly where the head is.
  let last = 0;
  while (last + 1 < course.run.length && course.run[last + 1] <= sailed) last++;
  const points = course.points.slice(0, last + 1);
  if (last + 1 < course.points.length) {
    const t = (sailed - course.run[last]) / (course.run[last + 1] - course.run[last] || 1);
    points.push([mix(course.points[last][0], course.points[last + 1][0], t), mix(course.points[last][1], course.points[last + 1][1], t)]);
  }
  const [x, y] = points.at(-1), open = hush(x, y, quiet) * progress.showing * progress.setting;
  frame.track = { points, alpha: CHART.track * progress.showing * progress.setting };
  frame.head = { x, y, alpha: CHART.head * open };
  return frame;
}

// Many short pieces share few strengths, so they are stroked together, a strength at a time.
function strokeByStrength(ctx, pieces, most, width) {
  const levels = 12, groups = Array.from({ length: levels }, () => []);
  for (const piece of pieces) groups[Math.min(levels - 1, Math.floor(piece.alpha / most * levels))].push(piece);
  ctx.lineWidth = width;
  groups.forEach((group, level) => {
    if (!group.length) return;
    ctx.globalAlpha = Math.min(most, most * (level + .5) / levels);
    ctx.beginPath();
    for (const piece of group) { ctx.moveTo(piece.x1, piece.y1); ctx.lineTo(piece.x2, piece.y2); }
    ctx.stroke();
  });
}

/** The caller owns the canvas clear, DPR and visible animation clock. */
export function drawChart(ctx, width, height, seconds, options = {}) {
  if (!(width > 0 && height > 0)) return;
  const frame = chartFrame(width, height, seconds, options);
  ctx.save();
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle = `rgb(${BLUE})`;
  strokeByStrength(ctx, frame.grid, CHART.grid, .7);
  strokeByStrength(ctx, frame.contours.filter(piece => !piece.index), CHART.contour, .85);
  strokeByStrength(ctx, frame.contours.filter(piece => piece.index), CHART.index, 1.1);
  ctx.lineWidth = .8;
  for (const mark of frame.soundings) {
    ctx.globalAlpha = mark.alpha;
    ctx.beginPath();
    if (mark.cross) { ctx.moveTo(mark.x - 2.6, mark.y); ctx.lineTo(mark.x + 2.6, mark.y); ctx.moveTo(mark.x, mark.y - 2.6); ctx.lineTo(mark.x, mark.y + 2.6); ctx.stroke(); }
    else { ctx.arc(mark.x, mark.y, 1.15, 0, TAU); ctx.fill(); }
  }
  // The dashes are counted from the start of the track, so they stay put as it lengthens.
  if (frame.track.alpha > .004 && frame.track.points.length > 1) {
    ctx.globalAlpha = frame.track.alpha; ctx.lineWidth = 1; ctx.lineCap = 'butt'; ctx.setLineDash([5, 4.5]);
    ctx.beginPath();
    frame.track.points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (frame.head.alpha > .004) {
    const { x, y, alpha } = frame.head;
    ctx.strokeStyle = ctx.fillStyle = `rgb(${CORAL})`;
    ctx.globalAlpha = Math.min(1, alpha * 1.1); ctx.fillStyle = '#F3F0E8'; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, TAU); ctx.fill();
    ctx.globalAlpha = alpha; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgb(${CORAL})`; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
