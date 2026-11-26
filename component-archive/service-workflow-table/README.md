# Service card: the workflow table

The first service card on Our Work, "Redesign workflows for people and agents", as it was until
November 2026: a route drawn across a table changed from coral to blue as a person and an agent
fitted two agent stations into it, with a reviewer holding a board in front. It was replaced by the
plumbers (`src/scripts/art/service-flow.mjs`): the work-flow as real pipework, in the same spirit
as the glass delivery van and the robot on the trial course beside it.

- `service-scenes-with-workflow-table.mjs`: `src/scripts/art/service-scenes.mjs` as it was, complete.
  The scene is the `workflow` function, with its motion in `servicePose(0, …)` and the helpers
  `floor`, `table`, `key` and `splitFigure`.

Its test was "the agent module meets the board and its human grips stay reachable" in
`scripts/check-services.mjs`; the commit that archived this scene shows it being removed.

To restore it, copy `workflow`, its helpers and the `index === 0` branch of `servicePose` back into
`src/scripts/art/service-scenes.mjs`, put `workflow` first in the `scenes` list with a loop length
of 224 and a still phase of .2, restore the test, and run `npm run build`, `npm run check` and
`npm run check:artwork`.
