import assert from 'node:assert/strict';
import test from 'node:test';
import { reefHabitat } from '../src/scripts/art/reef-habitat.mjs';
import { reefRockFragments, reefFloorHeight } from '../src/scripts/art/reef-terrain.mjs';
import * as relicModule from '../src/scripts/art/reef-relic.mjs';
import { reefRelic, paintRelic, INSCRIPTION, RESTING } from '../src/scripts/art/reef-relic.mjs';
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

test('the signature is cut letter by letter into the part of the face above the sand, and is faint', () => {
  assert.deepEqual(INSCRIPTION.wide, ['ΚΙΕΡΑΝ ΑΥΡΕΣ', 'ΕΠΟΙΗΣΕΝ']);
  assert.equal(INSCRIPTION.compact.join(' '), INSCRIPTION.wide.join(' '), 'The narrow reef carries the same words on more lines');
  assert.ok(RESTING >= .25 && RESTING <= .42, 'Faintly readable: about as strong as the rock\'s own mesh, never brighter');
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

test('the letters are still: nothing about them shimmers, moves or changes with time', () => {
  assert.equal(relicModule.shimmer, undefined);
  assert.equal(paintRelic.length, 3, 'The painter takes no time');
  const cam = { project: ([x, y, z]) => ({ x: x + 700, y: 400 - z + y * .01, z: 2800 + y }) };
  const drawn = () => {
    const record = [];
    const ctx = { save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo(x, y) { record.push(['M', x, y]); }, lineTo(x, y) { record.push(['L', x, y]); },
      stroke() { record.push(['S', this.strokeStyle, this.lineWidth]); } };
    paintRelic(ctx, cam, layouts[0].relic, record.length);
    return JSON.stringify(record);
  };
  assert.equal(drawn(), drawn());
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
  const styles = new Set(calls.strokes);
  assert.equal(styles.size, 2, 'A groove in shadow and its faint lower edge, nothing else');
  const brightness = style => style.match(/\d+/g).map(Number).reduce((sum, value) => sum + value, 0);
  // The slab's own mesh lines are drawn at up to four tenths of the reef's pale blue: rgb(64,79,131).
  assert.ok(Math.max(...[...styles].map(brightness)) <= 64 + 79 + 131, 'The letters are no brighter than the rock\'s own lines');
  paintRelic(ctx, cam, null, 0);
  // The scene itself carries the stone, so resizing and re-warming keep it.
  const state = { ctx: { canvas: {} }, w: 390, h: 440 };
  new Reef().seedReef(state);
  assert.ok(state.reefScene.relic && state.reefScene.relic.meshes.every(mesh => state.reefScene.includes(mesh)));
});
