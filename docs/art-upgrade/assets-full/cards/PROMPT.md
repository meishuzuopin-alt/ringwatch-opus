# cards — 12 upgrade-card illustrations + 6 rarity-tier frames

- Tool: ChatGPT web (chatgpt.com, Pro), built-in image generation, reasoning effort 「高」 High. AI-assisted, original designs.
- Conversation: https://chatgpt.com/c/6ab7b675-6808-83ea-80dd-ff6523690ec0
- Attachments on every message (style reference only): `/workspace/arttarget/hybrid/H1.png` (day), `/workspace/arttarget/hybrid/H3.png` (night).
- Date: 2026-09-26 (UTC+8). One generation per image, no re-rolls, no upscales.
- Card names/effects: `js/data.js` → `RW.NIGHT.picks.cards` on main.

| Original | Sent (UTC+8) | Content |
|---|---|---|
| `original/cards_art_set1_1.png` (1024×1536) | 23:02 | 2×2: 圣火扩环 hearth, 疾斩 tempo, 贯焰 pierce, 环焰 embers |
| `original/cards_art_set2_1.png` (1024×1536) | 23:05 | 2×2: 灼痕 scorch, 斥浪 pulse, 汲火 leech, 双舌 volley |
| `original/cards_art_set3.png` (1024×1536) | 22:44 | 2×2: 疾步 stride, 火盾 ward, 链电 chain, 霜环 frost |
| `../vfx/original/vfx_combat_plus_cardframes.png` (1254×1254) | 22:46 | 6 tier frames came back as the bottom row of the combat-VFX sheet (a queue mishap merged the frame prompt into the VFX message). One generation covered both; frames extracted from it, no extra generation spent. |

Post-processing (originals untouched):
- `processed/art/card_<id>.png`: each panel cut on the white gutters, cropped to 3:4 (~498×664). `card_<id>_384.jpg` = 384×512.
- `processed/frames/frame_t1_common … t6_mythic.png`: black background keyed out (large dark regions → alpha by luminance), each ~200×365 px. **Low-res** because they were one strip of a larger sheet; fine for in-game cards up to ~250 px tall, a dedicated frame sheet would be needed for 2× UI.
- `processed/composed/card_<id>_<tier>.png`: art behind frame (frame 2× Lanczos, art fitted to the transparent window). Tier chosen from data.js rarity: common→t1 普通, rare(精良)→t3 稀有(blue), epic(稀有)→t4 史诗(purple). data.js only has 3 rarity levels; tiers t2/t5/t6 are ready but unused (`_tier_demo_*` show them).
- `contact.png`: all 12 cards framed + one row showing the 6 tiers.

## Exact prompts

### cards_1.txt

```
STYLE: Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (our own renders). Use them ONLY for palette and rendering, not composition: "stylized realism" = AAA lighting, soft volumetric light, rich materials, visible hand-painted brushwork, blue-violet shadows (never pure black), soft glows with no hard spotlight edges. Colour rule "light is colour": warm saturated gold / ember orange inside the sacred-fire light, cool indigo night outside it. For these cards add premium collectible-card-game illustration quality with some anime flair: dynamic angles, expressive motion lines rendered as painterly strokes, bold readable focal point.

Characters that may appear: OUR HERO the fire-keeper = a stout, cute chibi-ish keeper (big head) in a red pointed hood (#B8452E) and cream cloak (#EFE2C4) holding a lantern staff; THE SACRED FIRE = a round carved stone brazier with a gold-white flame; ENEMIES = small shadow creatures of ink-black/purple (#120E22 / #6B3FA0) with glowing red eyes that shatter into ink shards (never blood). Setting: a night village and a stone-and-timber bridge over a river.

TASK: Please use image generation to create exactly 1 image: a portrait 2:3 sheet split into a 2 x 2 grid of FOUR separate card illustrations, each panel portrait 3:4 and full-bleed painted edge to edge inside its panel, separated by clean straight pure-white gutters (about 2% of the image) so they can be cut apart. Each panel is a dramatic small scene that reads clearly even when shown at 120 px tall: one strong focal subject, strong value contrast, no clutter at the panel edges (a card frame will cover the outer ~6%). No text, letters, numbers, card frames, borders, UI or watermarks inside the panels.

The four panels (top-left, top-right, bottom-left, bottom-right):
1. 圣火扩环 "Hearth Ring" (the sacred fire's reach grows and a ring of burning heat surrounds it): the stone brazier erupts, flame tongues lashing far outward in a spiral while a widening ring of shimmering heat and embers spreads across the paving, shadow creatures at the rim recoiling.
2. 疾斩 "Swift Cleave" (faster slashes): the hero spinning mid-air in a flurry, three overlapping warm-orange crescent slash arcs, ember streaks, several shadow imps cut into ink shards around him.
3. 贯焰 "Piercing Flame" (fire tongues pass through enemies to hit those behind): a single long lance of flame shooting from the sacred fire down the bridge, piercing straight through a line of three shadow creatures in a row, each bursting in sequence.
4. 环焰 "Orbiting Ember" (an ember circles you and burns whatever it touches): the hero standing calm with a bright ember orb whirling around him on a glowing orbital trail, the orb searing a lunging shadow wolf.
```

### cards_2.txt

```
STYLE: Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (our own renders). Use them ONLY for palette and rendering, not composition: "stylized realism" = AAA lighting, soft volumetric light, rich materials, visible hand-painted brushwork, blue-violet shadows (never pure black), soft glows with no hard spotlight edges. Colour rule "light is colour": warm saturated gold / ember orange inside the sacred-fire light, cool indigo night outside it. For these cards add premium collectible-card-game illustration quality with some anime flair: dynamic angles, expressive motion lines rendered as painterly strokes, bold readable focal point.

Characters that may appear: OUR HERO the fire-keeper = a stout, cute chibi-ish keeper (big head) in a red pointed hood (#B8452E) and cream cloak (#EFE2C4) holding a lantern staff; THE SACRED FIRE = a round carved stone brazier with a gold-white flame; ENEMIES = small shadow creatures of ink-black/purple (#120E22 / #6B3FA0) with glowing red eyes that shatter into ink shards (never blood). Setting: a night village and a stone-and-timber bridge over a river.

TASK: Please use image generation to create exactly 1 image: a portrait 2:3 sheet split into a 2 x 2 grid of FOUR separate card illustrations, each panel portrait 3:4 and full-bleed painted edge to edge inside its panel, separated by clean straight pure-white gutters (about 2% of the image) so they can be cut apart. Each panel is a dramatic small scene that reads clearly even when shown at 120 px tall: one strong focal subject, strong value contrast, no clutter at the panel edges (a card frame will cover the outer ~6%). No text, letters, numbers, card frames, borders, UI or watermarks inside the panels.

The four panels (top-left, top-right, bottom-left, bottom-right):
1. 灼痕 "Scorch Mark" (fire hits keep burning for a while): a shadow brute engulfed in clinging, licking flames that keep burning after the hit, glowing scorch cracks on its armour, embers peeling off.
2. 斥浪 "Repelling Wave" (periodically pushes nearby enemies away): the hero slamming his lantern staff down, a big warm shockwave ring bursting outward across the ground, shadow creatures blasted back off their feet in every direction.
3. 汲火 "Flame Drain" (fire damage heals the sacred fire a little): streams of warm coral-gold wisps drawn out of burning shadow creatures and flowing back into the sacred fire brazier, which glows brighter and mends its cracks.
4. 双舌 "Twin Tongues" (the sacred fire spits an extra fire tongue): the sacred fire unleashing two serpent-like fire tongues side by side, curling and striking two different shadow creatures at once.
```

### cards_3.txt

```
STYLE: Attachment 1 = our locked DAY style target, Attachment 2 = our locked NIGHT style target (our own renders). Use them ONLY for palette and rendering, not composition: "stylized realism" = AAA lighting, soft volumetric light, rich materials, visible hand-painted brushwork, blue-violet shadows (never pure black), soft glows with no hard spotlight edges. Colour rule "light is colour": warm saturated gold / ember orange inside the sacred-fire light, cool indigo night outside it. For these cards add premium collectible-card-game illustration quality with some anime flair: dynamic angles, expressive motion lines rendered as painterly strokes, bold readable focal point.

Characters that may appear: OUR HERO the fire-keeper = a stout, cute chibi-ish keeper (big head) in a red pointed hood (#B8452E) and cream cloak (#EFE2C4) holding a lantern staff; THE SACRED FIRE = a round carved stone brazier with a gold-white flame; ENEMIES = small shadow creatures of ink-black/purple (#120E22 / #6B3FA0) with glowing red eyes that shatter into ink shards (never blood). Setting: a night village and a stone-and-timber bridge over a river.

TASK: Please use image generation to create exactly 1 image: a portrait 2:3 sheet split into a 2 x 2 grid of FOUR separate card illustrations, each panel portrait 3:4 and full-bleed painted edge to edge inside its panel, separated by clean straight pure-white gutters (about 2% of the image) so they can be cut apart. Each panel is a dramatic small scene that reads clearly even when shown at 120 px tall: one strong focal subject, strong value contrast, no clutter at the panel edges (a card frame will cover the outer ~6%). No text, letters, numbers, card frames, borders, UI or watermarks inside the panels.

The four panels (top-left, top-right, bottom-left, bottom-right):
1. 疾步 "Quick Step" (run faster, hold the bridge mouth): the hero dashing across the wooden bridge with wind-swept cloak, ember afterimages and speed streaks trailing behind, shadow creatures left behind in the dark.
2. 火盾 "Flame Ward" (blocks one hit, then recharges): a translucent golden dome of fire-light around the hero absorbing a shadow brute's maul strike, cracks of light spreading on the shield at the point of impact.
3. 链电 "Chain Lightning" (an arc jumps between nearby enemies): a crackling pale violet-white lightning bolt leaping from the hero's lantern and chaining across four shadow creatures in a zigzag, each lit up mid-jump.
4. 霜环 "Frost Ring" (a ring of frost that slows enemies): an expanding ring of icy cyan crystals and frost mist spreading outward over the ground from the hero, shadow creatures caught and slowed with frost creeping up their legs, a cold blue counterpoint to the warm firelight.
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
