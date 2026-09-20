/**
 * TattooForge Pro — Photorealistic PBR Skin & Melanin Shader
 * Employs multi-layer physical rendering with micro-pore normal maps,
 * epidermal melanin absorption, subsurface sheen scattering, and ambient occlusion.
 */

const SkinShaderManager = {
  textureLoader: new THREE.TextureLoader(),
  skinAlbedoMap: null,
  skinNormalMap: null,
  skinRoughnessMap: null,
  skinAOMap: null,

  fitzpatrickPresets: {
    1: { name: "Type I (Porcelain / Rosy Peach)", hex: "#e2b79f", melanin: 0.05, roughness: 0.52, sheen: "#c9927d" },
    2: { name: "Type II (Fair / Warm Beige)", hex: "#d4a383", melanin: 0.20, roughness: 0.52, sheen: "#b57e62" },
    3: { name: "Type III (Golden / Olive)", hex: "#ba8558", melanin: 0.40, roughness: 0.53, sheen: "#8f5b35" },
    4: { name: "Type IV (Caramel / Warm Bronze)", hex: "#824925", melanin: 0.60, roughness: 0.54, sheen: "#4e250f" },
    5: { name: "Type V (Dark Chocolate / Espresso)", hex: "#3d1d0c", melanin: 0.80, roughness: 0.55, sheen: "#220d04" },
    6: { name: "Type VI (Deep Melanin / Ebony)", hex: "#1c0d06", melanin: 1.00, roughness: 0.56, sheen: "#0a0301" }
  },

  currentFitzpatrick: 3,
  currentMelanin: 0.40,
  currentColorHex: '#ba8558',
  isFreshInk: false,

  init() {
    // 1. Dermal Albedo / Capillary base (neutral micro-pore texture)
    this.skinAlbedoMap = this.textureLoader.load('/static/textures/skin_albedo.png');
    this.skinAlbedoMap.wrapS = THREE.RepeatWrapping;
    this.skinAlbedoMap.wrapT = THREE.RepeatWrapping;
    this.skinAlbedoMap.repeat.set(6, 6);

    // 2. Micro-pore Normal Map
    this.skinNormalMap = this.textureLoader.load('/static/textures/skin_normal.png');
    this.skinNormalMap.wrapS = THREE.RepeatWrapping;
    this.skinNormalMap.wrapT = THREE.RepeatWrapping;
    this.skinNormalMap.repeat.set(16, 16);

    // 3. Roughness Map
    this.skinRoughnessMap = this.textureLoader.load('/static/textures/skin_roughness.png');
    this.skinRoughnessMap.wrapS = THREE.RepeatWrapping;
    this.skinRoughnessMap.wrapT = THREE.RepeatWrapping;
    this.skinRoughnessMap.repeat.set(16, 16);

    // 4. Ambient Occlusion Map
    this.skinAOMap = this.textureLoader.load('/static/textures/skin_ao.png');
    this.skinAOMap.wrapS = THREE.RepeatWrapping;
    this.skinAOMap.wrapT = THREE.RepeatWrapping;
    this.skinAOMap.repeat.set(16, 16);
  },

  getSkinColorForMelanin(melanin) {
    const stops = [
      { t: 0.00, hex: this.fitzpatrickPresets[1].hex },
      { t: 0.20, hex: this.fitzpatrickPresets[2].hex },
      { t: 0.40, hex: this.fitzpatrickPresets[3].hex },
      { t: 0.60, hex: this.fitzpatrickPresets[4].hex },
      { t: 0.80, hex: this.fitzpatrickPresets[5].hex },
      { t: 1.00, hex: this.fitzpatrickPresets[6].hex },
    ];

    melanin = THREE.MathUtils.clamp(melanin, 0.0, 1.0);

    for (let i = 0; i < stops.length - 1; i++) {
      const s0 = stops[i];
      const s1 = stops[i + 1];
      if (melanin >= s0.t && melanin <= s1.t) {
        const alpha = (melanin - s0.t) / (s1.t - s0.t);
        return new THREE.Color(s0.hex).lerp(new THREE.Color(s1.hex), alpha);
      }
    }
    return new THREE.Color(stops[stops.length - 1].hex);
  },

  createPBRSkinMaterial() {
    let skinColor;
    if (this.currentColorHex) {
      skinColor = new THREE.Color(this.currentColorHex);
    } else {
      const preset = this.fitzpatrickPresets[this.currentFitzpatrick] || this.fitzpatrickPresets[3];
      skinColor = new THREE.Color(preset.hex);
    }

    // Dynamic capillary sheen: warm sub-dermal vascular scatter
    const sheenColor = skinColor.clone().multiplyScalar(0.72);
    sheenColor.r = Math.min(1.0, sheenColor.r * 1.15 + 0.04);
    sheenColor.g = Math.max(0.0, sheenColor.g * 0.90);
    sheenColor.b = Math.max(0.0, sheenColor.b * 0.82);

    const mat = new THREE.MeshPhysicalMaterial({
      color: skinColor,
      map: this.skinAlbedoMap,
      normalMap: this.skinNormalMap,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughnessMap: this.skinRoughnessMap,
      roughness: this.isFreshInk ? 0.42 : (0.50 + this.currentMelanin * 0.06),
      metalness: 0.0,
      
      // Ambient cavity occlusion
      aoMap: this.skinAOMap,
      aoMapIntensity: 1.15,

      // Epidermal lipid clearcoat (gives healthy defined skin sheen on all tones)
      clearcoat: this.isFreshInk ? 0.48 : (0.16 + this.currentMelanin * 0.10),
      clearcoatRoughness: this.isFreshInk ? 0.22 : 0.34,

      // Subsurface scattering & fine vellus fuzz reflection
      sheen: sheenColor,

      reflectivity: 0.25,
      side: THREE.FrontSide,
      morphTargets: true,
      morphNormals: true
    });

    return mat;
  },

  applyToMesh(mesh) {
    if (!mesh) return;
    const material = this.createPBRSkinMaterial();

    mesh.traverse((child) => {
      if (child.isMesh && !child.name.startsWith("Decal_") && !child.name.startsWith("Marker_")) {
        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.geometry && !child.geometry.attributes.uv2 && child.geometry.attributes.uv) {
          // Three.js requires uv2 for aoMap
          child.geometry.setAttribute('uv2', child.geometry.attributes.uv);
        }
      }
    });
  },

  setFitzpatrick(typeNumber, targetMesh) {
    if (!this.fitzpatrickPresets[typeNumber]) return;
    this.currentFitzpatrick = typeNumber;
    const preset = this.fitzpatrickPresets[typeNumber];
    this.currentMelanin = preset.melanin;
    this.currentColorHex = preset.hex;

    this.updateMeshMaterial(targetMesh, preset.hex);
  },

  setCustomMelanin(val, targetMesh) {
    this.currentMelanin = THREE.MathUtils.clamp(val, 0.0, 1.0);
    this.currentColorHex = null;
    this.updateMeshMaterial(targetMesh);
  },

  setCustomColor(hex, targetMesh, melaninVal) {
    this.currentColorHex = hex;
    const skinColor = new THREE.Color(hex);

    if (typeof melaninVal === 'number') {
      this.currentMelanin = THREE.MathUtils.clamp(melaninVal, 0.0, 1.0);
    } else {
      const lum = 0.2126 * skinColor.r + 0.7152 * skinColor.g + 0.0722 * skinColor.b;
      this.currentMelanin = THREE.MathUtils.clamp(1.0 - (lum / 0.82), 0.0, 1.0);
    }

    this.currentFitzpatrick = Math.max(1, Math.min(6, Math.round(this.currentMelanin * 5) + 1));
    this.updateMeshMaterial(targetMesh, hex);
  },

  setFreshInk(isFresh, targetMesh) {
    this.isFreshInk = isFresh;
    this.updateMeshMaterial(targetMesh);
  },

  updateMeshMaterial(targetMesh, overrideHex) {
    if (!targetMesh) return;

    if (overrideHex) {
      this.currentColorHex = overrideHex;
    }

    let skinColor;
    if (this.currentColorHex) {
      skinColor = new THREE.Color(this.currentColorHex);
    } else {
      skinColor = this.getSkinColorForMelanin(this.currentMelanin);
    }

    // If fresh ink mode, subtle epidermal vascular erythema
    if (this.isFreshInk) {
      skinColor.r = Math.min(1.0, skinColor.r * 1.08 + 0.02);
      skinColor.g = Math.max(0.0, skinColor.g * 0.92);
      skinColor.b = Math.max(0.0, skinColor.b * 0.90);
    }

    // Compute dynamic living sheen: warm capillary scatter
    const sheenColor = skinColor.clone().multiplyScalar(0.72);
    sheenColor.r = Math.min(1.0, sheenColor.r * 1.15 + 0.04);
    sheenColor.g = Math.max(0.0, sheenColor.g * 0.90);
    sheenColor.b = Math.max(0.0, sheenColor.b * 0.82);

    targetMesh.traverse((child) => {
      if (child.isMesh && child.material && !child.name.startsWith("Decal_") && !child.name.startsWith("Marker_")) {
        child.material.color.copy(skinColor);
        child.material.roughness = this.isFreshInk ? 0.42 : (0.50 + this.currentMelanin * 0.06);
        child.material.clearcoat = this.isFreshInk ? 0.48 : (0.16 + this.currentMelanin * 0.10);
        child.material.clearcoatRoughness = this.isFreshInk ? 0.22 : 0.34;
        if (child.material.sheen) {
          child.material.sheen.copy(sheenColor);
        }
        child.material.needsUpdate = true;
      }
    });
  }
};

window.SkinShaderManager = SkinShaderManager;
