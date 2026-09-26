# characters — Boss, hero evolution (3 stages × 5 flame colours), 3 new village guards

- Tool: ChatGPT web (chatgpt.com, Pro), built-in image generation, reasoning effort 「高」 High. AI-assisted, original designs.
- Conversation: https://chatgpt.com/c/6ab7b675-6808-83ea-80dd-ff6523690ec0
- Attachments on every message (style reference only): `/workspace/arttarget/hybrid/H1.png` (day target), `/workspace/arttarget/hybrid/H3.png` (night target).
- Date: 2026-09-26 (times UTC+8). One generation per sheet, no variants, no re-rolls, no upscales.
- `original/` = files exactly as downloaded. `processed/` = post-processed copies (slicing, bg removal, packing). Post-process scripts: `/workspace/assets_full/_tools/` (slice.py, vfx.py, tile.py, frames.py, cards.py).

| Original | Sent | Prompt file | Notes |
|---|---|---|---|
| `original/chars_m02_1.png` | 22:20 | `m02_boss_heroes.txt` | 巨影 Looming Shade boss sheet 4×6, 1024×1536 |
| `original/chars_m02_2.png` | 22:20 | `m02_boss_heroes.txt` | hero evolution 3 cols × 5 rows, 1536×1024 |
| `original/chars_m02_3.png` | 22:20 | `m02_boss_heroes.txt` | spearman / archer / fire warden, 4 frames each, 1536×1024 |

Post-processing: `processed/shade_boss.png/.json` packed atlas (height_rel_hero 2.0). `processed/hero_evolution/hero_<colour>_s<1-3>.png` (ember, frost, verdant, radiant, starlight). `processed/guards/guard_<type>_<idle|windup|release|recover>.png`. Note: the hero's face reads as a dark hood with glowing eyes (existing hero sprite shows a face) — flag for review.

## Exact prompts

### m02_boss_heroes.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 3 SEPARATE images (3 individual images, one per item below, not a collage). All are game assets for our original top-down 3D game "Ringwatch" (圣火守护者): camera looks down at about 46 degrees, light from the upper-left. For asset SHEETS: an evenly spaced grid, every item fully inside its own cell with generous empty padding, nothing touching, overlapping or cropped by the image edge, consistent scale and lighting across the sheet.

Background for all three: fully transparent PNG if possible; otherwise a perfectly flat pure white background with no floor, shadows or gradients.

1. BOSS SPRITE SHEET "巨影 The Looming Shade" (portrait 2:3, strict grid 4 columns x 6 rows, one frame per cell, same row order as our other character sheets: walk toward camera, walk right, walk left (drawn, not mirrored), walk away, idle facing camera, attack facing camera). A towering night boss about 2x hero height but still chunky and readable: a giant hooded shadow made of layered ink smoke and tattered cloth, antler-like crown of bone spikes, a hollow face with two burning red eyes, long arms ending in claws, a cracked violet core glowing in its chest, wisps of ink smoke trailing from the hem. Ink-dark #120E22 body revealing purple #6B3FA0 where firelit, moon-cyan rim. Attack row = both claws raised then slammed down with a violet shock burst. Same size and baseline in every frame.

2. HERO EVOLUTION SHEET (landscape 3:2, strict grid 3 columns x 5 rows = 15 figures, each standing idle facing the camera, full body, chibi head:body about 1:2, same scale and same foot baseline per row). Our hero is the stout fire-keeper: pointed hood, cloak, lantern staff. Columns = evolution stage: I = simple cloth hood and short lantern staff; II = reinforced hood with metal clasp, mantle with trim, longer staff with a caged flame lantern; III = ornate hooded mantle with flame embroidery and shoulder guards, tall staff crowned with a large ornate lantern and a floating halo of small flames. Rows = flame colour (the hood, trims, lantern fire and glow change colour; faces and base cloak shape stay the same): row 1 EMBER ORANGE #E07020 (flame-tongue motif), row 2 FROST CYAN #4FC3E0 (hexagon crystal motif), row 3 VERDANT GREEN #3FAE5A (leaf motif), row 4 RADIANT WHITE #EEF2F7 (orb-and-ring motif), row 5 STARLIGHT VIOLET-BLUE #8C8CF0 (four-point star motif).

3. VILLAGE GUARD SHEET (landscape 3:2, strict grid 4 columns x 3 rows). Three new friendly village guards in the same chibi style as our existing red-braided shield guard, humble villager outfits in warm earth and wood tones. Row 1 SPEARMAN: pointed cloth cap, a spear twice his height. Row 2 ARCHER: short hood, quiver on the back, big curved wooden bow. Row 3 FIRE WARDEN (司火): tall flat-topped hat, a long pole with a small smoking copper brazier hanging at its end. Columns for every row: idle facing camera, attack wind-up, attack release (spear thrust to screen-right / arrow loosed to screen-right / brazier swung releasing a fire puff to screen-right), recover.
```
