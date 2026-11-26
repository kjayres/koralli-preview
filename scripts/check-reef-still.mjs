import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';

// The reef's still is for a browser without scripts and for a reef that cannot be drawn. It must sit
// where a browser with scripts will not fetch it, and the page's script must be what shows it on failure.
test('the reef still is only in the no-script fallback, and the page script shows it on failure', async () => {
  const section = await fs.readFile('src/sections/reef.html', 'utf8'), site = await fs.readFile('src/scripts/site.js', 'utf8');
  const outside = section.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  assert.ok(/<noscript>[\s\S]*class="reef-still"[\s\S]*reef\.svg[\s\S]*<\/noscript>/.test(section), 'The still is in the no-script fallback');
  assert.ok(!/reef(-mobile)?\.svg/.test(outside), 'and nowhere a browser with scripts would fetch it from');
  assert.ok(/<canvas data-art="reef"/.test(outside));
  assert.ok(/function artworkFailed[\s\S]*?showReefStill\(state\)/.test(site), 'A failed reef shows the still');
  assert.equal(site.match(/showReefStill\(/g).length, 2, 'and nothing else does');
});
