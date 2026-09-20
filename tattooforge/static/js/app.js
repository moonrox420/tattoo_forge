/**
 * TattooForge Pro — Master Workstation Controller
 * Orchestrates 3D rendering, studio environment lighting, camera choreography,
 * photorealistic PBR skin shaders, decal placement, and client proofing exports.
 */

const TattooForgeApp = {
  container: null,
  canvas: null,
  scene: null,
  camera: null,
  renderer: null,
  controls: null,

  // Lighting setup
  lights: {
    ambient: null,
    key: null,
    fill: null,
    rim: null,
  },

  // State
  activeRegion: 'forearm',
  currentMode: 'view', // 'view', 'place', 'marker'
  isTurntableActive: false,

  async init() {
    this.container = document.getElementById('viewport-container');
    this.canvas = document.getElementById('webgl-canvas');

    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupLights();
    this.setupStudioEnvironment();
    this.setupPedestal();
    this.setupControls();

    // Initialize sub-engines
    SkinShaderManager.init();
    AnatomyEngine.init(this.scene);
    DecalEngine.init(this.scene, this.camera);

    // Load initial anatomical region (Forearm & Hand)
    this.switchRegion('forearm');

    // Setup event listeners & UI bindings
    this.bindEvents();
    this.bindUI();

    // Load first default tattoo layer (Dagger & Rose)
    setTimeout(() => {
      this.loadSampleFlash('dagger_rose');
    }, 450);

    // Start render loop
    this.animate();
  },

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true // Allows high-res portfolio snapshots
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
  },

  setupScene() {
    this.scene = new THREE.Scene();
  },

  setupCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    this.camera.position.set(0, -0.2, 4.4);
  },

  setupLights() {
    this.lights.ambient = new THREE.AmbientLight(0xfff6f0, 0.32);
    this.scene.add(this.lights.ambient);

    // Key Light (Main soft shadow caster)
    this.lights.key = new THREE.DirectionalLight(0xfffaed, 1.20);
    this.lights.key.position.set(3.5, 4.5, 4.5);
    this.lights.key.castShadow = true;
    this.lights.key.shadow.mapSize.width = 2048;
    this.lights.key.shadow.mapSize.height = 2048;
    this.lights.key.shadow.camera.near = 0.5;
    this.lights.key.shadow.camera.far = 25;
    this.lights.key.shadow.bias = -0.0001;
    this.scene.add(this.lights.key);

    // Fill Light (Soft cool contrast)
    this.lights.fill = new THREE.DirectionalLight(0xdbeafe, 0.45);
    this.lights.fill.position.set(-4.5, 2.0, 3.0);
    this.scene.add(this.lights.fill);

    // Rim Light (Edge definition)
    this.lights.rim = new THREE.DirectionalLight(0xffffff, 0.85);
    this.lights.rim.position.set(0, 4.0, -4.5);
    this.scene.add(this.lights.rim);
  },

  setupStudioEnvironment() {
    // Generate photorealistic studio IBL (Image-Based Lighting) reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new THREE.Scene();

    // Studio softbox 1 (Warm Key)
    const box1Geo = new THREE.PlaneGeometry(8, 8);
    const box1Mat = new THREE.MeshBasicMaterial({ color: 0xfff6ea, side: THREE.DoubleSide });
    const box1 = new THREE.Mesh(box1Geo, box1Mat);
    box1.position.set(6, 6, 5);
    box1.lookAt(0, 0, 0);
    envScene.add(box1);

    // Studio softbox 2 (Cool Fill)
    const box2Geo = new THREE.PlaneGeometry(6, 6);
    const box2Mat = new THREE.MeshBasicMaterial({ color: 0xdbeafe, side: THREE.DoubleSide });
    const box2 = new THREE.Mesh(box2Geo, box2Mat);
    box2.position.set(-6, 3, 4);
    box2.lookAt(0, 0, 0);
    envScene.add(box2);

    // Overhead strip softbox
    const box3Geo = new THREE.PlaneGeometry(12, 3);
    const box3Mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const box3 = new THREE.Mesh(box3Geo, box3Mat);
    box3.position.set(0, 7, -4);
    box3.lookAt(0, 0, 0);
    envScene.add(box3);

    envScene.background = new THREE.Color(0x161920);

    const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
    this.scene.environment = envMap;
    pmremGenerator.dispose();
  },

  setupPedestal() {
    // Elegant studio floor shadow receiver
    const shadowGeo = new THREE.PlaneGeometry(12, 12);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.38 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.9;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);
  },

  setupControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 18;
    this.controls.minDistance = 1.0;
    this.controls.target.set(0, -0.2, 0);
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 2.5;

    // Track default camera distance for zoom level calculation and reset
    this.defaultCameraDistance = this.camera.position.distanceTo(this.controls.target);
    this.controls.addEventListener('change', () => this.updateZoomDisplay());
  },

  setLightingPreset(presetKey) {
    if (presetKey === 'ring_light') {
      this.lights.ambient.intensity = 0.32;
      this.lights.key.intensity = 1.25;
      this.lights.key.color.setHex(0xffffff);
      this.lights.fill.intensity = 0.45;
      this.lights.fill.color.setHex(0xffffff);
      this.lights.rim.intensity = 0.85;
    } else if (presetKey === 'parlor_warm') {
      this.lights.ambient.intensity = 0.28;
      this.lights.key.intensity = 1.20;
      this.lights.key.color.setHex(0xffd4aa);
      this.lights.fill.intensity = 0.40;
      this.lights.fill.color.setHex(0xffa884);
      this.lights.rim.intensity = 0.90;
    } else if (presetKey === 'clinical') {
      this.lights.ambient.intensity = 0.38;
      this.lights.key.intensity = 1.30;
      this.lights.key.color.setHex(0xf0f9ff);
      this.lights.fill.intensity = 0.50;
      this.lights.fill.color.setHex(0xe0f2fe);
      this.lights.rim.intensity = 0.65;
    } else if (presetKey === 'daylight') {
      this.lights.ambient.intensity = 0.32;
      this.lights.key.intensity = 1.15;
      this.lights.key.color.setHex(0xfffaed);
      this.lights.fill.intensity = 0.42;
      this.lights.fill.color.setHex(0xdbeafe);
      this.lights.rim.intensity = 0.80;
    }
  },

  switchRegion(regionKey) {
    this.activeRegion = regionKey;
    const mesh = AnatomyEngine.selectRegion(regionKey);
    SkinShaderManager.applyToMesh(mesh);
    DecalEngine.setTargetMesh(mesh);

    // Update active chip in preset bar
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.region === regionKey);
    });

    // Sync select dropdown
    const regionSelect = document.getElementById('anatomy-region-select');
    if (regionSelect && regionSelect.value !== regionKey) {
      regionSelect.value = regionKey;
    }

    // Camera choreography for each anatomical focus
    if (regionKey === 'forearm') {
      this.tweenCamera(new THREE.Vector3(0, -0.2, 4.4), new THREE.Vector3(0, -0.2, 0));
    } else if (regionKey === 'upperarm') {
      this.tweenCamera(new THREE.Vector3(0, 0.4, 4.6), new THREE.Vector3(0, 0.2, 0));
    } else if (regionKey === 'ribs') {
      this.tweenCamera(new THREE.Vector3(0, 0.1, 5.2), new THREE.Vector3(0, 0.1, 0));
    } else if (regionKey === 'thigh') {
      this.tweenCamera(new THREE.Vector3(0, -0.3, 5.0), new THREE.Vector3(0, -0.3, 0));
    } else if (regionKey === 'male_full') {
      this.tweenCamera(new THREE.Vector3(0, 0.3, 7.8), new THREE.Vector3(0, 0.2, 0));
    } else if (regionKey === 'female_full') {
      this.tweenCamera(new THREE.Vector3(0, 0.3, 7.6), new THREE.Vector3(0, 0.2, 0));
    }

    // Reproject any existing decals onto the new anatomy
    for (const layer of DecalEngine.layers) {
      DecalEngine.reprojectDecal(layer);
    }

    this.defaultCameraDistance = this.camera.position.distanceTo(this.controls.target);
    this.updateZoomDisplay();
  },

  tweenCamera(targetPos, targetLookAt) {
    this.camera.position.copy(targetPos);
    this.controls.target.copy(targetLookAt);
    this.controls.update();
  },

  setMode(mode) {
    this.currentMode = mode;
    DecalEngine.currentMode = mode;

    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    this.controls.enabled = (mode === 'view');
    this.canvas.style.cursor = (mode === 'view') ? 'grab' : (mode === 'place' ? 'crosshair' : 'cell');
  },

  bindEvents() {
    window.addEventListener('resize', () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    // Canvas click / drag handling for decal placement and surgical marker
    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      if (this.currentMode === 'place') {
        const hit = DecalEngine.raycastPlacement(mouse);
        if (hit) {
          const activeLayer = DecalEngine.getActiveLayer();
          if (activeLayer) {
            DecalEngine.projectDecalAt(activeLayer, hit.point, hit.normal, hit.hitObject);
          }
        }
      } else if (this.currentMode === 'marker') {
        const hit = DecalEngine.raycastPlacement(mouse);
        if (hit) {
          DecalEngine.startMarkerStroke(hit.point, hit.normal);
        }
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.currentMode === 'marker' && DecalEngine.isDrawingMarker) {
        const rect = this.canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const hit = DecalEngine.raycastPlacement(mouse);
        if (hit) {
          DecalEngine.addMarkerPoint(hit.point, hit.normal);
        }
      }
    });

    window.addEventListener('pointerup', () => {
      if (this.currentMode === 'marker') {
        DecalEngine.endMarkerStroke();
      }
    });

    // Keyboard navigation: L/R arrows rotate figure, U/D arrows control camera angle
    const activeKeys = new Set();
    const isEditingText = (target) => {
      if (!target) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };

    window.addEventListener('keydown', (e) => {
      if (isEditingText(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.code;
      const isZoomIn = (e.key === '+' || e.key === '=' || key === 'NumpadAdd' || key === 'PageUp');
      const isZoomOut = (e.key === '-' || e.key === '_' || key === 'NumpadSubtract' || key === 'PageDown');
      const isZoomReset = (key === 'Home' || (e.key === '0' && !e.shiftKey) || key === 'Numpad0');

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
        e.preventDefault();
        activeKeys.add(key);

        // Immediate responsive step on initial keydown tap
        if (key === 'ArrowLeft') {
          this.rotateFigure(-0.045);
        } else if (key === 'ArrowRight') {
          this.rotateFigure(0.045);
        } else if (key === 'ArrowUp') {
          this.adjustCameraPitch(-0.035);
        } else if (key === 'ArrowDown') {
          this.adjustCameraPitch(0.035);
        }
      } else if (isZoomIn) {
        e.preventDefault();
        activeKeys.add('ZoomIn');
        this.zoomCamera(0.88);
      } else if (isZoomOut) {
        e.preventDefault();
        activeKeys.add('ZoomOut');
        this.zoomCamera(1.14);
      } else if (isZoomReset) {
        e.preventDefault();
        this.resetCameraZoom();
      }
    });

    window.addEventListener('keyup', (e) => {
      activeKeys.delete(e.code);
      if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd' || e.code === 'PageUp') {
        activeKeys.delete('ZoomIn');
      }
      if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract' || e.code === 'PageDown') {
        activeKeys.delete('ZoomOut');
      }
    });

    window.addEventListener('blur', () => {
      activeKeys.clear();
    });

    this.activeKeys = activeKeys;
  },

  bindUI() {
    // Mode buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setMode(btn.dataset.mode);
      });
    });

    // Anatomical presets
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.switchRegion(chip.dataset.region);
      });
    });

    // Initialize Skin Tone Color Wheel
    SkinColorWheel.init({
      onColorChange: (hex, melanin, undertoneName) => {
        // 1. Update 3D PBR Skin Shader
        SkinShaderManager.setCustomColor(hex, AnatomyEngine.activeMesh, melanin);

        // 2. Update UI Preview Card
        const previewSwatch = document.getElementById('skin-preview-swatch');
        if (previewSwatch) previewSwatch.style.background = hex;

        const nameEl = document.getElementById('skin-tone-name');
        if (nameEl) nameEl.textContent = undertoneName;

        const hexInput = document.getElementById('skin-hex-input');
        if (hexInput && document.activeElement !== hexInput) {
          hexInput.value = hex.toUpperCase();
        }

        const nativePicker = document.getElementById('skin-native-color-picker');
        if (nativePicker) nativePicker.value = hex;

        // 3. Sync Melanin Slider
        const melaninSlider = document.getElementById('melanin-slider');
        if (melaninSlider && document.activeElement !== melaninSlider) {
          melaninSlider.value = Math.round(melanin * 100);
        }
        const melaninVal = document.getElementById('melanin-val');
        if (melaninVal) melaninVal.textContent = Math.round(melanin * 100) + '%';

        // 4. Highlight closest Fitzpatrick swatch
        const closestType = Math.max(1, Math.min(6, Math.round(melanin * 5) + 1));
        document.querySelectorAll('.skin-tone-swatch').forEach(s => {
          s.classList.toggle('active', parseInt(s.dataset.fitzpatrick, 10) === closestType);
        });
      }
    });

    // Wheel Mode Buttons (Skin Spectrum vs 360° Spectrum)
    const modeSkinBtn = document.getElementById('wheel-mode-skin');
    const modeFullBtn = document.getElementById('wheel-mode-full');
    if (modeSkinBtn && modeFullBtn) {
      modeSkinBtn.addEventListener('click', () => {
        modeSkinBtn.classList.add('active');
        modeFullBtn.classList.remove('active');
        SkinColorWheel.setMode('skin');
      });
      modeFullBtn.addEventListener('click', () => {
        modeFullBtn.classList.add('active');
        modeSkinBtn.classList.remove('active');
        SkinColorWheel.setMode('full');
      });
    }

    // Hex Input editing
    const skinHexInput = document.getElementById('skin-hex-input');
    if (skinHexInput) {
      skinHexInput.addEventListener('change', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        SkinColorWheel.setFromHex(val);
      });
    }

    // Eyedropper / Screen color sampling button
    const eyedropperBtn = document.getElementById('skin-eyedropper-btn');
    const nativePicker = document.getElementById('skin-native-color-picker');
    if (eyedropperBtn) {
      eyedropperBtn.addEventListener('click', async () => {
        if (window.EyeDropper) {
          try {
            const eyeDropper = new window.EyeDropper();
            const result = await eyeDropper.open();
            if (result && result.sRGBHex) {
              SkinColorWheel.setFromHex(result.sRGBHex);
            }
          } catch (err) {
            // User cancelled eyedropper
          }
        } else if (nativePicker) {
          nativePicker.click();
        }
      });
    }
    if (nativePicker) {
      nativePicker.addEventListener('input', (e) => {
        SkinColorWheel.setFromHex(e.target.value);
      });
    }

    // Fitzpatrick swatches: clicking updates the color wheel!
    document.querySelectorAll('.skin-tone-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.skin-tone-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const typeNum = parseInt(swatch.dataset.fitzpatrick, 10);
        SkinColorWheel.selectFitzpatrick(typeNum);
      });
    });

    // Melanin slider: moving slider updates SkinColorWheel depth
    const melaninSlider = document.getElementById('melanin-slider');
    if (melaninSlider) {
      melaninSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100.0;
        SkinColorWheel.setMelanin(val);
      });
    }

    // Fresh vs. Healed Ink toggle
    const freshToggle = document.getElementById('fresh-ink-toggle');
    freshToggle.addEventListener('change', (e) => {
      SkinShaderManager.setFreshInk(e.target.checked, AnatomyEngine.activeMesh);
    });

    // Lighting preset selector
    document.getElementById('lighting-preset').addEventListener('change', (e) => {
      this.setLightingPreset(e.target.value);
    });

    // Muscle flex / deformation sliders
    document.getElementById('twist-slider').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100.0;
      document.getElementById('twist-val').textContent = e.target.value + '%';
      AnatomyEngine.setDeformation(0, val);
    });

    document.getElementById('flex-slider').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100.0;
      document.getElementById('flex-val').textContent = e.target.value + '%';
      AnatomyEngine.setDeformation(1, val);
    });

    // Curvature Strain Heatmap toggle
    const heatmapToggle = document.getElementById('heatmap-toggle');
    heatmapToggle.addEventListener('change', (e) => {
      CurvatureHeatmap.toggle(AnatomyEngine.activeMesh, e.target.checked);
    });

    // Clear marker lines button
    document.getElementById('clear-marker-btn').addEventListener('click', () => {
      DecalEngine.clearMarkerStrokes();
    });

    // Decal Transform controls
    const scaleSlider = document.getElementById('decal-scale-slider');
    scaleSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('scale-val').textContent = val.toFixed(1) + 'x';
      const active = DecalEngine.getActiveLayer();
      if (active) DecalEngine.updateLayerTransform(active.id, { scale: val });
    });

    const rotSlider = document.getElementById('decal-rotation-slider');
    rotSlider.addEventListener('input', (e) => {
      const deg = parseFloat(e.target.value);
      document.getElementById('rotation-val').textContent = deg + '°';
      const rad = THREE.MathUtils.degToRad(deg);
      const active = DecalEngine.getActiveLayer();
      if (active) DecalEngine.updateLayerTransform(active.id, { rotationAngle: rad });
    });

    const opacitySlider = document.getElementById('decal-opacity-slider');
    opacitySlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100.0;
      document.getElementById('opacity-val').textContent = e.target.value + '%';
      const active = DecalEngine.getActiveLayer();
      if (active) DecalEngine.updateLayerTransform(active.id, { opacity: val });
    });

    document.getElementById('decal-blend-mode').addEventListener('change', (e) => {
      const active = DecalEngine.getActiveLayer();
      if (active) DecalEngine.updateLayerTransform(active.id, { blendMode: e.target.value });
    });

    document.getElementById('mirror-btn').addEventListener('click', () => {
      const active = DecalEngine.getActiveLayer();
      if (active) DecalEngine.updateLayerTransform(active.id, { mirrorX: !active.mirrorX });
    });

    document.getElementById('delete-layer-btn').addEventListener('click', () => {
      const active = DecalEngine.getActiveLayer();
      if (active) {
        DecalEngine.removeLayer(active.id);
        this.renderLayerList();
      }
    });

    // Dropzone for artwork upload
    const dropzone = document.getElementById('artwork-dropzone');
    const fileInput = document.getElementById('artwork-file-input');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.handleImageUpload(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleImageUpload(e.target.files[0]);
      }
    });

    // Custom 3D scan upload (.obj, .gltf, .stl)
    const scanInput = document.getElementById('scan-file-input');
    document.getElementById('upload-scan-btn').addEventListener('click', () => scanInput.click());
    scanInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        AnatomyEngine.loadCustomScan(e.target.files[0], (loadedObj) => {
          SkinShaderManager.applyToMesh(loadedObj);
          DecalEngine.setTargetMesh(loadedObj);
        });
      }
    });

    // Client Proofing: High-Res Snapshot
    document.getElementById('snapshot-btn').addEventListener('click', () => {
      this.exportHighResSnapshot();
    });

    // Client Proofing: Turntable toggle
    document.getElementById('turntable-btn').addEventListener('click', (e) => {
      this.isTurntableActive = !this.isTurntableActive;
      e.currentTarget.classList.toggle('active', this.isTurntableActive);
      this.controls.autoRotate = this.isTurntableActive;
    });

    // Client Proofing: Wi-Fi QR Code dialog
    document.getElementById('share-qr-btn').addEventListener('click', () => {
      this.openWiFiShareDialog();
    });

    // Close modals
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal-backdrop').classList.remove('open');
      });
    });

    // Stencil Export buttons
    document.getElementById('download-thermal-btn').addEventListener('click', () => {
      this.downloadThermalStencil();
    });

    document.getElementById('download-compensated-btn').addEventListener('click', () => {
      this.downloadCompensatedStencil();
    });

    // Desktop Viewport Zoom Controls
    const zoomInBtn = document.getElementById('zoom-in-btn');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.zoomCamera(0.85));
    }
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.zoomCamera(1.18));
    }
    const resetZoomBtn = document.getElementById('reset-zoom-btn');
    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', () => this.resetCameraZoom());
    }
  },

  async handleImageUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('remove_bg', 'true');
    formData.append('bg_threshold', '240');
    formData.append('line_weight', '2');
    formData.append('threshold_sensitivity', '128');
    formData.append('stencil_color_hex', '#3A235D');

    try {
      const res = await fetch('/api/stencil/process', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      const layer = DecalEngine.addLayer(file.name, data.artwork_transparent_url, false);
      layer.thermalPrintableUrl = data.thermal_printable_url;
      layer.stencilDecalUrl = data.stencil_decal_url;

      this.projectDefaultDecal(layer);
      this.renderLayerList();
      this.setMode('place');
    } catch (err) {
      console.error("Error processing stencil:", err);
      const reader = new FileReader();
      reader.onload = (e) => {
        const layer = DecalEngine.addLayer(file.name, e.target.result, false);
        this.projectDefaultDecal(layer);
        this.renderLayerList();
        this.setMode('place');
      };
      reader.readAsDataURL(file);
    }
  },

  loadSampleFlash(sampleKey) {
    const sampleUrls = {
      'dagger_rose': '/static/textures/samples/dagger_rose.png',
      'sacred_mandala': '/static/textures/samples/sacred_mandala.png',
      'fine_line_snake': '/static/textures/samples/fine_line_snake.png',
    };
    const sampleNames = {
      'dagger_rose': 'Dagger & Rose (Neo-Trad)',
      'sacred_mandala': 'Sacred Mandala',
      'fine_line_snake': 'Fine-Line Serpent',
    };

    const url = sampleUrls[sampleKey];
    if (!url) return;

    const layer = DecalEngine.addLayer(sampleNames[sampleKey], url, false);
    this.projectDefaultDecal(layer);
    this.renderLayerList();
  },

  projectDefaultDecal(layer) {
    const anchors = {
      'forearm': new THREE.Vector3(0, 0, 0.85),
      'upperarm': new THREE.Vector3(0, 0.2, 0.95),
      'ribs': new THREE.Vector3(0, 0.2, 1.4),
      'thigh': new THREE.Vector3(0, 0, 1.2),
      'male_full': new THREE.Vector3(0, 0.8, 0.5),
      'female_full': new THREE.Vector3(0, 0.8, 0.45),
      'fullbody': new THREE.Vector3(0, 0.8, 0.5),
    };
    const centerPoint = anchors[this.activeRegion] || new THREE.Vector3(0, 0, 0.85);
    const normal = new THREE.Vector3(0, 0, 1);
    DecalEngine.projectDecalAt(layer, centerPoint, normal);
  },

  renderLayerList() {
    const container = document.getElementById('layer-list');
    container.innerHTML = '';

    DecalEngine.layers.forEach(layer => {
      const item = document.createElement('div');
      item.className = 'layer-item' + (layer.id === DecalEngine.activeLayerId ? ' active' : '');
      item.innerHTML = `
        <div class="info">
          <img src="${layer.textureUrl}" class="preview-thumb" />
          <span>${layer.name}</span>
        </div>
        <span style="font-size: 0.7rem; color: var(--text-muted);">${(layer.opacity * 100).toFixed(0)}%</span>
      `;
      item.addEventListener('click', () => {
        DecalEngine.setActiveLayer(layer.id);
        this.renderLayerList();
        document.getElementById('decal-scale-slider').value = layer.scale;
        document.getElementById('scale-val').textContent = layer.scale.toFixed(1) + 'x';
        document.getElementById('decal-rotation-slider').value = Math.round(THREE.MathUtils.radToDeg(layer.rotationAngle));
        document.getElementById('rotation-val').textContent = document.getElementById('decal-rotation-slider').value + '°';
        document.getElementById('decal-opacity-slider').value = Math.round(layer.opacity * 100);
        document.getElementById('opacity-val').textContent = Math.round(layer.opacity * 100) + '%';
        document.getElementById('decal-blend-mode').value = layer.blendMode;
      });
      container.appendChild(item);
    });
  },

  exportHighResSnapshot() {
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `TattooForge_3D_Preview_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  },

  async downloadThermalStencil() {
    const active = DecalEngine.getActiveLayer();
    if (!active) {
      alert("Please select an active tattoo layer to export its stencil.");
      return;
    }

    if (active.thermalPrintableUrl) {
      const link = document.createElement('a');
      link.download = `Thermal_Stencil_${Date.now()}.png`;
      link.href = active.thermalPrintableUrl;
      link.click();
    } else {
      const link = document.createElement('a');
      link.download = `Thermal_Stencil_${Date.now()}.png`;
      link.href = active.textureUrl;
      link.click();
    }
  },

  async downloadCompensatedStencil() {
    const active = DecalEngine.getActiveLayer();
    if (!active) {
      alert("Please select an active tattoo layer to export.");
      return;
    }

    try {
      const res = await fetch('/api/stencil/compensate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data_uri: active.textureUrl,
          cylinder_radius_cm: 4.5,
          arc_span_degrees: 110.0
        })
      });
      const data = await res.json();
      const link = document.createElement('a');
      link.download = `Compensated_Stencil_Transfer_${Date.now()}.png`;
      link.href = data.compensated_url;
      link.click();
    } catch (err) {
      console.error("Compensate error:", err);
    }
  },

  async openWiFiShareDialog() {
    const modal = document.getElementById('qr-modal');
    modal.classList.add('open');

    try {
      const res = await fetch('/api/network/info');
      const data = await res.json();
      
      const qrBox = document.getElementById('qrcode-box');
      qrBox.innerHTML = '';

      new QRCode(qrBox, {
        text: data.studio_url,
        width: 180,
        height: 180,
        colorDark: "#0d0f12",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });

      document.getElementById('qr-studio-url').textContent = data.studio_url;
    } catch (err) {
      console.error("Failed to load network info:", err);
    }
  },

  onRegionUpdated(mesh) {
    if (!mesh) return;
    SkinShaderManager.applyToMesh(mesh);
    DecalEngine.setTargetMesh(mesh);
    for (const layer of DecalEngine.layers) {
      DecalEngine.reprojectDecal(layer);
    }
  },

  /**
   * Rotate the anatomical figure around its vertical axis (L / R arrow keys)
   */
  rotateFigure(deltaAngle) {
    if (AnatomyEngine && AnatomyEngine.activeMesh) {
      AnatomyEngine.activeMesh.rotation.y += deltaAngle;
      AnatomyEngine.activeMesh.updateMatrixWorld(true);
    }
  },

  /**
   * Adjust camera vertical pitch / elevation angle around the focus target (U / D arrow keys)
   */
  adjustCameraPitch(deltaPitch) {
    if (!this.camera || !this.controls) return;

    const target = this.controls.target;
    const offset = this.camera.position.clone().sub(target);
    const radius = offset.length();
    if (radius < 0.001) return;

    // Current polar angle (phi) and azimuthal angle (theta)
    let phi = Math.acos(THREE.MathUtils.clamp(offset.y / radius, -1.0, 1.0));
    const theta = Math.atan2(offset.x, offset.z);

    // Adjust polar angle, bounded between 5 deg and 175 deg to avoid gimbal inversion
    const minPhi = 0.08;
    const maxPhi = Math.PI - 0.08;
    phi = THREE.MathUtils.clamp(phi + deltaPitch, minPhi, maxPhi);

    // Recompute spherical offset
    offset.x = radius * Math.sin(phi) * Math.sin(theta);
    offset.y = radius * Math.cos(phi);
    offset.z = radius * Math.sin(phi) * Math.cos(theta);

    this.camera.position.copy(target).add(offset);
    this.controls.update();
  },

  /**
   * Zoom camera in or out relative to current orbit target
   * factor < 1 zooms in (closer), factor > 1 zooms out (farther)
   */
  zoomCamera(factor) {
    if (!this.camera || !this.controls) return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const curDist = offset.length();
    if (curDist < 0.001) return;

    const newDist = THREE.MathUtils.clamp(
      curDist * factor,
      this.controls.minDistance,
      this.controls.maxDistance
    );
    offset.setLength(newDist);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.updateZoomDisplay();
  },

  /**
   * Reset camera zoom to default distance for current anatomical region
   */
  resetCameraZoom() {
    if (!this.camera || !this.controls) return;
    const defaultDist = this.defaultCameraDistance || 4.4;
    const offset = this.camera.position.clone().sub(this.controls.target);
    if (offset.length() < 0.001) offset.set(0, 0, defaultDist);
    offset.setLength(defaultDist);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.updateZoomDisplay();
  },

  /**
   * Update the UI zoom percentage label based on default vs current distance
   */
  updateZoomDisplay() {
    const zoomValEl = document.getElementById('zoom-level-val');
    if (!zoomValEl || !this.camera || !this.controls) return;
    const currentDist = this.camera.position.distanceTo(this.controls.target);
    const baseDist = this.defaultCameraDistance || 4.4;
    const zoomPct = Math.round((baseDist / Math.max(0.1, currentDist)) * 100);
    zoomValEl.textContent = `${zoomPct}%`;
  },

  animate() {
    requestAnimationFrame(() => this.animate());

    // Continuous smooth navigation when arrow keys or zoom keys are held down
    if (this.activeKeys && this.activeKeys.size > 0) {
      if (this.activeKeys.has('ArrowLeft')) {
        this.rotateFigure(-0.028);
      }
      if (this.activeKeys.has('ArrowRight')) {
        this.rotateFigure(0.028);
      }
      if (this.activeKeys.has('ArrowUp')) {
        this.adjustCameraPitch(-0.022);
      }
      if (this.activeKeys.has('ArrowDown')) {
        this.adjustCameraPitch(0.022);
      }
      if (this.activeKeys.has('ZoomIn')) {
        this.zoomCamera(0.975);
      }
      if (this.activeKeys.has('ZoomOut')) {
        this.zoomCamera(1.025);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
};

window.TattooForgeApp = TattooForgeApp;

window.addEventListener('DOMContentLoaded', () => {
  TattooForgeApp.init();
});
