import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ORGANIC_CORALS } from '../src/scripts/art/reef-organic.mjs';

// Building every coral takes long enough, in one piece, to make a running animation stutter. A page
// builds them a few milliseconds at a time; anything else has them at once. Either way they are the
// same corals, and the reef never depends on the gentle build having been asked for.
const inAPage = async (name, run) => {
  const hadDocument = 'document' in globalThis, previous = globalThis.document;
  globalThis.document = {};
  try { return await run(await import(`../src/scripts/art/reef-organic.mjs?${name}`)); }
  finally { if (hadDocument) globalThis.document = previous; else delete globalThis.document; }
};
const same = (corals, message) => {
  assert.deepEqual(Object.keys(corals), Object.keys(ORGANIC_CORALS), `${message}: the same kinds in the same order`);
  for (const kind of Object.keys(corals)) {
    assert.deepEqual(corals[kind].vertices, ORGANIC_CORALS[kind].vertices, `${message}: ${kind} has the same shape`);
    assert.deepEqual(corals[kind].faces, ORGANIC_CORALS[kind].faces, `${message}: ${kind} has the same faces`);
  }
};

test('outside a page (the tests, the export of the still) every coral is built on import', () => {
  assert.equal(Object.keys(ORGANIC_CORALS).length, 29);
  for (const coral of Object.values(ORGANIC_CORALS)) assert.ok(coral.vertices.length > 8 && coral.faces.length > 8);
});

test('in a page the corals are built a few at a time, giving the page a turn between', async () => {
  const Channel = globalThis.MessageChannel;
  let turns = 0, open = 0;
  globalThis.MessageChannel = class extends Channel {
    constructor() { super(); turns++; open++; const close = this.port1.close.bind(this.port1); this.port1.close = () => { open--; close(); }; }
  };
  try {
    await inAPage('gently', async module => {
      assert.equal(Object.keys(module.ORGANIC_CORALS).length, 0, 'Loading the module in a page builds nothing by itself');
      const building = module.buildCoralsGently();
      assert.equal(module.buildCoralsGently(), building, 'Asking twice does not build twice');
      assert.ok(Object.keys(module.ORGANIC_CORALS).length < 29, 'It does not all happen in the first step');
      await building;
      assert.ok(turns >= 2, `The page was given a turn between corals (${turns})`);
      assert.equal(open, 0, 'Every channel used to take a turn is closed again');
      same(module.ORGANIC_CORALS, 'built gently');
    });
  } finally { globalThis.MessageChannel = Channel; }
});

test('whatever is not yet built can be finished at once, including part-way through a gentle build', async () => {
  await inAPage('at-once', async module => {
    module.buildCorals();
    same(module.ORGANIC_CORALS, 'built at once');
    module.buildCorals(); await module.buildCoralsGently();
    same(module.ORGANIC_CORALS, 'built again');
  });
  await inAPage('interrupted', async module => {
    const building = module.buildCoralsGently();
    module.buildCorals();
    same(module.ORGANIC_CORALS, 'finished early');
    await building;
    same(module.ORGANIC_CORALS, 'after the gentle build ends');
  });
});

test('a reef in a page seeds itself correctly even when nothing prepared the corals', async () => {
  const script = `globalThis.document = {};
    const { Reef } = await import(${JSON.stringify(new URL('../src/scripts/art/reef.mjs', import.meta.url).href)});
    const state = { w: 1440, h: 690 }; new Reef().seedReef(state);
    console.log(JSON.stringify(state.reefGeometryStats));`;
  const { stdout } = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script]);
  assert.deepEqual(JSON.parse(stdout), { meshes: 309, vertices: 140850, triangles: 286854 });
});

// Some browsers still in use mishandle a module that awaits at its top level when two others import
// it, as two of the reef's modules do here. Nothing the reef loads may rely on that.
test('no reef module awaits at its top level', async () => {
  const directory = new URL('../src/scripts/art/', import.meta.url);
  for (const name of (await fs.readdir(directory)).filter(file => /^reef.*\.mjs$/.test(file))) {
    const module = new vm.SourceTextModule(await fs.readFile(new URL(name, directory), 'utf8'), { identifier: name });
    if (typeof module.hasTopLevelAwait !== 'function') return;
    assert.equal(module.hasTopLevelAwait(), false, `${name} awaits at its top level`);
  }
});
