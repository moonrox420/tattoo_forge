/**
 * TattooForge Pro — 3D Decal Projection, Wrapping & Layering Engine
 * Manages raycast surface placement, normal-oriented DecalGeometry projection,
 * depth clipping (no bleed-through), ink blending modes, and freehand surgical markers.
 */

const DecalEngine = {
  scene: null,
  camera: null,
  targetMesh: null,
  textureLoader: new THREE.TextureLoader(),

  layers: [],
  activeLayerId: null,
  currentMode: 'view', // 'view', 'place', 'marker'

  // Marker strokes
  markerStrokes: [],
  isDrawingMarker: false,

  init(scene, camera) {
    this.scene = scene;
    this.camera = camera;
  },

  setTargetMesh(mesh) {
    this.targetMesh = mesh;
  },

  /**
   * Add a new tattoo design layer
   */
  addLayer(name, textureUrl, isThermalStencil = false) {
    const id = 'layer_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const texture = this.textureLoader.load(textureUrl);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const layer = {
      id: id,
      name: name || 'Tattoo ' + (this.layers.length + 1),
      textureUrl: textureUrl,
      texture: texture,
      isThermalStencil: isThermalStencil,
      mesh: null,
      position: new THREE.Vector3(0, 0, 1.0),
      normal: new THREE.Vector3(0, 0, 1),
      rotationAngle: 0, // radians
      scale: 1.4, // overall scale
      aspectRatio: 1.0,
      opacity: 0.92,
      blendMode: 'multiply', // 'multiply', 'normal'
      visible: true,
      mirrorX: false,
    };

    // Determine image aspect ratio once texture loads
    const img = new Image();
    img.onload = () => {
      if (img.width && img.height) {
        layer.aspectRatio = img.width / img.height;
        if (layer.mesh) {
          this.reprojectDecal(layer);
        }
      }
    };
    img.src = textureUrl;

    this.layers.push(layer);
    this.activeLayerId = id;
    return layer;
  },

  getActiveLayer() {
    return this.layers.find(l => l.id === this.activeLayerId);
  },

  setActiveLayer(id) {
    this.activeLayerId = id;
  },

  removeLayer(id) {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx !== -1) {
      const layer = this.layers[idx];
      if (layer.mesh) {
        if (layer.mesh.parent) {
          layer.mesh.parent.remove(layer.mesh);
        } else {
          this.scene.remove(layer.mesh);
        }
        if (layer.mesh.geometry) layer.mesh.geometry.dispose();
      }
      this.layers.splice(idx, 1);
      if (this.activeLayerId === id) {
        this.activeLayerId = this.layers.length > 0 ? this.layers[this.layers.length - 1].id : null;
      }
    }
  },

  /**
   * Raycast from mouse coordinates onto target anatomical mesh
   */
  raycastPlacement(mouseCoords) {
    if (!this.targetMesh) return null;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseCoords, this.camera);

    const intersects = [];
    this.targetMesh.raycast(raycaster, intersects);

    // If targetMesh is a group, test all child meshes
    if (intersects.length === 0 && this.targetMesh.children) {
      this.targetMesh.traverse((child) => {
        if (child.isMesh && !child.name.startsWith("Decal_") && !child.name.startsWith("Marker_")) {
          child.raycast(raycaster, intersects);
        }
      });
    }

    if (intersects.length > 0) {
      // Find first intersection with positive hit
      const hit = intersects[0];
      return {
        point: hit.point,
        normal: hit.face ? hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize() : new THREE.Vector3(0, 0, 1),
        hitObject: hit.object
      };
    }
    return null;
  },

  /**
   * Project or re-project the decal onto the mesh surface
   */
  projectDecalAt(layer, point, normal, hitMesh) {
    let meshToProject = hitMesh || layer.targetMesh || this.targetMesh;
    if (!meshToProject) return;

    // If target is a Group or Object3D without its own geometry, find the child mesh
    if (!meshToProject.geometry && meshToProject.children) {
      meshToProject.traverse((child) => {
        if (child.isMesh && child.geometry && (!meshToProject.geometry || !meshToProject.isMesh)) {
          meshToProject = child;
        }
      });
    }

    if (!meshToProject || !meshToProject.geometry) return;

    meshToProject.updateMatrixWorld(true);
    const invMatrix = meshToProject.matrixWorld.clone().invert();

    layer.targetMesh = meshToProject;
    layer.position.copy(point);
    layer.normal.copy(normal);

    // Store local placement coordinates so reprojection remains locked to the surface
    layer.localPoint = point.clone().applyMatrix4(invMatrix);
    layer.localNormal = normal.clone().transformDirection(invMatrix).normalize();

    // Orientation: align with surface normal, then apply in-plane rotation
    const orientation = new THREE.Euler();
    const up = new THREE.Vector3(0, 1, 0);
    const rotationMatrix = new THREE.Matrix4();

    // Look along normal
    const eye = point.clone().add(normal);
    rotationMatrix.lookAt(eye, point, up);
    orientation.setFromRotationMatrix(rotationMatrix);
    orientation.z += layer.rotationAngle;

    // Projection dimensions: width, height, and deep adaptive projection depth.
    // Deep projection depth allows the decal to wrap smoothly around curved surfaces
    // (cylinders, forearms, biceps, ribs) without being sliced by a shallow bounding box,
    // while DecalGeometry's normal-cutoff (-0.08) eliminates backside bleed-through!
    const maxDim = Math.max(Math.abs(layer.scale * (layer.aspectRatio || 1.0)), Math.abs(layer.scale));
    const projectionDepth = Math.max(5.0, maxDim * 3.0);
    const size = new THREE.Vector3(
      Math.abs(layer.scale * (layer.aspectRatio || 1.0)),
      Math.abs(layer.scale),
      projectionDepth
    );

    if (layer.mirrorX) {
      size.x = -size.x;
    }

    // Safely generate clipped DecalGeometry with normal-guided surface curvature
    try {
      const decalGeometry = new THREE.DecalGeometry(meshToProject, point, orientation, size, -0.08);
      const material = this.createDecalMaterial(layer);

      if (layer.mesh) {
        if (layer.mesh.parent) {
          layer.mesh.parent.remove(layer.mesh);
        } else {
          this.scene.remove(layer.mesh);
        }
        if (layer.mesh.geometry) layer.mesh.geometry.dispose();
      }

      // Transform DecalGeometry by inverse world matrix so it resides in meshToProject's local space
      decalGeometry.applyMatrix4(invMatrix);

      layer.mesh = new THREE.Mesh(decalGeometry, material);
      layer.mesh.name = "Decal_" + layer.id;
      layer.mesh.renderOrder = 10;

      // Parent directly to targetMesh so spinning/moving/rotating the body keeps the decal glued!
      meshToProject.add(layer.mesh);
    } catch (err) {
      console.warn("Notice: DecalGeometry projection clipped or outside mesh boundary:", err);
    }
  },

  reprojectDecal(layer) {
    if (!layer) return;
    const mesh = layer.targetMesh || this.targetMesh;
    if (!mesh) return;

    mesh.updateMatrixWorld(true);

    if (layer.localPoint && layer.localNormal) {
      const worldPoint = layer.localPoint.clone().applyMatrix4(mesh.matrixWorld);
      const worldNormal = layer.localNormal.clone().transformDirection(mesh.matrixWorld).normalize();
      this.projectDecalAt(layer, worldPoint, worldNormal, mesh);
    } else if (layer.position && layer.normal) {
      this.projectDecalAt(layer, layer.position, layer.normal, mesh);
    }
  },

  createDecalMaterial(layer) {
    const isMultiply = layer.blendMode === 'multiply';
    
    return new THREE.MeshPhysicalMaterial({
      map: layer.texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      roughness: 0.5,
      metalness: 0.0,
      opacity: layer.opacity,
      blending: isMultiply ? THREE.MultiplyBlending : THREE.NormalBlending,
      side: THREE.DoubleSide
    });
  },

  updateLayerTransform(id, updates) {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    if (updates.scale !== undefined) layer.scale = updates.scale;
    if (updates.rotationAngle !== undefined) layer.rotationAngle = updates.rotationAngle;
    if (updates.opacity !== undefined) {
      layer.opacity = updates.opacity;
      if (layer.mesh && layer.mesh.material) {
        layer.mesh.material.opacity = layer.opacity;
        layer.mesh.material.needsUpdate = true;
      }
    }
    if (updates.blendMode !== undefined) {
      layer.blendMode = updates.blendMode;
      if (layer.mesh && layer.mesh.material) {
        layer.mesh.material.blending = layer.blendMode === 'multiply' ? THREE.MultiplyBlending : THREE.NormalBlending;
        layer.mesh.material.needsUpdate = true;
      }
    }
    if (updates.mirrorX !== undefined) layer.mirrorX = updates.mirrorX;
    if (updates.visible !== undefined) {
      layer.visible = updates.visible;
      if (layer.mesh) layer.mesh.visible = layer.visible;
    }

    // Reproject geometry if size/rotation/mirror changed
    if (updates.scale !== undefined || updates.rotationAngle !== undefined || updates.mirrorX !== undefined) {
      this.reprojectDecal(layer);
    }
  },

  /**
   * Freehand 3D Surgical Marker Pen
   */
  startMarkerStroke(point, normal) {
    this.isDrawingMarker = true;
    this.addMarkerPoint(point, normal);
  },

  addMarkerPoint(point, normal) {
    if (!this.isDrawingMarker || !point) return;

    const parentMesh = this.targetMesh;
    if (!parentMesh) return;

    // Add small purple ink dot adhering to surface in local coordinates
    const dotGeo = new THREE.SphereGeometry(0.024, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0x6a0dad, // Gentian violet / surgical marker ink
      depthTest: true,
      depthWrite: false
    });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.name = "Marker_Dot";

    parentMesh.updateMatrixWorld(true);
    const localPos = point.clone().addScaledVector(normal, 0.005);
    parentMesh.worldToLocal(localPos);
    dot.position.copy(localPos);

    parentMesh.add(dot);
    this.markerStrokes.push(dot);
  },

  endMarkerStroke() {
    this.isDrawingMarker = false;
  },

  clearMarkerStrokes() {
    for (const stroke of this.markerStrokes) {
      if (stroke.parent) {
        stroke.parent.remove(stroke);
      } else {
        this.scene.remove(stroke);
      }
      if (stroke.geometry) stroke.geometry.dispose();
      if (stroke.material) stroke.material.dispose();
    }
    this.markerStrokes = [];
  }
};

window.DecalEngine = DecalEngine;
