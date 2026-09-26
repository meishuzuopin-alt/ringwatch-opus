# enemies — Enemy sprite sheets (4 new shadow enemies)

- Tool: ChatGPT web (chatgpt.com, Pro), built-in image generation, reasoning effort 「高」 High. AI-assisted, original designs.
- Conversation: https://chatgpt.com/c/6ab7b675-6808-83ea-80dd-ff6523690ec0
- Attachments on every message (style reference only): `/workspace/arttarget/hybrid/H1.png` (day target), `/workspace/arttarget/hybrid/H3.png` (night target).
- Date: 2026-09-26 (times UTC+8). One generation per sheet, no variants, no re-rolls, no upscales.
- `original/` = files exactly as downloaded. `processed/` = post-processed copies (slicing, bg removal, packing). Post-process scripts: `/workspace/assets_full/_tools/` (slice.py, vfx.py, tile.py, frames.py, cards.py).

| Original | Sent | Prompt file | Notes |
|---|---|---|---|
| `original/enemies_m01_1..4.png` | 22:17 | `m01_enemies.txt` | one message, 4 images: brute, wolf rider, shadow shaman, night bat. Each 1024×1536 RGBA (real transparency). |

Post-processing: `processed/<name>.png + .json` = packed 4×6 atlas, frames feet-aligned, same json schema as `assets/sprites/*/*.json` (rows walk_down/right/left/up, idle_down, attack). height_rel_hero: brute 1.4, wolfrider 1.0, shaman 0.95, bat 0.7 (bat pivot includes its painted ground shadow).

## Exact prompts

### m01_enemies.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 4 SEPARATE images (four individual images, one per item below, not a collage). Each is a game SPRITE SHEET for our original top-down game "Ringwatch" (圣火守护者), portrait 2:3, same format as the 5 character sheets we already made: a strict grid of 4 columns x 6 rows, one frame per cell, character centred in each cell with generous padding, feet on the same baseline in every cell, identical scale in all 24 frames. Rows: 1 = walk toward camera (4 frames), 2 = walk to screen-right, 3 = walk to screen-left (drawn separately, not mirrored), 4 = walk away from camera, 5 = idle facing camera (breathing), 6 = attack facing camera (anticipation, strike, follow-through, recover). Chibi proportions (big head, head:body about 1:2), clean readable silhouette at 60 px, soft painterly rendering as in the style targets. These are SHADOW CREATURES of the night: ink-dark bodies (#120E22) that reveal purple colour (#6B3FA0, darks #45287A, lights #9068C8) with grey-violet armour, bone-coloured spikes and wooden weapons, glowing red eyes, thin moon-cyan rim light. Background: fully transparent PNG if possible; otherwise a perfectly flat pure white background with no shadows or gradients.

1. BRUTE (heavy elite, 1.4x hero height): wide and short, hunched massive back, spiked shoulder pauldrons, tiny head sunk between the shoulders, drags a huge stone-headed maul; attack row = overhead slam.
2. WOLF RIDER (fast, the only LONG horizontal silhouette): a lean shadow wolf with a small hooded goblin rider holding a slanted long spear; walk rows are a lope; attack row = a lunge with spear thrust.
3. SHADOW SHAMAN (caster): small hunched robed figure with a tall crooked staff topped by a floating violet ember, bone mask, trailing tattered robe; attack row = raising the staff and releasing a violet orb.
4. NIGHT BAT (flying swarm unit): a round-bodied shadow bat with big membranous wings and red eyes, hovering with a soft ground shadow below it; walk rows = wing-flap flight cycle in each direction; attack row = a diving bite.
```
