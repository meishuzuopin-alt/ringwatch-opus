/* sprite_anim.js — procedural motion for camera-facing sprite heroes (ES5, no modules).
 * Usage (Three.js r1xx): the sprite mesh must have its pivot at the feet (geometry translated so feet = local y 0).
 *   var pose = SpriteAnim.walkPose(t, 8);          // or SpriteAnim.idlePose(t)
 *   SpriteAnim.applyPose(spriteMesh, pose, heroHeight);
 *   light.intensity = SpriteAnim.lanternFlicker(t, baseIntensity);
 *   light2.intensity = SpriteAnim.castFlash(frame, u) * flashScale;
 */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;
  var SpriteAnim = {
    // frame index for a looping clip
    frameAt: function (t, fps, count) { return Math.floor(t * fps + 1e-6) % count; },

    // Walk bob + squash/stretch. 4-frame cycle: frames 0,2 = contact (low, squashed), 1,3 = passing (high, stretched).
    // Continuous (no pops): s goes 0 at contact -> 1 at passing.
    // bobAmp = fraction of hero height (default 0.025), squash = 0.03 -> scaleY 0.97..1.03, scaleX = 1/scaleY.
    walkPose: function (t, fps, bobAmp, squash) {
      bobAmp = bobAmp === undefined ? 0.025 : bobAmp; squash = squash === undefined ? 0.03 : squash;
      var u = t * fps / 2;                        // one contact->contact half cycle = 2 frames
      var s = 0.5 - 0.5 * Math.cos(TAU * u);      // 0 on frames 0,2 ; 1 on frames 1,3
      var sy = (1 - squash) + 2 * squash * s;
      return { y: bobAmp * s, sx: 1 / sy, sy: sy };
    },

    // Idle breathing: sin-wave scaleY around the feet, slight inverse scaleX (volume-ish preserving).
    idlePose: function (t, period, amp) {
      period = period || 1.6; amp = amp === undefined ? 0.03 : amp;
      var w = Math.sin(TAU * t / period);
      var sy = 1 + amp * w;
      return { y: 0, sx: 1 - amp * 0.5 * w, sy: sy };
    },

    // Blend two poses (k=0 -> a, 1 -> b) with smoothstep; use for ~0.2 s at state changes to avoid scale pops.
    blendPose: function (a, b, k) {
      k = Math.max(0, Math.min(1, k)); k = k * k * (3 - 2 * k);
      return { y: a.y + (b.y - a.y) * k, sx: a.sx + (b.sx - a.sx) * k, sy: a.sy + (b.sy - a.sy) * k };
    },

    // Neutral pose (cast etc.)
    restPose: function () { return { y: 0, sx: 1, sy: 1 }; },

    // Apply pose to a feet-pivoted mesh/group. baseScale lets you keep a global sprite scale.
    applyPose: function (obj, pose, heroHeight, baseScale) {
      var b = baseScale || 1;
      obj.scale.set(b * pose.sx, b * pose.sy, b);
      obj.position.y = pose.y * heroHeight;
    },

    // Lantern flicker multiplier on a base intensity: sum of incommensurate sines + hashed noise (deterministic).
    lanternFlicker: function (t, base, depth) {
      depth = depth === undefined ? 1 : depth;
      var n = Math.sin(t * 12.9898 + 78.233) * 43758.5453; n = n - Math.floor(n);           // 0..1
      var k = 0.14 * Math.sin(t * 11.3) + 0.09 * Math.sin(t * 27.1 + 1.3) + 0.07 * (n - 0.5);
      return base * Math.max(0.2, 1 + depth * k);
    },

    // Cast light flash multiplier for the 4-frame cast (0 wind-up, 1 raise, 2 burst, 3 follow-through).
    // u = 0..1 progress within the current frame.
    castFlash: function (frame, u) {
      var lv = [0.3, 1.2, 4.0, 2.2][frame] || 0;
      return frame >= 2 ? lv * Math.max(0.35, 1 - u * 0.6) : lv;
    },

    // Cast frame lookup from per-frame durations, e.g. [0.125,0.2,0.2,0.35]. Returns {frame,u}.
    castFrameAt: function (t, durations) {
      var f = 0, rem = t;
      while (f < durations.length - 1 && rem >= durations[f]) { rem -= durations[f]; f++; }
      return { frame: f, u: Math.min(1, rem / durations[f]) };
    }
  };
  root.SpriteAnim = SpriteAnim;
})(typeof window !== 'undefined' ? window : this);
