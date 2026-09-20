# ❓ Troubleshooting & Frequently Asked Questions (FAQ)

Find answers to common studio questions and solutions for connection, printer, and graphics issues.

---

## 🙋 Frequently Asked Questions

### 1. Does TattooForge Pro require an active internet connection?
**No.** TattooForge Pro is 100% self-contained and offline-ready. All 3D libraries (Three.js, OrbitControls, DecalGeometry), loaders (OBJ, GLTF), normal textures, and processing algorithms run locally on your machine. You can run it inside a convention booth or underground studio with zero internet.

### 2. What image file formats can I upload?
You can upload:
* **PNG** (transparent or opaque)
* **JPEG / JPG**
* **WebP**
* **SVG**
TattooForge Pro automatically converts solid white paper backgrounds into clean transparency.

### 3. What 3D file formats can I import for custom client scans?
You can import:
* **`.obj`** (Wavefront OBJ)
* **`.gltf` / `.glb`** (GL Transmission Format)
* **`.stl`** (Stereolithography)
These can be exported from any phone photogrammetry or LiDAR app (e.g. Polycam, Scaniverse, Metascan, 3D Scanner App, KIRI Engine).

### 4. Can I use an Apple Pencil on an iPad?
**Yes.** The 3D viewport and freehand **3D Skin Marker** support touch events and active styluses (Apple Pencil, Samsung S-Pen). You can sketch surgical guidelines directly onto the 3D body.

### 5. Which thermal stencil printers work with the exported files?
The **Thermal Stencil** export produces high-contrast, pure-black/purple 300 DPI line art optimized for all standard tattoo thermal transfer copiers, including:
* Brother PocketJet (PJ-773, PJ-883, PJ-763MFi, PJ-863)
* Spirit Thermal Copiers & Fax machines
* Ozer Wireless Quick Stencil Printers
* Phomemo & M08F Tattoo Transfer Machines
* Life Basin Thermal Copiers

---

## 🛠️ Troubleshooting Guide

### Issue 1: iPad cannot connect to the Wi-Fi QR Code URL
* **Cause**: The computer and iPad are on different networks, or Windows Firewall is blocking inbound connections on port 8000.
* **Solution**:
  1. Verify that your iPad and PC are connected to the **exact same Wi-Fi SSID** (ensure one is not on a "5GHz Guest" network).
  2. In Windows Defender Firewall:
     * Open **Windows Security** > **Firewall & network protection**.
     * Click **Allow an app through firewall**.
     * Ensure **Python** has permissions checked for **Private networks**.
  3. If using an iPhone personal hotspot, connect your PC to the iPhone hotspot.

### Issue 2: Tattoo stencil lines look too faint or too bold after thermal printing
* **Cause**: Threshold sensitivity or line weight settings on the original image.
* **Solution**:
  * If lines are too faint: In `app.js` or via the upload endpoint, set `line_weight` to `3` or increase contrast before uploading.
  * If solid black areas are bleeding: Decrease `line_weight` to `1` or `2` for crisp, fine-line outlines.

### Issue 3: Custom 3D scan imports with strange orientation or scale
* **Cause**: Some LiDAR apps export meshes with arbitrary coordinate systems (e.g. $Z$-up vs $Y$-up) or centimeter units instead of meters.
* **Solution**:
  * TattooForge Pro automatically centers and scales models upon import.
  * If the model appears rotated 90 degrees, simply use **👁️ 3D View** to rotate the camera into your desired view and place the tattoo.

### Issue 4: Viewport lag or low FPS on an older laptop
* **Cause**: Integrated GPU running high-resolution shadow maps.
* **Solution**:
  * Uncheck **Simulate Fresh (Swelling & Gloss)** to reduce shader complexity.
  * Ensure your browser has **Hardware Acceleration** enabled (in Chrome: *Settings > System > Use graphics acceleration when available*).

### Issue 5: Port 8000 is already in use by another application
* **Solution**:
  * If another service is occupying port 8000, edit `run_studio.py` and change `port = 8000` to `port = 8080`.
  * Relaunch via `run_studio.bat`.
