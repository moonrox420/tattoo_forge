/**
 * TattooForge Pro — Ultra-Realistic 3D Anatomical Mesh & Sculpt Engine
 * Provides high-polygon sculpted anatomy (Forearm+Hand, Upper Arm+Shoulder, Torso+Ribs, Thigh+Knee)
 * plus full-body male and female 3D anatomical models with real-time limb twisting and joint bending.
 */

const AnatomyEngine = {
  scene: null,
  activeMesh: null,
  models: {},
  currentRegion: 'forearm',
  objLoader: new THREE.OBJLoader(),
  deformationState: {
    twist: 0.0,
    flex: 0.0
  },

  init(scene) {
    this.scene = scene;
    this.buildSculptedModels();
    this.preloadScannedModels();
  },

  /**
   * Builds immediate synchronous anatomical models so viewport is NEVER blank
   */
  buildSculptedModels() {
    this.models['forearm'] = this.createSculptedForearmHand();
    this.models['upperarm'] = this.createSculptedUpperArm();
    this.models['ribs'] = this.createSculptedTorsoRibs();
    this.models['thigh'] = this.createSculptedThighKnee();
    this.models['male_full'] = this.createSculptedFullBody('male');
    this.models['female_full'] = this.createSculptedFullBody('female');
    this.models['fullbody'] = this.models['male_full'];
  },

  /**
   * Helper to merge multiple meshes from an OBJ hierarchy into a single unified Mesh
   */
  mergeObjectMeshes(obj) {
    const geometries = [];
    obj.updateMatrixWorld(true);
    obj.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const clonedGeo = child.geometry.clone();
        clonedGeo.applyMatrix4(child.matrixWorld);
        geometries.push(clonedGeo);
      }
    });

    if (geometries.length === 0) return null;

    let totalVertices = 0;
    for (const g of geometries) totalVertices += g.attributes.position.count;

    const positions = new Float32Array(totalVertices * 3);
    const normals = new Float32Array(totalVertices * 3);
    const uvs = new Float32Array(totalVertices * 2);
    const indices = [];

    let vertOffset = 0;
    for (const g of geometries) {
      const p = g.attributes.position;
      const n = g.attributes.normal;
      const u = g.attributes.uv;

      for (let i = 0; i < p.count; i++) {
        const idx = vertOffset + i;
        positions[idx * 3] = p.getX(i);
        positions[idx * 3 + 1] = p.getY(i);
        positions[idx * 3 + 2] = p.getZ(i);

        if (n) {
          normals[idx * 3] = n.getX(i);
          normals[idx * 3 + 1] = n.getY(i);
          normals[idx * 3 + 2] = n.getZ(i);
        }
        if (u) {
          uvs[idx * 2] = u.getX(i);
          uvs[idx * 2 + 1] = u.getY(i);
        }
      }

      if (g.index) {
        for (let i = 0; i < g.index.count; i++) {
          indices.push(g.index.getX(i) + vertOffset);
        }
      } else {
        for (let i = 0; i < p.count; i++) {
          indices.push(i + vertOffset);
        }
      }
      vertOffset += p.count;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    merged.setIndex(indices);
    return merged;
  },

  /**
   * Preload real scanned OBJs asynchronously with automatic fallback and live scene update
   */
  preloadScannedModels() {
    if (typeof window === 'undefined' || typeof XMLHttpRequest === 'undefined') return;

    // 1. Male Full Body Scan
    this.objLoader.load(
      '/static/models/male02.obj',
      (obj) => {
        try {
          const unifiedMesh = this.createUnifiedMeshFromScan(obj, "Anatomy_Male_FullBody", 'male_full');
          if (unifiedMesh) {
            this.models['male_full'] = unifiedMesh;
            this.models['fullbody'] = unifiedMesh;
            if (this.currentRegion === 'male_full' || this.currentRegion === 'fullbody') {
              this.refreshActiveRegion();
            }
          }
        } catch (e) {
          console.warn("Notice: Using procedural high-poly male body fallback:", e);
        }
      },
      undefined,
      (err) => {
        console.warn("Notice: Scanned male02.obj not loaded, utilizing procedural sculpted fallback.", err);
      }
    );

    // 2. Female Full Body Scan
    this.objLoader.load(
      '/static/models/female02.obj',
      (obj) => {
        try {
          const unifiedMesh = this.createUnifiedMeshFromScan(obj, "Anatomy_Female_FullBody", 'female_full');
          if (unifiedMesh) {
            this.models['female_full'] = unifiedMesh;
            if (this.currentRegion === 'female_full') {
              this.refreshActiveRegion();
            }
          }
        } catch (e) {
          console.warn("Notice: Using procedural high-poly female body fallback:", e);
        }
      },
      undefined,
      (err) => {
        console.warn("Notice: Scanned female02.obj not loaded, utilizing procedural sculpted fallback.", err);
      }
    );
  },

  createUnifiedMeshFromScan(obj, name, regionKey) {
    const mergedGeo = this.mergeObjectMeshes(obj);
    if (!mergedGeo) return null;

    mergedGeo.computeBoundingBox();
    const box = mergedGeo.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = 6.2 / (maxDim || 1.0);

    // Center and scale vertices directly in geometry
    mergedGeo.translate(-center.x, -center.y, -center.z);
    mergedGeo.scale(scaleFactor, scaleFactor, scaleFactor);
    mergedGeo.computeVertexNormals();

    const mat = window.SkinShaderManager ? window.SkinShaderManager.createPBRSkinMaterial() : this.createSkinMaterialPlaceholder();
    const mesh = new THREE.Mesh(mergedGeo, mat);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.regionKey = regionKey;
    mesh.userData.basePositions = new Float32Array(mergedGeo.attributes.position.array);

    return mesh;
  },

  refreshActiveRegion() {
    if (!this.scene) return;
    const region = this.currentRegion;
    const newMesh = this.models[region];
    if (!newMesh) return;

    if (this.activeMesh && this.activeMesh !== newMesh) {
      this.scene.remove(this.activeMesh);
    }

    this.activeMesh = newMesh;
    this.scene.add(this.activeMesh);

    if (window.SkinShaderManager) {
      window.SkinShaderManager.applyToMesh(this.activeMesh);
    }
    if (window.DecalEngine) {
      window.DecalEngine.setTargetMesh(this.activeMesh);
      for (const layer of window.DecalEngine.layers) {
        window.DecalEngine.reprojectDecal(layer);
      }
    }
  },

  /**
   * Ultra-Realistic Sculpted Forearm & Hand
   */
  createSculptedForearmHand() {
    const radialSegs = 64;
    const heightSegs = 96;
    const totalLength = 5.2;

    const geometry = new THREE.CylinderGeometry(0.78, 0.35, totalLength, radialSegs, heightSegs, false);
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const normY = (v.y + totalLength / 2) / totalLength; // 0 = fingertips, 1 = elbow
      const angle = Math.atan2(v.z, v.x);
      let r = Math.sqrt(v.x * v.x + v.z * v.z);

      if (normY < 0.26) {
        // === HAND & FINGERS ===
        const handT = normY / 0.26;
        const palmFlatness = 0.22 + 0.35 * handT;
        const palmWidth = 1.65 + 0.45 * Math.sin(handT * Math.PI);
        
        v.x = Math.cos(angle) * r * palmWidth;
        v.z = Math.sin(angle) * r * palmFlatness;

        // Thenar eminence (thumb pad)
        if (v.x > 0.15 && handT > 0.45) {
          const thumbBulge = Math.sin((handT - 0.45) / 0.55 * Math.PI);
          v.x += 0.28 * thumbBulge;
          v.z += 0.18 * thumbBulge;
        }

        // Finger separations
        if (handT < 0.55) {
          const fingerWaves = Math.cos(v.x * 12.0) * 0.04 * (1.0 - handT);
          v.z += fingerWaves;
          v.z -= 0.15 * Math.sin((1.0 - handT) * Math.PI * 0.5);
        }

        // Knuckle prominent arch
        const knuckleDist = Math.abs(handT - 0.52);
        if (knuckleDist < 0.12) {
          v.z += 0.06 * Math.cos(knuckleDist / 0.12 * Math.PI * 0.5);
        }
      } else if (normY < 0.42) {
        // === WRIST JOINT ===
        const wristT = (normY - 0.26) / 0.16;
        v.x = Math.cos(angle) * r * (1.28 - 0.12 * wristT);
        v.z = Math.sin(angle) * r * (0.68 + 0.18 * wristT);

        // Styloid processes
        if (v.x > 0.2 && Math.abs(wristT - 0.3) < 0.25) {
          v.x += 0.09 * (1.0 - Math.abs(wristT - 0.3) / 0.25);
        }
        if (v.x < -0.2 && Math.abs(wristT - 0.18) < 0.22) {
          v.x -= 0.07 * (1.0 - Math.abs(wristT - 0.18) / 0.22);
        }
      } else {
        // === FOREARM MUSCULATURE & ELBOW ===
        const armT = (normY - 0.42) / 0.58;
        const muscleBelly = Math.sin(armT * Math.PI * 0.95);

        let lateralBulge = 1.0;
        if (v.x > 0 && v.z > 0) {
          lateralBulge += 0.48 * Math.pow(armT, 0.7) * Math.sin(armT * Math.PI);
        }

        let anteriorBulge = 1.0;
        if (v.z > 0) anteriorBulge += 0.38 * muscleBelly;

        let posteriorBulge = 1.0;
        if (v.z < 0) posteriorBulge += 0.28 * muscleBelly;

        if (armT > 0.82) {
          const elbowT = (armT - 0.82) / 0.18;
          if (v.z < 0 && Math.abs(v.x) < 0.35) {
            v.z -= 0.16 * Math.sin(elbowT * Math.PI * 0.5);
          }
          v.x *= (1.0 + 0.22 * elbowT);
        }

        v.x *= (1.08 + 0.32 * muscleBelly) * lateralBulge;
        v.z *= (0.88 + 0.30 * muscleBelly) * anteriorBulge * posteriorBulge;
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, this.createSkinMaterialPlaceholder());
    mesh.name = "Anatomy_Forearm_Sculpted";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.regionKey = 'forearm';
    mesh.userData.totalLength = totalLength;
    mesh.userData.basePositions = new Float32Array(pos.array);
    return mesh;
  },

  /**
   * Ultra-Realistic Sculpted Upper Arm & Shoulder
   */
  createSculptedUpperArm() {
    const radialSegs = 64;
    const heightSegs = 80;
    const length = 4.8;
    const geometry = new THREE.CylinderGeometry(0.95, 0.68, length, radialSegs, heightSegs, false);
    
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const normY = (v.y + length / 2) / length; // 0 = elbow, 1 = shoulder

      // Deltoid 3-head cap
      if (normY > 0.65) {
        const deltT = (normY - 0.65) / 0.35;
        const deltCurve = Math.sin(deltT * Math.PI * 0.9);
        if (v.x > 0) v.x += 0.42 * deltCurve;
        v.z *= (1.0 + 0.28 * deltCurve);
      }

      // Bicep Brachii anterior curve
      if (v.z > 0 && normY < 0.75) {
        v.z += 0.34 * Math.sin(normY * Math.PI * 1.1);
        if (Math.abs(v.x) < 0.15) v.z -= 0.03;
      }

      // Tricep horseshoe curve
      if (v.z < 0 && normY < 0.72) {
        v.z -= 0.32 * Math.sin(normY * Math.PI * 0.95);
      }

      // Brachialis lateral bulge
      if (v.x > 0.2 && Math.abs(v.z) < 0.4 && normY > 0.25 && normY < 0.55) {
        v.x += 0.12 * Math.sin((normY - 0.25) / 0.3 * Math.PI);
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, this.createSkinMaterialPlaceholder());
    mesh.name = "Anatomy_UpperArm_Sculpted";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.regionKey = 'upperarm';
    mesh.userData.totalLength = length;
    mesh.userData.basePositions = new Float32Array(pos.array);
    return mesh;
  },

  /**
   * Ultra-Realistic Sculpted Torso & Rib Cage
   */
  createSculptedTorsoRibs() {
    const radialSegs = 72;
    const heightSegs = 90;
    const length = 5.4;
    const geometry = new THREE.CylinderGeometry(1.65, 1.38, length, radialSegs, heightSegs, false);
    
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const normY = (v.y + length / 2) / length;

      v.x *= 1.48;
      v.z *= 0.96;

      // Pectoralis major chest bulge
      if (v.z > 0 && normY > 0.58) {
        const pecT = Math.sin((normY - 0.58) / 0.42 * Math.PI);
        v.z += 0.45 * pecT;
        const midlineDist = Math.abs(v.x);
        if (midlineDist < 0.35) {
          v.z -= 0.14 * (1.0 - midlineDist / 0.35);
        }
      }

      // Costal margin rib arch flare
      if (normY > 0.35 && normY < 0.65) {
        const ribArch = Math.sin((normY - 0.35) / 0.3 * Math.PI);
        v.x += 0.18 * ribArch;
        if (v.z > 0) v.z += 0.14 * ribArch;
      }

      // Latissimus dorsi side curves
      if (v.z < 0 && Math.abs(v.x) > 0.8 && normY > 0.45) {
        v.x += (v.x > 0 ? 0.22 : -0.22) * Math.sin(normY * Math.PI * 0.9);
      }

      // Spinal furrow
      if (v.z < 0 && Math.abs(v.x) < 0.35) {
        v.z += 0.12 * (1.0 - Math.abs(v.x) / 0.35);
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, this.createSkinMaterialPlaceholder());
    mesh.name = "Anatomy_Ribs_Sculpted";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.regionKey = 'ribs';
    mesh.userData.totalLength = length;
    mesh.userData.basePositions = new Float32Array(pos.array);
    return mesh;
  },

  /**
   * Ultra-Realistic Sculpted Thigh & Knee
   */
  createSculptedThighKnee() {
    const radialSegs = 64;
    const heightSegs = 80;
    const length = 5.2;
    const geometry = new THREE.CylinderGeometry(1.35, 0.78, length, radialSegs, heightSegs, false);
    
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const normY = (v.y + length / 2) / length;

      const quadT = Math.sin(normY * Math.PI * 0.9);
      if (v.z > 0) v.z += 0.42 * quadT;
      if (v.x > 0) v.x += 0.32 * quadT;

      if (v.x < 0 && v.z > 0 && normY > 0.18 && normY < 0.42) {
        const teardrop = Math.sin((normY - 0.18) / 0.24 * Math.PI);
        v.x -= 0.18 * teardrop;
        v.z += 0.14 * teardrop;
      }

      if (normY < 0.22 && v.z > 0 && Math.abs(v.x) < 0.35) {
        const patellaT = Math.sin(normY / 0.22 * Math.PI);
        v.z += 0.16 * patellaT;
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, this.createSkinMaterialPlaceholder());
    mesh.name = "Anatomy_Thigh_Sculpted";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.regionKey = 'thigh';
    mesh.userData.totalLength = length;
    mesh.userData.basePositions = new Float32Array(pos.array);
    return mesh;
  },

  /**
   * High-Precision Sculpted Full Human Body (Procedural Guaranteed Fallback)
   */
  createSculptedFullBody(gender = 'male') {
    const isFemale = (gender === 'female');
    const totalHeight = 6.2;
    const radialSegs = 64;
    const heightSegs = 128;

    // Sculpted human body envelope
    const geometry = new THREE.CylinderGeometry(0.4, 0.2, totalHeight, radialSegs, heightSegs, false);
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const normY = (v.y + totalHeight / 2) / totalHeight; // 0 = feet, 1 = crown of head
      const angle = Math.atan2(v.z, v.x);
      let r = Math.sqrt(v.x * v.x + v.z * v.z);

      if (normY > 0.88) {
        // === HEAD & FACE ===
        const headT = (normY - 0.88) / 0.12;
        v.x = Math.cos(angle) * 0.42 * (1.0 - 0.3 * Math.pow(headT - 0.5, 2));
        v.z = Math.sin(angle) * 0.52 * (1.0 - 0.2 * Math.pow(headT - 0.5, 2));
        // Nose / Brow profile
        if (v.z > 0 && headT > 0.35 && headT < 0.65) {
          v.z += 0.12 * Math.sin((headT - 0.35) / 0.3 * Math.PI);
        }
      } else if (normY > 0.82) {
        // === NECK ===
        v.x = Math.cos(angle) * 0.28;
        v.z = Math.sin(angle) * 0.30;
      } else if (normY > 0.50) {
        // === TORSO & CHEST ===
        const torsoT = (normY - 0.50) / 0.32;
        const shoulderWidth = isFemale ? 1.45 : 1.75;
        const waistWidth = isFemale ? 1.05 : 1.25;
        const chestDepth = isFemale ? 0.85 : 0.95;

        const width = THREE.MathUtils.lerp(waistWidth, shoulderWidth, torsoT);
        v.x = Math.cos(angle) * width * 0.72;
        v.z = Math.sin(angle) * chestDepth * 0.58;

        // Chest / Breasts or Pectorals
        if (v.z > 0 && torsoT > 0.45 && torsoT < 0.85) {
          const chestT = Math.sin((torsoT - 0.45) / 0.4 * Math.PI);
          v.z += (isFemale ? 0.38 : 0.24) * chestT;
        }
      } else if (normY > 0.44) {
        // === PELVIS & HIPS ===
        const hipWidth = isFemale ? 1.42 : 1.32;
        v.x = Math.cos(angle) * hipWidth * 0.75;
        v.z = Math.sin(angle) * 0.65;
        // Gluteal curves at back
        if (v.z < 0) v.z -= 0.18;
      } else {
        // === LEGS & FEET ===
        const legT = normY / 0.44; // 0 = feet, 1 = hip
        const legWidth = 0.55 + 0.35 * legT;
        // Separate legs into two pillars using angle modulation
        const sideSign = v.x >= 0 ? 1 : -1;
        const legCenterX = sideSign * (0.42 - 0.12 * legT);
        
        v.x = legCenterX + Math.cos(angle) * legWidth * 0.42;
        v.z = Math.sin(angle) * legWidth * 0.45;

        // Knee definition at normY ~ 0.24
        if (Math.abs(normY - 0.24) < 0.05 && v.z > 0) {
          v.z += 0.08;
        }
        // Calf belly at normY ~ 0.16
        if (Math.abs(normY - 0.16) < 0.06 && v.z < 0) {
          v.z -= 0.12;
        }
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, this.createSkinMaterialPlaceholder());
    mesh.name = isFemale ? "Anatomy_Female_FullBody" : "Anatomy_Male_FullBody";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.regionKey = isFemale ? 'female_full' : 'male_full';
    mesh.userData.totalLength = totalHeight;
    mesh.userData.basePositions = new Float32Array(pos.array);
    return mesh;
  },

  createSkinMaterialPlaceholder() {
    return new THREE.MeshPhysicalMaterial({
      color: 0xdfb094,
      roughness: 0.52,
      metalness: 0.0,
      clearcoat: 0.16,
      clearcoatRoughness: 0.38,
      side: THREE.FrontSide,
      morphTargets: true,
      morphNormals: true
    });
  },

  selectRegion(regionKey) {
    if (regionKey === 'fullbody') regionKey = 'male_full';

    if (this.activeMesh) {
      this.scene.remove(this.activeMesh);
    }

    this.currentRegion = regionKey;

    if (this.models[regionKey]) {
      this.activeMesh = this.models[regionKey];
      this.scene.add(this.activeMesh);

      // Re-apply current deformation state to newly selected mesh
      this.applyAnatomicalDeformation(this.activeMesh);
    }

    return this.activeMesh;
  },

  /**
   * Real-time anatomical limb twisting (pronation/supination) & joint bending (flexion)
   */
  setDeformation(index, value) {
    const val = THREE.MathUtils.clamp(value, 0.0, 1.0);
    if (index === 0) {
      this.deformationState.twist = val;
    } else if (index === 1) {
      this.deformationState.flex = val;
    }

    if (this.activeMesh) {
      this.applyAnatomicalDeformation(this.activeMesh);
    }
  },

  applyAnatomicalDeformation(mesh) {
    if (!mesh || !mesh.geometry || !mesh.userData.basePositions) return;

    const basePositions = mesh.userData.basePositions;
    const pos = mesh.geometry.attributes.position;
    const count = pos.count;
    const region = mesh.userData.regionKey || this.currentRegion;
    const totalLength = mesh.userData.totalLength || 5.2;

    const twist = this.deformationState.twist; // 0.0 to 1.0
    const flex = this.deformationState.flex;   // 0.0 to 1.0

    for (let i = 0; i < count; i++) {
      let x = basePositions[i * 3];
      let y = basePositions[i * 3 + 1];
      let z = basePositions[i * 3 + 2];

      const normY = (y + totalLength / 2) / totalLength;

      if (region === 'forearm') {
        // === FOREARM & HAND ===
        // 1. Pronation / Supination Twist (Wrist & Hand rotate around arm axis)
        if (twist > 0.001) {
          const twistFactor = Math.max(0, Math.min(1, (0.85 - normY) / 0.65));
          const twistAngle = twist * 1.55; // up to ~89 degrees
          const cosA = Math.cos(twistAngle * twistFactor);
          const sinA = Math.sin(twistAngle * twistFactor);
          const nx = x * cosA - z * sinA;
          const nz = x * sinA + z * cosA;
          x = nx;
          z = nz;
        }

        // 2. Wrist Joint Flexion & Muscle Contraction
        if (flex > 0.001) {
          if (normY < 0.28) {
            // Wrist joint hinge bending
            const wristPivotY = -totalLength / 2 + 0.28 * totalLength;
            const dy = y - wristPivotY;
            const wristAngle = flex * 0.85; // up to ~49 degrees
            const cosW = Math.cos(wristAngle);
            const sinW = Math.sin(wristAngle);
            const ny = wristPivotY + dy * cosW - z * sinW;
            const nz = dy * sinW + z * cosW;
            y = ny;
            z = nz;
          } else {
            // Forearm flexor muscular pump / contraction
            const armT = Math.max(0, Math.min(1, (normY - 0.28) / 0.72));
            if (z > 0) {
              z += flex * 0.32 * Math.sin(armT * Math.PI);
            }
            x *= (1.0 + flex * 0.12 * Math.sin(armT * Math.PI));
          }
        }

      } else if (region === 'upperarm') {
        // === UPPER ARM & SHOULDER ===
        // 1. Humeral Rotation Twist
        if (twist > 0.001) {
          const angle = twist * 0.95;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const nx = x * cosA - z * sinA;
          const nz = x * sinA + z * cosA;
          x = nx;
          z = nz;
        }

        // 2. Elbow Flexion & Bicep Peak Contraction
        if (flex > 0.001) {
          if (normY < 0.25) {
            // Distal elbow hinge bend
            const pivotY = -totalLength / 2 + 0.25 * totalLength;
            const dy = y - pivotY;
            const elbowAngle = flex * 1.15; // up to ~65 degrees
            const cosE = Math.cos(elbowAngle);
            const sinE = Math.sin(elbowAngle);
            y = pivotY + dy * cosE - z * sinE;
            z = dy * sinE + z * cosE;
          } else {
            // Dramatic bicep contraction peak
            if (z > 0 && normY > 0.25 && normY < 0.75) {
              const peakT = Math.sin((normY - 0.25) / 0.5 * Math.PI);
              z += flex * 0.48 * Math.pow(peakT, 1.2);
              x *= (1.0 + flex * 0.18 * peakT);
            }
          }
        }

      } else if (region === 'thigh') {
        // === THIGH & KNEE ===
        // 1. Hip / Femoral Rotation Twist
        if (twist > 0.001) {
          const angle = twist * 0.75;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const nx = x * cosA - z * sinA;
          const nz = x * sinA + z * cosA;
          x = nx;
          z = nz;
        }

        // 2. Knee Flexion (bending lower knee backwards) & Quad Flex
        if (flex > 0.001) {
          if (normY < 0.22) {
            // Knee hinge backwards bend
            const kneePivotY = -totalLength / 2 + 0.22 * totalLength;
            const dy = y - kneePivotY;
            const kneeAngle = -flex * 1.1; // bend backwards
            const cosK = Math.cos(kneeAngle);
            const sinK = Math.sin(kneeAngle);
            y = kneePivotY + dy * cosK - z * sinK;
            z = dy * sinK + z * cosK;
          } else {
            // Quad flex
            const quadT = Math.sin(normY * Math.PI);
            if (z > 0) z += flex * 0.38 * quadT;
          }
        }

      } else if (region === 'ribs') {
        // === TORSO & RIBS ===
        // 1. Torso Axial Twist
        if (twist > 0.001) {
          const torsoT = Math.max(0, (normY - 0.2) / 0.8);
          const angle = twist * 0.65 * torsoT;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const nx = x * cosA - z * sinA;
          const nz = x * sinA + z * cosA;
          x = nx;
          z = nz;
        }

        // 2. Deep Respiratory Inhale Rib Expansion
        if (flex > 0.001) {
          const ribT = Math.sin(normY * Math.PI * 0.9);
          x *= (1.0 + flex * 0.18 * ribT);
          z *= (1.0 + flex * 0.26 * ribT);
        }

      } else if (region === 'male_full' || region === 'female_full') {
        // === FULL BODY ===
        // 1. Upper Body Torso Twist
        if (twist > 0.001 && normY > 0.45) {
          const twistT = (normY - 0.45) / 0.55;
          const angle = twist * 0.70 * twistT;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const nx = x * cosA - z * sinA;
          const nz = x * sinA + z * cosA;
          x = nx;
          z = nz;
        }

        // 2. Chest Expansion & Postural Flex
        if (flex > 0.001) {
          if (normY > 0.50 && normY < 0.85) {
            const chestT = Math.sin((normY - 0.50) / 0.35 * Math.PI);
            if (z > 0) z += flex * 0.25 * chestT;
            x *= (1.0 + flex * 0.12 * chestT);
          }
        }
      }

      pos.setXYZ(i, x, y, z);
    }

    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.normalsNeedUpdate = true;

    // Reproject any existing decals to perfectly adhere to the deformed geometry
    if (window.DecalEngine && window.DecalEngine.layers && window.DecalEngine.layers.length > 0) {
      for (const layer of window.DecalEngine.layers) {
        window.DecalEngine.reprojectDecal(layer);
      }
    }
  },

  loadCustomScan(file, onLoadCallback, onErrorCallback) {
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    if (fileName.endsWith('.obj')) {
      reader.onload = (e) => {
        try {
          const loader = new THREE.OBJLoader();
          const obj = loader.parse(e.target.result);
          const unifiedMesh = this.createUnifiedMeshFromScan(obj, "Custom_Scan_" + file.name, 'custom');
          if (unifiedMesh) {
            if (this.activeMesh) this.scene.remove(this.activeMesh);
            this.activeMesh = unifiedMesh;
            this.scene.add(this.activeMesh);
            if (onLoadCallback) onLoadCallback(unifiedMesh);
          }
        } catch (err) {
          if (onErrorCallback) onErrorCallback(err);
        }
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.gltf') || fileName.endsWith('.glb')) {
      reader.onload = (e) => {
        try {
          const loader = new THREE.GLTFLoader();
          loader.parse(e.target.result, '', (gltf) => {
            const unifiedMesh = this.createUnifiedMeshFromScan(gltf.scene, "Custom_Scan_" + file.name, 'custom');
            if (unifiedMesh) {
              if (this.activeMesh) this.scene.remove(this.activeMesh);
              this.activeMesh = unifiedMesh;
              this.scene.add(this.activeMesh);
              if (onLoadCallback) onLoadCallback(unifiedMesh);
            }
          }, onErrorCallback);
        } catch (err) {
          if (onErrorCallback) onErrorCallback(err);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }
};

window.AnatomyEngine = AnatomyEngine;
