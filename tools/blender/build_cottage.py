"""
Build stylized-realism medieval timber-frame cottage (cottage_01) in Blender 5.2 LTS.
Target: Under 3000 triangles, real-world scale (1 unit = 1 m), origin at base center.
Matches style references .ref/H1.png and .ref/H3.png:
  - Rustic fieldstone foundation base with beveled corner stones and threshold step.
  - Warm parchment plaster walls inset into dark oak timber framing.
  - Heavy timber beams: corner posts, sill beams, wall plates, diagonal braces, rafter tails.
  - Pitched roof with 5 overlapping courses of wooden/slate shingles, ridge cap saddles, and bargeboards.
  - Two cozy warm-glowing amber windows flanking a vertical plank cottage door.
  - Stone chimney, water barrel, and firewood crate.
Generates:
  - assets/models/trial/cottage_01.glb
  - art_src/blender/cottage_01.blend
  - docs/art-upgrade/models-trial/cottage_01.png
"""

import bpy
import bmesh
import math
import os
import random
from mathutils import Vector, Matrix, Euler

def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not bpy.data.collections:
        col = bpy.data.collections.new("SceneCollection")
        bpy.context.scene.collection.children.link(col)

def create_material(name, base_roughness=0.8, is_emissive=False, emit_strength=4.0):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    
    vcol = nodes.new("ShaderNodeAttribute")
    vcol.attribute_name = "Color"
    links.new(vcol.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = base_roughness
    
    if is_emissive:
        links.new(vcol.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emit_strength
        
    return mat

def add_box(bm, center, size, rot_euler=None):
    cx, cy, cz = center
    sx, sy, sz = size
    hx, hy, hz = sx * 0.5, sy * 0.5, sz * 0.5
    
    verts = [
        Vector((-hx, -hy, -hz)), Vector((hx, -hy, -hz)),
        Vector((hx, hy, -hz)), Vector((-hx, hy, -hz)),
        Vector((-hx, -hy, hz)), Vector((hx, -hy, hz)),
        Vector((hx, hy, hz)), Vector((-hx, hy, hz))
    ]
    
    if rot_euler:
        rot_mat = Euler(rot_euler, 'XYZ').to_matrix().to_4x4()
        verts = [rot_mat @ v for v in verts]
        
    bm_verts = [bm.verts.new(v + Vector((cx, cy, cz))) for v in verts]
    
    faces = [
        bm.faces.new([bm_verts[0], bm_verts[1], bm_verts[2], bm_verts[3]]), # bottom
        bm.faces.new([bm_verts[4], bm_verts[7], bm_verts[6], bm_verts[5]]), # top
        bm.faces.new([bm_verts[0], bm_verts[4], bm_verts[5], bm_verts[1]]), # front
        bm.faces.new([bm_verts[2], bm_verts[6], bm_verts[7], bm_verts[3]]), # back
        bm.faces.new([bm_verts[0], bm_verts[3], bm_verts[7], bm_verts[4]]), # left
        bm.faces.new([bm_verts[1], bm_verts[5], bm_verts[6], bm_verts[2]]), # right
    ]
    return faces

def build_cottage_mesh():
    bm = bmesh.new()
    
    W = 5.8   # width along X
    D = 3.8   # depth along Y
    H_stone = 0.85
    H_wall = 2.25 # wall top at Z = 3.10
    H_eaves = H_stone + H_wall # 3.10
    H_ridge = 4.90 # peak at Z = 4.90
    
    hx = W * 0.5 # 2.9
    hy = D * 0.5 # 1.9
    
    # ---------------- 1. STONE FOUNDATION ----------------
    faces_stone = []
    # Main stone base walls
    faces_stone += add_box(bm, (0, -hy + 0.16, H_stone * 0.5), (W, 0.36, H_stone))
    faces_stone += add_box(bm, (0, hy - 0.16, H_stone * 0.5), (W, 0.36, H_stone))
    faces_stone += add_box(bm, (-hx + 0.16, 0, H_stone * 0.5), (0.36, D - 0.68, H_stone))
    faces_stone += add_box(bm, (hx - 0.16, 0, H_stone * 0.5), (0.36, D - 0.68, H_stone))
    
    # Foundation quoin blocks
    quoin_coords = [
        (-hx - 0.04, -hy - 0.04, 0.22, 0.36, 0.36, 0.38),
        (-hx - 0.03, -hy - 0.03, 0.60, 0.34, 0.34, 0.34),
        (hx + 0.04, -hy - 0.04, 0.22, 0.36, 0.36, 0.38),
        (hx + 0.03, -hy - 0.03, 0.60, 0.34, 0.34, 0.34),
        (-hx - 0.04, hy + 0.04, 0.22, 0.36, 0.36, 0.38),
        (-hx - 0.03, hy + 0.03, 0.60, 0.34, 0.34, 0.34),
        (hx + 0.04, hy + 0.04, 0.22, 0.36, 0.36, 0.38),
        (hx + 0.03, hy + 0.03, 0.60, 0.34, 0.34, 0.34),
        (-1.45, -hy - 0.03, 0.38, 0.46, 0.16, 0.32),
        (1.45, -hy - 0.03, 0.32, 0.44, 0.16, 0.28),
        (-hx - 0.03, 0.15, 0.40, 0.16, 0.46, 0.30),
        (hx + 0.03, -0.25, 0.42, 0.16, 0.44, 0.30),
    ]
    for qx, qy, qz, qsx, qsy, qsz in quoin_coords:
        faces_stone += add_box(bm, (qx, qy, qz), (qsx, qsy, qsz))
        
    # Stone doorstep steps
    faces_stone += add_box(bm, (0, -hy - 0.22, 0.16), (1.45, 0.45, 0.28))
    faces_stone += add_box(bm, (0, -hy - 0.48, 0.07), (1.65, 0.36, 0.14))
    
    for f in faces_stone:
        f.material_index = 0
        
    # ---------------- 2. PLASTER WALLS ----------------
    faces_plaster = []
    faces_plaster += add_box(bm, (-1.55, -hy + 0.12, H_stone + H_wall * 0.5), (2.1, 0.10, H_wall))
    faces_plaster += add_box(bm, (1.55, -hy + 0.12, H_stone + H_wall * 0.5), (2.1, 0.10, H_wall))
    faces_plaster += add_box(bm, (0, -hy + 0.12, 2.70), (1.0, 0.10, 0.80))
    faces_plaster += add_box(bm, (0, hy - 0.12, H_stone + H_wall * 0.5), (W - 0.4, 0.10, H_wall))
    faces_plaster += add_box(bm, (-hx + 0.12, 0, H_stone + H_wall * 0.5), (0.10, D - 0.4, H_wall))
    faces_plaster += add_box(bm, (hx - 0.12, 0, H_stone + H_wall * 0.5), (0.10, D - 0.4, H_wall))
    
    # Gable plaster triangles
    p_left_1 = bm.verts.new((-hx + 0.12, -hy + 0.15, H_eaves))
    p_left_2 = bm.verts.new((-hx + 0.12, hy - 0.15, H_eaves))
    p_left_3 = bm.verts.new((-hx + 0.12, 0.0, H_ridge - 0.12))
    faces_plaster.append(bm.faces.new([p_left_1, p_left_2, p_left_3]))
    
    p_right_1 = bm.verts.new((hx - 0.12, -hy + 0.15, H_eaves))
    p_right_2 = bm.verts.new((hx - 0.12, 0.0, H_ridge - 0.12))
    p_right_3 = bm.verts.new((hx - 0.12, hy - 0.15, H_eaves))
    faces_plaster.append(bm.faces.new([p_right_1, p_right_2, p_right_3]))
    
    for f in faces_plaster:
        f.material_index = 2
        
    # ---------------- 3. TIMBER FRAMING (FACHWERK) ----------------
    faces_wood = []
    T_beam = 0.22
    
    corner_posts = [
        (-hx + T_beam * 0.5, -hy + T_beam * 0.5),
        (hx - T_beam * 0.5, -hy + T_beam * 0.5),
        (-hx + T_beam * 0.5, hy - T_beam * 0.5),
        (hx - T_beam * 0.5, hy - T_beam * 0.5),
    ]
    for cpx, cpy in corner_posts:
        faces_wood += add_box(bm, (cpx, cpy, H_stone + H_wall * 0.5), (T_beam, T_beam, H_wall + 0.08))
        
    faces_wood += add_box(bm, (0, -hy + T_beam * 0.5, H_stone + 0.08), (W, T_beam, 0.18))
    faces_wood += add_box(bm, (0, hy - T_beam * 0.5, H_stone + 0.08), (W, T_beam, 0.18))
    faces_wood += add_box(bm, (-hx + T_beam * 0.5, 0, H_stone + 0.08), (T_beam, D - T_beam*2, 0.18))
    faces_wood += add_box(bm, (hx - T_beam * 0.5, 0, H_stone + 0.08), (T_beam, D - T_beam*2, 0.18))
    
    faces_wood += add_box(bm, (0, -hy + T_beam * 0.5, H_eaves), (W + 0.2, T_beam, 0.20))
    faces_wood += add_box(bm, (0, hy - T_beam * 0.5, H_eaves), (W + 0.2, T_beam, 0.20))
    faces_wood += add_box(bm, (-hx + T_beam * 0.5, 0, H_eaves), (T_beam, D - T_beam*2, 0.20))
    faces_wood += add_box(bm, (hx - T_beam * 0.5, 0, H_eaves), (T_beam, D - T_beam*2, 0.20))
    
    # Door posts & lintel
    faces_wood += add_box(bm, (-0.64, -hy + T_beam * 0.5, H_stone + H_wall * 0.5), (0.16, T_beam, H_wall))
    faces_wood += add_box(bm, (0.64, -hy + T_beam * 0.5, H_stone + H_wall * 0.5), (0.16, T_beam, H_wall))
    faces_wood += add_box(bm, (0, -hy + T_beam * 0.5, 2.25), (1.44, T_beam, 0.18))
    
    # Window posts & sills
    faces_wood += add_box(bm, (-2.15, -hy + T_beam * 0.5, H_stone + H_wall * 0.5), (0.14, T_beam, H_wall))
    faces_wood += add_box(bm, (-0.95, -hy + T_beam * 0.5, H_stone + H_wall * 0.5), (0.14, T_beam, H_wall))
    faces_wood += add_box(bm, (0.95, -hy + T_beam * 0.5, H_stone + H_wall * 0.5), (0.14, T_beam, H_wall))
    faces_wood += add_box(bm, (2.15, -hy + T_beam * 0.5, H_stone + H_wall * 0.5), (0.14, T_beam, H_wall))
    
    faces_wood += add_box(bm, (-1.55, -hy + T_beam * 0.5, 1.25), (1.18, T_beam, 0.15))
    faces_wood += add_box(bm, (-1.55, -hy + T_beam * 0.5, 2.45), (1.18, T_beam, 0.15))
    faces_wood += add_box(bm, (1.55, -hy + T_beam * 0.5, 1.25), (1.18, T_beam, 0.15))
    faces_wood += add_box(bm, (1.55, -hy + T_beam * 0.5, 2.45), (1.18, T_beam, 0.15))
    
    # Rear wall framing
    faces_wood += add_box(bm, (0, hy - T_beam * 0.5, H_stone + H_wall * 0.5), (0.16, T_beam, H_wall))
    faces_wood += add_box(bm, (-1.5, hy - T_beam * 0.5, H_stone + H_wall * 0.5), (0.16, T_beam, H_wall))
    faces_wood += add_box(bm, (1.5, hy - T_beam * 0.5, H_stone + H_wall * 0.5), (0.16, T_beam, H_wall))
    faces_wood += add_box(bm, (0, hy - T_beam * 0.5, 1.95), (W - 0.4, T_beam, 0.14))
    
    # Side walls framing
    faces_wood += add_box(bm, (-hx + T_beam * 0.5, 0, H_stone + H_wall * 0.5), (T_beam, 0.16, H_wall))
    faces_wood += add_box(bm, (-hx + T_beam * 0.5, -0.85, H_stone + H_wall * 0.5), (T_beam, 0.12, H_wall))
    faces_wood += add_box(bm, (-hx + T_beam * 0.5, 0.85, H_stone + H_wall * 0.5), (T_beam, 0.12, H_wall))
    
    faces_wood += add_box(bm, (hx - T_beam * 0.5, 0, H_stone + H_wall * 0.5), (T_beam, 0.16, H_wall))
    faces_wood += add_box(bm, (hx - T_beam * 0.5, -0.65, H_stone + H_wall * 0.5), (T_beam, 0.12, H_wall))
    faces_wood += add_box(bm, (hx - T_beam * 0.5, 0.65, H_stone + H_wall * 0.5), (T_beam, 0.12, H_wall))
    faces_wood += add_box(bm, (hx - T_beam * 0.5, 0, 1.35), (T_beam, 1.25, 0.14))
    faces_wood += add_box(bm, (hx - T_beam * 0.5, 0, 2.35), (T_beam, 1.25, 0.14))
    
    # Gable timbers
    for gx, sgn in [(-hx + 0.10, -1), (hx - 0.10, 1)]:
        faces_wood += add_box(bm, (gx, 0, 4.00), (0.16, 0.16, 1.8))
        faces_wood += add_box(bm, (gx, 0, 4.10), (0.14, 2.0, 0.14))
        
    # Exposed rafter tails
    rafter_xs = [-2.4, -1.5, -0.6, 0.6, 1.5, 2.4]
    for rx in rafter_xs:
        faces_wood += add_box(bm, (rx, -hy - 0.18, H_eaves - 0.05), (0.14, 0.45, 0.12))
        faces_wood += add_box(bm, (rx, hy + 0.18, H_eaves - 0.05), (0.14, 0.45, 0.12))
        
    # Cottage Door
    faces_wood += add_box(bm, (0, -hy + 0.05, 1.55), (0.96, 0.06, 1.95))
    for p_x in [-0.28, 0, 0.28]:
        faces_wood += add_box(bm, (p_x, -hy - 0.01, 1.55), (0.24, 0.04, 1.90))
        
    for f in faces_wood:
        f.material_index = 1
        
    # ---------------- 4. WINDOWS & GLASS ----------------
    faces_win = []
    faces_win += add_box(bm, (-1.55, -hy + 0.05, 1.85), (0.90, 0.02, 1.05))
    faces_win += add_box(bm, (1.55, -hy + 0.05, 1.85), (0.90, 0.02, 1.05))
    faces_win += add_box(bm, (hx - 0.05, 0, 1.85), (0.02, 0.90, 0.85))
    
    for f in faces_win:
        f.material_index = 4
        
    # Window mullions
    faces_mullions = []
    for wx in [-1.55, 1.55]:
        faces_mullions += add_box(bm, (wx, -hy - 0.02, 1.85), (0.06, 0.06, 1.05))
        faces_mullions += add_box(bm, (wx, -hy - 0.02, 1.85), (0.90, 0.06, 0.06))
        faces_mullions += add_box(bm, (wx, -hy - 0.08, 1.28), (1.10, 0.22, 0.09))
    faces_mullions += add_box(bm, (hx + 0.02, 0, 1.85), (0.06, 0.06, 0.85))
    faces_mullions += add_box(bm, (hx + 0.02, 0, 1.85), (0.06, 0.90, 0.06))
    faces_mullions += add_box(bm, (hx + 0.08, 0, 1.38), (0.22, 1.10, 0.09))
    
    for f in faces_mullions:
        f.material_index = 1
        
    # ---------------- 5. PITCHED SHINGLE ROOF ----------------
    O_eave = 0.38
    O_gable = 0.42
    
    roof_hx = hx + O_gable
    roof_hy = hy + O_eave
    roof_eave_z = H_eaves - 0.05
    roof_ridge_z = H_ridge + 0.12
    
    faces_roof = []
    
    n_tiers = 5
    for slope_sgn, slope_name in [(-1, 'front'), (1, 'rear')]:
        for tier in range(n_tiers):
            t0 = tier / n_tiers
            t1 = min(1.0, (tier + 1.2) / n_tiers)
            
            y_start = slope_sgn * (roof_hy * (1.0 - t0))
            z_start = roof_eave_z + (roof_ridge_z - roof_eave_z) * t0
            
            y_end = slope_sgn * (roof_hy * (1.0 - t1))
            z_end = roof_eave_z + (roof_ridge_z - roof_eave_z) * t1
            
            row_cy = (y_start + y_end) * 0.5
            row_cz = (z_start + z_end) * 0.5 + (0.035 * tier)
            row_len = math.sqrt((y_end - y_start)**2 + (z_end - z_start)**2)
            
            pitch_angle = math.atan2(roof_ridge_z - roof_eave_z, roof_hy)
            rot_x = -slope_sgn * pitch_angle
            
            n_tabs = 8
            tab_w = (roof_hx * 2.0) / n_tabs
            for tab_i in range(n_tabs):
                tab_cx = -roof_hx + (tab_i + 0.5) * tab_w
                tab_seed = (tab_i * 37 + tier * 101 + (0 if slope_sgn < 0 else 53)) % 100
                stagger = ((tab_seed % 7) - 3) * 0.02
                thickness = 0.06 + (tab_seed % 5) * 0.008
                
                tc_y = row_cy - slope_sgn * stagger
                tc_z = row_cz - stagger * math.sin(pitch_angle)
                
                tab_faces = add_box(
                    bm,
                    (tab_cx, tc_y, tc_z),
                    (tab_w * 0.96, row_len * 1.05, thickness),
                    rot_euler=(rot_x, 0, 0)
                )
                faces_roof += tab_faces
                
    faces_roof += add_box(bm, (0, 0, roof_ridge_z + 0.02), (roof_hx * 2.0 + 0.1, 0.22, 0.16))
    
    saddle_xs = [-2.8, -1.85, -0.95, 0.0, 0.95, 1.85, 2.8]
    for sx in saddle_xs:
        faces_roof += add_box(bm, (sx, -0.16, roof_ridge_z + 0.02), (0.24, 0.22, 0.08), rot_euler=(-0.75, 0, 0))
        faces_roof += add_box(bm, (sx, 0.16, roof_ridge_z + 0.02), (0.24, 0.22, 0.08), rot_euler=(0.75, 0, 0))
        faces_roof += add_box(bm, (sx, 0, roof_ridge_z + 0.14), (0.26, 0.14, 0.14))
        
    for gx, sgn in [(-roof_hx + 0.05, -1), (roof_hx - 0.05, 1)]:
        b_len = math.sqrt(roof_hy**2 + (roof_ridge_z - roof_eave_z)**2)
        pitch = math.atan2(roof_ridge_z - roof_eave_z, roof_hy)
        faces_roof += add_box(
            bm,
            (gx, -roof_hy * 0.5, (roof_ridge_z + roof_eave_z) * 0.5),
            (0.12, b_len, 0.22),
            rot_euler=(pitch, 0, 0)
        )
        faces_roof += add_box(
            bm,
            (gx, roof_hy * 0.5, (roof_ridge_z + roof_eave_z) * 0.5),
            (0.12, b_len, 0.22),
            rot_euler=(-pitch, 0, 0)
        )
        faces_roof += add_box(bm, (gx, 0, roof_ridge_z + 0.22), (0.14, 0.14, 0.35))
        
    for f in faces_roof:
        f.material_index = 3
        
    # ---------------- 6. STONE CHIMNEY ----------------
    faces_chimney = []
    chim_cx, chim_cy = -1.40, 1.00
    chim_base_z = 2.60
    chim_top_z = 5.50
    chim_h = chim_top_z - chim_base_z
    
    faces_chimney += add_box(bm, (chim_cx, chim_cy, chim_base_z + chim_h * 0.5), (0.75, 0.70, chim_h))
    faces_chimney += add_box(bm, (chim_cx, chim_cy, chim_top_z + 0.06), (0.88, 0.82, 0.12))
    faces_chimney += add_box(bm, (chim_cx, chim_cy, chim_top_z + 0.18), (0.72, 0.68, 0.14))
    faces_chimney += add_box(bm, (chim_cx, chim_cy, chim_top_z + 0.32), (0.42, 0.40, 0.22))
    
    for f in faces_chimney:
        f.material_index = 0
        
    # ---------------- 7. COZY VILLAGE PROPS ----------------
    faces_barrel_wood = []
    faces_iron = []
    
    bx, by = -1.45, -hy - 0.42
    b_h = 0.68
    b_r = 0.28
    
    n_bsides = 8
    b_rings = []
    for r_z, r_rad in [(0.0, b_r * 0.85), (0.22, b_r * 1.06), (0.46, b_r * 1.04), (b_h, b_r * 0.88)]:
        ring = []
        for i in range(n_bsides):
            ang = 2.0 * math.pi * i / n_bsides
            vx = bx + r_rad * math.cos(ang)
            vy = by + r_rad * math.sin(ang)
            ring.append(bm.verts.new((vx, vy, r_z)))
        b_rings.append(ring)
        
    for r in range(len(b_rings) - 1):
        for i in range(n_bsides):
            i_next = (i + 1) % n_bsides
            faces_barrel_wood.append(bm.faces.new([b_rings[r][i], b_rings[r][i_next], b_rings[r + 1][i_next], b_rings[r + 1][i]]))
    faces_barrel_wood.append(bm.faces.new(reversed(b_rings[0])))
    faces_barrel_wood.append(bm.faces.new(b_rings[-1]))
    
    faces_iron += add_box(bm, (bx, by, 0.14), (b_r * 2.15, b_r * 2.15, 0.05))
    faces_iron += add_box(bm, (bx, by, 0.54), (b_r * 2.05, b_r * 2.05, 0.05))
    
    faces_iron += add_box(bm, (-0.38, -hy - 0.03, 2.10), (0.35, 0.02, 0.06))
    faces_iron += add_box(bm, (-0.38, -hy - 0.03, 1.05), (0.35, 0.02, 0.06))
    faces_iron += add_box(bm, (0.32, -hy - 0.03, 1.55), (0.08, 0.04, 0.12))
    faces_iron += add_box(bm, (0.34, -hy - 0.06, 1.52), (0.04, 0.04, 0.08))
    
    faces_wood_props = []
    faces_wood_props += add_box(bm, (1.65, -hy - 0.35, 0.22), (0.90, 0.45, 0.44))
    faces_wood_props += add_box(bm, (1.65, -hy - 0.35, 0.46), (0.94, 0.49, 0.06))
    
    for f in faces_barrel_wood + faces_wood_props:
        f.material_index = 1
    for f in faces_iron:
        f.material_index = 5
        
    return bm

def assign_vertex_colors(mesh):
    color_layer = mesh.color_attributes.new(name="Color", type='FLOAT_COLOR', domain='CORNER')
    
    # PBR Albedos for stylized realism matching H1.png:
    # Stone: fieldstone with dark mortar
    c_stone_base  = Vector((0.22, 0.19, 0.16))
    c_stone_light = Vector((0.32, 0.28, 0.24))
    c_stone_dark  = Vector((0.14, 0.12, 0.10))
    c_stone_dirt  = Vector((0.20, 0.15, 0.10))
    
    # Wood: deep dark weathered oak framing
    c_wood_dark  = Vector((0.10, 0.06, 0.03))
    c_wood_mid   = Vector((0.16, 0.10, 0.06))
    c_wood_light = Vector((0.24, 0.16, 0.10))
    
    # Plaster: warm parchment / butter-cream stucco
    c_plaster_mid  = Vector((0.68, 0.62, 0.50))
    c_plaster_top  = Vector((0.78, 0.72, 0.60))
    c_plaster_dark = Vector((0.48, 0.42, 0.32))
    
    # Roof: dark weathered slate / timber shake
    c_roof_mid   = Vector((0.10, 0.08, 0.07))
    c_roof_warm  = Vector((0.16, 0.12, 0.10))
    c_roof_shade = Vector((0.06, 0.05, 0.04))
    
    # Window: rich glowing warm amber
    c_win_bright = Vector((1.00, 0.65, 0.15))
    c_win_amber  = Vector((1.00, 0.45, 0.05))
    
    c_iron = Vector((0.08, 0.08, 0.09))
    
    for poly in mesh.polygons:
        mat_idx = poly.material_index
        normal = poly.normal
        
        for li in poly.loop_indices:
            v_idx = mesh.loops[li].vertex_index
            v_co = mesh.vertices[v_idx].co
            
            if mat_idx == 0:
                # STONE
                up_h = max(0.0, normal.z)
                col = c_stone_base.lerp(c_stone_light, up_h * 0.55)
                if v_co.z < 0.45:
                    dirt_f = max(0.0, 1.0 - (v_co.z / 0.45))
                    col = col.lerp(c_stone_dirt, dirt_f * 0.70)
                block_hash = ((math.floor(v_co.x * 2.5) * 17 + math.floor(v_co.y * 2.5) * 31 + math.floor(v_co.z * 3.0) * 11) % 10) / 10.0
                col += Vector(((block_hash - 0.5) * 0.08, (block_hash - 0.5) * 0.06, (block_hash - 0.5) * 0.05))
                
            elif mat_idx == 1:
                # TIMBER BEAMS
                up_h = max(0.0, normal.z * 0.5 - normal.y * 0.3)
                col = c_wood_mid.lerp(c_wood_light, up_h * 0.5)
                if v_co.z < 1.2:
                    col = col.lerp(c_wood_dark, 0.30)
                grain = math.sin(v_co.z * 16.0 + v_co.x * 4.0) * 0.025
                col += Vector((grain, grain * 0.7, grain * 0.5))
                
            elif mat_idx == 2:
                # PLASTER WALLS
                h_norm = max(0.0, min(1.0, (v_co.z - 0.85) / 2.25))
                col = c_plaster_mid.lerp(c_plaster_top, h_norm * 0.5)
                if v_co.z < 1.15:
                    col = col.lerp(c_plaster_dark, 0.35)
                noise = math.sin(v_co.x * 3.0 + v_co.z * 4.0) * 0.02
                col += Vector((noise, noise * 0.8, noise * 0.5))
                
            elif mat_idx == 3:
                # ROOF SHINGLES
                sun_exp = max(0.0, normal.z * 0.6 - normal.y * 0.45)
                col = c_roof_mid.lerp(c_roof_warm, sun_exp * 0.65)
                if normal.y > 0.2:
                    col = col.lerp(c_roof_shade, 0.35)
                shingle_hash = ((math.floor(v_co.x * 2.5) * 13 + math.floor(v_co.y * 3.5) * 29) % 10) / 10.0
                col += Vector(((shingle_hash - 0.5) * 0.07, (shingle_hash - 0.5) * 0.06, (shingle_hash - 0.5) * 0.05))
                
            elif mat_idx == 4:
                # WINDOW GLOW
                col = c_win_amber.lerp(c_win_bright, 0.65)
                
            elif mat_idx == 5:
                # IRON
                col = c_iron
            else:
                col = Vector((0.5, 0.5, 0.5))
                
            col.x = max(0.0, min(1.0, col.x))
            col.y = max(0.0, min(1.0, col.y))
            col.z = max(0.0, min(1.0, col.z))
            color_layer.data[li].color = (col.x, col.y, col.z, 1.0)

def setup_camera_and_lighting(target=(0, -0.4, 2.1), dist=12.0, elev_deg=45.0, azim_deg=-34.0):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.film_transparent = True
    
    elev = math.radians(elev_deg)
    azim = math.radians(azim_deg)
    
    tx, ty, tz = target
    cam_x = tx + dist * math.cos(elev) * math.sin(azim)
    cam_y = ty - dist * math.cos(elev) * math.cos(azim)
    cam_z = tz + dist * math.sin(elev)
    
    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 52.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_obj.location = (cam_x, cam_y, cam_z)
    
    dir_vec = (Vector(target) - cam_obj.location).normalized()
    cam_obj.rotation_euler = dir_vec.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    
    # Key light: Balanced warm golden sunlight
    sun_data = bpy.data.lights.new("SunKey", type='SUN')
    sun_data.energy = 2.6
    sun_data.color = (1.0, 0.94, 0.82)
    sun_obj = bpy.data.objects.new("SunKey", sun_data)
    sun_dir = Vector((0.45, 0.65, -0.65)).normalized()
    sun_obj.rotation_euler = sun_dir.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(sun_obj)
    
    # Fill light: Cool blue-violet ambient fill
    fill_data = bpy.data.lights.new("FillLight", type='SUN')
    fill_data.energy = 0.95
    fill_data.color = (0.58, 0.66, 0.96)
    fill_obj = bpy.data.objects.new("FillLight", fill_data)
    fill_dir = Vector((-0.65, -0.45, -0.40)).normalized()
    fill_obj.rotation_euler = fill_dir.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(fill_obj)
    
    # Warm interior point lights behind windows
    for wx in [-1.55, 1.55]:
        p_data = bpy.data.lights.new(f"WinLight_{wx}", type='POINT')
        p_data.energy = 20.0
        p_data.color = (1.0, 0.65, 0.18)
        p_data.shadow_soft_size = 0.35
        p_obj = bpy.data.objects.new(f"WinLight_{wx}", p_data)
        p_obj.location = (wx, -1.80, 1.85)
        bpy.context.scene.collection.objects.link(p_obj)
        
    # Ground contact disk
    bm_ground = bmesh.new()
    bmesh.ops.create_circle(bm_ground, cap_ends=True, radius=5.2, segments=28)
    m_ground = bpy.data.meshes.new("GroundShadow")
    bm_ground.to_mesh(m_ground)
    bm_ground.free()
    obj_ground = bpy.data.objects.new("GroundShadow", m_ground)
    obj_ground.location = (0, 0, -0.01)
    
    mat_g = bpy.data.materials.new("Mat_Ground")
    bsdf_g = mat_g.node_tree.nodes.get("Principled BSDF")
    bsdf_g.inputs["Base Color"].default_value = (0.35, 0.32, 0.28, 1.0)
    bsdf_g.inputs["Roughness"].default_value = 0.95
    m_ground.materials.append(mat_g)
    bpy.context.scene.collection.objects.link(obj_ground)

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    out_glb = os.path.join(root_dir, "assets", "models", "trial", "cottage_01.glb")
    out_blend = os.path.join(root_dir, "art_src", "blender", "cottage_01.blend")
    out_png = os.path.join(root_dir, "docs", "art-upgrade", "models-trial", "cottage_01.png")
    
    for d in [os.path.dirname(out_glb), os.path.dirname(out_blend), os.path.dirname(out_png)]:
        os.makedirs(d, exist_ok=True)
        
    clean_scene()
    
    mat_stone = create_material("Mat_CottageStone", base_roughness=0.88)
    mat_wood = create_material("Mat_CottageWood", base_roughness=0.84)
    mat_plaster = create_material("Mat_CottagePlaster", base_roughness=0.92)
    mat_roof = create_material("Mat_CottageRoof", base_roughness=0.80)
    mat_window = create_material("Mat_CottageWindow", base_roughness=0.25, is_emissive=True, emit_strength=4.0)
    mat_iron = create_material("Mat_CottageIron", base_roughness=0.55)
    
    bm = build_cottage_mesh()
    mesh = bpy.data.meshes.new("Cottage_01")
    bm.to_mesh(mesh)
    bm.free()
    
    mesh.materials.append(mat_stone)   # 0
    mesh.materials.append(mat_wood)    # 1
    mesh.materials.append(mat_plaster) # 2
    mesh.materials.append(mat_roof)    # 3
    mesh.materials.append(mat_window)  # 4
    mesh.materials.append(mat_iron)    # 5
    
    assign_vertex_colors(mesh)
    
    obj = bpy.data.objects.new("Cottage_01", mesh)
    bpy.context.scene.collection.objects.link(obj)
    
    tri_count = sum(len(p.vertices) - 2 for p in mesh.polygons)
    print(f"==========================================")
    print(f"Cottage_01 built successfully!")
    print(f"Total Polygons: {len(mesh.polygons)}")
    print(f"Total Triangles: {tri_count} (Budget: < 3000)")
    print(f"==========================================")
    assert tri_count < 3000, f"Triangle count {tri_count} exceeds 3000 budget!"
    
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    
    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_attributes=True,
        export_materials='EXPORT'
    )
    glb_size = os.path.getsize(out_glb)
    print(f"Exported GLB: {out_glb} ({glb_size / 1024:.1f} KB)")
    
    setup_camera_and_lighting(target=(0, -0.4, 2.1), dist=12.0, elev_deg=45.0, azim_deg=-34.0)
    
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    print(f"Saved .blend: {out_blend}")
    
    scene = bpy.context.scene
    scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
    print(f"Rendered preview: {out_png}")

if __name__ == "__main__":
    main()
