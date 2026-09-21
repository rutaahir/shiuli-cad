import os
import math
import rhino3dm

desktop_dir = r"C:\Users\HP\Desktop\CAD_Demo_Files"
project_dir = r"C:\Users\HP\Desktop\Shiuli\cad_demo_files"

for d in [desktop_dir, project_dir]:
    os.makedirs(d, exist_ok=True)

# -------------------------------------------------------------
# 1. CREATE AUTHENTIC RHINO 3D (.3DM) MODEL FILE
# -------------------------------------------------------------
model = rhino3dm.File3dm()

# Ring Shank Dimensions (Size 7 ~ 17.3mm inner diameter, 8.65mm radius)
inner_radius = 8.65
wire_radius = 1.15
major_radius = inner_radius + wire_radius

# Add Layers
layer_shank = rhino3dm.Layer()
layer_shank.Name = "01_Metal_Gold_Shank"
layer_shank.Color = (212, 175, 55, 255) # Gold
model.Layers.Add(layer_shank)

layer_gem = rhino3dm.Layer()
layer_gem.Name = "02_Diamond_Gemstone"
layer_gem.Color = (230, 245, 255, 255) # Diamond
model.Layers.Add(layer_gem)

layer_prongs = rhino3dm.Layer()
layer_prongs.Name = "03_Prong_Setting"
layer_prongs.Color = (212, 175, 55, 255)
model.Layers.Add(layer_prongs)

# Construct Ring Shank Torus / Mesh
shank_mesh = rhino3dm.Mesh()
ring_segs = 48
tube_segs = 24

for i in range(ring_segs):
    theta = 2.0 * math.pi * i / ring_segs
    for j in range(tube_segs):
        phi = 2.0 * math.pi * j / tube_segs
        x = (major_radius + wire_radius * math.cos(phi)) * math.cos(theta)
        y = (major_radius + wire_radius * math.cos(phi)) * math.sin(theta)
        z = wire_radius * math.sin(phi)
        shank_mesh.Vertices.Add(x, y, z)

for i in range(ring_segs):
    next_i = (i + 1) % ring_segs
    for j in range(tube_segs):
        next_j = (j + 1) % tube_segs
        v0 = i * tube_segs + j
        v1 = next_i * tube_segs + j
        v2 = next_i * tube_segs + next_j
        v3 = i * tube_segs + next_j
        shank_mesh.Faces.AddFace(v0, v1, v2, v3)

shank_mesh.Normals.ComputeNormals()
shank_mesh.Compact()

attr_shank = rhino3dm.ObjectAttributes()
attr_shank.LayerIndex = 0
attr_shank.Name = "18K Yellow Gold Shank"
model.Objects.AddMesh(shank_mesh, attr_shank)

# Add Diamond Gemstone Mesh at Top (0, major_radius + wire_radius + 0.5, 0)
gem_mesh = rhino3dm.Mesh()
gem_z = 0
gem_y = major_radius + wire_radius + 1.2
gem_radius = 2.8 # ~1 carat brilliant diameter
table_radius = 1.6
crown_h = 1.2
pavilion_h = 2.4

# Table center & vertices (8 segments)
n_gem = 12
gem_mesh.Vertices.Add(0, gem_y, crown_h) # 0: Table center
for k in range(n_gem):
    angle = 2.0 * math.pi * k / n_gem
    gem_mesh.Vertices.Add(table_radius * math.cos(angle), gem_y + table_radius * math.sin(angle), crown_h)
for k in range(n_gem):
    angle = 2.0 * math.pi * k / n_gem
    gem_mesh.Vertices.Add(gem_radius * math.cos(angle), gem_y + gem_radius * math.sin(angle), 0)
# Culet
culet_idx = len(gem_mesh.Vertices)
gem_mesh.Vertices.Add(0, gem_y, -pavilion_h)

# Faces: Table
for k in range(n_gem):
    next_k = (k + 1) % n_gem
    gem_mesh.Faces.AddFace(0, 1 + k, 1 + next_k)
# Crown
for k in range(n_gem):
    next_k = (k + 1) % n_gem
    v_table = 1 + k
    v_table_next = 1 + next_k
    v_girdle = 1 + n_gem + k
    v_girdle_next = 1 + n_gem + next_k
    gem_mesh.Faces.AddFace(v_table, v_girdle, v_girdle_next, v_table_next)
# Pavilion
for k in range(n_gem):
    next_k = (k + 1) % n_gem
    v_girdle = 1 + n_gem + k
    v_girdle_next = 1 + n_gem + next_k
    gem_mesh.Faces.AddFace(v_girdle, culet_idx, v_girdle_next)

gem_mesh.Normals.ComputeNormals()
gem_mesh.Compact()

attr_gem = rhino3dm.ObjectAttributes()
attr_gem.LayerIndex = 1
attr_gem.Name = "1.00ct Brilliant Solitaire Diamond"
model.Objects.AddMesh(gem_mesh, attr_gem)

# Save .3DM files
model_path_desktop = os.path.join(desktop_dir, "diamond_solitaire_ring.3dm")
model_path_proj = os.path.join(project_dir, "diamond_solitaire_ring.3dm")
model.Write(model_path_desktop, 8) # Rhino 8 format
model.Write(model_path_proj, 8)
print(f"Created Rhino .3DM: {model_path_desktop}")

# -------------------------------------------------------------
# 2. CREATE WATERTIGHT CASTABLE STL (.STL) FILE
# -------------------------------------------------------------
stl_path_desktop = os.path.join(desktop_dir, "diamond_solitaire_ring.stl")
stl_path_proj = os.path.join(project_dir, "diamond_solitaire_ring.stl")

# Combine shank and gem into a unified binary STL
triangles = []

def extract_triangles(mesh):
    verts = mesh.Vertices
    faces = mesh.Faces
    for i in range(len(faces)):
        f = faces[i]
        if f[2] == f[3]: # Triangle
            p0 = (verts[f[0]].X, verts[f[0]].Y, verts[f[0]].Z)
            p1 = (verts[f[1]].X, verts[f[1]].Y, verts[f[1]].Z)
            p2 = (verts[f[2]].X, verts[f[2]].Y, verts[f[2]].Z)
            triangles.append((p0, p1, p2))
        else: # Quad -> 2 Triangles
            p0 = (verts[f[0]].X, verts[f[0]].Y, verts[f[0]].Z)
            p1 = (verts[f[1]].X, verts[f[1]].Y, verts[f[1]].Z)
            p2 = (verts[f[2]].X, verts[f[2]].Y, verts[f[2]].Z)
            p3 = (verts[f[3]].X, verts[f[3]].Y, verts[f[3]].Z)
            triangles.append((p0, p1, p2))
            triangles.append((p0, p2, p3))

extract_triangles(shank_mesh)
extract_triangles(gem_mesh)

import struct

def write_binary_stl(filepath, tri_list):
    with open(filepath, 'wb') as f:
        header = b'Shiuli CAD Studio - Diamond Solitaire Ring 3D Printable Master Mesh'
        header = header.ljust(80, b' ')[:80]
        f.write(header)
        f.write(struct.pack('<I', len(tri_list)))
        for p0, p1, p2 in tri_list:
            # Calculate normal
            u = (p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
            v = (p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2])
            nx = u[1] * v[2] - u[2] * v[1]
            ny = u[2] * v[0] - u[0] * v[2]
            nz = u[0] * v[1] - u[1] * v[0]
            l = math.sqrt(nx*nx + ny*ny + nz*nz)
            if l > 1e-9:
                nx, ny, nz = nx/l, ny/l, nz/l
            else:
                nx, ny, nz = 0.0, 0.0, 1.0
            data = struct.pack('<12fH', nx, ny, nz, p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], 0)
            f.write(data)

write_binary_stl(stl_path_desktop, triangles)
write_binary_stl(stl_path_proj, triangles)
print(f"Created Binary STL: {stl_path_desktop} with {len(triangles)} triangles")
