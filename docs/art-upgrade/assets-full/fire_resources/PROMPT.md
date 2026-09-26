# fire_resources — Sacred fire + altar states; resource & flame-crystal icons

- Tool: ChatGPT web (chatgpt.com, Pro), built-in image generation, reasoning effort 「高」 High. AI-assisted, original designs.
- Conversation: https://chatgpt.com/c/6ab7b675-6808-83ea-80dd-ff6523690ec0
- Attachments on every message (style reference only): `/workspace/arttarget/hybrid/H1.png` (day target), `/workspace/arttarget/hybrid/H3.png` (night target).
- Date: 2026-09-26 (times UTC+8). One generation per sheet, no variants, no re-rolls, no upscales.
- `original/` = files exactly as downloaded. `processed/` = post-processed copies (slicing, bg removal, packing). Post-process scripts: `/workspace/assets_full/_tools/` (slice.py, vfx.py, tile.py, frames.py, cards.py).

| Original | Sent | Prompt file | Notes |
|---|---|---|---|
| `original/fire_m03_1.png` | 22:24 | `m03_fire_resources.txt` | 8 states, 1536×1024 |
| `original/res_m03b_1.png` | 22:34 | `m03b_resources.txt` | 12 icons, 1254×1254. The first message asked for 2 images but only returned the fire sheet; this follow-up generated the missing one (not a re-roll). |

Post-processing: `processed/sacred_fire/` fire_lv1..3, fire_damaged, fire_extinguished, fire_overload, altar_inactive, altar_active. `processed/resources/` res_wood, res_stone, res_food, res_flame_shard, crystal_ember/frost/verdant/radiant/starlight, res_gold_coins, res_shard_pouch, xp_orb.

## Exact prompts

### m03_fire_resources.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 2 SEPARATE images (2 individual images, one per item below, not a collage). All are game assets for our original top-down 3D game "Ringwatch" (圣火守护者): camera looks down at about 46 degrees, light from the upper-left. For asset SHEETS: an evenly spaced grid, every item fully inside its own cell with generous empty padding, nothing touching, overlapping or cropped by the image edge, consistent scale and lighting across the sheet.

Background for both: fully transparent PNG if possible; otherwise a perfectly flat pure white background with no floor or gradients.

1. SACRED FIRE & ALTAR STATES SHEET (landscape 3:2, strict grid 4 columns x 2 rows, 8 cells, each object seen from our 46-degree top-down camera). Row 1 = the sacred fire on its round stone brazier (stone colour #B9A88F, fire gold #FFB547 with white-hot core #FFF1C8 and ember-orange outer flames #E8702A): (a) level 1 small stone brazier with a modest flame; (b) level 2 brazier ringed by a low circle of short carved stone pillars; (c) level 3 grand altar-brazier with tall carved pillars and a floating ring of small flames; (d) damaged / low health: cracked stones, a short dim flickering flame, thin smoke. Row 2: (e) extinguished: cold grey brazier, dark ash, a single thin wisp of smoke; (f) OVERLOAD: the fire erupting in a tall column with swirling embers (soft glow, no hard edges); (g) field altar INACTIVE: small square stone plinth with three short pillars holding dull blue crystals; (h) field altar ACTIVE: same altar with crystals glowing moon-cyan #5FA8C8, soft light motes rising.

2. RESOURCE & FLAME-SHARD ICON SHEET (square 1:1, strict grid 4 columns x 3 rows = 12 icons, each a chunky painted game item icon with a darker same-hue outline and a small top-left highlight, readable at 32 px). Row 1 day-village resources: (1) WOOD: a bundle of three cut logs tied with rope; (2) STONE: a small pile of grey cut stone blocks; (3) FOOD: a woven basket with bread, apples and a carrot; (4) FLAME SHARD: a glowing gold-orange crystal shard with a tiny flame inside. Row 2 the five coloured flame crystals, each a faceted glowing gem whose SHAPE differs: (5) ember orange #E07020 three-tongued flame shape; (6) frost cyan #4FC3E0 upright hexagonal prism; (7) verdant green #3FAE5A pointed leaf / spindle with a mid-vein; (8) radiant white #EEF2F7 round orb with an outer ring; then (9) starlight violet-blue #8C8CF0 slender four-point star. Then (10) GOLD COIN stack, (11) a small wrapped bundle of flame shards (reward pouch), (12) a glowing experience orb (soft warm white-gold).
```

### m03b_resources.txt

```
Thanks, the sacred-fire sheet is perfect. The second image of my previous message was not generated. Please use image generation to create it now (exactly 1 image), with the same STYLE rules as before (attachments = style references only):

RESOURCE & FLAME-SHARD ICON SHEET (square 1:1, strict grid 4 columns x 3 rows = 12 icons, each a chunky painted game item icon with a darker same-hue outline and a small top-left highlight, readable at 32 px). Row 1 day-village resources: (1) WOOD: a bundle of three cut logs tied with rope; (2) STONE: a small pile of grey cut stone blocks; (3) FOOD: a woven basket with bread, apples and a carrot; (4) FLAME SHARD: a glowing gold-orange crystal shard with a tiny flame inside. Row 2 the five coloured flame crystals, each a faceted glowing gem whose SHAPE differs: (5) ember orange #E07020 three-tongued flame shape; (6) frost cyan #4FC3E0 upright hexagonal prism; (7) verdant green #3FAE5A pointed leaf / spindle with a mid-vein; (8) radiant white #EEF2F7 round orb with an outer ring; then (9) starlight violet-blue #8C8CF0 slender four-point star. Then (10) GOLD COIN stack, (11) a small wrapped bundle of flame shards (reward pouch), (12) a glowing experience orb (soft warm white-gold).

Background: fully transparent PNG if possible; otherwise a perfectly flat pure white background. No text or numbers.
```
