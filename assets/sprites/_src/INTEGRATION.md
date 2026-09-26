# Sprite integration spec (grok/sprite-integration)

Source: 5 approved 2D sprite sets (hero, grunt, elite, boss, guard), produced 2026-09-25/26 from ChatGPT image generation
sprite sheets (6 rows x 4 cols, white bg), then cut out / halo-cleaned / height-normalized / feet-aligned offline.

## Atlases (assets/sprites/<name>/<name>.png + <name>.json)
Each atlas = 4 columns x 6 rows of equal frames. Row order (see json `rows`):
0 walk_down, 1 walk_right, 2 walk_left (drawn separately, NOT a mirror), 3 walk_up, 4 idle_down, 5 attack (front-facing).
Frame (r,c) is at x=c*frame_w, y=r*frame_h. `pivot_x/pivot_y` = feet point inside a frame (px from frame top-left).
World body height = HERO_H * height_rel_hero; plane height = bodyHeight * frame_h / body_height_px; width = height*frame_w/frame_h.
Heights: hero 1.0, grunt 0.85, elite 1.0, guard 1.0, boss 1.9.
fps: walk 8 (boss 6), idle 4, attack = per-frame durations array in json.
Guard attack thrusts toward screen-right: mirror (scale.x = -1) when her target is on her left.

The PNG atlases are NOT in the repo yet (binary transfer pending). Expected sha256 after they land:
  hero  c195509cf1c88a82249f0e60e2b038de1f3eec1afa102cfcfbc80062f9ca7065  (800x912)
  grunt 7a4f7af22fd65b0709e71a0f7bc7476aa1ea93971f11d0176eff93a1073c846f  (712x858)
  elite cc96faaf09b44c923710aa4d4bb1e6d6a7446b1fa8f862e221f657b8aa2c5853  (944x768)
  boss  8218187919e4992bdcaf27045d92dc074c38749fe4b712c0eada46820bf50f32  (960x1404)
  guard ac865ab39ed20e2ff4d9741f838b0b0a0b6406b9b43facca1aee1d9fce4ba234  (704x702)

## Motion (sprite_anim.js, ES5, window.SpriteAnim)
walkPose(t,fps) bob 2.5% + squash 0.97/1.03 on contact/passing; idlePose(t,1.6,0.03) breathing; blendPose for 0.2 s state
changes; castFrameAt(t,durations) for attack; castFlash(frame,u) for hero cast light; lanternFlicker(t,base) for hero light.
Pose y is world-up; if the plane is tilted to face the camera, divide by the billboard's up.y.

## Rendering
Camera-facing plane (quaternion = camera quaternion), MeshLambert/Standard so the existing C1 lighting (warm inside flame
circle, cool indigo outside) still tints sprites; colorSpace SRGB, alphaTest ~0.5, depthWrite true, keep blob shadow.
Atlases are ~2.2x game-scale hand-painted art: LinearFilter (mipmaps on) reads better than NearestFilter at 40-110 px.
Direction = dominant axis of screen-space velocity (down/right/left/up); idle/attack use front rows.
