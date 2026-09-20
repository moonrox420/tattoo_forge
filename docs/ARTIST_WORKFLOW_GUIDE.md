# 🎨 Artist Workflow Guide: From Consultation to Transfer Paper

This guide details the step-by-step studio workflow for using **TattooForge Pro** during client consultations, anatomical placement, ink proofing, and stencil printing.

---

## 📌 Complete Workflow Overview

```mermaid
flowchart LR
    A["1. Select Anatomy or Import Scan"] --> B["2. Match Skin Tone & Melanin"]
    B --> C["3. Drop Tattoo Artwork"]
    C --> D["4. Project, Rotate & Scale in 3D"]
    D --> E["5. Check Muscle Flex & Strain"]
    E --> F["6. Show Client Healed vs Fresh"]
    F --> G["7. Export Thermal Stencil"]
```

---

## Step 1: Select the Anatomical Region or Import a Client Scan

1. Look at the **Anatomical Region** dropdown on the left panel.
2. Select the intended body area:
   * **Forearm & Wrist**: Detailed radius/ulna taper, flexor muscle belly, and wrist joint.
   * **Upper Arm & Sleeve**: Deltoid shoulder cap, bicep anterior prominence, tricep groove.
   * **Torso & Rib Cage**: Lateral rib arches, pectorals, sternum contour, and waist.
   * **Thigh & Leg**: Quadriceps bulge, knee patella contour, hamstring taper.
   * **Full Body Avatar**: Overall composition across the entire human form.
3. **Using a Client's Actual 3D Scan (LiDAR / Photogrammetry)**:
   * If you used an iPhone LiDAR app (e.g. Polycam, Scaniverse, 3D Scanner App) to scan your client's arm or back, click **📂 Import Custom 3D Scan**.
   * Select the exported `.obj`, `.gltf`, `.glb`, or `.stl` file.
   * TattooForge Pro automatically centers, normalizes scale, and applies the PBR skin shader to your client's exact anatomy!

---

## Step 2: Match Your Client's Fitzpatrick Skin Tone

Clients want to know how the tattoo will look on *their* skin tone:

1. In the **Realistic Skin & Melanin** section, click the swatch corresponding to your client's Fitzpatrick phototype:
   * **Type I**: Pale white (Celtic/Northern European, pinkish undertones)
   * **Type II**: Fair (Caucasian, neutral undertones)
   * **Type III**: Medium / Olive (Mediterranean, Southern European, light Hispanic)
   * **Type IV**: Moderate Brown (Hispanic, Latino, Middle Eastern, Native American)
   * **Type V**: Dark Brown (South Asian, Afro-Caribbean, African)
   * **Type VI**: Deep Melanin (African, deeply pigmented)
2. Fine-tune with the **Melanin Density** slider (0% to 100%) to match their exact complexion.
3. Switch the **Studio Lighting Preset** to test the placement under:
   * *Studio Ring Light* (crisp, high-definition linework clarity)
   * *Warm Tattoo Parlor* (intimate 3200K studio ambiance)
   * *Clinical Spotlight* (direct overhead inspection)
   * *Natural Daylight* (5600K balanced sunlight)

---

## Step 3: Ingest Tattoo Artwork & Stencils

1. Export your design from Procreate, Photoshop, or your scanner as a `PNG` or `JPEG`.
2. Drag and drop the image into the **Artwork & Stencil Ingestion** dropzone on the right panel (or click to browse).
3. **What happens automatically**:
   * **Background Removal**: Solid white paper backgrounds are automatically removed, leaving clean, transparent line art.
   * **Line Stencil Extraction**: Difference-of-Gaussians (DoG) filtering isolates the outlines into sharp transfer lines.
   * A new layer is added to your **Layer Stack** and automatically activated.

> [!TIP]
> You can also click any of the **Quick Flash Presets** (Neo-Trad Dagger & Rose, Sacred Mandala, or Fine-Line Serpent) to immediately test placement.

---

## Step 4: Position, Scale & Wrap on the 3D Body

1. Click the **🎯 Place Tattoo** button on the top floating toolbar.
2. Click anywhere on the 3D anatomical model: the design immediately projects onto the surface conforming to the muscle curvature.
3. Use the **Tattoo Transform & Ink Tuning** sliders on the right panel:
   * **Size / Scale (0.4x – 3.5x)**: Increase or decrease size to fit the limb.
   * **In-Plane Rotation (0° – 360°)**: Rotate the stencil so it aligns naturally with the client's muscle flow and bone lines.
   * **Ink Density / Opacity**: Adjust transparency to match intended ink saturation.
   * **🪞 Flip Mirror**: Flip horizontally if the client wants the design facing the opposite direction (e.g. dragon facing forward).
4. **Ink Blending Mode**:
   * Choose **Multiply**: Black and colored pigments naturally absorb into the melanin and skin pores, giving the most realistic preview of real inking.
   * Choose **Normal**: Opaque preview for stencil proofing.

> [!IMPORTANT]
> **Curved Wrap & No Bleed-Through**: TattooForge Pro features normal-guided 3D projection unwrapping. Tattoos wrap smoothly around the full curvature of forearms, biceps, calves, and ribcages without clipping along artificial bounding boxes, while directional normal culling prevents ink from bleeding through onto the back of the limb or spine.

---

## Step 5: Compose Multi-Piece Sleeves & Layers

Tattoo artists frequently build complex sleeves by combining multiple flash elements:

1. Drop a second or third artwork image into the dropzone.
2. Switch to **🎯 Place Tattoo** and click on another area of the limb (e.g. wrist for piece 1, forearm for piece 2, elbow for piece 3).
3. Click any item in the **Tattoo Layers** list to make it active and adjust its scale, rotation, or opacity independently.
4. If you need to remove a piece, select it and click **🗑️ Delete**.

---

## Step 6: Freehand 3D Surgical Marker Planning

Need to plan anatomical flow lines, wind bars, background filler, or sharpie guidelines before inking?

1. Click **✏️ 3D Skin Marker** on the top floating toolbar.
2. Click and drag your mouse (or Apple Pencil on an iPad) across the 3D skin.
3. High-visibility gentian violet surgical marker lines (`#6a0dad`) adhere directly to the 3D surface.
4. Click **🧹 Clear Lines** whenever you want to reset marker guides.

---

## Step 7: Simulate Muscle Flex & Check Curvature Strain

One of the biggest pain points for clients is how a tattoo warps when they move their body:

1. On the left panel, slide **Pronation / Twist Deformation**:
   * On the forearm, watch how rotating the wrist twists the skin and deforms the artwork.
2. Slide **Muscle Flex / Contraction**:
   * Watch how bicep or quad contractions expand the muscle belly and stretch the tattoo lines.
3. Toggle **Geometric Skin Strain (Curvature Heatmap)**:
   * The 3D surface colors into a high-readability scientific heatmap:
     * **Blue / Cyan**: Flat, stable skin areas with minimal geometric distortion.
     * **Yellow / Orange**: Moderate curvature (transition zones).
     * **Red / Crimson**: High-strain zones (e.g. inner elbow crease, wrist bone, rib flare) where stencil lines warp most significantly.

---

## Step 8: Client Consultation Proofing Mode

When presenting the finished concept to the client:

1. **Fresh vs. Healed Ink**:
   * Unchecked (*Healed*): Shows how the tattoo will look after 6 months once ink settles beneath the epidermal layer with a soft matte finish.
   * Check **Simulate Fresh (Swelling & Gloss)**: Shows how the tattoo will look immediately after the session with slight post-needle erythema (skin redness) and ointment sheen.
2. **🔄 360° Turntable**:
   * Click the Turntable button in the header to start a smooth 360-degree rotation so the client can admire the flow from every angle.
3. **⌨️ Keyboard Navigation Shortcuts**:
   * **Left / Right Arrow Keys (`◀` / `▶`)**: Rotate the 3D figure around its vertical axis to view the front, side, or back. Attached tattoos rotate with the body.
   * **Up / Down Arrow Keys (`▲` / `▼`)**: Tilt the camera angle up or down (elevation/pitch) to inspect from high overhead or looking up from below.
4. **📸 High-Res Snapshot**:
   * Click **Snapshot** to download a print-quality PNG of the 3D model for your portfolio or client messages.
5. **📱 Client Wi-Fi Sync**:
   * Click the Wi-Fi Sync button, let the client scan the QR code with their phone, and let them inspect and spin the 3D model in their own hands!

---

## Step 9: Export Thermal Transfer Stencils

Once the client approves the design and placement:

1. Click **🖨️ Thermal Stencil (Spirit/PocketJet)**:
   * Downloads a high-contrast black/purple on white stencil with crisp vector-like edges, ready to feed straight into your thermal copier (Brother PocketJet, Spirit, Ozer, etc.).
2. Click **📐 Compensated Curvature Stencil**:
   * Generates an inverse arc-length compensated unwrap that pre-stretches/shrinks horizontal proportions to counteract cylindrical limb distortion.
   * When applied onto the curved arm or leg, the tattoo transfer lines settle into intended geometric balance without unwanted barrel warping.
