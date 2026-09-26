"""
Build stylized-realism deciduous tree (tree_01) in Blender 5.2 LTS.
Target: Under 1500 triangles, real-world scale (1 unit = 1 m), origin at base center.
Matches style references .ref/H1.png and .ref/H3.png:
  - Chunky organic trunk with 4 flared root buttresses and mossy base.
  - Clustered soft canopy with puffy, voluminous foliage clouds.
  - Saturated hand-painted palette (golden lime on top, rich lush emerald, deep mossy shadows).
  - Smooth foliage normals for soft stylized shading.
Generates:
  - assets/models/trial/tree_01.glb
  - art_src/blender/tree_01.blend
  - docs/art-upgrade/models-trial/tree_01.png
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

def setup_materials():
    mat_bark = bpy.data.materials.new(name="Mat_TreeBark")
    nodes_b = mat_bark.node_tree.nodes
    links_b = mat_bark.node_tree.links
    bsdf_b = nodes_b.get("Principled BSDF")
    vcol_b = nodes_b.new("ShaderNodeAttribute")
    vcol_b.attribute_name = "Color"
    links_b.new(vcol_b.outputs["Color"], bsdf_b.inputs["Base Color"])
    bsdf_b.inputs["Roughness"].default_value = 0.88

    mat_leaf = bpy.data.materials.new(name="Mat_TreeCanopy")
    nodes_l = mat_leaf.node_tree.nodes
    links_l = mat_leaf.node_tree.links
    bsdf_l = nodes_l.get("Principled BSDF")
    vcol_l = nodes_l.new("ShaderNodeAttribute")
    vcol_l.attribute_name = "Color"
    links_l.new(vcol_l.outputs["Color"], bsdf_l.inputs["Base Color"])
    bsdf_l.inputs["Roughness"].default_value = 0.65

    return mat_bark, mat_leaf

def create_geodesic_sphere(subdivisions=1):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=1.0)
    return bm

def create_canopy_cluster_mesh(center, radii, seed):
    random.seed(seed)
    rx, ry, rz = radii
    bm = create_geodesic_sphere(subdivisions=1)
    
    p1 = random.uniform(0, math.pi * 2)
    p2 = random.uniform(0, math.pi * 2)
    p3 = random.uniform(0, math.pi * 2)

    for v in bm.verts:
        d = v.co.normalized()
        theta = math.atan2(d.y, d.x)
        phi = math.asin(max(-1.0, min(1.0, d.z)))

        harmonics = (
            0.18 * math.sin(2.0 * theta + p1) * math.cos(2.0 * phi) +
            0.12 * math.cos(3.0 * phi + p2) +
            0.08 * math.sin(4.0 * theta + p3)
        )
        bottom_factor = 1.0
        if d.z < -0.2:
            bottom_factor = 1.0 - 0.15 * (-d.z - 0.2)

        scale = (1.0 + harmonics) * bottom_factor
        v.co.x = d.x * rx * scale + center[0]
        v.co.y = d.y * ry * scale + center[1]
        v.co.z = d.z * rz * scale + center[2]

    return bm

def build_tree_mesh():
    bm_all = bmesh.new()
    
    # ---------------- 1. TRUNK & ROOT BUTTRESSES ----------------
    trunk_rings = [
        (0.00,  0.00,  0.00, 0.68, 0.62, [
            (0.0, 1.05), (math.pi*0.5, 0.95), (math.pi, 1.00), (math.pi*1.5, 0.90),
            (math.pi*0.25, 0.40), (math.pi*1.25, 0.40)
        ]),
        (0.28,  0.02, -0.01, 0.54, 0.50, [
            (0.0, 0.60), (math.pi*0.5, 0.50), (math.pi, 0.55), (math.pi*1.5, 0.50)
        ]),
        (0.70,  0.04, -0.02, 0.48, 0.44, [
            (0.0, 0.25), (math.pi*0.5, 0.20), (math.pi, 0.22), (math.pi*1.5, 0.20)
        ]),
        (1.25,  0.06,  0.01, 0.44, 0.40, []),
        (1.95,  0.09,  0.03, 0.40, 0.38, []),
        (2.60,  0.11,  0.04, 0.38, 0.35, []),
    ]
    
    trunk_vert_rings = []
    n_ring = 10
    for (z, cx, cy, rx, ry, flares) in trunk_rings:
        ring = []
        for i in range(n_ring):
            ang = 2.0 * math.pi * i / n_ring
            vx = cx + rx * math.cos(ang)
            vy = cy + ry * math.sin(ang)
            for f_ang, f_ext in flares:
                diff = math.cos(ang - f_ang)
                if diff > 0.5:
                    weight = (diff - 0.5) / 0.5
                    vx += math.cos(f_ang) * f_ext * (weight ** 1.6)
                    vy += math.sin(f_ang) * f_ext * (weight ** 1.6)
            vert = bm_all.verts.new((vx, vy, z))
            ring.append(vert)
        trunk_vert_rings.append(ring)
    
    for r in range(len(trunk_vert_rings) - 1):
        r1 = trunk_vert_rings[r]
        r2 = trunk_vert_rings[r + 1]
        for i in range(n_ring):
            i_next = (i + 1) % n_ring
            bm_all.faces.new([r1[i], r1[i_next], r2[i_next], r2[i]])
    
    bm_all.faces.new(reversed(trunk_vert_rings[0]))
    
    # Branches
    branches = [
        ([
            (0.11, 0.04, 2.55, 0.32),
            (0.24, 0.16, 3.25, 0.26),
            (0.35, 0.28, 4.05, 0.21),
            (0.42, 0.38, 4.80, 0.15),
         ], 6),
        ([
            (0.08, 0.02, 2.50, 0.29),
            (-0.35, -0.16, 3.15, 0.24),
            (-0.85, -0.32, 3.80, 0.19),
            (-1.35, -0.45, 4.40, 0.14),
         ], 6),
        ([
            (0.13, 0.03, 2.55, 0.28),
            (0.45, -0.22, 3.20, 0.23),
            (0.90, -0.52, 3.75, 0.18),
            (1.25, -0.75, 4.30, 0.13),
         ], 6),
        ([
            (0.09, 0.06, 2.55, 0.27),
            (-0.22, 0.38, 3.25, 0.21),
            (-0.60, 0.75, 3.95, 0.16),
            (-0.90, 1.10, 4.60, 0.12),
         ], 5),
        ([
            (0.12, 0.05, 2.55, 0.25),
            (0.38, 0.32, 3.30, 0.20),
            (0.68, 0.65, 4.00, 0.15),
            (0.92, 0.90, 4.65, 0.11),
         ], 5),
    ]
    
    for pts, sides in branches:
        branch_rings = []
        for p_idx, (px, py, pz, pr) in enumerate(pts):
            if p_idx < len(pts) - 1:
                tangent = Vector((pts[p_idx + 1][0] - px, pts[p_idx + 1][1] - py, pts[p_idx + 1][2] - pz)).normalized()
            else:
                tangent = Vector((px - pts[p_idx - 1][0], py - pts[p_idx - 1][1], pz - pts[p_idx - 1][2])).normalized()
            
            up = Vector((0, 0, 1))
            if abs(tangent.dot(up)) > 0.9:
                up = Vector((1, 0, 0))
            side1 = tangent.cross(up).normalized()
            side2 = tangent.cross(side1).normalized()
            
            ring = []
            for s in range(sides):
                ang = 2.0 * math.pi * s / sides
                off = side1 * (math.cos(ang) * pr) + side2 * (math.sin(ang) * pr)
                v = bm_all.verts.new(Vector((px, py, pz)) + off)
                ring.append(v)
            branch_rings.append(ring)
            
        for r in range(len(branch_rings) - 1):
            r1 = branch_rings[r]
            r2 = branch_rings[r + 1]
            for i in range(sides):
                i_next = (i + 1) % sides
                bm_all.faces.new([r1[i], r1[i_next], r2[i_next], r2[i]])
        bm_all.faces.new(branch_rings[-1])
        
    for f in bm_all.faces:
        f.material_index = 0
        
    # ---------------- 2. CLUSTERED SOFT CANOPY ----------------
    clusters = [
        (( 0.15,  0.10, 5.95), (1.60, 1.55, 1.35), 301),  # 1. Main High Crown
        (( 0.35, -0.65, 5.35), (1.48, 1.42, 1.22), 302),  # 2. Front High Bulge
        ((-1.35, -0.28, 4.80), (1.48, 1.38, 1.24), 303),  # 3. Left Mid Shoulder
        (( 1.35, -0.50, 4.65), (1.44, 1.38, 1.20), 304),  # 4. Right Mid Shoulder
        ((-0.85,  1.10, 5.15), (1.42, 1.40, 1.20), 305),  # 5. Back-Left Bulge
        (( 1.00,  0.98, 5.30), (1.42, 1.35, 1.24), 306),  # 6. Back-Right Bulge
        ((-1.95, -0.32, 3.90), (1.24, 1.18, 1.00), 307),  # 7. Low Left Droop
        (( 0.40, -1.38, 4.05), (1.22, 1.15, 0.98), 308),  # 8. Low Front Droop
        (( 1.65,  0.50, 4.25), (1.24, 1.18, 1.00), 309),  # 9. Low Right Droop
        (( 0.05,  0.12, 4.55), (1.50, 1.45, 1.18), 310),  # 10. Center Volume Core
        ((-1.15, -1.08, 4.40), (1.00, 0.94, 0.84), 311),  # 11. Front-Left accent
        (( 1.20, -1.18, 4.25), (0.98, 0.92, 0.82), 312),  # 12. Front-Right accent
        ((-0.20,  1.48, 4.50), (1.02, 0.98, 0.85), 313),  # 13. Back accent
        (( 0.10, -0.20, 6.45), (1.10, 1.05, 0.88), 314),  # 14. Top Apex Puff
        ((-0.80, -0.40, 3.45), (0.95, 0.90, 0.80), 315),  # 15. Low Understory Accent
    ]
    
    canopy_start_face_idx = len(bm_all.faces)
    canopy_vert_cluster_map = {}
    
    for c_idx, (center, radii, s) in enumerate(clusters):
        bm_c = create_canopy_cluster_mesh(center, radii, s)
        vert_map = {}
        for v in bm_c.verts:
            new_v = bm_all.verts.new(v.co)
            vert_map[v] = new_v
            canopy_vert_cluster_map[(round(new_v.co.x, 3), round(new_v.co.y, 3), round(new_v.co.z, 3))] = center
        for f in bm_c.faces:
            new_f = bm_all.faces.new([vert_map[v] for v in f.verts])
            new_f.material_index = 1
            new_f.smooth = True
        bm_c.free()
        
    return bm_all, canopy_start_face_idx, clusters, canopy_vert_cluster_map

def assign_vertex_colors_and_normals(mesh, clusters, vert_cluster_map):
    color_layer = mesh.color_attributes.new(name="Color", type='FLOAT_COLOR', domain='CORNER')
    
    # Saturated fantasy palette matching H1.png & H3.png:
    c_bark_base = Vector((0.24, 0.15, 0.08))    # Warm dark walnut / oak
    c_bark_moss = Vector((0.26, 0.38, 0.10))    # Moss green overlay on base roots
    c_bark_top  = Vector((0.34, 0.23, 0.13))    # Sunlit upper branches
    c_bark_dark = Vector((0.14, 0.08, 0.05))    # Deep bark crevice
    
    # Foliage: Vibrant saturated fantasy greens
    c_leaf_sun    = Vector((0.44, 0.70, 0.10))  # Sunny warm golden-lime highlight
    c_leaf_mid    = Vector((0.20, 0.48, 0.10))  # Lush meadow/forest green
    c_leaf_shadow = Vector((0.07, 0.22, 0.06))  # Deep rich mossy shadow
    c_leaf_warm   = Vector((0.34, 0.58, 0.12))  # Warm midtone
    
    custom_normals = []
    
    for v in mesh.vertices:
        key = (round(v.co.x, 3), round(v.co.y, 3), round(v.co.z, 3))
        if key in vert_cluster_map:
            c_center = Vector(vert_cluster_map[key])
            n = (v.co - c_center).normalized()
            n = (n * 0.75 + Vector((0, 0, 0.25))).normalized()
            custom_normals.append(n)
        else:
            custom_normals.append(v.normal)
            
    mesh.normals_split_custom_set_from_vertices(custom_normals)
    
    for poly in mesh.polygons:
        mat_idx = poly.material_index
        
        for li in poly.loop_indices:
            v_idx = mesh.loops[li].vertex_index
            v_co = mesh.vertices[v_idx].co
            v_norm = custom_normals[v_idx]
            
            if mat_idx == 0:
                # TRUNK / BARK
                h_factor = max(0.0, min(1.0, v_co.z / 4.0))
                moss_factor = max(0.0, 1.0 - (v_co.z / 1.1)) * max(0.0, v_norm.z * 0.6 + 0.4)
                
                col = c_bark_base.lerp(c_bark_top, h_factor)
                col = col.lerp(c_bark_moss, moss_factor * 0.75)
                if v_norm.z < 0:
                    col = col.lerp(c_bark_dark, 0.40)
                grain = math.sin(v_co.z * 12.0 + v_co.x * 3.0) * 0.02
                col += Vector((grain, grain * 0.8, grain * 0.5))
            else:
                # FOLIAGE / CANOPY
                h_norm = max(0.0, min(1.0, (v_co.z - 3.2) / 3.8))
                up_factor = v_norm.z * 0.5 + 0.5
                
                sun_factor = max(0.0, min(1.0, h_norm * 0.50 + up_factor * 0.50))
                shadow_factor = max(0.0, min(1.0, -v_norm.z * 0.65 + (1.0 - h_norm) * 0.45))
                
                col = c_leaf_mid.lerp(c_leaf_sun, sun_factor)
                col = col.lerp(c_leaf_shadow, shadow_factor * 0.75)
                
                dist_xy = math.sqrt(v_co.x**2 + v_co.y**2)
                if dist_xy > 1.1:
                    col = col.lerp(c_leaf_warm, 0.22)
                    
                n_var = (math.sin(v_co.x * 2.2) * math.cos(v_co.y * 2.2) + math.sin(v_co.z * 2.8)) * 0.035
                col += Vector((n_var, n_var * 1.2, n_var * 0.5))

            col.x = max(0.0, min(1.0, col.x))
            col.y = max(0.0, min(1.0, col.y))
            col.z = max(0.0, min(1.0, col.z))
            color_layer.data[li].color = (col.x, col.y, col.z, 1.0)

def setup_camera_and_lighting(target_z=3.8, dist=11.2, elev_deg=46.0, azim_deg=-38.0):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.film_transparent = True
    
    elev = math.radians(elev_deg)
    azim = math.radians(azim_deg)
    
    cam_x = dist * math.cos(elev) * math.sin(azim)
    cam_y = -dist * math.cos(elev) * math.cos(azim)
    cam_z = target_z + dist * math.sin(elev)
    
    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 52.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_obj.location = (cam_x, cam_y, cam_z)
    
    dir_vec = (Vector((0, 0, target_z)) - cam_obj.location).normalized()
    cam_obj.rotation_euler = dir_vec.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    
    # Key light: Balanced warm sunlight
    sun_data = bpy.data.lights.new("SunKey", type='SUN')
    sun_data.energy = 2.4
    sun_data.color = (1.0, 0.94, 0.82)
    sun_obj = bpy.data.objects.new("SunKey", sun_data)
    sun_dir = Vector((0.45, 0.65, -0.65)).normalized()
    sun_obj.rotation_euler = sun_dir.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(sun_obj)
    
    # Fill light: Cool sky fill
    fill_data = bpy.data.lights.new("FillLight", type='SUN')
    fill_data.energy = 0.90
    fill_data.color = (0.58, 0.66, 0.96)
    fill_obj = bpy.data.objects.new("FillLight", fill_data)
    fill_dir = Vector((-0.65, -0.45, -0.40)).normalized()
    fill_obj.rotation_euler = fill_dir.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(fill_obj)
    
    # Ground contact disk
    bm_ground = bmesh.new()
    bmesh.ops.create_circle(bm_ground, cap_ends=True, radius=3.2, segments=28)
    m_ground = bpy.data.meshes.new("GroundShadow")
    bm_ground.to_mesh(m_ground)
    bm_ground.free()
    obj_ground = bpy.data.objects.new("GroundShadow", m_ground)
    obj_ground.location = (0, 0, -0.01)
    
    mat_g = bpy.data.materials.new("Mat_Ground")
    bsdf_g = mat_g.node_tree.nodes.get("Principled BSDF")
    bsdf_g.inputs["Base Color"].default_value = (0.35, 0.38, 0.32, 1.0)
    bsdf_g.inputs["Roughness"].default_value = 0.95
    m_ground.materials.append(mat_g)
    bpy.context.scene.collection.objects.link(obj_ground)

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    out_glb = os.path.join(root_dir, "assets", "models", "trial", "tree_01.glb")
    out_blend = os.path.join(root_dir, "art_src", "blender", "tree_01.blend")
    out_png = os.path.join(root_dir, "docs", "art-upgrade", "models-trial", "tree_01.png")
    
    for d in [os.path.dirname(out_glb), os.path.dirname(out_blend), os.path.dirname(out_png)]:
        os.makedirs(d, exist_ok=True)
        
    clean_scene()
    mat_bark, mat_leaf = setup_materials()
    
    bm_all, canopy_start, clusters, vert_cluster_map = build_tree_mesh()
    mesh = bpy.data.meshes.new("Tree_01")
    bm_all.to_mesh(mesh)
    bm_all.free()
    
    mesh.materials.append(mat_bark)
    mesh.materials.append(mat_leaf)
    
    for poly in mesh.polygons:
        poly.use_smooth = (poly.material_index == 1)
        
    assign_vertex_colors_and_normals(mesh, clusters, vert_cluster_map)
    
    obj = bpy.data.objects.new("Tree_01", mesh)
    bpy.context.scene.collection.objects.link(obj)
    
    tri_count = sum(len(p.vertices) - 2 for p in mesh.polygons)
    print(f"==========================================")
    print(f"Tree_01 built successfully!")
    print(f"Total Polygons: {len(mesh.polygons)}")
    print(f"Total Triangles: {tri_count} (Budget: < 1500)")
    print(f"==========================================")
    assert tri_count < 1500, f"Triangle count {tri_count} exceeds 1500 budget!"
    
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
    
    setup_camera_and_lighting(target_z=3.8, dist=11.2, elev_deg=46.0, azim_deg=-38.0)
    
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    print(f"Saved .blend: {out_blend}")
    
    scene = bpy.context.scene
    scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
    print(f"Rendered preview: {out_png}")

if __name__ == "__main__":
    main()
