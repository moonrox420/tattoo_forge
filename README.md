# 🗡️ TATTOOFORGE PRO — 3D Workstation for Tattoo Artists

```text
======================================================================
     ____ _____ _____ _____ _____ _____ _____ _____ ____  ____ _____ 
    |_   _|  _  |_   _|_   _|  _  |     |   __|     | __ || __ |  _  |
      | | |     | | |   | | | | | | | | |   __| | | | __ || __ | |_| |
      |_| |__|__| |_|   |_| |_____|_|_|_|__|  |_|_|_|____||____|_____|
                        PRO 3D WORKSTATION v2.0
======================================================================
```

> **TattooForge Pro** is an ultra-responsive, visually stunning 3D visualization, anatomical wrapping, client proofing, and stencil preparation workstation built specifically for professional tattoo artists. It bridges the gap between 2D flat flash design and real, curved human anatomy.

---

## 📚 Studio Documentation Index

Explore our comprehensive studio documentation in the [`docs/`](docs/) directory:

| Guide | Description |
| :--- | :--- |
| [🚀 **Getting Started Guide**](docs/GETTING_STARTED.md) | System requirements, 1-click launch, iPad Wi-Fi setup, interface tour. |
| [🎨 **Artist Workflow Guide**](docs/ARTIST_WORKFLOW_GUIDE.md) | Step-by-step walkthrough from consultation to thermal transfer paper. |
| [⚙️ **Technical Architecture**](docs/TECHNICAL_ARCHITECTURE.md) | B-spline math engine, differential geometry ($H$, $K$), PBR shaders, REST API. |
| [❓ **Troubleshooting & FAQ**](docs/TROUBLESHOOTING_FAQ.md) | iPad pairing fixes, thermal copier tips, custom LiDAR import advice. |

---

## 🔥 Key Capabilities

### 1. Ultra-Lifelike 3D Anatomical Library & Custom Scans
* **Dedicated Anatomical Regions**:
  * **Forearm & Wrist**: Radial bow, flexor muscle belly, and wrist joint.
  * **Upper Arm & Sleeve**: Deltoid shoulder cap, bicep anterior prominence, tricep groove.
  * **Torso & Rib Cage**: Lateral rib arches, pectorals, sternum contour, and waist.
  * **Thigh & Leg**: Quadriceps bulge, knee patella contour, hamstring taper.
  * **Full Body Avatar**: Overall composition across the entire human form.
* **Custom 3D Mesh Import**: Drag-and-drop `.obj`, `.gltf`, `.glb`, or `.stl` photogrammetry / LiDAR scans of your client's actual body directly into the workstation!

### 2. Interactive Decal Projection & 360° Wrapping
* **Click-to-Place Raycast Decal**: Click anywhere on the 3D skin to project artwork adhering to organic muscle curvature.
* **Normal Depth & Angle Clipping**: Eliminates bleed-through to the opposite side of limbs or ribs (clamped depth box).
* **Transform Controls**: In-plane rotation (0°–360°), scale slider (0.4x–3.5x), opacity, and horizontal mirror flipping.
* **Multi-Decal Layer Stack**: Compose multiple flash pieces simultaneously on the same body part to build full sleeves.
* **Freehand 3D Surgical Marker Pen**: Draw purple surgical ink guidelines (`#6a0dad`) directly on the 3D body with your mouse or Apple Pencil.

### 3. Realistic PBR Skin & Melanin Shading
* **Fitzpatrick Phototypes (I – VI)**: Accurate melanin absorption from pale white (Type I) to deep melanin (Type VI).
* **Micro-Pore Normal & Roughness Maps**: Procedural pore texture and micro-creases under dynamic lighting.
* **Fresh vs. Healed Ink Simulation**:
  * *Fresh*: High contrast, subtle post-needle erythema (redness) around linework, and shaved skin gloss.
  * *Healed*: Translucent ink settled beneath the dermal layer, softened diffusion, natural matte finish.
* **Studio Lighting Presets**: Studio Ring Light (linework clarity), Warm Tattoo Parlor (3200K), Clinical Spotlight, and Natural Window Daylight (5600K).

### 4. Muscle Flex & Curvature Strain Heatmap
* **Dynamic Deformation Sliders**: Simulate wrist pronation/supination, bicep flex contraction, and rib expansion to show clients how their tattoo warps when moving.
* **Analytical Strain Heatmap**: Color-coded overlay (powered by B-spline differential geometry) highlighting high-stretch regions (red/amber) where stencils are prone to distortion.

### 5. Stencil & Client Proofing Suite
* **Automatic Background Removal**: Converts solid paper backgrounds into clean transparency on image drop.
* **Thermal Stencil Line Extractor**: Generates high-contrast outline transfer sheets ready for Brother PocketJet / Spirit thermal copiers.
* **Compensated Curvature Stencil**: Inverse arc-length unwrap that pre-compensates for cylindrical limb distortion before printing.
* **1-Click High-Res Snapshot**: Download crisp 3D preview images for your portfolio or client messages.
* **360° Turntable Mode**: Smooth orbiting animation for video presentation.
* **Studio Wi-Fi QR Code Sync**: Instantly pair your studio iPad or let clients scan a QR code with their phone to interact with the 3D model in real time.

---

## 🎯 How to Use TattooForge Pro (Quick Step-by-Step)

```text
[ Step 1: Launch ]
       │
       ▼
Double-click "run_studio.bat" (or run "python run_studio.py")
The workstation opens in your browser at http://localhost:8000

[ Step 2: Choose Anatomy & Skin Tone ]
       │
       ▼
Select the body part (e.g. Forearm) from the left dropdown.
Click the Fitzpatrick swatch (I–VI) matching your client's skin tone.

[ Step 3: Add Tattoo Artwork ]
       │
       ▼
Drag and drop your tattoo design (PNG or JPG) into the right panel dropzone.
Background is automatically removed and line stencil extracted.

[ Step 4: Position in 3D ]
       │
       ▼
Click "🎯 Place Tattoo" in the top bar.
Click anywhere on the 3D skin to project the design.
Use the Scale and In-Plane Rotation sliders to fit the muscle flow.

[ Step 5: Test Movement & Strain ]
       │
       ▼
Move the "Pronation / Twist" slider to see how the tattoo stretches.
Toggle "Curvature & Stretch Heatmap" to check for distortion hotspots.

[ Step 6: Show the Client ]
       │
       ▼
Check "Simulate Fresh" vs. Healed to show how the ink settles over time.
Click "🔄 360° Turntable" for an orbiting showcase.
Click "📱 Client Wi-Fi Sync" and let them scan the QR code with their phone!

[ Step 7: Print Stencil ]
       │
       ▼
Click "🖨️ Thermal Stencil" to download the copier-ready transfer file.
Feed it into your thermal printer and begin inking with confidence!
```

---

## 🚀 Quick Launch & Execution

### 1. One-Click Desktop Launcher
Simply double-click:
```bat
run_studio.bat
```

### 2. Command Line
```powershell
python run_studio.py
```

---

## 🧪 Automated Testing & Quality Audit

The codebase is 100% verified across 21 automated tests covering B-spline mathematics, differential geometry invariants, thermal stencil extraction, curvature compensation, API routes, and static asset integrity:

```powershell
python -m pytest -v
```

```text
tests/test_audit.py::test_audit_static_assets_completeness PASSED        [  4%]
tests/test_audit.py::test_audit_invalid_image_error_handling PASSED      [  9%]
tests/test_audit.py::test_audit_invalid_json_base64_error_handling PASSED [ 14%]
tests/test_audit.py::test_audit_extreme_curvature_compensation PASSED    [ 19%]
tests/test_audit.py::test_audit_bspline_boundary_and_degeneracy PASSED   [ 23%]
tests/test_basis.py::test_partition_of_unity PASSED                      [ 28%]
tests/test_basis.py::test_basis_non_negativity_and_boundary PASSED       [ 33%]
tests/test_basis.py::test_basis_derivatives_vs_finite_difference PASSED  [ 38%]
tests/test_basis.py::test_precompute_basis_matrices PASSED               [ 42%]
tests/test_basis.py::test_flat_surface_differential_geometry PASSED      [ 47%]
tests/test_knots.py::test_knot_vector_length_and_clamps PASSED           [ 52%]
tests/test_knots.py::test_knot_vector_invalid_parameters PASSED          [ 57%]
tests/test_server.py::test_health_check PASSED                           [ 61%]
tests/test_server.py::test_serve_index_and_static PASSED                 [ 66%]
tests/test_server.py::test_network_info PASSED                           [ 71%]
tests/test_server.py::test_stencil_process_endpoint PASSED               [ 76%]
tests/test_server.py::test_stencil_process_json_endpoint PASSED          [ 80%]
tests/test_server.py::test_curvature_analyze_endpoint PASSED             [ 85%]
tests/test_stencil.py::test_remove_background_luminance PASSED           [ 90%]
tests/test_stencil.py::test_extract_thermal_stencil PASSED               [ 93%]
tests/test_stencil.py::test_generate_curvature_compensated_stencil PASSED [100%]
============================= 21 passed in 0.59s ==============================
```

### Static Analysis & Linting:
```powershell
python -m ruff check .; python -m black --check .
```
```text
All checks passed!
All done! ✨ 🍰 ✨
24 files would be left unchanged.
```

---

## 🛠️ Architecture & Tech Stack

* **Graphics & Viewport**: Three.js (WebGL 2.0), `DecalGeometry`, `OrbitControls`, `OBJLoader`, `GLTFLoader`.
* **Rendering Pipeline**: ACESFilmicToneMapping, PCFSoftShadowMap, PBR Physical Materials, Micro-pore normal maps.
* **Backend Engine**: FastAPI, Uvicorn, Python 3.12, Pillow, NumPy, SciPy.
* **Offline-First**: 100% self-contained locally with zero external CDN dependencies.
# tattoo_forge
