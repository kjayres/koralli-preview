import assert from 'node:assert/strict';
import test from 'node:test';
import { drawJournalSubmersible, submersiblePose, SUBMERSIBLE } from '../src/scripts/art/journal-submersible.mjs';

function recorder({ gradients = false } = {}) {
  const calls = { paths: [], fills: 0, strokes: 0, gradients: 0, low: Infinity, high: -Infinity, left: Infinity, right: -Infinity, alphas: [] };
  const see = (x, y) => { assert.ok(Number.isFinite(x + y)); calls.low = Math.min(calls.low, y); calls.high = Math.max(calls.high, y); calls.left = Math.min(calls.left, x); calls.right = Math.max(calls.right, x); };
  const ctx = {
    globalAlpha: 1, strokeStyle: '', fillStyle: '', lineWidth: 1, depth: 0,
    save() { this.depth++; }, restore() { this.depth--; }, beginPath() {}, closePath() {},
    moveTo: see, lineTo: see,
    arc(x, y, radius, from, to) { assert.ok(radius > 0 && Math.abs(to - from - Math.PI * 2) < 1e-9); see(x, y - radius); see(x, y + radius); },
    stroke() { calls.strokes++; calls.alphas.push(this.globalAlpha); }, fill() { calls.fills++; calls.alphas.push(this.globalAlpha); },
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
      assert.ok(pose.y - pose.length * .3 > 90 && pose.y + pose.length * .25 < screen * .62, `It keeps to the open water at ${width}x${screen}`);
      assert.ok(Math.abs(pose.pitch) < .05, 'It stays level');
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
    assert.ok(calls.strokes >= 3 && calls.fills >= 5, 'Hull, outline and pilot, with lights and lit water');
    assert.equal(calls.gradients > 0, gradients, 'The beam fades smoothly where the canvas can, and in steps where it cannot');
    assert.ok(calls.low >= pose.y - pose.reach && calls.high <= pose.y + pose.reach, 'Nothing is drawn outside the band it is culled by');
    assert.ok(calls.alphas.every(alpha => alpha >= 0 && alpha <= 1) && Math.max(...calls.alphas.filter(alpha => alpha < 1)) <= 1);
    assert.ok(pose.alpha <= .45, 'As quiet as the animals around it');
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
