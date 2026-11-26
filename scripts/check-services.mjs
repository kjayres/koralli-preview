import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import { servicePose, serviceSceneMarkup, SERVICE_STEPS, SERVICE_STILL } from '../src/scripts/art/service-scenes.mjs';
import { coursePose, courseActors, courseMarkup } from '../src/scripts/art/service-course.mjs';
import { vanPose, vanMarkup, upright, VAN, STONE, STACK, RIDER, CATCHER, DRIVER, HELM, HIT, SPEED, TURNS, MARKS, VAN_STEPS, VAN_STILL } from '../src/scripts/art/service-van.mjs';

const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
// Every number in a pose, however it is nested.
const numbers = value => typeof value === 'number' ? [value] : Object.values(value).flatMap(numbers);
// A figure's shoulder, from the same construction the drawing uses.
function humanShoulder(who, side, lean, floor = 0) {
  const forward = [Math.sin(who.heading), Math.cos(who.heading)], right = [Math.cos(who.heading), -Math.sin(who.heading)];
  return [who.x + (right[0] * side * 4.25 + forward[0] * lean * .92) * who.scale, who.y + (right[1] * side * 4.25 + forward[1] * lean * .92) * who.scale, floor + 33.5 * who.scale];
}

test('all scenes close their physical loops without a jump', () => {
  for (let scene = 0; scene < 2; scene++) {
    // A scene's clock runs on through the loop; its physical state must return to where it began.
    const state = phase => { const { clock, ...rest } = servicePose(scene, phase); return rest; };
    const first = numbers(state(0)), last = numbers(state(1 - 1e-7));
    assert.ok(first.length > 3 && first.length === last.length);
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

test('the van meets the stone once a loop, front wheel then rear, and rides it on its springs', () => {
  const seconds = VAN_STEPS / 16, at = time => vanPose(time / seconds);
  assert.ok(HIT.rear > HIT.front && Math.abs(HIT.rear - HIT.front - (VAN.axles.front - VAN.axles.rear) / SPEED) < 1e-9, 'The rear wheel reaches the stone a wheelbase later');
  for (const [axle, time] of [['front', HIT.front], ['rear', HIT.rear]]) {
    assert.ok(Math.abs(at(time).clock.stone - VAN.axles[axle]) < 1e-6, `The stone is under the ${axle} axle at its hit`);
    assert.ok(Math.abs(at(time).lift[axle] - STONE.height) < 1e-6, 'A wheel on top of the stone is lifted by its height');
    assert.ok(at(time + .08).body[axle] > 1 && at(time + .08).body[axle] < STONE.height + .5, 'The body follows on its spring, without leaping');
    assert.ok(at(time + .4).body[axle] < 0, 'A spring rebounds before it settles');
  }
  let lifted = 0;
  for (let i = 0; i < 4000; i++) {
    const pose = vanPose(i / 4000);
    for (const axle of ['front', 'rear']) {
      const reach = Math.abs(pose.clock.stone - VAN.axles[axle]);
      assert.ok(pose.lift[axle] >= 0 && pose.lift[axle] <= STONE.height + 1e-9);
      if (reach > VAN.wheel) assert.equal(pose.lift[axle], 0, 'A wheel only rises while it is on the stone');
      // The housing moves with the body and the wheel with the road: they must never meet.
      assert.ok(pose.lift[axle] - pose.body[axle] < VAN.housing - VAN.wheel - .1, 'A wheel stays inside its housing');
    }
    if (pose.lift.front || pose.lift.rear) lifted++;
    assert.ok(Math.abs(pose.tilt) < .11, 'Riders wobble; nobody falls');
    assert.ok(pose.squash >= -.012 && pose.squash <= .08);
  }
  assert.ok(lifted / 4000 < .05, 'The stone is an occasional event, not the whole journey');
  // Calm before the stone and again well before the loop closes, so the still moment is a clean one.
  for (const phase of [0, VAN_STILL, HIT.front / seconds - .02, .75, .999]) {
    const pose = vanPose(phase);
    numbers([pose.lift, pose.body, pose.tilt, pose.squash, pose.slide, pose.hops, pose.steer]).forEach(value => assert.ok(Math.abs(value) < .01));
  }
});

test('the road, wheels and air close their loop exactly', () => {
  assert.ok(Number.isInteger(TURNS) && Number.isInteger(MARKS), 'Whole wheel turns and whole lane marks in a loop');
  assert.ok(Math.abs(SPEED * VAN_STEPS / 16 - TURNS * Math.PI * 2 * VAN.wheel) < 1e-9, 'The wheels roll without slipping');
  // At 16 frames a second a five-spoked wheel must turn less than half a spoke per frame, or it strobes.
  assert.ok(SPEED / VAN.wheel / 16 < Math.PI / 5);
  assert.equal(vanMarkup(0), vanMarkup(1));
  const still = vanMarkup(VAN_STILL);
  assert.ok(still.indexOf('>Value<') < still.indexOf('>Work<') && still.indexOf('>Work<') < still.indexOf('>Cost<'), 'Cost, Work and Value are stacked in view, read from the top');
  assert.doesNotMatch(still, /<g opacity/, 'The still moment is clean road: no stone in sight');
});

test('the load hops and slips into waiting hands, then is eased back into line', () => {
  const seconds = VAN_STEPS / 16;
  let furthest = 0;
  for (let i = 0; i < 4000; i++) {
    const pose = vanPose(i / 4000);
    assert.ok(pose.slide >= 0 && pose.slide < 4, 'The top crate slips a little, towards the catcher');
    assert.ok(pose.hops.every(height => height >= 0) && pose.hops[2] >= pose.hops[1] && pose.hops[1] >= pose.hops[0], 'Crates never pass through one another');
    assert.ok(pose.hops[2] < 2.5 && VAN.floor + STACK.height * 3 + pose.hops[2] < VAN.rail - 4, 'The load stays well clear of the rail and roof');
    furthest = Math.max(furthest, pose.slide);
    // Both of the catcher's hands stay flat on the top crate's leading face, wherever it goes.
    pose.catcher.hold.forEach((hand, j) => {
      assert.ok(Math.abs(hand[0] - (STACK.x + STACK.length + pose.slide + 1.25)) < 1e-9);
      assert.ok(Math.abs(hand[2] - (VAN.floor + STACK.height * 2.5 + pose.hops[2])) < 1e-9);
      assert.equal(hand[1], CATCHER.y + (j ? 3.4 : -3.4));
    });
  }
  assert.ok(furthest > 3, 'The slip is large enough to see');
  assert.ok(vanPose((HIT.front - .1) / seconds).slide === 0, 'Nothing moves before the stone');
  assert.ok(vanPose((HIT.rear + .6) / seconds).slide > 3, 'The crate is held where it was caught');
  assert.ok(vanPose((HIT.rear + 2.4) / seconds).slide < .01, 'and is back in line soon after');
});

test('hands stay planted and within reach while the riders sway, and the driver keeps the wheel', () => {
  const still = vanPose(VAN_STILL);
  for (let i = 0; i < 2000; i++) {
    const pose = vanPose(i / 2000), settle = upright(pose.tilt, pose.squash);
    assert.deepEqual(pose.rider.grip, still.rider.grip, 'The hand on the rail never lets go');
    assert.equal(pose.rider.grip[2], VAN.rail - .3);
    // Reach is measured on the upright figure, as the drawing solves it.
    assert.ok(distance(settle(pose.rider.grip), humanShoulder(RIDER, 1, pose.rider.lean, VAN.floor)) < 15.36 * RIDER.scale);
    assert.ok(distance(pose.rider.loose, humanShoulder(RIDER, -1, pose.rider.lean, VAN.floor)) < 15.36 * RIDER.scale);
    assert.ok(pose.rider.loose[2] < VAN.floor + 20 * RIDER.scale, 'The free arm hangs; it only swings a little');
    pose.catcher.hold.forEach((hand, j) => {
      const reach = distance(settle(hand), humanShoulder(CATCHER, j ? 1 : -1, pose.catcher.lean, VAN.floor));
      assert.ok(reach < 15.36 * CATCHER.scale && reach > 6, 'Arms give as the crate arrives, without folding up');
    });
    assert.equal(pose.rider.lean, -pose.catcher.lean, 'Facing each other, both riders are thrown the same way');
    pose.driver.hands.forEach((hand, j) => {
      assert.ok(Math.abs(distance(hand, [HELM.x, HELM.y, HELM.z]) - HELM.radius) < 1e-9, 'Both hands stay on the rim');
      const side = j ? 1 : -1, shoulder = [DRIVER.x + .2 * DRIVER.scale, DRIVER.y - side * 6.4 * DRIVER.scale, DRIVER.z + 31.8 * DRIVER.scale];
      assert.ok(distance(hand, shoulder) < 21 * DRIVER.scale);
    });
    assert.ok(distance(...pose.driver.hands) > HELM.radius * 1.99, 'on opposite sides of it');
    assert.deepEqual(pose.driver.feet, still.driver.feet, 'The driver stays seated');
    pose.driver.feet.forEach((foot, j) => {
      const hip = [DRIVER.x, DRIVER.y + (j ? -2.4 : 2.4) * DRIVER.scale, DRIVER.z + 18.2 * DRIVER.scale];
      assert.ok(distance([foot[0], foot[1], foot[2] + 2.4 * DRIVER.scale], hip) < 17.2 * DRIVER.scale);
    });
  }
  // The swaying figure, moved back into the van, puts its hand exactly where the pose says.
  const thrown = vanPose((HIT.rear + .25) / (VAN_STEPS / 16)), back = upright(thrown.tilt, thrown.squash);
  assert.ok(Math.abs(thrown.tilt) > .03);
  const [x, y, z] = back(thrown.rider.grip), height = z - VAN.floor;
  assert.ok(distance([x + thrown.tilt * height, y, VAN.floor + height * (1 - thrown.squash)], thrown.rider.grip) < 1e-9);
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
