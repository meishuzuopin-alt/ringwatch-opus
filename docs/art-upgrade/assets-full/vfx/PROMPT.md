# vfx — VFX sprite sheets (black bg, additive)

- Tool: ChatGPT web (chatgpt.com, Pro), built-in image generation, reasoning effort 「高」 High. AI-assisted, original designs.
- Conversation: https://chatgpt.com/c/6ab7b675-6808-83ea-80dd-ff6523690ec0
- Attachments on every message (style reference only): `/workspace/arttarget/hybrid/H1.png` (day target), `/workspace/arttarget/hybrid/H3.png` (night target).
- Date: 2026-09-26 (times UTC+8). One generation per sheet, no variants, no re-rolls, no upscales.
- `original/` = files exactly as downloaded. `processed/` = post-processed copies (slicing, bg removal, packing). Post-process scripts: `/workspace/assets_full/_tools/` (slice.py, vfx.py, tile.py, frames.py, cards.py).

| Original | Sent | Prompt file | Notes |
|---|---|---|---|
| `original/vfx_combat_plus_cardframes.png` | 22:46 | `m06_vfx_1.txt (+ cards_frames.txt merged into the same message)` | 6 combat rows + a bottom row of 6 card frames, RGB 1254² |
| `original/vfx_elemental.png` | 22:48 | `m06_vfx_2.txt` | 6 rows, RGB 1254² |
| `original/vfx_misc.png` | 22:50 | `m06_vfx_3.txt` | 6 rows, RGB 1254² |

Post-processing: `processed/<effect>.png + .json`: one 6-frame horizontal strip per row, black converted to straight alpha (luminance → alpha, colour un-premultiplied). Effects: hit_spark, flame_bolt, bolt_impact, flame_arc_slash, embers_rise, orbit_ember, burn_dot_loop, burn_tick, frost_ring, frost_status, chain_lightning, lightning_impact, death_ink_shatter, knockback_pulse, shield_charge, lifesteal, pickup_sparkle, levelup_burst.

## Exact prompts

### m06_vfx_1.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 1 image (a single image). All are game assets for our original top-down 3D game "Ringwatch" (圣火守护者): camera looks down at about 46 degrees, light from the upper-left. For asset SHEETS: an evenly spaced grid, every item fully inside its own cell with generous empty padding, nothing touching, overlapping or cropped by the image edge, consistent scale and lighting across the sheet.

VFX SPRITE SHEETS: background for all three MUST be perfectly flat pure black #000000 (no vignette, no noise, no stars), because the effects are used with additive blending in the engine; the black cells separate cleanly. Effects painted with soft hand-painted brushy glows (no hard vector edges, no lens-flare streaks), each frame centred in its cell with padding so no glow touches a cell border. Every row is one animation read left to right.

COMBAT VFX SHEET (square 1:1, strict grid 6 columns x 6 rows): row 1 = warm hit spark / impact burst (6 frames: flash, expanding star burst, breaking into brush flecks, fading); row 2 = FLAME BOLT projectile travelling to screen-right (6 frames of a looping flickering fireball with a short ember tail); row 3 = flame-bolt impact explosion (6 frames); row 4 = melee flame ARC slash, a warm orange crescent swing (6 frames); row 5 = rising embers loop (6 frames of small ember particles drifting up); row 6 = ORBITING EMBER: a small bright ember orb with a curved motion trail (6 frames loop).
```

### cards_frames.txt

```
STYLE: Attachment 1 and 2 are our locked style targets (palette and rendering only): stylized realism with hand-painted brushwork, soft glows, no hard edges.

TASK: Please use image generation to create exactly 1 image: a square 1:1 sheet with SIX collectible-card FRAMES in a 3 x 2 grid (top row left to right = tiers 1-3, bottom row = tiers 4-6), each frame portrait 3:4, evenly spaced with generous empty space between them. Each frame is only a border: its large inner art window must be completely EMPTY and transparent (fully transparent PNG background everywhere outside the frame metal and inside the window). If transparency is impossible, fill the background and every window with a perfectly flat pure #00FF00 green (no gradients) so it can be keyed out. Keep a slim empty name plate at the bottom of each frame (blank, no text) and a small gem socket at the top centre. Rarity tiers colour-coded, each tier VISIBLY more ornate than the previous one:
1. Common (普通): plain weathered grey-white stone / pewter frame, simple, thin.
2. Uncommon (优秀): green: bronze frame with green enamel inlay and small leaf engravings.
3. Rare (稀有): blue: silver frame with sapphire-blue enamel, flowing wave filigree, blue gem.
4. Epic (史诗): purple: dark gold and amethyst-purple frame, ornate filigree, corner crystals, faint violet glow.
5. Legendary (传说): orange-gold: rich gold frame with sunburst crests, amber gems, warm orange glow and drifting embers.
6. Mythic (神话): red: crimson and gold frame, most elaborate, flame-shaped crest at the top, sacred-flame glow licking along the edges, floating embers.
Original design, no text, no letters, no numbers, no watermark.
```

### m06_vfx_2.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 1 image (a single image). All are game assets for our original top-down 3D game "Ringwatch" (圣火守护者): camera looks down at about 46 degrees, light from the upper-left. For asset SHEETS: an evenly spaced grid, every item fully inside its own cell with generous empty padding, nothing touching, overlapping or cropped by the image edge, consistent scale and lighting across the sheet.

VFX SPRITE SHEETS: background for all three MUST be perfectly flat pure black #000000 (no vignette, no noise, no stars), because the effects are used with additive blending in the engine; the black cells separate cleanly. Effects painted with soft hand-painted brushy glows (no hard vector edges, no lens-flare streaks), each frame centred in its cell with padding so no glow touches a cell border. Every row is one animation read left to right.

ELEMENTAL VFX SHEET (square 1:1, strict grid 6 columns x 6 rows): row 1 = BURN damage-over-time: small licking flames clinging to a target area (6-frame loop); row 2 = burn tick puff of fire and smoke (6 frames); row 3 = FROST RING: an expanding ring of icy cyan #4FC3E0 shards and frost mist seen from the 46-degree camera (6 frames); row 4 = frozen / chilled status: ice crystals forming (6 frames); row 5 = CHAIN LIGHTNING bolt segment, horizontal, pale violet-white (6 frame flicker); row 6 = lightning strike impact with sparks (6 frames).
```

### m06_vfx_3.txt

```
STYLE (applies to every image): Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (both are our own renders from this conversation). Use them ONLY as rendering-style reference, NOT for composition: "stylized realism" = AAA-grade lighting, material richness and soft volume, rendered with visible hand-painted brushwork, slightly chunky simplified shapes, soft medium-saturation palette, blue-violet shadows (never pure black), soft painted edges. Colour rule "light is colour": things lit by the sacred fire are warm and saturated (fire gold #FFB547, ember orange #E8702A, warm earth #C9A27A, wood #7A5234, ochre-red roofs #A8483A); anything outside the fire light is cool indigo (#1E2A4A to #3E5486) with a thin moon-cyan rim light (#5FA8C8). No hard spotlight edges: every glow falls off softly. Pure red #FF3B3B is reserved for enemy eyes and danger; gold is reserved for rewards. Original designs only. No text, letters, numbers, labels, grid lines, watermarks or signatures anywhere in the images.

TASK: Please use image generation to create exactly 1 image (a single image). All are game assets for our original top-down 3D game "Ringwatch" (圣火守护者): camera looks down at about 46 degrees, light from the upper-left. For asset SHEETS: an evenly spaced grid, every item fully inside its own cell with generous empty padding, nothing touching, overlapping or cropped by the image edge, consistent scale and lighting across the sheet.

VFX SPRITE SHEETS: background for all three MUST be perfectly flat pure black #000000 (no vignette, no noise, no stars), because the effects are used with additive blending in the engine; the black cells separate cleanly. Effects painted with soft hand-painted brushy glows (no hard vector edges, no lens-flare streaks), each frame centred in its cell with padding so no glow touches a cell border. Every row is one animation read left to right.

MISC VFX SHEET (square 1:1, strict grid 6 columns x 6 rows): row 1 = enemy DEATH "ink shatter" (6 frames: white hit flash on a small dark purple creature silhouette, cracks appear, it bursts into 6 to 10 sharp ink-black shards with purple inner faces, shards fly outward with 1 to 3 orange embers, shards thin into ink smoke, faint wisp) — no blood, no corpse; row 2 = KNOCKBACK PULSE: expanding warm shockwave ring on the ground seen at 46 degrees (6 frames); row 3 = SHIELD CHARGE: a warm golden translucent dome shield forming, holding, cracking (6 frames); row 4 = LIFESTEAL: small warm red-orange life motes flowing inward to a centre and a heal glow (6 frames) — use warm coral, not danger red; row 5 = PICKUP sparkle: a gold reward glint burst (6 frames); row 6 = LEVEL-UP / upgrade burst: a column of warm light with rising motes (6 frames).
```
