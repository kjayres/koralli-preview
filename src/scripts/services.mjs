import { serviceSceneMarkup, SERVICE_STEPS, SERVICE_STILL } from './art/service-scenes.mjs';

export function initServices() {
  const section = document.querySelector('[data-services]');
  if (!section) return;
  const stage = section.querySelector('[data-services-stage]');
  const cards = [...section.querySelectorAll('.service')];
  const svgs = cards.map(card => card.querySelector('[data-service-scene]'));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const list = section.querySelector('.service-list') || stage;
  let frame = 0, last = 0, near = false, shown = false, primed = false;
  const times = [0, 0, 0], lastSteps = [-1, -1, -1], visible = [false, false, false];

  function update() {
    cards.forEach((card, i) => {
      const bounds = card.getBoundingClientRect();
      visible[i] = shown && bounds.bottom > 0 && bounds.top < innerHeight;
    });
    schedule();
  }
  // The three offerings arrive together as the section comes into view, a moment apart, and stay.
  // The page is never held: what is offered should not have to be scrolled out of hiding.
  function reveal() {
    if (shown) return;
    shown = true;
    section.classList.add('services-shown');
    update();
  }
  function still() {
    svgs.forEach((svg, i) => { svg.innerHTML = serviceSceneMarkup(i, SERVICE_STILL[i]); });
    lastSteps.fill(-1);
    cancelAnimationFrame(frame); frame = 0; last = 0;
  }
  function schedule() {
    if (!frame && near && !motion.matches && !document.hidden && visible.some(Boolean)) frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    if (!near || motion.matches || document.hidden || !visible.some(Boolean)) { last = 0; return; }
    // Fixed 16fps artwork clock. Hidden cards do no drawing, and the elapsed time
    // is capped so returning to a tab never jumps a person or a carried object.
    if (!last || now - last >= 62.5) {
      const dt = last ? Math.min(.12, (now - last) / 1000) : 0;
      last = now;
      svgs.forEach((svg, i) => {
        if (!visible[i]) return;
        times[i] += dt;
        const length = SERVICE_STEPS[i];
        const step = Math.floor(times[i] * 16) % length;
        if (step !== lastSteps[i]) {
          svg.innerHTML = serviceSceneMarkup(i, step / length);
          lastSteps[i] = step;
        }
      });
    }
    schedule();
  }
  function settle() {
    // With reduced motion the cards are simply present, each showing one still moment.
    if (motion.matches) { section.classList.remove('services-reveal'); reveal(); still(); }
    update();
  }

  new IntersectionObserver(entries => {
    near = entries.some(entry => entry.isIntersecting);
    if (!near) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    update();
  }).observe(stage);
  // Reveal once the first card has properly entered, not as its top edge touches the fold.
  new IntersectionObserver((entries, observer) => {
    let entered = entries.some(entry => entry.isIntersecting);
    if (!primed) {
      primed = true;
      // Cards are only ever hidden while still below the fold. On a deep link, or when the page
      // opens further down, they are already on screen or behind the reader and simply stay.
      if (list.getBoundingClientRect().top < innerHeight) entered = true;
      else if (!motion.matches && !shown) section.classList.add('services-reveal');
    }
    if (!entered) return;
    observer.disconnect();
    reveal();
  }, { rootMargin: '0px 0px -12% 0px' }).observe(list);
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  motion.addEventListener('change', settle);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    schedule();
  });
  settle();
}

if (typeof document !== 'undefined') initServices();
