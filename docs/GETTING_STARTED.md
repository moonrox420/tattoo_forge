# 🚀 Getting Started with TattooForge Pro

Welcome to **TattooForge Pro**! This guide walks you through setting up, launching, and navigating the workstation in under 2 minutes.

---

## 📋 System Requirements

* **Workstation OS**: Windows 10 or 11 (64-bit)
* **Python**: Python 3.10, 3.11, or 3.12 (with standard dependencies installed)
* **Web Browser**: Any modern browser (Google Chrome, Microsoft Edge, Brave, Safari, Firefox) with WebGL 2.0 support
* **Optional Client Device**: Apple iPad / iPhone, Android tablet, or studio secondary display connected to the same local Wi-Fi network

---

## ⚡ Quick Launch (1-Click)

### Method 1: Desktop Batch File (Recommended)
Simply double-click the file in the project folder:
```bat
run_studio.bat
```

### Method 2: PowerShell / Terminal
Open your terminal inside the project directory and run:
```powershell
python run_studio.py
```

### What Happens When You Launch:
1. The **FastAPI backend engine** boots up locally on `http://localhost:8000`.
2. Your primary **local network Wi-Fi IP** (e.g. `http://192.168.1.45:8000`) is automatically detected.
3. Your default web browser opens immediately to the 3D workstation interface.
4. An ASCII banner displays your local connection URLs in the terminal.

---

## 📱 Pairing Your Studio iPad / Tablet

Tattoo artists frequently conduct consultations on iPads. TattooForge Pro has built-in local Wi-Fi pairing with zero cloud configuration:

1. Connect your iPad to the **same Wi-Fi network** as your studio computer.
2. In the top-right header of TattooForge Pro, click:
   ```text
   📱 Client Wi-Fi Sync
   ```
3. A modal with a **QR Code** and URL appears on your screen.
4. Open the Camera app on your iPad or client's phone and scan the QR code.
5. Tap the link: the full 3D interactive session loads directly in Safari on the iPad with touch-optimized controls!

---

## 🖥️ Workstation Interface Tour

```text
+-----------------------------------------------------------------------------------+
| 🗡️ TATTOOFORGE PRO         [🔄 360° Turntable] [📱 Client Sync] [📸 Snapshot]    |
+----------------------+------------------------------------+-----------------------+
|  LEFT PANEL          |  CENTER 3D VIEWPORT                |  RIGHT PANEL          |
|                      |                                    |                       |
|  • Anatomical Region |  [👁️ 3D View] [🎯 Place] [✏️ Marker] |  • Dropzone (Upload)  |
|    - Forearm         |                                    |  • Flash Presets      |
|    - Upper Arm       |           [ 3D MESH ]              |  • Size / Scale       |
|    - Torso / Ribs    |           (60 FPS PBR)             |  • Rotation (0-360°)  |
|    - Thigh           |                                    |  • Ink Density %      |
|    - Full Body       |                                    |  • Multiply / Normal  |
|    - Custom Scan     |                                    |  • Layer Stack        |
|  • Fitzpatrick I-VI  |  [Forearm] [Arm] [Ribs] [Thigh]    |  • Thermal Stencil    |
|  • Melanin Slider    |                                    |    Export Buttons     |
|  • Fresh vs. Healed  +------------------------------------+-----------------------+
|  • Muscle Flex       |
+----------------------+
```

### 1. Left Panel — Body Anatomy & Skin Realism
* **Anatomical Region Selector**: Switch between Forearm, Upper Arm, Torso/Ribs, Thigh, and Full Body.
* **Import Custom 3D Scan**: Drop your client's `.obj`, `.gltf`, or `.stl` scan from an iPhone LiDAR app directly onto this button.
* **Fitzpatrick Phototypes (I–VI)**: Click the swatches to instantly shift skin pigment from pale white (Type I) to deep melanin (Type VI).
* **Melanin Density Slider**: Fine-tune custom melanin concentrations from 0% to 100%.
* **Simulate Fresh Ink**: Toggles post-tattoo vascular erythema (subtle redness) and fresh epidermal gloss vs. matte healed ink.
* **Studio Lighting**: Switch between Ring Light, Warm Parlor, Clinical Spotlight, and Daylight.
* **Muscle Flex & Twist**: Sliders that simulate wrist pronation/supination and muscle contraction.
* **Geometric Skin Strain**: Toggles the real-time curvature strain heatmap overlay.

### 2. Center Viewport — 3D Interactive Canvas
* **Floating Modes**:
  * `👁️ 3D View`: Click and drag to orbit camera; scroll to zoom; right-click drag to pan.
  * `🎯 Place Tattoo`: Click directly on any limb surface to project your active tattoo design.
  * `✏️ 3D Skin Marker`: Click and drag across the skin to draw purple surgical marker guidelines.
  * `🧹 Clear Lines`: Removes freehand marker guidelines.
* **Bottom Camera Presets**: Fast-focus camera chips for Forearm, Arm, Ribs, Thigh, and Full Body.

### 3. Right Panel — Artwork, Transforms & Stencil Export
* **Artwork Dropzone**: Drag and drop any image (`PNG`, `JPG`, `SVG`) from your computer.
* **Quick Flash Presets**: 1-click test designs (Dagger & Rose, Sacred Mandala, Serpent).
* **Transform Controls**: Sliders for Scale (0.4x to 3.5x), In-plane rotation (0° to 360°), Opacity (10% to 100%), and Flip Mirror.
* **Ink Blend Mode**: `Multiply` (natural ink absorption into dermal pores) vs. `Normal` (opaque proofing).
* **Layer Stack**: Manage multiple tattoo designs on the same body part.
* **Thermal Stencil Production**: 1-click download of thermal transfer paper stencils (Brother PocketJet/Spirit ready) and curvature-compensated stencils.
