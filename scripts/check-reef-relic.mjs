import assert from 'node:assert/strict';
import test from 'node:test';
import { reefHabitat } from '../src/scripts/art/reef-habitat.mjs';
import { reefRockFragments, reefFloorHeight } from '../src/scripts/art/reef-terrain.mjs';
import { reefRelic, paintRelic, shimmer, INSCRIPTION, SHIMMER_EVERY, SHIMMER_LASTS, RESTING } from '../src/scripts/art/reef-relic.mjs';
import { Reef, movingFish } from '../src/scripts/art/reef.mjs';
import { movingTurtle } from '../src/scripts/art/reef-turtle.mjs';

const layouts = [false, true].map(compact => {
  const rocks = reefRockFragments(reefHabitat(compact), compact);
  return { compact, rocks, relic: reefRelic(rocks, compact) };
});

test('the signed stone lies in the sand against the front slab, as part of the seabed', () => {
  for (const { compact, rocks, relic } of layouts) {
    const slab = rocks.find(rock => rock.name === `Limestone outcrop ${compact ? 1 : 2}`), [low, high] = slab.bounds;
    assert.ok(relic, 'The reef has its maker\'s mark');
    assert.ok(relic.bounds[0][0] > low[0] && relic.bounds[1][0] < high[0], 'The stone lies within the width of the slab behind it');
    assert.ok(relic.bounds[0][1] < low[1], 'It lies in front of the slab');
    assert.ok(Math.abs(relic.bounds[1][1] - relic.slabFace) < 4, 'and leans back until it touches it');
    const floor = reefFloorHeight(relic.foot[0], relic.foot[1] / 3.1, compact);
    assert.ok(floor - relic.foot[2] >= 3.5, 'Its foot is under the sand, so it cannot look as if it floats');
    assert.ok(relic.bounds[1][2] < high[2] + 6, 'It stands no taller than the rock it rests on');
    assert.ok(relic.lean > .15 && relic.lean < .45, 'It leans; it is not set upright like a sign');
    assert.equal(relic.meshes.length, 1);
    const [mesh] = relic.meshes;
    assert.equal(mesh.material, 'limestone', 'The same stone, mesh and colour as the rocks around it');
    assert.ok(mesh.vertices.flat().every(Number.isFinite) && mesh.faces.length >= 40, 'A meshed solid, not a flat plate');
    assert.ok(mesh.normals.every(n => Math.abs(Math.hypot(...n) - 1) < 1e-9));
    // A worn face is uneven: its triangles do not all share one plane.
    const facing = mesh.normals.filter(n => n[1] < -.5).map(n => n.map(value => value.toFixed(2)).join());
    assert.ok(new Set(facing).size > 8);
    assert.equal(mesh.coral, false); assert.equal(mesh.motion, false);
  }
});

test('the signature is cut letter by letter into the part of the face above the sand, and is faint at rest', () => {
  assert.deepEqual(INSCRIPTION.wide, ['ΚΙΕΡΑΝ ΑΥΡΕΣ', 'ΕΠΟΙΗΣΕΝ']);
  assert.equal(INSCRIPTION.compact.join(' '), INSCRIPTION.wide.join(' '), 'The narrow reef carries the same words on more lines');
  assert.ok(RESTING > .08 && RESTING <= .25, 'At rest the letters are fainter than the reef\'s own lines');
  for (const { relic } of layouts) {
    assert.ok(relic.strokes.length > 25, 'Every letter is cut');
    for (const cut of relic.strokes) {
      assert.ok(cut.across > 0 && cut.across < 1);
      for (const [a, b] of cut.points) {
        assert.ok(a > 2.5 && a < relic.width - 2.5, 'Letters keep a margin from the worn edges');
        assert.ok(b > relic.buried + 1 && b < relic.height - 2.5, 'and from the sand and the top');
      }
      // Each stroke lies on the face: the point given for it is the same distance proud of the block.
      const [p, q] = [relic.at(...cut.points[0], 0), relic.at(...cut.points[0], 1)];
      assert.ok(Math.abs(Math.hypot(...p.map((v, i) => v - q[i])) - 1) < 1e-9);
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
    arc() { calls.arcs++; },
    stroke() { calls.strokes.push(this.strokeStyle); }, fill() { calls.fills.push(this.fillStyle); },
  };
  const cam = { project: ([x, y, z]) => ({ x: x + 700, y: 400 - z + y * .01, z: 2800 + y }) };
  paintRelic(ctx, cam, layouts[0].relic, 0);
  assert.ok(calls.line > 100 && calls.arcs === 0, 'Straight strokes only');
  const resting = new Set(calls.strokes);
  assert.equal(resting.size, 2, 'At rest: a groove in shadow and its faint lower edge, nothing else');
  const brightness = style => style.match(/\d+/g).map(Number).reduce((sum, value) => sum + value, 0);
  // The slab's own mesh lines are drawn at three tenths or more of the reef's pale blue: rgb(51,65,110).
  assert.ok(Math.max(...[...resting].map(brightness)) < 51 + 65 + 110, 'Resting letters are dimmer than the rock\'s own lines');
  calls.strokes.length = 0;
  paintRelic(ctx, cam, layouts[0].relic, SHIMMER_LASTS * .5);
  const lit = calls.strokes.filter(style => !resting.has(style));
  assert.ok(lit.length > 3 && lit.every(style => /^rgb\(\d+,\d+,\d+\)$/.test(style)));
  const [r, g, b] = lit.sort((a, c) => brightness(c) - brightness(a))[0].match(/\d+/g).map(Number);
  assert.ok(brightness(`${r},${g},${b}`) > 500 && b >= r && b >= g, 'The glint is blue-silver');
  paintRelic(ctx, cam, null, 0);
  // The scene itself carries the stone, so resizing and re-warming keep it.
  const state = { ctx: { canvas: {} }, w: 390, h: 440 };
  new Reef().seedReef(state);
  assert.ok(state.reefScene.relic && state.reefScene.relic.meshes.every(mesh => state.reefScene.includes(mesh)));
});
