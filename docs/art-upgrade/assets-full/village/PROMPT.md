# village — Day-village buildings

- Tool: ChatGPT web (chatgpt.com, Pro), built-in image generation, reasoning effort 「高」 High. AI-assisted, original designs.
- Conversation: https://chatgpt.com/c/6ab7b675-6808-83ea-80dd-ff6523690ec0
- Attachments on every message (style reference only): `/workspace/arttarget/hybrid/H1.png` (day target), `/workspace/arttarget/hybrid/H3.png` (night target).
- Date: 2026-09-26 (times UTC+8). One generation per sheet, no variants, no re-rolls, no upscales.
- `original/` = files exactly as downloaded. `processed/` = post-processed copies (slicing, bg removal, packing). Post-process scripts: `/workspace/assets_full/_tools/` (slice.py, vfx.py, tile.py, frames.py, cards.py).

| Original | Sent | Prompt file | Notes |
|---|---|---|---|
| `original/village_a.png` | 22:42 | `m05_village_1.txt` | 6 buildings, 1536×1024. Sent while a second queue ran by mistake; the message text also contained the card set-1 prompt, the model returned only the village sheet. |
| `original/village_b_1.png` | 23:08 | `m05_village_2.txt` | 6 structures, 1536×1024 |

Post-processing: `processed/`: cottage, house_2storey, woodcutter_hut, quarry_workshop, granary, flame_shrine, barracks, tower_archer, tower_mage, tower_cannon, well, market_stall.

## Exact prompts

### m05_village_1.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 1 image (a single image). All are game assets for our original top-down 3D game "Ringwatch" (圣火守护者): camera looks down at about 46 degrees, light from the upper-left. For asset SHEETS: an evenly spaced grid, every item fully inside its own cell with generous empty padding, nothing touching, overlapping or cropped by the image edge, consistent scale and lighting across the sheet.

Background for both: fully transparent PNG if possible; otherwise a perfectly flat pure white background with no ground plane or gradients. DAYTIME village buildings in soft sunlight (style of Attachment 1), each a separate isolated building seen from our 46-degree top-down camera. House silhouette rule: "mushroom" shapes — narrow walls (warm earth #C9A27A plaster, timber #7A5234 frames, stone #B9A88F bases) under tall, wide-eaved ochre-red pointed roofs #A8483A. Chunky, charming, readable.

VILLAGE BUILDINGS SHEET A (landscape 3:2, strict grid 3 columns x 2 rows = 6 buildings): (1) small cottage; (2) larger two-storey house; (3) woodcutter's hut with a log pile and chopping block; (4) stone quarry workshop with cut blocks; (5) farm granary / food storehouse with sacks and a small garden plot; (6) flame-shard shrine: small open pavilion with a crystal bowl glowing gold.
```

### m05_village_2.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 1 image (a single image). All are game assets for our original top-down 3D game "Ringwatch" (圣火守护者): camera looks down at about 46 degrees, light from the upper-left. For asset SHEETS: an evenly spaced grid, every item fully inside its own cell with generous empty padding, nothing touching, overlapping or cropped by the image edge, consistent scale and lighting across the sheet.

Background for both: fully transparent PNG if possible; otherwise a perfectly flat pure white background with no ground plane or gradients. DAYTIME village buildings in soft sunlight (style of Attachment 1), each a separate isolated building seen from our 46-degree top-down camera. House silhouette rule: "mushroom" shapes — narrow walls (warm earth #C9A27A plaster, timber #7A5234 frames, stone #B9A88F bases) under tall, wide-eaved ochre-red pointed roofs #A8483A. Chunky, charming, readable.

VILLAGE BUILDINGS SHEET B (landscape 3:2, strict grid 3 columns x 2 rows = 6 structures): (1) barracks with a training dummy and weapon rack; (2) ARCHER TOWER: timber watchtower with an ochre-red pointed roof; (3) MAGE TOWER: stone pillar with a floating glowing blue diamond crystal above it; (4) CANNON TOWER: squat round stone drum with a short thick bronze cannon mouth; (5) village well with a small roof; (6) market stall with a striped awning and baskets of goods.
```
