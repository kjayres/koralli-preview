import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import { servicePose, serviceSceneMarkup, SERVICE_STEPS, SERVICE_STILL } from '../src/scripts/art/service-scenes.mjs';
import { coursePose, courseActors, courseMarkup } from '../src/scripts/art/service-course.mjs';

test('all scenes close their physical loops without a jump', () => {
  const values = object => Object.values(object).flat();
  for (let scene = 0; scene < 2; scene++) {
    const first = values(servicePose(scene, 0)), last = values(servicePose(scene, 1 - 1e-7));
    first.forEach((value, i) => assert.ok(Math.abs(value - last[i]) < .002, `scene ${scene}, coordinate ${i}`));
    assert.deepEqual(servicePose(scene, 0), servicePose(scene, 1));
  }
});

test('monkey bars keep a supporting hand on a rung and all limbs remain within reach', () => {
  for (let i = 0; i < 1000; i++) {
    const pose = coursePose(i / 1000);
    if (pose.stage === 'monkey-bars') {
      assert.ok(pose.grips.some(Boolean));
      [pose.left, pose.right].forEach((hand, j) => {
        if (pose.grips[j]) {
          assert.equal(hand[2], 72);
          assert.equal((hand[0] - 44) % 10, 0);
        }
      });
    }
    [pose.left, pose.right].forEach((hand, j) => {
      const side = j ? 1 : -1;
      const shoulder = [pose.x + .2 * pose.scale, 74 - side * 6.4 * pose.scale, pose.z + 31.8 * pose.scale];
      assert.ok(Math.hypot(...hand.map((v, k) => v - shoulder[k])) <= 21 * pose.scale);
    });
    pose.feet?.forEach((foot, j) => {
      const hip = [pose.x, 74 - (j ? 2.4 : -2.4) * pose.scale, pose.z + 18.2 * pose.scale];
      const ankle = foot.map((v, k) => v + (k === 2 ? 2.4 * pose.scale : 0));
      assert.ok(Math.hypot(...ankle.map((v, k) => v - hip[k])) <= 17.2 * pose.scale);
    });
  }
});

test('feet land on the posts and knees settle without the feet sliding', () => {
  for (const [t, x, z] of [[.645, 118, 12], [.745, 136, 16], [.845, 154, 12]]) {
    const pose = coursePose(t);
    assert.equal(pose.stage, 'settle');
    assert.equal(pose.x, x);
    assert.ok(pose.z < z);
    pose.feet.forEach(foot => { assert.equal(foot[0], x); assert.equal(foot[2], z); });
  }
});

test('hopping arms swing back, lift for take-off and lower continuously into landing', () => {
  for (const [wait, start, end] of [[.63, .66, .73], [.73, .76, .83], [.83, .86, .92]]) {
    const crouch = coursePose(wait + (start - wait) * .55);
    const takeoff = coursePose(start);
    const flight = coursePose(start + (end - start) * .35);
    const landing = coursePose(end);
    for (const key of ['left', 'right']) {
      assert.ok(crouch[key][0] < crouch.x, 'The backswing passes behind the torso.');
      assert.ok(takeoff[key][0] > takeoff.x && takeoff[key][2] > crouch[key][2]);
      assert.ok(flight[key][2] > flight.z + 31.8 * flight.scale, 'The arms rise above shoulder level in flight.');
      assert.ok(Math.abs(flight[key][1] - flight.y) > Math.abs(landing[key][1] - landing.y), 'Arms open for balance before lowering.');
      assert.ok(landing[key][2] < landing.z + 31.8 * landing.scale);
    }
    for (const boundary of [wait, start, end]) {
      const before = coursePose(boundary - 1e-7), after = coursePose(boundary + 1e-7);
      for (const key of ['left', 'right']) {
        assert.ok(Math.hypot(...before[key].map((v, i) => v - after[key][i])) < .002, `No hand jump at ${boundary}.`);
      }
    }
  }
});

test('only one robot is visible, with an empty interval before the next entry', () => {
  for (let i = 0; i <= 2000; i++) {
    const actors = courseActors(i / 2000);
    assert.ok(actors.length <= 1);
    actors.forEach(actor => assert.ok(actor.opacity > 0 && actor.opacity <= 1));
  }
  for (const phase of [.985, .995, 0, .005, 1 - 1e-7, 1]) assert.deepEqual(courseActors(phase), []);
  assert.ok(courseActors(.95)[0].opacity > courseActors(.97)[0].opacity);
  assert.ok(courseActors(.015)[0].opacity < courseActors(.035)[0].opacity);
  assert.ok(courseActors(.015)[0].x < courseActors(.035)[0].x);
  assert.equal(courseMarkup(0), courseMarkup(1), 'The entire rendered scene closes its loop.');
});

test('cloth remains on the glass and within the human arm reach', () => {
  for (let i = 0; i < 300; i++) {
    const { x, heading, wipe } = servicePose(1, i / 300);
    assert.equal(wipe[1], 118);
    const right = [Math.cos(heading), -Math.sin(heading)], forward = [Math.sin(heading), Math.cos(heading)];
    const targets = [[wipe[0] - 1.4, 118, wipe[2]], [wipe[0] + 1.4, 118, wipe[2]]];
    if (right[0] < 0) targets.reverse();
    targets.forEach((hand, j) => {
      const side = j ? 1 : -1;
      const shoulder = [x + right[0] * side * 4.25 + forward[0] * .4 * .92, 112 + right[1] * side * 4.25 + forward[1] * .4 * .92, 33.5];
      assert.ok(Math.hypot(...hand.map((v, k) => v - shoulder[k])) < 15.36);
    });
  }
});

test('the agent module meets the board and its human grips stay reachable', () => {
  for (let i = 0; i < 300; i++) {
    const { chip } = servicePose(0, i / 300);
    assert.ok(chip[2] >= 24);
    for (const side of [-1, 1]) {
      const shoulder = [93 + side * 4.25 * 1.03, 59 + .8 * .92 * 1.03, 33.5 * 1.03];
      const hand = [chip[0] + side * 4, chip[1], chip[2] + 3];
      assert.ok(Math.hypot(...hand.map((v, k) => v - shoulder[k])) <= 15.36 * 1.03);
    }
  }
  assert.equal(servicePose(0, .5).chip[2], 24);
});

test('frames have finite geometry, unique figure clips and balanced SVG groups', () => {
  for (let scene = 0; scene < 3; scene++) for (let frame = 0; frame < 96; frame++) {
    const markup = serviceSceneMarkup(scene, frame / 96);
    assert.doesNotMatch(markup, /NaN|Infinity|undefined|service-hands/);
    const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length);
    let depth = 0;
    for (const tag of markup.matchAll(/<\/?g\b[^>]*>/g)) {
      depth += tag[0].startsWith('</') ? -1 : 1;
      assert.ok(depth >= 0);
    }
    assert.equal(depth, 0);
  }
});

test('services sit outside the approach hold, inside the same main landmark, with no hold of their own', async () => {
  const html = await fs.readFile(new URL('../src/our-work.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.match(html, /<main id="main">\s*<div[^>]*data-approach-shell/);
  assert.match(html, /<\/section>\s*<\/div>\s*<\/div>\s*<section[^>]*data-services/);
  assert.ok(html.indexOf('data-services') < html.indexOf('</main>'));
  assert.doesNotMatch(html, /data-services-shell|data-services-page/, 'Nothing wraps the page to hold it beside the cards');
  const source = await fs.readFile(new URL('../src/scripts/services.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /scrollTo|pushState|preventDefault|sticky/, 'The cards never move, hold or intercept the page');
});

test('cards are hidden only while the script is waiting to reveal them, and arrive a moment apart', async () => {
  const css = await fs.readFile(new URL('../src/styles/services.css', import.meta.url), 'utf8');
  assert.match(css, /\.services-reveal \.service \{[^}]*opacity:0/);
  assert.doesNotMatch(css.match(/\.services-reveal \.service \{[^}]*\}/)[0], /transition/, 'Hiding is instant and offscreen; only the arrival is animated');
  assert.match(css, /\.services-reveal\.services-shown \.service \{[^}]*opacity:1[^}]*transition:/);
  const delays = [...css.matchAll(/\.services-reveal\.services-shown \.service:nth-child\((\d)\) \{ transition-delay:\.(\d+)s; \}/g)].map(m => [Number(m[1]), Number(`.${m[2]}`)]);
  assert.deepEqual(delays.map(([card]) => card), [2, 3]);
  assert.ok(delays[0][1] > 0 && delays[0][1] < delays[1][1] && delays[1][1] <= .3, 'The stagger is short');
  assert.match(css, /prefers-reduced-motion:reduce\) \{\s*\.services-reveal \.service \{[^}]*opacity:1[^}]*transition:none/);
  // Without the script, or before it runs, nothing hides the offerings.
  for (const rule of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (/opacity:0/.test(rule[2])) assert.match(rule[1], /\.services-reveal/);
  }
});

async function controller({ width = 1200, height = 800, reduced = false, cardTop = 2100 } = {}) {
  const events = new Map(), frames = new Map(), classes = new Set(), observers = [], stills = [];
  let frameID = 0, renders = 0, moved = 0;
  const classList = { add: k => classes.add(k), remove: k => classes.delete(k) };
  const top = () => cardTop - context.scrollY;
  const svgs = [0, 1, 2].map(() => ({ set innerHTML(v) { renders++; } }));
  const cards = svgs.map(svg => ({ querySelector: () => svg, getBoundingClientRect: () => ({ top: top(), bottom: top() + 400 }) }));
  const stage = { name: 'stage' }, list = { name: 'list', getBoundingClientRect: () => ({ top: top() - 20 }) };
  const section = { id: 'services', classList, querySelector: selector => ({ '[data-services-stage]': stage, '.service-list': list })[selector], querySelectorAll: () => cards };
  const motion = { matches: reduced, addEventListener: (name, fn) => events.set('motion', fn) };
  const document = { hidden: false, querySelector: selector => selector === '[data-services]' ? section : null, addEventListener: (name, fn) => events.set(name, fn) };
  const context = vm.createContext({
    document, innerWidth: width, innerHeight: height, scrollY: 0,
    matchMedia: () => motion,
    addEventListener: (name, fn) => events.set(name, fn),
    requestAnimationFrame: fn => { frames.set(++frameID, fn); return frameID; }, cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class { constructor(fn, options = {}) { this.fn = fn; this.options = options; observers.push(this); } observe(target) { this.target = target; } disconnect() { this.gone = true; } },
    scrollTo: () => { moved++; },
  });
  const source = await fs.readFile(new URL('../src/scripts/services.mjs', import.meta.url), 'utf8');
  const mod = new vm.SourceTextModule(source, { context });
  await mod.link(() => new vm.SyntheticModule(['serviceSceneMarkup', 'SERVICE_STEPS', 'SERVICE_STILL'], function () {
    this.setExport('serviceSceneMarkup', (index, phase) => { stills.push([index, phase]); return '<g/>'; });
    this.setExport('SERVICE_STEPS', SERVICE_STEPS);
    this.setExport('SERVICE_STILL', SERVICE_STILL);
  }, { context }));
  await mod.evaluate();
  const watching = target => observers.find(observer => observer.target === target);
  return { context, section, cards, classes, motion, frames, document, events, stills, watching, stage, list,
    get renders() { return renders; }, get moved() { return moved; },
    scroll(y) { context.scrollY = y; events.get('scroll')(); },
    near(value) { watching(stage).fn([{ isIntersecting: value }], watching(stage)); },
    // The browser reports once when observation begins, then whenever the first card crosses the line.
    report(value) { const observer = watching(list); if (!observer.gone) observer.fn([{ isIntersecting: value }], observer); },
    enter() { this.report(true); },
    tick(time) { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(time)); },
  };
}

test('the cards wait, then arrive together once as the section comes into view', async () => {
  const view = await controller();
  assert.equal(view.classes.size, 0, 'Nothing is hidden before the browser has said where the cards are');
  assert.match(view.watching(view.list).options.rootMargin, /^0px 0px -\d+% 0px$/, 'They arrive once the first card has properly entered');
  view.report(false);
  assert.ok(view.classes.has('services-reveal') && !view.classes.has('services-shown'), 'Below the fold they wait, out of sight');
  view.scroll(900); view.report(false);
  assert.ok(!view.classes.has('services-shown'));
  view.enter();
  assert.ok(view.classes.has('services-shown'));
  assert.ok(view.watching(view.list).gone, 'Once shown they stay; the reveal never replays');
  view.scroll(0); view.scroll(5000); view.scroll(1800);
  assert.ok(view.classes.has('services-shown'));
  assert.equal(view.moved, 0, 'Scrolling is never held or redirected');
});

test('cards already on screen or behind the reader when the page opens are never hidden', async () => {
  for (const scrollY of [1500, 1800, 4000]) {
    const view = await controller();
    view.context.scrollY = scrollY;
    view.report(scrollY === 1800);
    assert.ok(!view.classes.has('services-reveal'), 'A deep link must not blink the offerings out and in');
    assert.ok(view.classes.has('services-shown') && view.watching(view.list).gone);
  }
});

test('unrevealed, offscreen and hidden artwork does no drawing', async () => {
  const view = await controller();
  view.report(false);
  view.scroll(1800);
  view.near(true);
  assert.equal(view.frames.size, 0, 'Nothing is drawn behind a card that has not arrived');
  view.enter();
  assert.equal(view.frames.size, 1);
  view.tick(100);
  assert.equal(view.renders, 3);
  view.tick(120);
  assert.equal(view.renders, 3, 'The artwork keeps a fixed 16fps clock');
  view.tick(200);
  assert.equal(view.renders, 6);
  view.near(false);
  assert.equal(view.frames.size, 0);
  view.near(true);
  view.document.hidden = true;
  view.events.get('visibilitychange')();
  assert.equal(view.frames.size, 0);
  view.document.hidden = false;
  view.events.get('visibilitychange')();
  assert.equal(view.frames.size, 1);
  view.scroll(0);
  view.tick(300);
  assert.equal(view.frames.size, 0, 'Cards scrolled out of view stop drawing');
  assert.equal(view.renders, 6);
});

test('reduced motion shows every card at once with one still moment each', async () => {
  const view = await controller();
  view.report(false); view.scroll(1800); view.near(true); view.enter(); view.tick(100);
  view.motion.matches = true;
  view.events.get('motion')();
  assert.equal(view.frames.size, 0);
  assert.ok(!view.classes.has('services-reveal') && view.classes.has('services-shown'));
  assert.deepEqual(view.stills.slice(-3), [0, 1, 2].map(i => [i, SERVICE_STILL[i]]));
  view.tick(900);
  assert.equal(view.frames.size, 0);

  const still = await controller({ reduced: true });
  assert.ok(!still.classes.has('services-reveal') && still.classes.has('services-shown'), 'Nothing waits for a scroll position');
  assert.deepEqual(still.stills, [0, 1, 2].map(i => [i, SERVICE_STILL[i]]));
  still.report(false);
  assert.ok(!still.classes.has('services-reveal'));
  still.scroll(1800); still.near(true); still.enter();
  assert.equal(still.frames.size, 0);
});

test('each scene has a loop length and a still moment that reads on its own', () => {
  assert.equal(SERVICE_STEPS.length, 3); assert.equal(SERVICE_STILL.length, 3);
  SERVICE_STEPS.forEach(steps => assert.ok(Number.isInteger(steps) && steps >= 160 && steps <= 400));
  SERVICE_STILL.forEach((phase, scene) => {
    assert.ok(phase >= 0 && phase < 1);
    assert.equal(serviceSceneMarkup(scene), serviceSceneMarkup(scene, phase), 'The first paint is the still moment');
  });
});
