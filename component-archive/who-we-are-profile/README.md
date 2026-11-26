# Who We Are: one archived profile

One core team profile, taken off Who We Are in November 2026 for the time being. Nothing else on
the page changed: the list is built from `src/content/people.json`, one row per person.

- `profile.json`: the entry exactly as it was (`profile`), with where it sat in the list
  (`position`, counting from 0, between `after` and `before`).
- `portrait.webp`: its portrait, from `src/assets/images/portraits/kieran.webp`.

To restore it, move `portrait.webp` back to `src/assets/images/portraits/kieran.webp`, insert the
`profile` object into `src/content/people.json` at `position`, and run `npm run build` and
`npm run check`.
