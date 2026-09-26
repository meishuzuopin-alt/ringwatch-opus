"""
Render combined night scene of tree_01 and cottage_01 in Blender 5.2 LTS.
Matches style reference .ref/H3.png (a cosy medieval fantasy village by a bridge at night):
  - Cottage on the right with glowing warm firelit windows.
  - Deciduous tree on the left framing the composition with mossy roots and soft canopy.
  - Wooden lantern post casting a warm golden pool of light on the cobblestone path.
  - Deep midnight indigo sky and cool blue-violet moonlight rim lighting.
  - 3/4 top-down camera matching the game's view.
Generates:
  - art_src/blender/night_combo.blend
  - docs/art-upgrade/models-trial/night_combo.png
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not bpy.data.collections:
        col = bpy.data.collections.new("SceneCollection")
        bpy.context.scene.collection.children.link(col)

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
        bm.faces.new([bm_verts[0], bm_verts[1], bm_verts[2], bm_verts[3]]),
        bm.faces.new([bm_verts[4], bm_verts[7], bm_verts[6], bm_verts[5]]),
        bm.faces.new([bm_verts[0], bm_verts[4], bm_verts[5], bm_verts[1]]),
        bm.faces.new([bm_verts[2], bm_verts[6], bm_verts[7], bm_verts[3]]),
        bm.faces.new([bm_verts[0], bm_verts[3], bm_verts[7], bm_verts[4]]),
        bm.faces.new([bm_verts[1], bm_verts[5], bm_verts[6], bm_verts[2]]),
    ]
    return faces

def create_ground_and_props():
    bm = bmesh.new()
    
    # Ground disc with cobblestone / dirt path relief
    bmesh.ops.create_circle(bm, cap_ends=True, radius=10.5, segments=36)
    for v in bm.verts:
        v.co.z = -0.02
        
    # Cobblestone path slabs in front of cottage and connecting to tree
    for px in [-4.2, -3.1, -2.0, -0.9, 0.3, 1.5, 2.7, 3.8]:
        for py in [-1.5, -2.4, -3.3]:
            sw = 0.88 + (hash((px, py)) % 5) * 0.04
            sd = 0.68 + (hash((py, px)) % 5) * 0.03
            add_box(bm, (px + 0.05, py - 0.1, 0.02), (sw, sd, 0.05))
            
    # Wooden lantern post (positioned between tree and cottage)
    lx, ly = -1.10, -2.15
    add_box(bm, (lx, ly, 0.15), (0.42, 0.42, 0.30))
    add_box(bm, (lx, ly, 1.25), (0.16, 0.16, 2.0))
    add_box(bm, (lx, ly, 2.30), (0.18, 0.18, 0.15))
    add_box(bm, (lx + 0.18, ly, 2.25), (0.45, 0.12, 0.10))
    add_box(bm, (lx + 0.35, ly, 2.05), (0.24, 0.24, 0.34))
    add_box(bm, (lx + 0.35, ly, 2.25), (0.32, 0.32, 0.08))
    
    # Rustic wooden fence segment behind lantern
    for fx in [-1.8, -2.6, -3.4]:
        add_box(bm, (fx, -0.9, 0.55), (0.12, 0.12, 1.10))
    add_box(bm, (-2.6, -0.9, 0.85), (1.8, 0.06, 0.12))
    add_box(bm, (-2.6, -0.9, 0.40), (1.8, 0.06, 0.12))
    
    mesh = bpy.data.meshes.new("GroundAndProps")
    bm.to_mesh(mesh)
    bm.free()
    
    mat_g = bpy.data.materials.new("Mat_NightGround")
    nodes_g = mat_g.node_tree.nodes
    bsdf_g = nodes_g.get("Principled BSDF")
    bsdf_g.inputs["Base Color"].default_value = (0.14, 0.13, 0.16, 1.0)
    bsdf_g.inputs["Roughness"].default_value = 0.90
    mesh.materials.append(mat_g)
    
    obj = bpy.data.objects.new("GroundAndProps", mesh)
    bpy.context.scene.collection.objects.link(obj)
    return lx + 0.35, ly, 2.05 # lantern bulb position

def setup_night_lighting(lantern_pos):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.film_transparent = False
    
    # World background: Deep midnight indigo (matching H3.png)
    world = bpy.data.worlds.new("NightWorld")
    scene.world = world
    bg_node = world.node_tree.nodes.get("Background")
    bg_node.inputs["Color"].default_value = (0.015, 0.022, 0.060, 1.0)
    bg_node.inputs["Strength"].default_value = 0.55
    
    # 1. Cool moonlight (deep blue-violet rim light from rear-top)
    moon_data = bpy.data.lights.new("Moonlight", type='SUN')
    moon_data.energy = 2.2
    moon_data.color = (0.35, 0.45, 0.85)
    moon_obj = bpy.data.objects.new("Moonlight", moon_data)
    moon_dir = Vector((-0.45, -0.65, -0.60)).normalized()
    moon_obj.rotation_euler = moon_dir.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(moon_obj)
    
    # 2. Cool night ambient fill
    fill_data = bpy.data.lights.new("NightFill", type='SUN')
    fill_data.energy = 0.80
    fill_data.color = (0.24, 0.30, 0.65)
    fill_obj = bpy.data.objects.new("NightFill", fill_data)
    fill_dir = Vector((0.5, 0.5, -0.5)).normalized()
    fill_obj.rotation_euler = fill_dir.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(fill_obj)
    
    # 3. Lantern warm light (bright golden amber pool on ground and tree)
    lx, ly, lz = lantern_pos
    lamp_data = bpy.data.lights.new("LanternPoint", type='POINT')
    lamp_data.energy = 110.0
    lamp_data.color = (1.00, 0.60, 0.15)
    lamp_data.shadow_soft_size = 0.35
    lamp_obj = bpy.data.objects.new("LanternPoint", lamp_data)
    lamp_obj.location = (lx, ly, lz)
    bpy.context.scene.collection.objects.link(lamp_obj)
    
    # Glowing lantern core mesh
    bm_bulb = bmesh.new()
    bmesh.ops.create_cube(bm_bulb, size=0.16)
    m_bulb = bpy.data.meshes.new("LanternBulb")
    bm_bulb.to_mesh(m_bulb)
    bm_bulb.free()
    mat_bulb = bpy.data.materials.new("Mat_LanternGlow")
    bsdf_b = mat_bulb.node_tree.nodes.get("Principled BSDF")
    bsdf_b.inputs["Emission Color"].default_value = (1.0, 0.55, 0.10, 1.0)
    bsdf_b.inputs["Emission Strength"].default_value = 12.0
    m_bulb.materials.append(mat_bulb)
    obj_bulb = bpy.data.objects.new("LanternBulb", m_bulb)
    obj_bulb.location = (lx, ly, lz)
    bpy.context.scene.collection.objects.link(obj_bulb)
    
    # 4. Cottage window lights spilling out into the night
    for wx in [1.60 - 1.55, 1.60 + 1.55]:
        win_data = bpy.data.lights.new(f"NightWinLight_{wx}", type='POINT')
        win_data.energy = 60.0
        win_data.color = (1.00, 0.55, 0.12)
        win_data.shadow_soft_size = 0.40
        win_obj = bpy.data.objects.new(f"NightWinLight_{wx}", win_data)
        win_obj.location = (wx, -1.65, 1.85)
        bpy.context.scene.collection.objects.link(win_obj)
        
    # 5. Warm bounce fill on cottage facade & tree base
    bounce_data = bpy.data.lights.new("WarmBounce", type='POINT')
    bounce_data.energy = 55.0
    bounce_data.color = (1.00, 0.50, 0.10)
    bounce_obj = bpy.data.objects.new("WarmBounce", bounce_data)
    bounce_obj.location = (0.8, -2.8, 0.9)
    bpy.context.scene.collection.objects.link(bounce_obj)
    
    # 6. Tree warm light from lantern
    tree_light = bpy.data.lights.new("TreeWarm", type='POINT')
    tree_light.energy = 40.0
    tree_light.color = (1.00, 0.58, 0.14)
    tree_light_obj = bpy.data.objects.new("TreeWarm", tree_light)
    tree_light_obj.location = (-2.8, -1.2, 1.2)
    bpy.context.scene.collection.objects.link(tree_light_obj)
    
    # Tweak cottage window material to have deep amber emission in the night
    for mat in bpy.data.materials:
        if "Window" in mat.name:
            nodes = mat.node_tree.nodes
            bsdf = nodes.get("Principled BSDF")
            if bsdf and "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = (1.0, 0.42, 0.05, 1.0)
                bsdf.inputs["Emission Strength"].default_value = 5.0

def setup_camera(target=(-0.8, -0.3, 2.2), dist=16.0, elev_deg=45.0, azim_deg=-34.0):
    elev = math.radians(elev_deg)
    azim = math.radians(azim_deg)
    
    tx, ty, tz = target
    cam_x = tx + dist * math.cos(elev) * math.sin(azim)
    cam_y = ty - dist * math.cos(elev) * math.cos(azim)
    cam_z = tz + dist * math.sin(elev)
    
    cam_data = bpy.data.cameras.new("NightCam")
    cam_data.lens = 48.0
    cam_obj = bpy.data.objects.new("NightCam", cam_data)
    cam_obj.location = (cam_x, cam_y, cam_z)
    
    dir_vec = (Vector(target) - cam_obj.location).normalized()
    cam_obj.rotation_euler = dir_vec.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    glb_tree = os.path.join(root_dir, "assets", "models", "trial", "tree_01.glb")
    glb_cottage = os.path.join(root_dir, "assets", "models", "trial", "cottage_01.glb")
    out_blend = os.path.join(root_dir, "art_src", "blender", "night_combo.blend")
    out_png = os.path.join(root_dir, "docs", "art-upgrade", "models-trial", "night_combo.png")
    
    for d in [os.path.dirname(out_blend), os.path.dirname(out_png)]:
        os.makedirs(d, exist_ok=True)
        
    clean_scene()
    
    # 1. Import Cottage GLB
    print(f"Importing cottage from {glb_cottage}...")
    bpy.ops.import_scene.gltf(filepath=glb_cottage)
    cottage_objs = [obj for obj in bpy.context.selected_objects]
    for obj in cottage_objs:
        obj.location = (1.60, 0.20, 0.0)
        
    # 2. Import Tree GLB
    print(f"Importing tree from {glb_tree}...")
    bpy.ops.import_scene.gltf(filepath=glb_tree)
    tree_objs = [obj for obj in bpy.context.selected_objects if obj not in cottage_objs]
    for obj in tree_objs:
        obj.location = (-4.20, -0.40, 0.0)
        obj.rotation_euler = (0, 0, math.radians(45.0))
        
    # 3. Create ground and lantern post prop
    lantern_pos = create_ground_and_props()
    
    # 4. Setup night lighting & atmosphere matching H3.png
    setup_night_lighting(lantern_pos)
    
    # 5. Setup camera
    setup_camera(target=(-0.8, -0.3, 2.2), dist=16.0, elev_deg=45.0, azim_deg=-34.0)
    
    # Save combo .blend file
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    print(f"Saved .blend: {out_blend}")
    
    # Render night preview
    scene = bpy.context.scene
    scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
    print(f"Rendered night combo preview: {out_png}")

if __name__ == "__main__":
    main()
