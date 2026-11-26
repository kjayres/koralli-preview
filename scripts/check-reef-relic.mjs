import assert from 'node:assert/strict';
import test from 'node:test';
import { reefHabitat } from '../src/scripts/art/reef-habitat.mjs';
import { reefRockFragments } from '../src/scripts/art/reef-terrain.mjs';
import { reefRelic, paintRelic, shimmer, wheelAngles, INSCRIPTION, SHIMMER_EVERY, SHIMMER_LASTS, WHEEL_TURNS_IN } from '../src/scripts/art/reef-relic.mjs';
import { Reef, movingFish } from '../src/scripts/art/reef.mjs';
import { movingTurtle } from '../src/scripts/art/reef-turtle.mjs';

const layouts = [false, true].map(compact => {
  const rocks = reefRockFragments(reefHabitat(compact), compact);
  return { compact, rocks, relic: reefRelic(rocks, compact) };
});

test('the carved stone is seated on the front limestone slab, in both layouts', () => {
  for (const { compact, rocks, relic } of layouts) {
    const slab = rocks.find(rock => rock.name === `Limestone outcrop ${compact ? 1 : 2}`), [low, high] = slab.bounds;
    assert.ok(relic, 'The reef has its maker\'s mark');
    assert.ok(relic.bounds[0][0] > low[0] && relic.bounds[1][0] < high[0], 'The stone stands within the slab from side to side');
    assert.ok(relic.face > low[1] && relic.face + relic.depth < high[1], 'and from front to back');
    assert.ok(relic.base < high[2] && relic.base > high[2] - (high[2] - low[2]) * .6, 'Its foot is sunk into the slab\'s top, not floating over it');
    for (const mesh of relic.meshes) {
      assert.ok(mesh.vertices.flat().every(Number.isFinite) && mesh.faces.length > 8);
      assert.ok(mesh.normals.every(n => Math.abs(Math.hypot(...n) - 1) < 1e-9));
      assert.equal(mesh.coral, false); assert.equal(mesh.motion, false);
    }
    assert.deepEqual(relic.meshes.map(mesh => mesh.material), ['stele', 'bronze']);
  }
});

test('the signature reads as carved, letter by letter, inside the face of the stone', () => {
  assert.deepEqual(INSCRIPTION.wide, ['ΚΙΕΡΑΝ ΑΥΡΕΣ', 'ΕΠΟΙΗΣΕΝ']);
  assert.equal(INSCRIPTION.compact.join(' '), INSCRIPTION.wide.join(' '), 'The narrow reef carries the same words on more lines');
  for (const { relic } of layouts) {
    const left = relic.x - relic.width / 2, right = relic.x + relic.width / 2;
    assert.ok(relic.strokes.length > 25, "Every letter is cut");
    for (const cut of relic.strokes) {
      assert.ok(cut.across > 0 && cut.across < 1);
      for (const [x, z] of cut.points) {
        assert.ok(x > left + 1.5 && x < right - 1.5, 'Letters keep a margin from the edges of the stone');
        assert.ok(z > relic.base + 1.5 && z < relic.top - 1.5);
      }
    }
    // Every stroke lies within one row of letters, and the rows do not touch.
    assert.equal(relic.baselines.length, relic.lines.length);
    relic.baselines.slice(1).forEach((baseline, i) => assert.ok(relic.baselines[i] - baseline > relic.cap + 1.5));
    for (const cut of relic.strokes) {
      const heights = cut.points.map(point => point[1]);
      assert.ok(relic.baselines.some(baseline => Math.min(...heights) >= baseline - 1e-9 && Math.max(...heights) <= baseline + relic.cap + 1e-9));
    }
  }
});

test('light crosses the letters every seven seconds, left to right, and leaves the still frame clean', () => {
  assert.equal(SHIMMER_EVERY, 7);
  assert.ok(SHIMMER_LASTS > .8 && SHIMMER_LASTS < 2.5, 'A glint, not a glow');
  for (const across of [.05, .3, .5, .7, .95]) {
    assert.equal(shimmer(0, across), 0, 'Nothing is lit at the moment the still is taken');
    let brightest = 0, at = 0;
    for (let i = 0; i <= 700; i++) {
      const time = i / 100, light = shimmer(time, across);
      assert.ok(light >= 0 && light <= 1);
      assert.ok(Math.abs(light - shimmer(time + SHIMMER_EVERY, across)) < 1e-9, 'The pass repeats exactly');
      if (time >= SHIMMER_LASTS) assert.equal(light, 0, 'Between passes the letters rest');
      if (light > brightest) { brightest = light; at = time; }
    }
    assert.ok(brightest > .95, 'Every letter is fully lit once in each pass');
    assert.ok(Math.abs(at / SHIMMER_LASTS - (across + .22) / 1.44) < .03, 'Letters further along are lit later');
  }
});

test('the wheels turn slowly against one another and stay on the fragment', () => {
  for (const { relic } of layouts) {
    const xs = relic.plate.map(point => point[0]), zs = relic.plate.map(point => point[1]);
    for (const wheel of relic.wheels) {
      assert.ok(wheel.at[0] - wheel.radius > Math.min(...xs) - 1.5 && wheel.at[0] + wheel.radius < Math.max(...xs) + 1.5);
      assert.ok(wheel.at[1] - wheel.radius > Math.min(...zs) - 1.5 && wheel.at[1] + wheel.radius < Math.max(...zs) + 1.5);
    }
    assert.ok(Math.min(...zs) < relic.top && Math.min(...zs) > relic.top - 2, 'The fragment stands on the stone');
    const start = wheelAngles(relic, 0), later = wheelAngles(relic, WHEEL_TURNS_IN);
    assert.ok(start.every(angle => angle === 0));
    assert.ok(Math.abs(later[0] - Math.PI * 2) < 1e-9, 'The great wheel turns once in its period');
    later.slice(1).forEach((angle, i) => {
      assert.ok(angle < 0, 'Neighbours turn the other way');
      assert.ok(Math.abs(angle * relic.wheels[i + 1].radius + later[0] * relic.wheels[0].radius) < 1e-9, 'in proportion to their size');
    });
    assert.ok(WHEEL_TURNS_IN >= 30, 'Slow enough to be a detail, not a distraction');
  }
});

test('no fish or turtle swims through it', () => {
  const span = mesh => [0, 1, 2].map(axis => [Math.min(...mesh.vertices.map(v => v[axis])), Math.max(...mesh.vertices.map(v => v[axis]))]);
  for (const { compact, relic } of layouts) {
    const box = [0, 1, 2].map(axis => [relic.bounds[0][axis], relic.bounds[1][axis]]);
    for (let time = 0; time <= 3600; time += 6) {
      const actors = [0, 1, 2, 3].map(index => movingFish(time, index, compact));
      actors.push(movingTurtle(time, compact, 0), movingTurtle(time, compact, 1));
      for (const actor of actors.map(span)) {
        const gap = Math.hypot(...[0, 1, 2].map(axis => Math.max(0, box[axis][0] - actor[axis][1], actor[axis][0] - box[axis][1])));
        assert.ok(gap > 25, `Animals keep clear of the stone at ${time}s`);
      }
    }
  }
});

test('the fine work is drawn with plain strokes the still export can hold, and the reef carries it', () => {
  const calls = { move: 0, line: 0, arcs: 0, strokes: [], fills: [] };
  const ctx = {
    save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); calls.move++; },
    lineTo(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); calls.line++; },
    arc(x, y, r, from, to) { assert.ok(Math.abs(to - from - Math.PI * 2) < 1e-9, 'Only whole circles'); calls.arcs++; },
    stroke() { calls.strokes.push(this.strokeStyle); }, fill() { calls.fills.push(this.fillStyle); },
  };
  const cam = { project: ([x, y, z]) => ({ x: x + 700, y: 400 - z + y * .01, z: 2800 + y }) };
  paintRelic(ctx, cam, layouts[0].relic, 0);
  assert.ok(calls.line > 300 && calls.arcs === layouts[0].relic.pits.length);
  const resting = calls.strokes.at(-1);
  calls.strokes.length = 0;
  paintRelic(ctx, cam, layouts[0].relic, SHIMMER_LASTS * .5);
  assert.ok(calls.strokes.some(style => style !== resting && /^rgb\(\d+,\d+,\d+\)$/.test(style)), 'Lit letters are drawn brighter than resting ones');
  paintRelic(ctx, cam, null, 0);
  // The scene itself carries the stone, so resizing and re-warming keep it.
  const state = { ctx: { canvas: {} }, w: 390, h: 440 };
  new Reef().seedReef(state);
  assert.ok(state.reefScene.relic && state.reefScene.relic.meshes.every(mesh => state.reefScene.includes(mesh)));
});
