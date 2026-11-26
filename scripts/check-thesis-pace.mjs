import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { thesisPace, THESIS_SCROLL, THESIS_PACE, FIRST_CARD, SECOND_CARD } from '../src/scripts/thesis-pace.mjs';

const read = path => fs.readFile(new URL(path, import.meta.url), 'utf8');

test('the reveal runs once from nothing to everything, smoothly, whichever way the reader scrolls', () => {
  assert.equal(thesisPace(0), 0);
  assert.equal(thesisPace(1), 1);
  for (const outside of [-1, 2, NaN, Infinity, undefined]) assert.ok(thesisPace(outside) >= 0 && thesisPace(outside) <= 1);
  let last = 0;
  for (let i = 1; i <= 2000; i++) {
    const now = thesisPace(i / 2000);
    assert.ok(now >= last, 'It never runs backwards as the reader goes on');
    assert.ok(now - last < .003, 'and never jumps');
    last = now;
  }
});

test('the first card is whole before the section is held; it never waits there as an empty frame', async () => {
  const cards = await read('../src/scripts/art/thesis-cards.mjs');
  // The cards complete their artwork last. These are the points the pacing is built around.
  const completes = name => { const [, from, over] = cards.match(new RegExp(`setReveal\\(items\\.${name}, \\(p - ([\\d.]+)\\) / ([\\d.]+)\\)`)); return Number(from) + Number(over); };
  assert.ok(Math.abs(completes('card1Art') - FIRST_CARD) < 1e-9, 'FIRST_CARD is where the first card\'s artwork is fully in');
  assert.ok(Math.abs(completes('card2Art') - SECOND_CARD) < 1e-9, 'SECOND_CARD is where the second card\'s artwork is fully in');
  assert.ok(THESIS_PACE.firstCard < THESIS_PACE.held - .1, 'The first card is finished well before the hold begins');
  assert.ok(thesisPace(THESIS_PACE.held) >= FIRST_CARD);
  assert.ok(Math.abs(thesisPace(THESIS_PACE.firstCard) - FIRST_CARD) < 1e-9);
  // It begins as the section comes into view, not when it is already half way up the window.
  assert.ok(THESIS_SCROLL.from >= .75 && THESIS_SCROLL.from < 1);
  // And the second card is already arriving, heading in place, as the hold begins.
  assert.ok(thesisPace(THESIS_PACE.held) >= completes('card2Heading'));
});

test('the second card follows promptly across a short hold, with a little left to read both', async () => {
  assert.ok(Math.abs(thesisPace(THESIS_PACE.secondCard) - SECOND_CARD) < 1e-9);
  assert.ok(THESIS_PACE.secondCard > THESIS_PACE.held && THESIS_PACE.secondCard < 1);
  const total = THESIS_SCROLL.from + THESIS_SCROLL.hold;
  for (const window of [620, 900, 1200]) {
    const afterHeld = (THESIS_PACE.secondCard - THESIS_PACE.held) * total * window, toRead = (1 - THESIS_PACE.secondCard) * total * window;
    assert.ok(afterHeld < window * .45, 'Less than half a window of scrolling completes the second card');
    assert.ok(toRead >= 150 && toRead < window * .4, 'A short, readable pause before the page moves on');
  }
  assert.ok(THESIS_SCROLL.hold <= .75, 'The page is held for well under a window; it was 1.75');
  // The stylesheet and the scroll handler agree with these numbers.
  const css = await read('../src/styles/home.css'), site = await read('../src/scripts/site.js');
  const [, height] = css.match(/\.thesis-section\.thesis-enhanced \{\s*height:(\d+)svh;/);
  assert.equal(Number(height), Math.round(100 + THESIS_SCROLL.hold * 100));
  assert.match(site, /innerHeight \* THESIS_SCROLL\.from/);
  assert.match(site, /thesisProgress = thesisPace\(/);
});
