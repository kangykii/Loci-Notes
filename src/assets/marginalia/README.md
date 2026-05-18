# Marginalia

Hand-drawn ink illustrations dropped here are placed as "marginalia" — small accents
in the negative space of the editorial home view. They are styled with
`mix-blend-mode: multiply` so a transparent or off-white background works best.

## Expected slot filenames

The home view (see `src/App.tsx`, `<figure class="margin-ink">` elements) reserves
three slots. Drop a PNG or SVG with the matching filename and wire it in via a
simple `<img src={...} />` inside the figure once you have the asset.

| Filename             | Slot          | Position                                   |
| -------------------- | ------------- | ------------------------------------------ |
| `greeting-right.svg` | Greeting      | Top-right of the greeting block            |
| `tip-left.svg`       | Tip card      | Bottom-left, slightly rotated              |
| `recent-bottom.svg`  | Recent Notes  | Bottom-right beneath the list              |

Sketches in the style of loose fashion line-art — gestural single-weight ink,
optional blush-pink accents, no fill — sit best against the soft warm canvas.

Below ~960px viewport width the marginalia slots auto-hide so they only show
up on roomy screens.

Each character can also emit `<character>.<part>.svg` overlays for hover-only
micro-animations. The current bounding boxes and generated import metadata live
in `scripts/convert-marginalia.mjs`.
