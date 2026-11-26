import assert from 'node:assert/strict';
import test from 'node:test';
import { drawJournalSubmersible, submersiblePose, pilotMarkup, pilotPose, craftMarkup, displayList, girth, SUBMERSIBLE, CRAFT, DEEP } from '../src/scripts/art/journal-submersible.mjs';
import { robotMarkup, makeProjector, PAPER, SHADE, GLASS, BLUE } from '../src/scripts/art/thesis-cards.mjs';

function recorder({ gradients = false } = {}) {
  const calls = { paths: [], fills: 0, strokes: 0, gradients: 0, low: Infinity, high: -Infinity, left: Infinity, right: -Infinity, alphas: [], colours: new Set() };
  const see = (x, y) => { assert.ok(Number.isFinite(x + y)); calls.low = Math.min(calls.low, y); calls.high = Math.max(calls.high, y); calls.left = Math.min(calls.left, x); calls.right = Math.max(calls.right, x); };
  const ctx = {
    globalAlpha: 1, strokeStyle: '', fillStyle: '', lineWidth: 1, depth: 0,
    save() { this.depth++; }, restore() { this.depth--; }, beginPath() {}, closePath() {},
    moveTo: see, lineTo: see,
    arc(x, y, radius, from, to) { assert.ok(radius > 0 && Math.abs(to - from - Math.PI * 2) < 1e-9); see(x, y - radius); see(x, y + radius); },
    stroke() { calls.strokes++; calls.alphas.push(this.globalAlpha); calls.colours.add(this.strokeStyle); }, fill() { calls.fills++; calls.alphas.push(this.globalAlpha); calls.colours.add(this.fillStyle); },
  };
  if (gradients) ctx.createLinearGradient = () => { calls.gradients++; return { addColorStop(at, colour) { assert.ok(at >= 0 && at <= 1); const alpha = Number(colour.match(/,([\d.]+)\)$/)[1]); assert.ok(alpha <= .05, 'The beam stays a faint wash'); } }; };
  return { ctx, calls };
}

test('the craft crosses the opening from right to left, steadily, and is in view when the page opens', () => {
  for (const [width, height, screen] of [[1440, 6000, 900], [1280, 5200, 620], [390, 7000, 844]]) {
    const options = { screen }, opening = submersiblePose(width, height, 0, options);
    assert.ok(opening.active && opening.x > width * .45 && opening.x < width * .95, 'A visitor sees it on arrival, on the open side of the page');
    assert.ok(opening.lit > .95, 'with its lamp already up');
    let passes = 0, was = false;
    for (let i = 0; i <= SUBMERSIBLE.cycle * 3 * 20; i++) {
      const time = i / 20, pose = submersiblePose(width, height, time, options), next = submersiblePose(width, height, time + .05, options);
      if (pose.active && !was) passes++;
      was = pose.active;
      assert.ok(pose.lit >= 0 && pose.lit <= 1);
      if (!pose.active || !next.active) continue;
      assert.ok(next.x < pose.x, 'It only ever travels to the left');
      assert.ok(pose.x - next.x < 6 && Math.abs(next.y - pose.y) < 1, 'No jump while it is in the water');
      // Between the navigation and the title, which sits at the foot of the first screen.
      assert.ok(pose.y - pose.length * .3 > 90 && pose.y + pose.length * .25 < screen * .66, `It keeps to the open water at ${width}x${screen}`);
      assert.ok(pose.pitch < 0 && pose.pitch > -.11, 'It holds a steady attitude, nose a touch down');
    }
    assert.ok(passes >= 3 && passes <= 4, 'One pass in each cycle');
    const leaving = submersiblePose(width, height, SUBMERSIBLE.crossing - SUBMERSIBLE.lead - .01, options);
    assert.ok(leaving.x < 0 && leaving.lit < .01, 'It is off the page with its lamp down before it is taken away');
    assert.ok(!submersiblePose(width, height, SUBMERSIBLE.crossing - SUBMERSIBLE.lead + 1, options).active, 'Then the water is empty until the next pass');
  }
  assert.ok(SUBMERSIBLE.crossing >= 30 && SUBMERSIBLE.cycle > SUBMERSIBLE.crossing + 10, 'Slow, and only now and then');
});

test('reduced motion shows one composed still, and an invalid time is safe', () => {
  const a = submersiblePose(1440, 6000, 5, { reducedMotion: true, screen: 900 }), b = submersiblePose(1440, 6000, 999, { reducedMotion: true, screen: 900 });
  assert.deepEqual(a, b);
  assert.ok(a.active && a.x > 1440 * .45 && a.x < 1440 * .9 && a.lit === 1);
  for (const time of [NaN, Infinity, -4]) assert.ok(Number.isFinite(submersiblePose(1440, 6000, time).x));
});

test('everything drawn lies within its stated reach, is faint, and is skipped whole when out of view', () => {
  for (const [width, compact] of [[1440, false], [390, true]]) for (const gradients of [false, true]) for (const time of [0, 3, 11, 20, 29]) {
    const { ctx, calls } = recorder({ gradients }), options = { compact, screen: 844 }, pose = submersiblePose(width, 6000, time, options);
    drawJournalSubmersible(ctx, width, 6000, time, options);
    assert.equal(ctx.depth, 0, 'The shared canvas state is restored');
    assert.ok(calls.strokes > 70 && calls.fills > 60, 'Solid shapes with clean outlines, as the service cards are drawn');
    for (const colour of Object.values(DEEP)) assert.ok(calls.colours.has(colour), 'in the colours of deep water');
    for (const colour of [PAPER, SHADE, GLASS, BLUE]) assert.ok(!calls.colours.has(colour), 'and none of the paper-page colours');
    assert.equal(calls.gradients > 0, gradients, 'The beam fades smoothly where the canvas can, and in steps where it cannot');
    assert.ok(calls.low >= pose.y - pose.reach && calls.high <= pose.y + pose.reach, 'Nothing is drawn outside the band it is culled by');
    assert.ok(calls.alphas.every(alpha => alpha >= 0 && alpha <= 1) && Math.max(...calls.alphas.filter(alpha => alpha < 1)) <= 1);
    // The beam points ahead and down: the lowest and leftmost marks belong to it.
    assert.ok(calls.left < pose.x - pose.length && calls.high > pose.y + pose.length * .6);
    for (const viewport of [{ top: pose.y + pose.reach + 1, bottom: pose.y + pose.reach + 900 }, { top: 0, bottom: pose.y - pose.reach - 1 }]) {
      const away = recorder({ gradients });
      drawJournalSubmersible(away.ctx, width, 6000, time, { ...options, viewport });
      assert.equal(away.calls.strokes + away.calls.fills, 0);
    }
  }
  const empty = recorder();
  drawJournalSubmersible(empty.ctx, 1440, 6000, SUBMERSIBLE.crossing - SUBMERSIBLE.lead + 5, { screen: 900 });
  assert.equal(empty.calls.strokes + empty.calls.fills, 0, 'Between passes it draws nothing');
});

test('the pilot is the same agent as on the homepage and the cards, seated facing ahead with both hands on the yoke', () => {
  // Built by the shared figure function, not a look-alike: its markup carries that figure's marks.
  const markup = pilotMarkup(3);
  const reference = robotMarkup(makeProjector(), { x: 0, y: 0 });
  const signature = text => ({ screens: (text.match(/fill-opacity="\.82"/g) || []).length, visors: (text.match(/fill-opacity="\.28"/g) || []).length });
  assert.deepEqual(signature(markup), signature(reference), 'The chest screen and the visor');
  assert.ok((markup.match(/<circle/g) || []).length >= (reference.match(/<circle/g) || []).length, 'Every joint, the grippers and the antenna');
  const list = displayList(markup);
  assert.ok(list.length > 40 && list.every(item => item.circle || item.points.length >= 2));
  assert.ok(list.every(item => ![PAPER, SHADE, GLASS, BLUE].includes(item.fill) && ![PAPER, SHADE, GLASS, BLUE].includes(item.stroke)), 'Recoloured for deep water');
  const { centre, radius } = CRAFT.sphere, inside = point => Math.hypot(...point.map((v, k) => v - centre[k])) < radius - 1;
  const still = pilotPose(0), limb = 8.6, arm = 10.5;
  // It faces the way the craft is going, not the viewer.
  assert.ok(Math.abs(Math.sin(still.heading) - CRAFT.forward[0]) < 1e-9 && Math.abs(Math.cos(still.heading) - CRAFT.forward[1]) < 1e-9, 'It looks where the craft is heading');
  assert.ok(Math.abs(still.hips[1]) < 1e-9 && Math.abs(still.hips[2] - still.seat) < 1, 'It sits on the seat, on the centreline');
  for (let i = 0; i < 400; i++) {
    const pose = pilotPose(i / 7);
    assert.deepEqual(pose.feet, still.feet, 'It stays in its seat');
    assert.deepEqual(pose.hips, still.hips);
    pose.feet.forEach(foot => {
      assert.equal(foot[2], CRAFT.floor, 'Both feet are flat on the cabin floor');
      assert.ok(foot[0] > pose.hips[0] + 6, 'out in front of it');
      // Hip to ankle is well short of a straight leg: the knee is bent about a right angle, as one sits.
      const span = Math.hypot(foot[0] - pose.hips[0], foot[2] + 2.4 - pose.hips[2]);
      assert.ok(span > limb * 1.2 && span < limb * 1.6, `A seated knee, not a standing or folded one (${span.toFixed(1)})`);
      assert.ok(inside(foot));
    });
    const [near, far] = pose.hands, top = pose.yoke[1];
    assert.ok(near[1] > 0 && Math.abs(near[1] + far[1]) < 1e-9, 'A hand at each end of the bar');
    assert.ok(Math.abs((near[0] + far[0]) / 2 - top[0]) < 1e-9 && Math.abs((near[2] + far[2]) / 2 - top[2]) < 1e-9, 'and the bar turns about the top of its column');
    assert.ok(Math.abs(near[2] - far[2]) < 3.5, 'It steers gently');
    assert.equal(pose.yoke[0][2], CRAFT.floor, 'The column stands on the floor');
    for (const hand of pose.hands) {
      assert.ok(hand[0] > pose.hips[0] + 8 && inside(hand), 'Hands ahead of the body, inside the glass');
      assert.ok(Math.hypot(hand[0] - pose.hips[0], Math.abs(hand[1]) - 6.4, hand[2] - (pose.hips[2] + 13.6)) < arm * 2 - 2, 'within easy reach of its shoulders');
    }
    assert.ok(inside([pose.hips[0], 0, pose.hips[2] + 29.5]), 'Its antenna clears the glass');
  }
});

test('the craft is rounded: a turned hull, a glass sphere and curved fittings, with nothing boxed', () => {
  const { behind, ahead } = craftMarkup(), parts = [...displayList(behind), ...displayList(ahead)];
  const shapes = parts.filter(part => part.points && part.closed);
  assert.ok(shapes.length > 15);
  assert.ok(shapes.every(shape => shape.points.length >= 6), 'No four-cornered panels anywhere on it');
  const area = points => Math.abs(points.reduce((sum, [x, y], i) => { const [nx, ny] = points[(i + 1) % points.length]; return sum + x * ny - nx * y; }, 0)) / 2;
  const sharpest = points => Math.max(...points.map((point, i) => {
    const a = points[(i + points.length - 1) % points.length], b = points[(i + 1) % points.length];
    const turn = Math.atan2(b[1] - point[1], b[0] - point[0]) - Math.atan2(point[1] - a[1], point[0] - a[0]);
    return Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn)));
  }));
  // The largest outlines are the hull, the sphere and the collar between them: each is smooth all the way round.
  const largest = shapes.filter(shape => shape.stroke !== 'none').sort((a, b) => area(b.points) - area(a.points)).slice(0, 4);
  for (const shape of largest) {
    assert.ok(shape.points.length >= 24, 'Drawn as a curve');
    assert.ok(sharpest(shape.points) < .45, `No corner on it (${sharpest(shape.points).toFixed(2)})`);
  }
  // The hull is fullest behind the sphere and is drawn in steadily to a blunt tail.
  let last = Infinity;
  for (let x = CRAFT.bow; x >= CRAFT.stern; x -= 1) { const radius = girth(x); assert.ok(radius <= last + 1e-9 && radius > 3); last = radius; }
  assert.ok(girth(CRAFT.bow) === CRAFT.girth && girth(CRAFT.stern) < CRAFT.girth * .25);
  assert.ok(Math.sqrt(CRAFT.sphere.radius ** 2 - (CRAFT.bow - CRAFT.sphere.centre[0]) ** 2) < CRAFT.girth + 2, 'The sphere seats inside the collar');
});
