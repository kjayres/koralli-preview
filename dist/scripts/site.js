import { journalViewportBand } from './journal-viewport.mjs?v=c06c618d0a3f';
import { thesisPace, THESIS_SCROLL } from './thesis-pace.mjs?v=c06c618d0a3f';

const motion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = n => Math.min(1, Math.max(0, n));
const canvasStates = [];
let frame = 0;
let lastTime = 0;
let updateApproach = () => {};
let journalState;
let journalViewportDirty = true;
const artworkLoaders = {
  wave: () => import('./art/wave.mjs?v=c06c618d0a3f'),
  approach: () => import('./art/approach.mjs?v=c06c618d0a3f'),
  chart: () => import('./art/chart.mjs?v=c06c618d0a3f'),
  strands: () => import('./art/strands.mjs?v=c06c618d0a3f'),
  'work-coral': () => import('./art/coral.mjs?v=c06c618d0a3f'),
  reef: () => import('./art/reef.mjs?v=c06c618d0a3f'),
  'journal-water': () => import('./art/journal-water.mjs?v=c06c618d0a3f')
};

function artworkFailed(state, error) {
  if (state.failed) return;
  state.failed = true;
  state.host.classList.remove('art-ready');
  state.host.classList.add('art-failed');
  if (state.kind === 'reef') showReefStill(state);
  console.error(`Unable to display ${state.kind} artwork:`, error);
}

// The reef's still is a picture of over two megabytes, kept for a browser without scripts and for a
// reef that cannot be drawn. A working reef never fetches it: until the live reef is ready its place
// is the deep blue of the section, and the reef then fades up out of that.
function showReefStill(state) {
  if (!state.stillMarkup || state.host.querySelector('.reef-still')) return;
  const template = document.createElement('template');
  template.innerHTML = state.stillMarkup;
  state.host.insertBefore(template.content, state.canvas);
}

function updateJournalViewport() {
  if (!journalState || !journalViewportDirty) return;
  journalViewportDirty = false;
  const rect = journalState.host.getBoundingClientRect();
  journalState.viewport = journalViewportBand(journalState.h, rect.top, innerHeight);
  const heading = journalState.heading?.getBoundingClientRect();
  journalState.headingVisible = !heading || heading.bottom >= -120 && heading.top <= innerHeight + 120;
}

async function warmReefArtwork(state) {
  if (state.failed || document.hidden || !state.w || !state.h) return;
  const revision = state.reefRevision = (state.reefRevision || 0) + 1;
  const isCurrent = () => revision === state.reefRevision && !state.failed && !document.hidden;
  state.reefReady = false;
  state.host.classList.remove('art-ready');
  try {
    if (state.reef.prewarmReef) {
      if (!await state.reef.prewarmReef(state, isCurrent)) return;
    } else state.reef.seedReef(state);
    if (!isCurrent()) return;
    state.reefReady = true;
    paint(state);
    schedule();
  } catch (error) { if (isCurrent()) artworkFailed(state, error); }
}

async function prepareArtwork(state) {
  if (state.loading || state.failed) return;
  state.loading = true;
  try {
    state.art = await artworkLoaders[state.kind]();
    if (state.kind === 'reef') {
      // The corals are built a little at a time; the reef would otherwise build them all in its first step.
      await state.art.prepareReefCorals?.();
      state.reef = new state.art.Reef();
    }
    if (state.kind === 'journal-water' && document.querySelector('[data-journal-frond], [data-journal-coral]')) {
      const { initJournalLettering } = await import('./art/journal-lettering.mjs?v=c06c618d0a3f');
      state.updateJournalLettering = initJournalLettering();
    }
    state.loaded = true;
    if (state.kind === 'reef') { await warmReefArtwork(state); return; }
    paint(state);
    schedule();
  } catch (error) { artworkFailed(state, error); }
}

function paint(state, dt = 0) {
  const { ctx, w, h, kind } = state;
  if (!state.loaded || state.failed || !w || !h) return;
  if (kind === 'reef' && !state.reefReady) return;
  try {
    // The reef and journal renderers own their clear, including direct gallery use.
    if (kind !== 'reef' && kind !== 'journal-water') ctx.clearRect(0, 0, w, h);
    if (!motion.matches) state.time += dt;
    if (state.pointer) {
      const blend = 1 - Math.exp(-dt * 9);
      state.pointer.x += (state.pointerTarget.x - state.pointer.x) * blend;
      state.pointer.y += (state.pointerTarget.y - state.pointer.y) * blend;
      state.pointer.strength += (state.pointerTarget.strength - state.pointer.strength) * blend;
    }
    const options = { reducedMotion: motion.matches, pointer: state.pointer, variant: state.variant };
    if (kind === 'wave') state.art.drawWave(ctx, w, h, state.time, options);
    // Opening artwork is told where the copy lies over it, and keeps clear of it.
    if (kind === 'chart') state.art.drawChart(ctx, w, h, state.time, { ...options, quiet: state.quiet });
    if (kind === 'strands') state.art.drawStrands(ctx, w, h, state.time, { ...options, quiet: state.quiet });
    if (kind === 'approach') {
      const presentation = state.art.drawApproach(ctx, w, h, state.time, { ...options, phase: state.phase || 0 });
      if (presentation) {
        for (const key of ['caption', 'detail']) {
          const element = state[key];
          if (element && element.textContent !== presentation[key]) element.textContent = presentation[key];
        }
      }
    }
    if (kind === 'journal-water') {
      updateJournalViewport();
      // Move and repaint together: all drawing still uses full-scene coordinates,
      // with the context translating them into the small visible pixel buffer.
      const top = state.viewport.top;
      canvasOffset(state, top);
      state.art.drawJournalWater(ctx, w, h, state.time, { ...options, viewport: state.viewport, screen: innerHeight });
      if (state.headingVisible || motion.matches) state.updateJournalLettering?.(state.time, options);
    }
    if (kind === 'work-coral') {
      state.art.drawWorkCoralTrace(ctx, w, h, state.time, options);
    }
    if (kind === 'reef' && state.reef) {
      if (motion.matches || state.paused) state.reef.drawReef(state);
      else {
        state.fraction += dt * 60;
        const steps = Math.floor(state.fraction);
        state.fraction -= steps;
        state.t += steps;
        state.reef.stepReef(state);
      }
    }
    if (!state.host.classList.contains('art-ready')) state.host.classList.add('art-ready');
  } catch (error) { artworkFailed(state, error); }
}

function canvasOffset(state, top) {
  if (state.canvasTop === top) return;
  state.canvasTop = top;
  state.canvas.style.transform = `translateY(${top}px)`;
  state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, -top * state.dpr);
}

let thesisStage = null;
let renderThesis = null;
let thesisVisible = false;
let thesisProgress = 0;
let thesisTime = 0;

function tick(now) {
  frame = 0;
  const dt = lastTime ? Math.min(.05, (now - lastTime) / 1000) : 0;
  lastTime = now;
  canvasStates.filter(state => state.visible && !state.paused).forEach(state => paint(state, dt));
  if (thesisVisible && renderThesis && !motion.matches) {
    thesisTime += dt;
    renderThesis(thesisProgress, thesisTime, false);
  }
  schedule();
}

function schedule() {
  const activeCanvas = canvasStates.some(state => state.visible && !state.paused && state.loaded && !state.failed && (state.kind !== 'reef' || state.reefReady));
  const activeThesis = Boolean(thesisVisible && renderThesis);
  if (!frame && !motion.matches && !document.hidden && (activeCanvas || activeThesis)) frame = requestAnimationFrame(tick);
}

for (const canvas of document.querySelectorAll('canvas[data-art]')) {
  const state = { canvas, host: canvas.parentElement, kind: canvas.dataset.art, w: 0, h: 0, t: 0, time: 0, fraction: 0, visible: false };
  // Reuse the existing no-script description while artwork loads or if it fails.
  const fallback = state.host.querySelector('noscript');
  if (fallback && state.kind === 'reef') state.stillMarkup = fallback.textContent;
  else if (fallback) {
    const template = document.createElement('template');
    template.innerHTML = fallback.textContent;
    state.host.insertBefore(template.content, canvas);
  }
  let ctx;
  try { ctx = canvas.getContext('2d'); } catch (error) { artworkFailed(state, error); continue; }
  if (!ctx) { artworkFailed(state, new Error('Canvas is unavailable.')); continue; }
  state.ctx = ctx;
  if (state.kind === 'journal-water') {
    journalState = state;
    state.heading = document.querySelector('.journal-opening h1');
  }
  canvas.addEventListener('contextlost', () => artworkFailed(state, new Error('Canvas context was lost.')));
  if (state.kind === 'approach') {
    const figure = canvas.closest('[data-approach-figure]');
    state.caption = figure.querySelector('[data-approach-caption]');
    state.detail = figure.querySelector('[data-approach-detail]');
  }
  if (state.kind === 'wave') {
    state.pointer = { x: 0, y: 0, strength: 0 };
    state.pointerTarget = { x: 0, y: 0, strength: 0 };
    const hero = canvas.parentElement;
    hero.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || motion.matches) return;
      const rect = hero.getBoundingClientRect();
      state.pointerTarget = { x: event.clientX - rect.left, y: event.clientY - rect.top, strength: 1 };
      if (state.pointer.strength < .01) Object.assign(state.pointer, { x: state.pointerTarget.x, y: state.pointerTarget.y });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { state.pointerTarget.strength = 0; });
  }
  // Copy laid over an opening's artwork: its box within the canvas, measured again whenever either changes.
  const copy = state.host.querySelector('[data-art-quiet]');
  const measureQuiet = () => {
    if (!copy) return false;
    const host = state.host.getBoundingClientRect(), box = copy.getBoundingClientRect();
    const quiet = { x: box.left - host.left, y: box.top - host.top, width: box.width, height: box.height };
    const moved = !state.quiet || Object.keys(quiet).some(key => Math.abs(quiet[key] - state.quiet[key]) > .5);
    if (moved) state.quiet = quiet;
    return moved;
  };
  const resize = () => {
    if (state.failed) return;
    try {
      const rect = state.kind === 'approach'
        ? { width: canvas.parentElement.clientWidth, height: canvas.parentElement.clientHeight }
        : canvas.parentElement.getBoundingClientRect();
      const quietMoved = measureQuiet();
      const dpr = Math.min(devicePixelRatio || 1, state.kind === 'journal-water' ? 1.5 : 2);
      const bufferHeight = state.kind === 'journal-water'
        ? journalViewportBand(rect.height, rect.top, innerHeight).height : rect.height;
      if (state.w === rect.width && state.h === rect.height && state.dpr === dpr && state.bufferHeight === bufferHeight) {
        if (quietMoved) paint(state);
        return;
      }
      state.w = rect.width;
      state.h = rect.height;
      state.dpr = dpr;
      state.bufferHeight = bufferHeight;
      state.canvasTop = undefined;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(bufferHeight * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${bufferHeight}px`;
      if (state.kind === 'journal-water') canvas.style.position = 'absolute';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (state.kind === 'journal-water') journalViewportDirty = true;
      if (state.kind === 'reef' && state.loaded) warmReefArtwork(state);
      else paint(state);
    } catch (error) { artworkFailed(state, error); }
  };
  const resized = new ResizeObserver(resize);
  resized.observe(canvas.parentElement);
  if (copy) resized.observe(copy);
  if (state.kind === 'journal-water') addEventListener('resize', resize);
  new IntersectionObserver(entries => {
    state.visible = entries[0].isIntersecting;
    if (state.kind === 'journal-water') journalViewportDirty = true;
    lastTime = 0;
    if (state.visible && state.kind !== 'reef') paint(state);
    schedule();
  }).observe(state.kind === 'journal-water' ? state.host : canvas);
  canvasStates.push(state);
  resize();
  // Artwork at the head of a page is on screen from the start, so it is prepared at once.
  if (['wave', 'journal-water', 'chart', 'strands'].includes(state.kind)) prepareArtwork(state);
  else {
    const nearby = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      nearby.disconnect();
      prepareArtwork(state);
    }, { rootMargin: state.kind === 'reef' ? '3200px' : '600px' });
    nearby.observe(canvas);
  }
}

if (document.querySelector('[data-approach]')) import('./approach-view.mjs?v=c06c618d0a3f').then(({ initApproach }) => {
  updateApproach = initApproach(phase => {
    const state = canvasStates.find(item => item.kind === 'approach');
    if (!state) return;
    state.phase = phase;
    paint(state);
    schedule();
  });
}).catch(error => {
  const state = canvasStates.find(item => item.kind === 'approach');
  if (state) artworkFailed(state, error);
});

const building = document.querySelector('.building-section');
const svg = building?.querySelector('.company-building');
const panels = [...document.querySelectorAll('[data-depth-panel]')];
const depths = [...document.querySelectorAll('[data-depth]')];
const chamber = building?.querySelector('.building-sticky');
let staticDepth = 0;
let scrollFrame = 0;
let buildingProgress = 0;
let lastBuildingKey = '';
let lastBuildingLayer = -1;
let updateBuilding;
// The physical four-section timeline stays fixed even with three copy panels.
let buildingTimelineSteps = 4;
const buildingOriginal = svg ? { content: svg.innerHTML, viewBox: svg.getAttribute('viewBox') } : null;
const mixColour = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
const BUILDING_COLOURS = {
  paper: [[243, 240, 232], [23, 36, 71]],
  line: [[36, 78, 255], [183, 198, 255]],
  shade: [[229, 232, 237], [32, 48, 82]],
  glass: [[215, 223, 239], [41, 61, 105]]
};

function colourDepth(progress, force = false) {
  const p = clamp(progress);
  const stops = [[0,[243,240,232]],[.25,[202,213,231]],[.48,[65,91,142]],[.75,[24,44,82]],[1,[12,22,48]]];
  const upper = stops.findIndex(([at]) => at >= p);
  const [a,from] = stops[Math.max(0,upper-1)], [b,to] = stops[upper];
  const t = b===a ? 0 : (p-a)/(b-a);
  const background = from.map((v,i) => Math.round(v+(to[i]-v)*t));
  const linear = background.map(v => v/255 <= .04045 ? v/255/12.92 : ((v/255+.055)/1.055)**2.4);
  const luminance = linear.reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
  // Choose the readable side of the palette as the water darkens.
  const text = luminance < .19 ? 1 : 0;
  const bg = `rgb(${background.join(',')})`;
  if (chamber.style.backgroundColor !== bg) chamber.style.backgroundColor = bg;
  if (!force && chamber.dataset.depthTheme === String(text)) return;
  chamber.dataset.depthTheme = String(text);
  chamber.style.color = mixColour([17,17,17], [243,240,232], text);
  chamber.style.setProperty('--depth-muted', mixColour([95,95,96], [177,187,209], text));
  chamber.style.setProperty('--depth-accent', mixColour([36,78,255], [183,198,255], text));
  for (const [name, [start,end]] of Object.entries(BUILDING_COLOURS)) chamber.style.setProperty(`--building-${name}`, mixColour(start,end,text));
}

function preserveReadingPosition(change) {
  // Enhancing the building changes its height. Keep downstream reading/hash targets in place.
  const following = building.getBoundingClientRect().bottom <= 0 ? building.nextElementSibling : null;
  const before = following?.getBoundingClientRect().top;
  try { return change(); }
  finally {
    if (following) {
      // Measuring again accounts for any scroll anchoring the browser has already applied.
      const delta = following.getBoundingClientRect().top - before;
      if (Math.abs(delta) > .5) scrollTo({ top: scrollY + delta, behavior: 'instant' });
    }
  }
}

function buildingFailed(error) {
  preserveReadingPosition(() => {
    updateBuilding = undefined;
    lastBuildingKey = '';
    lastBuildingLayer = -1;
    building.classList.remove('building-enhanced');
    chamber.removeAttribute('style');
    delete chamber.dataset.depthTheme;
    building.querySelectorAll?.('.company-building-layer')?.forEach(layer => layer.remove());
    svg.innerHTML = buildingOriginal.content;
    svg.setAttribute('viewBox', buildingOriginal.viewBox);
    panels.forEach(panel => {
      for (const name of ['opacity', 'visibility', 'transform']) panel.style.removeProperty(name);
      panel.removeAttribute('aria-hidden');
    });
    depths.forEach(button => { button.removeAttribute('aria-current'); button.classList.remove('visited'); });
  });
  console.error('Unable to initialise the building artwork:', error);
}

function renderBuilding(force = false, preReadRect = null) {
  if (!updateBuilding || !building?.classList.contains('building-enhanced')) return;
  try {
    const rect = preReadRect || building.getBoundingClientRect();
    if (!force && !motion.matches && (rect.top > innerHeight || rect.bottom < 0)) return;
    const progress = motion.matches ? (staticDepth + .6) / buildingTimelineSteps : clamp(-rect.top / Math.max(1, rect.height - innerHeight));
    const compact = innerWidth < 760;
    const renderKey = `${progress}|${motion.matches}|${compact}`;
    if (!force && renderKey === lastBuildingKey) return;
    lastBuildingKey = renderKey;
    const focus = clamp((progress - .25) / .75);
    const viewBox = compact ? `130 ${Math.round(-160 + 320 * focus)} 440 ${Math.round(800 - 440 * focus)}` : '0 -160 700 860';
    if (svg.getAttribute('viewBox') !== viewBox) svg.setAttribute('viewBox', viewBox);
    buildingProgress = progress;
    colourDepth(progress, force);
    const { phase } = updateBuilding(svg, progress, motion.matches);
    const layer = phase;
    if (force || layer !== lastBuildingLayer) {
      lastBuildingLayer = layer;
      panels.forEach((panel, i) => {
        const active = i === layer;
        const opacity = 1;
        panel.style.opacity = active ? String(opacity) : '0';
        panel.style.visibility = active ? 'visible' : 'hidden';
        panel.style.transform = `translateY(${active ? (1 - opacity) * 8 : 8}px)`;
        panel.setAttribute('aria-hidden', String(!active));
      });
      depths.forEach((button, i) => {
        if (i === layer) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
        button.classList.toggle('visited', i < layer);
      });
    }
  } catch (error) { buildingFailed(error); }
}

depths.forEach((button, i) => button.addEventListener('click', () => {
  if (!updateBuilding) return;
  if (motion.matches) {
    staticDepth = Number(button.dataset.depth);
    renderBuilding();
    return;
  }
  const rect = building.getBoundingClientRect();
  const top = scrollY + rect.top + (rect.height - innerHeight) * (Number(button.dataset.depth) + .96) / buildingTimelineSteps;
  scrollTo({ top, behavior: 'smooth' });
}));

if (building && svg) import('./art/building.mjs?v=c06c618d0a3f').then(module => {
  preserveReadingPosition(() => {
    // First prove the renderer works while the complete static copy is still present.
    module.updateBuilding(svg, 0, motion.matches);
    updateBuilding = module.updateBuilding;
    buildingTimelineSteps = module.buildingSectionCount || 4;
    building.classList.add('building-enhanced');
    renderBuilding(true);
  });
}).catch(buildingFailed);

thesisStage = document.querySelector('[data-thesis-stage]');
function updateThesisScroll() {
  if (!thesisStage || !renderThesis) return;
  const compact = innerWidth <= 960;
  if (motion.matches || compact) {
    thesisProgress = 1;
    renderThesis(1, thesisTime, motion.matches);
    return;
  }
  const rect = thesisStage.getBoundingClientRect();
  if (rect.top > innerHeight || rect.bottom < 0) return;
  // The first card fills in as the section rises into view, so it is whole when the section is held.
  const startTop = innerHeight * THESIS_SCROLL.from;
  const endTop = -(rect.height - innerHeight);
  thesisProgress = thesisPace(clamp((startTop - rect.top) / Math.max(1, startTop - endTop)));
  renderThesis(thesisProgress, thesisTime, false);
}
if (thesisStage) {
  new IntersectionObserver(entries => {
    thesisVisible = entries[0].isIntersecting;
    lastTime = 0;
    if (thesisVisible) updateThesisScroll();
    schedule();
  }).observe(thesisStage);
  import('./art/thesis-cards.mjs?v=c06c618d0a3f').then(({ initThesisCards }) => {
    renderThesis = initThesisCards(thesisStage);
    updateThesisScroll();
    schedule();
  }).catch(error => console.error('Unable to initialise thesis artwork:', error));
}

// The anchor hangs over paper or deep water; the building's chamber darkens as it is explored.
const seaAnchor = document.querySelector('[data-sea-anchor]');
let updateSeaAnchor = () => {};
function seaIsDarkAt(y) {
  const within = element => { const rect = element?.getBoundingClientRect(); return rect && y >= rect.top && y <= rect.bottom; };
  if ([...document.querySelectorAll('.deep-water, .site-footer, .journal-page main')].some(within)) return true;
  return within(chamber) && chamber.dataset.depthTheme === '1';
}
if (seaAnchor) {
  import('./sea-anchor.mjs?v=c06c618d0a3f')
    .then(({ initSeaAnchor }) => { updateSeaAnchor = initSeaAnchor(seaAnchor, { darkAt: seaIsDarkAt }); })
    .catch(error => console.error('Unable to initialise the anchor:', error));
}

// The homepage uses its original depth gauge; the journal retains its anchor.
const depthGauge = document.querySelector('.depth-gauge');
let updateDepthGauge = () => {};
if (depthGauge) {
  import('./depth-gauge.mjs?v=c06c618d0a3f')
    .then(({ initDepthGauge }) => { updateDepthGauge = initDepthGauge(depthGauge, { building, motion, darkAt: seaIsDarkAt }); })
    .catch(error => console.error('Unable to initialise the depth gauge:', error));
}

// A hermit crab under a stone at the foot of Views from the Reef.
const reefCrab = document.querySelector('[data-reef-crab]');
if (reefCrab) {
  import('./reef-crab.mjs?v=c06c618d0a3f')
    .then(({ initReefCrab }) => initReefCrab(reefCrab))
    .catch(error => console.error('Unable to initialise the hermit crab:', error));
}

let lastScrollAt = -1e9;
function onScroll(event) {
  if (event && typeof performance !== 'undefined') lastScrollAt = performance.now();
  journalViewportDirty = true;
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    const rect = building?.getBoundingClientRect();
    updateJournalViewport();
    if (motion.matches && journalState?.visible) paint(journalState);
    updateThesisScroll();
    renderBuilding(false, rect);
    updateApproach();
    updateSeaAnchor();
    updateDepthGauge();
  });
}
const tracksScroll = Boolean(building || seaAnchor || depthGauge || journalState || thesisStage || document.querySelector('[data-approach]'));
if (tracksScroll) {
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
}
motion.addEventListener('change', () => {
  cancelAnimationFrame(frame);
  frame = 0;
  lastTime = 0;
  canvasStates.forEach(state => paint(state));
  updateThesisScroll();
  renderBuilding(true);
  updateDepthGauge();
  schedule();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(frame); frame = 0;
    canvasStates.filter(state => state.kind === 'reef' && !state.reefReady).forEach(state => state.reefRevision = (state.reefRevision || 0) + 1);
  } else {
    lastTime = 0;
    journalViewportDirty = true;
    canvasStates.filter(state => state.kind === 'reef' && state.loaded && !state.reefReady).forEach(warmReefArtwork);
    schedule();
  }
});
document.querySelectorAll('.site-header nav a').forEach(link => {
  if (new URL(link.href).pathname === location.pathname && !link.hash) link.setAttribute('aria-current', 'page');
});
if (tracksScroll) onScroll();

// The reef's code is loaded, and its coral meshes built a few at a time, in the quiet moment after the
// page has finished loading, so the reef is ready long before it is scrolled to.
if (document.querySelector('canvas[data-art="reef"]')) {
  addEventListener('load', () => {
    const preload = () => artworkLoaders.reef().then(art => art.prepareReefCorals?.()).catch(() => {});
    if ('requestIdleCallback' in window) requestIdleCallback(preload, { timeout: 2500 });
    else setTimeout(preload, 1200);
  }, { once: true });
}
