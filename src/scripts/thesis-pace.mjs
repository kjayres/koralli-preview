// How the homepage's two opening cards are paced against scrolling.
//
// The cards' own reveal runs from 0 to 1: the first card (its frame and heading, its text, then its
// artwork) is complete at FIRST_CARD, the second at SECOND_CARD. This module decides how much
// scrolling each part takes. The first card fills in while its section is still rising into view,
// so it is whole by the time it is held in place and never sits there as an empty frame. The second
// follows across a short hold, and a little is left to read both before the page moves on.
export const FIRST_CARD = .46, SECOND_CARD = .94;

/**
 * In heights of the window: `from` is how far below the top of the window the section's top edge is
 * when the reveal begins, and `hold` is how long the section is then held once it reaches the top.
 * The stylesheet sets the section's height to 100svh plus the hold.
 */
export const THESIS_SCROLL = { from: .85, hold: .6 };

// The share of the whole journey at which each card is complete.
const TOTAL = THESIS_SCROLL.from + THESIS_SCROLL.hold;
export const THESIS_PACE = { firstCard: .58 / TOTAL, secondCard: 1.16 / TOTAL, held: THESIS_SCROLL.from / TOTAL };

const clamp = value => Math.max(0, Math.min(1, value));

/** The cards' reveal (0 to 1) for how far the reader has travelled through the section (0 to 1). */
export function thesisPace(travelled) {
  const t = clamp(Number(travelled) || 0), { firstCard, secondCard } = THESIS_PACE;
  if (t <= firstCard) return t / firstCard * FIRST_CARD;
  if (t <= secondCard) return FIRST_CARD + (t - firstCard) / (secondCard - firstCard) * (SECOND_CARD - FIRST_CARD);
  return SECOND_CARD + (t - secondCard) / (1 - secondCard) * (1 - SECOND_CARD);
}
