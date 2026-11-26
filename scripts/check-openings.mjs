import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { CHART, chartFrame, surveyCourse, surveyProgress, drawChart, hush as chartHush } from '../src/scripts/art/chart.mjs';
import { STRANDS, strandsFrame, strandAt, ropeWalk, drawStrands } from '../src/scripts/art/strands.mjs';

// The two openings as they are laid out on a desktop, a short laptop, a tablet and a phone, each
// with the box its copy occupies within the canvas.
const WORK = [
  { width: 1440, height: 900, quiet: { x: 82, y: 522, width: 1276, height: 306 } },
  { width: 1280, height: 640, quiet: { x: 64, y: 316, width: 1152, height: 252 } },
  { width: 768, height: 1024, quiet: { x: 38, y: 652, width: 692, height: 300 } },
  { width: 390, height: 844, quiet: { x: 24, y: 346, width: 342, height: 442 } },
];
const PEOPLE = [
  { width: 1440, height: 900, quiet: { x: 82, y: 514, width: 1276, height: 314 } },
  { width: 1280, height: 740, quiet: { x: 64, y: 367, width: 1152, height: 301 } },
  { width: 768, height: 1024, quiet: { x: 38, y: 563, width: 692, height: 389 } },
  { width: 390, height: 937, quiet: { x: 24, y: 262, width: 342, height: 619 } },
];
// A cramped opening too: copy that leaves little paper above it must still be kept clear.
const CRAMPED = { width: 390, height: 700, quiet: { x: 24, y: 232, width: 342, height: 412 } };
const inside = (x, y, box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
const finite = values => values.every(Number.isFinite);
const seconds = CHART.loop;

// Records what is drawn, with the strength it is drawn at.
function recorder() {
  return {
    marks: [], path: [], stack: [], dash: [], globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: '', lineJoin: '',
    save() { this.stack.push({ globalAlpha: this.globalAlpha, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth, lineCap: this.lineCap }); },
    restore() { assert.ok(this.stack.length, 'Canvas restores must match saves'); Object.assign(this, this.stack.pop()); },
    setLineDash(dash) { this.dash = dash; },
    beginPath() { this.path = []; },
    closePath() {},
    arc(x, y, radius, from, to) { assert.ok(finite([x, y, radius, from, to]) && radius > 0); this.path.push([x, y]); },
    moveTo(x, y) { assert.ok(finite([x, y])); this.path.push([x, y]); },
    lineTo(x, y) { assert.ok(finite([x, y])); this.path.push([x, y]); },
    fill() { this.marks.push({ kind: 'fill', alpha: this.globalAlpha, style: this.fillStyle, path: this.path }); },
    stroke() { this.marks.push({ kind: 'stroke', alpha: this.globalAlpha, style: this.strokeStyle, width: this.lineWidth, dashed: this.dash.length > 0, path: this.path }); },
  };
}

test('the chart is a pure function of the time, with finite geometry at every size', () => {
  for (const { width, height, quiet } of [...WORK, CRAMPED]) for (const time of [0, 7.3, 21, 44.6, 52.99, 300.5]) {
    const frame = chartFrame(width, height, time, { quiet });
    assert.deepEqual(chartFrame(width, height, time, { quiet }), frame, 'The same moment is always drawn the same way');
    for (const piece of [...frame.grid, ...frame.contours]) assert.ok(finite([piece.x1, piece.y1, piece.x2, piece.y2, piece.alpha]));
    for (const mark of frame.soundings) assert.ok(finite([mark.x, mark.y, mark.alpha]));
    assert.ok(frame.track.points.flat().every(Number.isFinite) && finite([frame.head.x, frame.head.y, frame.head.alpha]));
    const first = recorder(), second = recorder();
    drawChart(first, width, height, time, { quiet });
    drawChart(second, width, height, time, { quiet });
    assert.deepEqual(first.marks, second.marks);
    assert.equal(first.stack.length, 0, 'Drawing restores the canvas state');
    assert.deepEqual(first.dash, [], 'and leaves no dash set');
  }
  for (const size of [[0, 900], [1440, 0], [NaN, 10]]) {
    assert.deepEqual(chartFrame(...size, 3), { grid: [], contours: [], soundings: [], track: null, head: null });
    const blank = recorder(); drawChart(blank, ...size, 3); assert.equal(blank.marks.length, 0);
  }
});

test('the chart is drawn lightly, on the open paper above the copy and never across it', () => {
  assert.ok(CHART.contour <= .32 && CHART.index <= .5 && CHART.sounding <= .45 && CHART.grid <= .1 && CHART.track <= .6 && CHART.hush <= .05);
  assert.ok(CHART.index > CHART.contour, 'Index contours are a little firmer than the rest');
  for (const { width, height, quiet } of [...WORK, CRAMPED]) {
    for (let step = 0; step < 200; step++) {
      const frame = chartFrame(width, height, step * seconds / 200, { quiet });
      for (const piece of frame.grid) assert.ok(piece.alpha > 0 && piece.alpha <= CHART.grid + 1e-9);
      for (const piece of frame.contours) assert.ok(piece.alpha > 0 && piece.alpha <= (piece.index ? CHART.index : CHART.contour) + 1e-9);
      for (const mark of frame.soundings) assert.ok(mark.alpha > 0 && mark.alpha <= CHART.sounding + 1e-9);
      assert.ok(frame.track.alpha <= CHART.track + 1e-9 && frame.head.alpha <= CHART.head + 1e-9);
      const marks = [...frame.grid, ...frame.contours].map(piece => [(piece.x1 + piece.x2) / 2, (piece.y1 + piece.y2) / 2, piece.alpha]).concat(frame.soundings.map(mark => [mark.x, mark.y, mark.alpha]));
      for (const [x, y, alpha] of marks) {
        if (y >= quiet.y - 1) assert.ok(alpha <= CHART.hush, 'Nothing of the chart shows level with the copy or below it');
        assert.ok(alpha <= (y < 40 ? .26 : 1) * CHART.index + 1e-9, 'and it is lighter behind the navigation');
      }
      // The track is sailed above the copy, clear of it, and on the canvas.
      for (const [x, y] of frame.track.points) assert.ok(y < quiet.y - 30 && y > 80 && x > 0 && x < width && !inside(x, y, quiet));
      const drawn = recorder();
      drawChart(drawn, width, height, step * seconds / 200, { quiet });
      assert.ok(drawn.marks.every(mark => mark.alpha <= CHART.head * 1.1 + 1e-9 && mark.alpha >= 0));
      assert.ok(drawn.marks.filter(mark => mark.kind === 'stroke' && mark.style === 'rgb(36,78,255)' && !mark.dashed).every(mark => mark.alpha <= CHART.index + 1e-9 && mark.width <= 1.2), 'Fine blue line throughout');
    }
    assert.equal(chartHush(quiet.x + 40, quiet.y + 40, quiet), 0);
    assert.ok(chartHush(width / 2, Math.max(130, quiet.y - 200), quiet) > .9);
  }
});

test('the survey sails long joined passes, and the chart is found only as far as it has been', () => {
  for (const { width, height, quiet } of [...WORK, CRAMPED]) {
    const course = surveyCourse(width, height, quiet);
    assert.ok(course.passes >= 1 && course.passes <= 3 && (course.passes > 1 || quiet === CRAMPED.quiet));
    for (let i = 1; i < course.points.length; i++) {
      assert.ok(course.run[i] - course.run[i - 1] < 9, 'The course has no gaps or jumps');
    }
    assert.ok(course.reach >= course.gap * .55, 'Neighbouring passes reveal one continuous chart');
    assert.ok(course.length > width * (course.passes > 1 ? 1.4 : .6), 'There is a real journey to make');
    assert.ok(course.points.every(([x, y]) => y < quiet.y - 30 && y > 80 && x > 0 && x < width), 'It is sailed on the paper above the copy');
    // Nothing is charted before the track sets out; then what is known only grows until the chart clears.
    const known = time => {
      const frame = chartFrame(width, height, time - CHART.lead, { quiet });
      return { strength: frame.contours.reduce((sum, piece) => sum + piece.alpha, 0) + frame.soundings.reduce((sum, mark) => sum + mark.alpha, 0), frame };
    };
    assert.equal(known(.2).strength, 0, 'A blank chart to begin with');
    let last = 0;
    for (let time = CHART.sets; time <= CHART.clears[0]; time += .5) {
      const now = known(time).strength;
      assert.ok(now >= last - 1e-9, 'What is known never shrinks while the survey is under way');
      last = now;
    }
    assert.ok(last > (course.passes > 1 ? 20 : 4), 'A full chart by the end');
    // Ahead of the track the paper is blank: early on, every charted mark lies near where it has been.
    const early = known(CHART.sets + (CHART.lands - CHART.sets) * .3).frame, sailed = early.track.points;
    for (const piece of early.contours) {
      const x = (piece.x1 + piece.x2) / 2, y = (piece.y1 + piece.y2) / 2;
      assert.ok(Math.min(...sailed.map(([px, py]) => Math.hypot(px - x, py - y))) <= course.reach + 7, 'No contour appears beyond the reach of the track so far');
    }
    // The head is always the end of the track, and it only moves forward.
    let along = 0;
    for (let time = 0; time < CHART.loop; time += .25) {
      const { frame } = known(time), [x, y] = frame.track.points.at(-1);
      assert.ok(Math.hypot(frame.head.x - x, frame.head.y - y) < 1e-9);
      assert.ok(frame.progress.along >= along - 1e-12); along = frame.progress.along;
    }
  }
});

test('the contours are continuous curves of varied spacing, with a few index contours among them', () => {
  for (const { width, height, quiet } of [...WORK, CRAMPED]) {
    const frame = chartFrame(width, height, CHART.clears[0] - CHART.lead - .1, { quiet });
    assert.ok(frame.contours.length > (quiet === CRAMPED.quiet ? 40 : 250) && frame.contours.length < 9000, `${frame.contours.length} short pieces`);
    const index = frame.contours.filter(piece => piece.index).length / frame.contours.length;
    assert.ok(index > .1 && index < .45, 'Some index contours, not most');
    // Each piece is short and meets another at both ends, unless it ends at the edge of what is charted.
    const ends = new Map(), name = (x, y) => `${x.toFixed(3)},${y.toFixed(3)}`;
    for (const piece of frame.contours) {
      const length = Math.hypot(piece.x2 - piece.x1, piece.y2 - piece.y1);
      assert.ok(length >= .6 && length < 13, 'Short pieces, and none of no length');
      for (const end of [name(piece.x1, piece.y1), name(piece.x2, piece.y2)]) ends.set(end, (ends.get(end) || 0) + 1);
    }
    const joined = [...ends.values()].filter(count => count === 2).length / ends.size;
    assert.ok(joined > .8, 'Contours run on as curves; they are not broken dashes');
    assert.ok([...ends.values()].every(count => count <= 2), 'and never cross or fork');
    assert.ok(frame.soundings.length > 6 && frame.soundings.some(mark => !mark.cross));
  }
});

test('the chart loops without a cut: it is held, fades, and the survey sets out again', () => {
  const { width, height, quiet } = WORK[0];
  assert.ok(CHART.loop >= 60 && CHART.sets < CHART.lands && CHART.lands < CHART.clears[0] && CHART.clears[0] < CHART.clears[1] && CHART.clears[1] < CHART.loop);
  assert.ok(CHART.clears[1] - CHART.clears[0] >= 4, 'The chart fades gently');
  const at = time => chartFrame(width, height, time - CHART.lead, { quiet });
  // The same moment comes round again exactly, loop after loop.
  const same = (a, b) => {
    assert.equal(a.contours.length, b.contours.length); assert.equal(a.soundings.length, b.soundings.length);
    a.contours.forEach((piece, i) => assert.ok(Math.abs(piece.alpha - b.contours[i].alpha) < 1e-9 && piece.x1 === b.contours[i].x1));
    assert.ok(Math.hypot(a.head.x - b.head.x, a.head.y - b.head.y) < 1e-6 && Math.abs(a.track.alpha - b.track.alpha) < 1e-9);
  };
  same(at(0), at(CHART.loop)); same(at(13.7), at(13.7 + 3 * CHART.loop)); same(at(61.2), at(61.2 - CHART.loop));
  // Across the end of the loop every strength changes by a hair at most.
  const strongest = frame => Math.max(0, frame.track.alpha, frame.head.alpha, ...frame.contours.map(piece => piece.alpha), ...frame.soundings.map(mark => mark.alpha));
  for (let time = CHART.clears[0] - 1; time < CHART.loop + CHART.sets + 1; time += 1 / 30) {
    assert.ok(Math.abs(strongest(at(time + 1 / 30)) - strongest(at(time))) < .03, 'No strength jumps from one frame to the next');
  }
  assert.equal(strongest(at(CHART.loop - .1)), 0, 'The chart is clear before it begins again');
  assert.ok(at(CHART.loop - .1).grid.length > 20, 'while the graticule stays');
  // The page opens part-way through: a good half surveyed, the track mid-course.
  const opening = surveyProgress(0);
  assert.ok(opening.along > .4 && opening.along < .7 && opening.showing === 1);
});

test('the strands are a pure function of the time, with finite geometry at every size', () => {
  assert.ok(STRANDS.colours.length >= 5 && STRANDS.colours.length <= 6);
  assert.ok(STRANDS.colours.filter(colour => colour === 'blue').length >= 2 && STRANDS.colours.filter(colour => colour === 'coral').length >= 2, 'Both colours are clearly present');
  for (const { width, height, quiet } of [...PEOPLE, CRAMPED]) for (const time of [0, 3.1, 9, 47.25, 600]) {
    const frame = strandsFrame(width, height, time, { quiet });
    assert.deepEqual(strandsFrame(width, height, time, { quiet }).runs, frame.runs, 'The same moment is always drawn the same way');
    assert.ok(frame.runs.length > STRANDS.colours.length * 4);
    for (const run of frame.runs) {
      assert.ok(run.points.length >= 2 && run.points.flat().every(Number.isFinite) && Number.isFinite(run.alpha));
      assert.ok(run.alpha >= 0 && run.alpha <= STRANDS.near + 1e-9);
      for (const [x, y] of run.points) if (inside(x, y, quiet)) assert.ok(run.alpha <= STRANDS.hush, 'No strand is drawn over the copy');
    }
    assert.deepEqual(new Set(frame.runs.map(run => run.index)), new Set(STRANDS.colours.map((_, i) => i)), 'Every strand is drawn');
    const first = recorder(), second = recorder();
    drawStrands(first, width, height, time, { quiet });
    drawStrands(second, width, height, time, { quiet });
    assert.deepEqual(first.marks, second.marks);
    assert.equal(first.stack.length, 0);
    assert.ok(first.marks.every(mark => mark.kind === 'stroke' && mark.alpha >= 0 && mark.alpha <= 1 && mark.width <= 4.5));
    assert.ok(first.marks.filter(mark => mark.style !== '#F3F0E8').every(mark => mark.width >= 1 && mark.width <= 1.5 && mark.alpha <= STRANDS.near + 1e-9), 'Strands are fine lines');
  }
  assert.deepEqual(strandsFrame(0, 900, 3).runs, []);
});

test('the strands come in apart, gather, and run on as one rope clear of the copy', () => {
  for (const { width, height, quiet } of [...PEOPLE, CRAMPED]) {
    const walk = ropeWalk(width, height, quiet), count = STRANDS.colours.length;
    assert.ok(walk.gather < walk.join && walk.join < width * .6, 'They are one rope for a good part of the opening');
    assert.ok(walk.top >= 90 && walk.floor <= Math.max(walk.top + 104, quiet.y - 30));
    for (const time of [0, 4.4, 9, 31.7]) {
      // Loose: well apart at the edge, each at its own height, none crossing another before they gather.
      const edge = STRANDS.colours.map((_, i) => strandAt(walk, i, 0, time).y).sort((a, b) => a - b);
      for (let i = 1; i < count; i++) assert.ok(edge[i] - edge[i - 1] > walk.radius * 1.4, 'The loose strands are clearly separate');
      assert.ok(edge.at(-1) - edge[0] > walk.radius * 7);
      for (let x = 0; x < walk.gather; x += 6) {
        const heights = STRANDS.colours.map((_, i) => strandAt(walk, i, x, time).y);
        for (let i = 1; i < count; i++) assert.ok(heights[i] > heights[i - 1], 'and do not cross while loose');
      }
      // Laid: every strand within the rope's own width, spaced evenly around it.
      for (let x = walk.join + 4; x < width; x += 9) {
        const strands = STRANDS.colours.map((_, i) => strandAt(walk, i, x, time));
        for (const strand of strands) {
          assert.ok(Math.abs(strand.y - walk.centre(x)) <= walk.radius + 1e-6 && Math.abs(strand.laid - 1) < 1e-9);
          assert.ok(strand.y > 60 && strand.y < quiet.y - 20, 'The rope runs above the copy');
        }
        const near = strands.filter(strand => strand.depth >= 0).length;
        assert.ok(near >= 2 && near <= count - 2, 'Strands pass on both the near and the far side, as in a rope');
        const angles = strands.map(strand => Math.atan2((strand.y - walk.centre(x)) / walk.radius, strand.depth)).sort((a, b) => a - b);
        for (let i = 1; i < count; i++) assert.ok(Math.abs(angles[i] - angles[i - 1] - Math.PI * 2 / count) < 1e-6, 'evenly round it: not two strands back and forth');
      }
    }
    // The copy is clear: on the way in and along the rope, nothing drawn reaches it.
    for (const run of strandsFrame(width, height, 9, { quiet }).runs) {
      for (const [x, y] of run.points) assert.ok(!inside(x, y, quiet) || run.alpha === 0);
    }
  }
});

test('near strands are drawn over far ones, with paper showing where they cross', () => {
  const { width, height, quiet } = PEOPLE[0];
  const frame = strandsFrame(width, height, 9, { quiet });
  const firstNear = frame.runs.findIndex(run => run.near);
  assert.ok(firstNear > 0 && frame.runs.slice(firstNear).every(run => run.near), 'Far runs first, then near runs');
  const laid = frame.runs.filter(run => run.laid > .98);
  assert.ok(laid.length > 20 && laid.filter(run => run.near).every(run => Math.abs(run.alpha - STRANDS.near) < .03) && laid.filter(run => !run.near).every(run => Math.abs(run.alpha - STRANDS.far) < .03));
  assert.ok(STRANDS.far < STRANDS.near * .6, 'The far side of the rope is clearly quieter');
  const drawn = recorder();
  drawStrands(drawn, width, height, 9, { quiet });
  const paper = drawn.marks.map((mark, i) => mark.style === '#F3F0E8' ? i : -1).filter(i => i >= 0);
  assert.ok(paper.length > 20, 'Paper is laid under each near strand of the rope');
  const lastFar = drawn.marks.findLastIndex(mark => mark.style !== '#F3F0E8' && mark.width < 1.3);
  const firstNearColour = drawn.marks.findIndex(mark => mark.style !== '#F3F0E8' && mark.width > 1.3);
  assert.ok(lastFar < paper[0] && paper.at(-1) < firstNearColour, 'Order: far strands, then the paper gaps, then near strands');
  assert.ok(drawn.marks.filter(mark => mark.style === '#F3F0E8').every(mark => mark.width > 3 && mark.width < 5), 'The gap is thin');
});

test('the lay travels slowly along the rope and the loose ends only sway', () => {
  const { width, height, quiet } = PEOPLE[0];
  const walk = ropeWalk(width, height, quiet);
  assert.ok(STRANDS.travel >= 5 && STRANDS.travel <= 18, 'Slow');
  // The whole pattern of the rope moves along it at the travel speed.
  const x = walk.join + 200, later = 2.5;
  STRANDS.colours.forEach((_, i) => {
    const before = strandAt(walk, i, x, 3), after = strandAt(walk, i, x + STRANDS.travel * later, 3 + later);
    assert.ok(Math.abs(before.depth - after.depth) < 1e-6);
  });
  for (let frame = 0; frame < 60 * 40; frame++) {
    const time = frame / 60;
    STRANDS.colours.forEach((_, i) => {
      for (const at of [0, walk.gather, (walk.gather + walk.join) / 2, walk.join + 120, width]) {
        const moved = Math.abs(strandAt(walk, i, at, time + 1 / 60).y - strandAt(walk, i, at, time).y);
        assert.ok(moved < .2, 'Nothing moves more than a fraction of a pixel a frame');
      }
      const sway = Math.abs(strandAt(walk, i, 0, time).y - strandAt(walk, i, 0, 0).y);
      assert.ok(sway < walk.depth * .07, 'The loose ends sway a little, no more');
    });
  }
});

test('with reduced motion each opening shows one still, composed moment', () => {
  for (const { width, height, quiet } of WORK) {
    const chart = chartFrame(width, height, 0, { quiet, reducedMotion: true });
    assert.deepEqual(chartFrame(width, height, 97.3, { quiet, reducedMotion: true }), chart);
    assert.deepEqual(chartFrame(width, height, 0, { quiet }), chart, 'The still is the moment the page opens on');
    assert.ok(chart.contours.length > 80 && chart.progress.along > .4 && chart.progress.along < .7, 'A good half surveyed, the track mid-course');
    assert.ok(chart.head.alpha > .5);
  }
  for (const { width, height, quiet } of PEOPLE) {
    const rope = strandsFrame(width, height, 0, { quiet, reducedMotion: true }).runs;
    assert.deepEqual(strandsFrame(width, height, 412, { quiet, reducedMotion: true }).runs, rope);
    assert.deepEqual(strandsFrame(width, height, STRANDS.still, { quiet }).runs, rope);
  }
});

test('both openings carry their artwork behind the copy without taking part in layout', async () => {
  const read = name => fs.readFile(new URL(`../src/${name}`, import.meta.url), 'utf8');
  const [work, people, css, site] = await Promise.all([read('our-work.html'), read('who-we-are.html'), read('styles/openings.css'), read('scripts/site.js')]);
  for (const [html, section, art] of [[work, 'work-opening', 'chart'], [people, 'people-hero', 'strands']]) {
    assert.match(html, /<link rel="stylesheet" href="\/styles\/openings\.css">/);
    const opening = html.match(new RegExp(`<section class="${section}"[^>]*>([\\s\\S]*?)</section>`))[1];
    assert.match(opening, new RegExp(`^\\s*<canvas data-art="${art}" aria-hidden="true"></canvas>\\s*<div class="[^"]+" data-art-quiet>`), 'The artwork comes first, hidden from assistive technology, then the copy it keeps clear of');
    assert.equal((opening.match(/<canvas/g) || []).length, 1);
    assert.equal((opening.match(/<h1\b/g) || []).length, 1);
    assert.ok(opening.indexOf('<h1') < opening.indexOf('<p'), 'The heading leads the reading order');
    assert.doesNotMatch(opening, /<br\b/, 'Lines break where the measure breaks them');
    assert.match(site, new RegExp(`${art}: \\(\\) => import\\('\\./art/${art}\\.mjs'\\)`));
    assert.match(site, new RegExp(`kind === '${art}'\\) state\\.art\\.draw\\w+\\(ctx, w, h, state\\.time, \\{ \\.\\.\\.options, quiet: state\\.quiet \\}\\)`));
  }
  // Our Work reads in one order: the lead, the line the page turns on, then the supporting copy.
  const order = ['work-opening-lead', 'work-opening-thesis', 'work-opening-support'].map(name => work.indexOf(`${name}"`));
  assert.ok(order.every(at => at > 0) && order[0] < order[1] && order[1] < order[2]);
  assert.equal((work.match(/<section class="work-opening"[\s\S]*?<\/section>/)[0].match(/<strong>/g) || []).length, 1, 'One emphasised line');
  // On Who We Are the way on to the team follows the copy it belongs to.
  assert.ok(people.indexOf('people-opening-detail') < people.indexOf('href="#people"'));
  assert.match(css, /\.work-opening > canvas,\s*\.people-hero > canvas \{[^}]*position:absolute;[^}]*inset:0;[^}]*pointer-events:none;/);
  assert.match(css, /\.work-opening,\s*\.people-hero \{[^}]*justify-content:flex-end;[^}]*min-height:max\(100svh,\d+px\);/, 'The copy sits at the foot of a full first screen');
  assert.doesNotMatch(css, /!important/);
});
