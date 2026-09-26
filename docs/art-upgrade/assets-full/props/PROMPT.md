# props — Night-battle props, nature props, bridge kit

- Tool: ChatGPT web (chatgpt.com, Pro), built-in image generation, reasoning effort 「高」 High. AI-assisted, original designs.
- Conversation: https://chatgpt.com/c/6ab7b675-6808-83ea-80dd-ff6523690ec0
- Attachments on every message (style reference only): `/workspace/arttarget/hybrid/H1.png` (day target), `/workspace/arttarget/hybrid/H3.png` (night target).
- Date: 2026-09-26 (times UTC+8). One generation per sheet, no variants, no re-rolls, no upscales.
- `original/` = files exactly as downloaded. `processed/` = post-processed copies (slicing, bg removal, packing). Post-process scripts: `/workspace/assets_full/_tools/` (slice.py, vfx.py, tile.py, frames.py, cards.py).

| Original | Sent | Prompt file | Notes |
|---|---|---|---|
| `original/props_battle_1.png` | 22:36 | `m04_props_1.txt` | 16 props, 1254² |
| `original/props_nature_1.png` | 22:38 | `m04_props_2.txt` | 16 props, 1254² |
| `original/props_bridge_1.png` | 22:40 | `m04_props_3.txt` | 12 bridge parts, 1536×1024 |

Post-processing: `processed/battle/`, `processed/nature/`, `processed/bridge/`: one trimmed transparent PNG per prop, named by the prompt order (check contact sheet: the model mostly but not always kept the order).

## Exact prompts

### m04_props_1.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 1 image (a single image). All are game assets for our original top-down 3D game "Ringwatch" (圣火守护者): camera looks down at about 46 degrees, light from the upper-left. For asset SHEETS: an evenly spaced grid, every item fully inside its own cell with generous empty padding, nothing touching, overlapping or cropped by the image edge, consistent scale and lighting across the sheet.

Background for all three: fully transparent PNG if possible; otherwise a perfectly flat pure white background with no ground plane, cast shadows or gradients. Each prop is a separate isolated object seen from our 46-degree top-down camera, painted in warm firelit colours (the engine darkens them to indigo outside the light).

NIGHT-BATTLE PROPS SHEET (square 1:1, strict grid 4 columns x 4 rows = 16 props): (1) hanging paper lantern on a wooden post, lit; (2) iron street lantern, lit; (3) small stone lantern (tōrō-like but original), lit; (4) unlit lantern post; (5) wooden supply crate; (6) stack of two crates; (7) wooden barrel; (8) sacks of grain; (9) short wooden picket fence segment (straight); (10) fence corner segment; (11) broken fence segment; (12) wooden spike barricade (cheval-de-frise); (13) campfire log pile, unlit; (14) weapon rack with spears; (15) small wooden signpost (blank board); (16) wheelbarrow.
```

### m04_props_2.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 1 image (a single image). All are game assets for our original top-down 3D game "Ringwatch" (圣火守护者): camera looks down at about 46 degrees, light from the upper-left. For asset SHEETS: an evenly spaced grid, every item fully inside its own cell with generous empty padding, nothing touching, overlapping or cropped by the image edge, consistent scale and lighting across the sheet.

Background for all three: fully transparent PNG if possible; otherwise a perfectly flat pure white background with no ground plane, cast shadows or gradients. Each prop is a separate isolated object seen from our 46-degree top-down camera, painted in warm firelit colours (the engine darkens them to indigo outside the light).

NATURE PROPS SHEET (square 1:1, strict grid 4 columns x 4 rows = 16 props, chunky clustered painterly foliage masses like our style targets): (1) round broadleaf tree; (2) tall broadleaf tree; (3) pine tree; (4) tall pine; (5) dead gnarled tree; (6) tree stump; (7) round bush; (8) flowering bush; (9) large mossy boulder; (10) medium rock; (11) cluster of small rocks; (12) flat stepping stones; (13) reeds / cattails clump; (14) tall grass tuft; (15) fallen log; (16) mushroom cluster.
```

### m04_props_3.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 1 image (a single image). All are game assets for our original top-down 3D game "Ringwatch" (圣火守护者): camera looks down at about 46 degrees, light from the upper-left. For asset SHEETS: an evenly spaced grid, every item fully inside its own cell with generous empty padding, nothing touching, overlapping or cropped by the image edge, consistent scale and lighting across the sheet.

Background for all three: fully transparent PNG if possible; otherwise a perfectly flat pure white background with no ground plane, cast shadows or gradients. Each prop is a separate isolated object seen from our 46-degree top-down camera, painted in warm firelit colours (the engine darkens them to indigo outside the light).

BRIDGE KIT SHEET (landscape 3:2, strict grid 4 columns x 3 rows = 12 modular pieces, stone #B9A88F and timber #7A5234): (1) straight wooden bridge deck section (planks on beams, seen from above at our angle); (2) bridge deck end section; (3) damaged deck section with a gap; (4) stone bridge pier with water-worn base; (5) wooden railing segment; (6) railing end post with a small lantern hook; (7) stone stair flight (4 steps); (8) bridge-head stone gate arch (low, original design); (9) stone abutment block; (10) wooden support trestle; (11) rope-and-post barrier; (12) mooring post with coiled rope.
```
