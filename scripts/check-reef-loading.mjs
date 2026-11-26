import assert from 'node:assert/strict';
import test from 'node:test';
import { ORGANIC_CORALS } from '../src/scripts/art/reef-organic.mjs';

// Building every coral takes long enough, in one piece, to make a running animation stutter. In a page
// the module gives the browser a turn every few milliseconds while it builds them; the corals it ends
// up with are the same ones, in the same order.
test('in a page the corals are built a few at a time, and are the same corals', async () => {
  const Channel = globalThis.MessageChannel, hadDocument = 'document' in globalThis, previous = globalThis.document;
  let turns = 0, open = 0;
  globalThis.MessageChannel = class extends Channel {
    constructor() { super(); turns++; open++; const close = this.port1.close.bind(this.port1); this.port1.close = () => { open--; close(); }; }
  };
  globalThis.document = {};
  try {
    const paged = (await import('../src/scripts/art/reef-organic.mjs?in-a-page')).ORGANIC_CORALS;
    assert.ok(turns >= 2, `The page was given a turn between corals (${turns})`);
    assert.equal(open, 0, 'Every channel used to take a turn is closed again');
    assert.deepEqual(Object.keys(paged), Object.keys(ORGANIC_CORALS), 'The same kinds in the same order');
    for (const kind of Object.keys(paged)) {
      assert.deepEqual(paged[kind].vertices, ORGANIC_CORALS[kind].vertices, `${kind} has the same shape`);
      assert.deepEqual(paged[kind].faces, ORGANIC_CORALS[kind].faces, `${kind} has the same faces`);
    }
  } finally {
    globalThis.MessageChannel = Channel;
    if (hadDocument) globalThis.document = previous; else delete globalThis.document;
  }
});

test('outside a page (the tests, the export of the still) nothing waits', async () => {
  assert.equal(Object.keys(ORGANIC_CORALS).length, 29);
  for (const coral of Object.values(ORGANIC_CORALS)) assert.ok(coral.vertices.length > 8 && coral.faces.length > 8);
});
