// Shared by the three service scenes on Our Work.

/**
 * The way a robot's elbows point in these scenes: down and a little back, close to its body, whether
 * it is carrying, driving, walking or hanging. Passed to `robotMarkup` as `elbow`; without it, as on
 * the homepage, elbows bend outwards.
 */
export const tuckedElbows = (side, { right, forward }) => [right[0] * side * .25 - forward[0] * .25, right[1] * side * .25 - forward[1] * .25, -1];
