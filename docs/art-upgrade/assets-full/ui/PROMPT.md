# ui — Minimal UI kit

- Tool: ChatGPT web (chatgpt.com, Pro), built-in image generation, reasoning effort 「高」 High. AI-assisted, original designs.
- Conversation: https://chatgpt.com/c/6ab7b675-6808-83ea-80dd-ff6523690ec0
- Attachments on every message (style reference only): `/workspace/arttarget/hybrid/H1.png` (day target), `/workspace/arttarget/hybrid/H3.png` (night target).
- Date: 2026-09-26 (times UTC+8). One generation per sheet, no variants, no re-rolls, no upscales.
- `original/` = files exactly as downloaded. `processed/` = post-processed copies (slicing, bg removal, packing). Post-process scripts: `/workspace/assets_full/_tools/` (slice.py, vfx.py, tile.py, frames.py, cards.py).

| Original | Sent | Prompt file | Notes |
|---|---|---|---|
| `original/ui_kit.png` | 22:51 | `m07_ui_1.txt` | 1254² RGB; the model painted a fake checkerboard instead of real transparency |

Post-processing: `original/_ui_kit_keyed.png` checkerboard keyed out; `processed/*.png` 26 pieces (primary/secondary buttons ×4 states, toggles, icon buttons, close, checkboxes, hp+xp bars (one file, two bars), cooldown ring, slider, boss hp bar, minimap frame, wave-timer medallion, tooltip, large panel, banner). The separate card-frame and flat upgrade-icon prompts (m07_ui_2/3) were dropped: the user switched to illustrated cards, see `../cards/`.

## Exact prompts

### m07_ui_1.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 1 image (a single image). All are game assets for our original top-down 3D game "Ringwatch" (圣火守护者): camera looks down at about 46 degrees, light from the upper-left. For asset SHEETS: an evenly spaced grid, every item fully inside its own cell with generous empty padding, nothing touching, overlapping or cropped by the image edge, consistent scale and lighting across the sheet.

UI KIT in our MINIMAL style: thin elegant frames, dark translucent indigo-ink panels (#0F1530 to #1E2A4A) with thin warm brass/gold hairline borders (#B9894F), small tasteful corner ornaments, soft painted texture, NO thick bevels, NO stacked borders, NO glossy plastic gradients, NO text or letters. Background for all three: fully transparent PNG if possible; otherwise a perfectly flat pure magenta #FF00FF background (no gradients) so it can be keyed out. Every element isolated in its own cell with generous padding.

UI KIT SHEET (square 1:1): primary button (normal / hover / pressed / disabled, 4 wide rounded-rectangle buttons with a warm ember-orange fill for primary), secondary button (normal / hover / pressed / disabled, dark with brass hairline), a small round icon button, a close "x" button, a large content panel (9-slice friendly: plain centre, ornament only at corners), a small tooltip panel, a top banner ribbon, a HP bar frame and its warm red-orange fill, a XP bar frame and its gold fill, a boss HP bar frame (wider, ink-violet with small bone ornaments) and its violet fill, a circular cooldown ring, a toggle switch on/off, a checkbox on/off, a slider track and knob, a minimap round frame, and a wave-timer medallion frame. Empty areas where text would go.
```
