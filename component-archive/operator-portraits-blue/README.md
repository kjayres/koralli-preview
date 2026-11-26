# Who We Are: the operators' portraits in blue

Until November 2026 every portrait on Who We Are was printed in the site's blue. The two operators'
portraits are now printed in coral and the researchers' stay blue, the same pairing as the strands
in the opening artwork and the figures on the homepage (blue for researchers, coral for operators).

- `antony-refined.webp`, `james-walker.png`: the blue originals, from `src/assets/images/portraits/`.

The coral versions (`…-coral.webp`, `…-coral.png`) were made from these by keeping every pixel's
transparency, which carries the tone, and replacing its ink with the site's coral (#FF6655). Coral
is a lighter ink than the blue, so each tone was laid a little more densely (transparency raised to
the power .62) to keep the same presence on the page.

To restore the blue, move the two files back and point `portrait` for those two people in
`src/content/people.json` at them, then run `npm run build` and `npm run check`. A new operator's
portrait can be made coral the same way.
