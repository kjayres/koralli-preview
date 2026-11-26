# Service card: the glass room

The middle service card on Our Work, "Make delivery performance transparent", as it was until
November 2026: a person and an agent working at a table inside a glass room, while a second person
wiped a frosted pane clear to reveal the labels Cost, Work and Value. It was replaced by the glass
delivery van (`src/scripts/art/service-van.mjs`), which says "delivery" and "transparent" in one
picture and gives the three cards three different silhouettes.

- `service-scenes-with-glass-room.mjs`: `src/scripts/art/service-scenes.mjs` as it was, complete.
  The scene is the `transparency` function, with its motion in `servicePose(1, …)` and the helpers
  `wipePath`, `turningStep` and `strideAt`.

Its test was "cloth remains on the glass and within the human arm reach" in
`scripts/check-services.mjs`; the commit that archived this scene shows it being removed.

To restore it, copy `transparency`, the three helpers and the `index === 1` branch of `servicePose`
back into `src/scripts/art/service-scenes.mjs`, put `transparency` back in the `scenes` list with a
loop length of 256 and a still phase of .2, restore the test, and run `npm run build`,
`npm run check` and `npm run check:artwork`.
