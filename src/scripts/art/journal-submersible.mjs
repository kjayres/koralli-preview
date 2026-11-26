// A small research submersible crosses the open water of the Views from the Reef opening, an agent
// at its controls behind the dome and a lamp lighting the water ahead. It says where we are: not on
// the reef any more, but down in the dark where things have to be gone and looked at. Native wire
// geometry in CSS pixels, drawn like the animals around it; everything follows from the time.
const TAU = Math.PI * 2;
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const wrap = (value, span) => ((value % span) + span) % span;
const mix = (a, b, t) => a + (b - a) * t;
const hash = n => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return value - Math.floor(value); };

/** One pass every CYCLE seconds, taking CROSSING of them; the page opens with the craft already in view. */
export const SUBMERSIBLE = { cycle: 62, crossing: 44, lead: 13, still: 2, beam: 2.5, slope: 24 * Math.PI / 180 };

// The craft, in units of its own length: x forward, y down, z towards the viewer.
function build() {
  const fine = [], firm = [], pilot = [];
  const ring = (x, y, ry, rz, count = 12) => Array.from({ length: count + 1 }, (_, i) => [x, y + Math.cos(i * TAU / count) * ry, Math.sin(i * TAU / count) * rz]);
  // Hull: a rounded body behind the dome, tapering to the thruster.
  const stations = [[-.40, .034, .03], [-.33, .084, .074], [-.22, .117, .104], [-.08, .128, .114], [.04, .121, .109], [.13, .094, .086]], spine = -.035;
  const rings = stations.map(([x, ry, rz]) => ring(x, spine, ry, rz));
  rings.forEach(points => fine.push(points));
  for (const k of [1, 3, 5, 7, 9, 11]) fine.push(rings.map(points => points[k]));
  firm.push(rings.map(points => points[0]), rings.map(points => points[6]));
  // The dome: a glass sphere, drawn as its outline and three sections.
  const dome = [.25, -.012, 0], r = .165, circle = (plane, radius = r, offset = 0, count = 24) => Array.from({ length: count + 1 }, (_, i) => {
    const a = i * TAU / count, u = Math.cos(a) * radius, v = Math.sin(a) * radius;
    return plane === 'side' ? [dome[0] + u, dome[1] + v, offset] : plane === 'level' ? [dome[0] + u, dome[1] + offset, v] : [dome[0] + offset, dome[1] + u, v];
  });
  firm.push(circle('side'));
  fine.push(circle('level'), circle('across'), circle('across', Math.sqrt(r * r - .1 * .1), .1), ring(.115, -.02, .118, .105));
  // The pilot: an agent's square head with its visor to the front, antenna, shoulders and one arm on the stick.
  const box = ([cx, cy, cz], [hx, hy, hz]) => {
    const c = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([a, b, d]) => [cx + a * hx, cy + b * hy, cz + d * hz]);
    return [[c[0], c[1], c[2], c[3], c[0]], [c[4], c[5], c[6], c[7], c[4]], [c[0], c[4]], [c[1], c[5]], [c[2], c[6]], [c[3], c[7]]];
  };
  const head = [.262, -.07, 0];
  pilot.push(...box(head, [.043, .038, .043]), ...box([.246, .04, 0], [.052, .042, .056]));
  pilot.push([[head[0] + .0435, head[1] - .018, -.03], [head[0] + .0435, head[1] - .018, .03], [head[0] + .0435, head[1] + .012, .03], [head[0] + .0435, head[1] + .012, -.03], [head[0] + .0435, head[1] - .018, -.03]]);
  pilot.push([[head[0], head[1] - .038, 0], [head[0], head[1] - .082, 0]], [[head[0], head[1] + .038, 0], [head[0], head[1] + .0, 0]]);
  pilot.push([[.262, .012, .056], [.305, .052, .062], [.336, .03, .052]], [[.336, .03, .052], [.338, .082, .05]], [[.31, .084, -.05], [.366, .084, -.05], [.366, .084, .06], [.31, .084, .06]]);
  // Pontoons with their struts, the fairing and mast on top, and the lamp bar under the dome.
  for (const side of [-1, 1]) {
    const z = side * .108, tube = (y, dz) => [[-.3, .137 + y, z + dz], [.22, .137 + y, z + dz]];
    fine.push(ring(-.3, .137, .034, .034, 8).map(([x, y, w]) => [x, y, w + z]), ring(.22, .137, .034, .034, 8).map(([x, y, w]) => [x, y, w + z]), tube(0, .034), tube(0, -.034));
    firm.push(tube(.034, 0));
    fine.push([[-.2, .07, z * .8], [-.2, .105, z]], [[.07, .075, z * .8], [.07, .105, z]]);
  }
  firm.push([[-.21, -.148, 0], [-.15, -.212, 0], [.0, -.212, 0], [.07, -.156, 0]]);
  fine.push([[-.15, -.212, 0], [-.15, -.15, 0]], [[.0, -.212, 0], [.0, -.156, 0]], [[-.075, -.212, 0], [-.075, -.29, 0]]);
  const lamp = [.325, .142, 0];
  for (const side of [-1, 1]) firm.push(ring(lamp[0], lamp[1], .026, .026, 10).map(([x, y, w]) => [x, y, w + side * .07]));
  // The thruster shroud at the stern.
  fine.push(ring(-.418, spine, .07, .066), [[-.4, spine - .034, 0], [-.455, spine - .076, 0]], [[-.4, spine + .034, 0], [-.455, spine + .076, 0]]);
  firm.push(ring(-.455, spine, .078, .072));
  const visor = [[head[0] + .0437, head[1] - .018, -.03], [head[0] + .0437, head[1] - .018, .03], [head[0] + .0437, head[1] + .012, .03], [head[0] + .0437, head[1] + .012, -.03]];
  return { fine, firm, pilot, visor, lamp, stern: [-.455, spine, 0], mastTop: [-.075, -.29, 0], antenna: [head[0], head[1] - .082, 0], arm: [[.17, .128, .092], [.33, .2, .1], [.42, .152, .1]] };
}
const CRAFT = build();

/** Where the craft is and whether it is in the water at this moment. */
export function submersiblePose(width, height, seconds = 0, { compact = width < 700, reducedMotion = false, screen } = {}) {
  const elapsed = Number(seconds), time = reducedMotion ? SUBMERSIBLE.still : Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const phase = wrap(time + SUBMERSIBLE.lead, SUBMERSIBLE.cycle), progress = phase / SUBMERSIBLE.crossing;
  const size = clamp(width / 1440, .66, 1.18), length = compact ? 124 : 205 * size, margin = length * .75;
  // It keeps to the open water between the navigation and the title, which sits at the foot of the
  // first screen: a little above the middle of that screen, with the slow rise and fall of a craft
  // trimming itself. `screen` is the height of the window; without it a usual laptop is assumed.
  const tall = Number.isFinite(screen) && screen > 0 ? screen : 800;
  const depth = Math.min(height * .2, clamp(tall * .36, compact ? 205 : 215, compact ? 300 : 345));
  const active = reducedMotion || phase <= SUBMERSIBLE.crossing;
  // The lamp comes up as the craft arrives and is dimmed before it leaves, so nothing appears or vanishes at once.
  const lit = reducedMotion ? 1 : smooth(phase / 3) * smooth((SUBMERSIBLE.crossing - phase) / 2.5);
  return {
    x: mix(width + margin, -margin, Math.min(progress, 1)), y: depth + 7 * Math.sin(time * .31 + .6) + 2.5 * Math.sin(time * .83 + 2),
    length, time, phase, progress, active, lit, compact,
    pitch: .018 * Math.sin(time * .27 + 1.1) + .01 * Math.sin(time * .9), yaw: .34 + .05 * Math.sin(time * .11),
    alpha: compact ? .38 : .42,
    // The whole drawing lies within this distance above and below its depth. The lamp beam reaches
    // furthest: its length down its slope, plus its spread, from a lamp slung under the dome.
    reach: length * (.2 + SUBMERSIBLE.beam * (Math.sin(SUBMERSIBLE.slope + .1) + .27)) + 16,
  };
}

/** The craft, its pilot, its lamp beam and the water the beam lights. */
export function drawJournalSubmersible(ctx, width, height, seconds = 0, options = {}) {
  if (!ctx || !Number.isFinite(width + height) || width <= 0 || height <= 0) return;
  const pose = submersiblePose(width, height, seconds, options);
  if (!pose.active) return;
  const { viewport } = options;
  if (viewport && (pose.y + pose.reach < viewport.top || pose.y - pose.reach > viewport.bottom)) return;
  const { x, y, length, time } = pose, cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw), cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
  // It travels to the left, so the model's forward axis is mirrored on screen.
  const project = ([px, py, pz]) => {
    const xx = px * cy + pz * sy, yy = py + pz * .24;
    return [x - (xx * cp - yy * sp) * length, y + (xx * sp + yy * cp) * length];
  };
  const path = points => { const first = project(points[0]); ctx.moveTo(first[0], first[1]); for (let i = 1; i < points.length; i++) { const p = project(points[i]); ctx.lineTo(p[0], p[1]); } };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // The beam: a soft cone ahead and below, strongest at the lamp, in a few steps so no gradient is needed.
  const origin = project(CRAFT.lamp), slope = SUBMERSIBLE.slope + .035 * Math.sin(time * .4) + pose.pitch;
  const aim = [-Math.cos(slope), Math.sin(slope)], across = [-aim[1], aim[0]], far = SUBMERSIBLE.beam * length;
  const along = (s, w) => [origin[0] + aim[0] * far * s + across[0] * far * s * w, origin[1] + aim[1] * far * s + across[1] * far * s * w];
  if (pose.lit > .01) {
    const end = along(1, 0), cones = [[.235, .028], [.185, .026], [.135, .03], [.085, .034], [.04, .04]];
    if (typeof ctx.createLinearGradient === 'function') {
      // Each cone fades smoothly to nothing along its length.
      for (const [spread, strength] of cones) {
        const fade = ctx.createLinearGradient(origin[0], origin[1], end[0], end[1]);
        fade.addColorStop(0, `rgba(201,216,255,${(strength * pose.lit).toFixed(4)})`);
        fade.addColorStop(.55, `rgba(201,216,255,${(strength * pose.lit * .32).toFixed(4)})`);
        fade.addColorStop(1, 'rgba(201,216,255,0)');
        ctx.fillStyle = fade; ctx.globalAlpha = 1;
        const b = along(1, -spread), c = along(1, spread);
        ctx.beginPath(); ctx.moveTo(origin[0], origin[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath(); ctx.fill();
      }
    } else {
      // Without gradients, the same cones in steps.
      ctx.fillStyle = '#C9D8FF';
      for (const [spread, strength] of cones) for (let step = 0; step < 8; step++) {
        const from = step / 8, to = (step + 1) / 8;
        ctx.globalAlpha = strength * pose.lit * (1 - from) ** 1.6;
        ctx.beginPath();
        const a = along(from, -spread), b = along(to, -spread), c = along(to, spread), d = along(from, spread);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
      }
    }
    // Marine snow caught in the beam, drifting back past the craft.
    ctx.fillStyle = '#DCE6FF';
    for (let i = 0; i < (pose.compact ? 9 : 15); i++) {
      const s = wrap(hash(i * 13 + 5) - time * (.012 + hash(i * 13 + 6) * .01), 1) * .9 + .06, w = (hash(i * 13 + 7) * 2 - 1) * .2;
      const speck = along(s, w + .02 * Math.sin(time * .5 + i));
      ctx.globalAlpha = pose.lit * .5 * (1 - s) ** .7 * (1 - Math.abs(w) / .24);
      ctx.beginPath(); ctx.arc(speck[0], speck[1], .55 + hash(i * 13 + 8) * .6, 0, TAU); ctx.fill();
    }
  }

  // The hull and frame as fine wire, then its outline, then the pilot a little firmer still.
  ctx.strokeStyle = '#B5C4DF';
  ctx.globalAlpha = pose.alpha * .5; ctx.lineWidth = .45; ctx.beginPath();
  for (const line of CRAFT.fine) path(line);
  ctx.stroke();
  ctx.globalAlpha = pose.alpha; ctx.lineWidth = .62; ctx.beginPath();
  for (const line of CRAFT.firm) path(line);
  // The manipulator arm rests folded, its elbow easing a little as the craft moves.
  const ease = .012 * Math.sin(time * .35), [shoulder, elbow, wrist] = CRAFT.arm, bent = [elbow[0], elbow[1] + ease, elbow[2]], held = [wrist[0], wrist[1] + ease * 1.6, wrist[2]];
  path([shoulder, bent, held]); path([held, [held[0] + .04, held[1] - .022, held[2]]]); path([held, [held[0] + .036, held[1] + .026, held[2]]]);
  // The propeller turns in its shroud.
  const [sx, sy0] = [CRAFT.stern[0], CRAFT.stern[1]], turn = time * 4.2;
  for (let blade = 0; blade < 3; blade++) { const a = turn + blade * TAU / 3; path([[sx, sy0, 0], [sx, sy0 + Math.cos(a) * .066, Math.sin(a) * .062]]); }
  ctx.stroke();
  ctx.strokeStyle = '#C6D3F2'; ctx.globalAlpha = Math.min(1, pose.alpha * 1.25); ctx.lineWidth = .66; ctx.beginPath();
  for (const line of CRAFT.pilot) path(line);
  ctx.stroke();
  // Its visor, a pale panel on the front of its head, is what makes it an agent and not a box.
  ctx.fillStyle = '#C6D3F2'; ctx.globalAlpha = pose.alpha * .55; ctx.beginPath(); path(CRAFT.visor); ctx.closePath(); ctx.fill();
  // Small steady lights: the lamps, the mast head and the pilot's antenna.
  ctx.fillStyle = '#DCE6FF';
  const dot = (point, radius, alpha) => { const p = project(point); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(p[0], p[1], radius, 0, TAU); ctx.fill(); };
  for (const side of [-1, 1]) dot([CRAFT.lamp[0], CRAFT.lamp[1], side * .07], Math.max(.9, length * .012), Math.min(1, pose.alpha * (1 + pose.lit)));
  dot(CRAFT.mastTop, Math.max(.7, length * .007), pose.alpha * 1.1);
  dot(CRAFT.antenna, Math.max(.7, length * .008), Math.min(1, pose.alpha * 1.3));
  // A few bubbles rise from the stern and fall behind.
  ctx.strokeStyle = '#B5C4DF'; ctx.lineWidth = .5;
  const stern = project(CRAFT.stern);
  for (let i = 0; i < 5; i++) {
    const age = wrap(time * .32 + i / 5, 1);
    ctx.globalAlpha = pose.alpha * .7 * (1 - age);
    ctx.beginPath(); ctx.arc(stern[0] + (10 + age * 46) * length / 150 + 3 * Math.sin(time * 1.3 + i * 2), stern[1] - age * 44 * length / 150 - 3, (.9 + 1.5 * age) * length / 150 + .3, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
