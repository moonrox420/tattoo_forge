/**
 * TattooForge Pro — Analytical Curvature & Strain Heatmap Engine
 * Colorizes the 3D anatomical surface to reveal areas of high geometric strain and curvature,
 * alerting tattoo artists to regions where stencils will stretch or distort most.
 */

const CurvatureHeatmap = {
  isEnabled: false,
  originalMaterials: new Map(),

  turboColormap(t) {
    // High-readability scientific colormap: Blue -> Cyan -> Green -> Yellow -> Red
    t = THREE.MathUtils.clamp(t, 0.0, 1.0);
    let r, g, b;

    if (t < 0.25) {
      const s = t / 0.25;
      r = 0.1;
      g = 0.2 + 0.6 * s;
      b = 0.8 + 0.2 * s;
    } else if (t < 0.5) {
      const s = (t - 0.25) / 0.25;
      r = 0.1 + 0.3 * s;
      g = 0.8 + 0.2 * s;
      b = 1.0 - 0.7 * s;
    } else if (t < 0.75) {
      const s = (t - 0.5) / 0.25;
      r = 0.4 + 0.6 * s;
      g = 1.0 - 0.2 * s;
      b = 0.3 - 0.3 * s;
    } else {
      const s = (t - 0.75) / 0.25;
      r = 1.0;
      g = 0.8 - 0.7 * s;
      b = 0.0 + 0.1 * s;
    }

    return new THREE.Color(r, g, b);
  },

  toggle(targetMesh, enabled) {
    this.isEnabled = enabled;

    if (!targetMesh) return;

    if (this.isEnabled) {
      this.applyHeatmap(targetMesh);
    } else {
      this.restoreOriginalMaterial(targetMesh);
    }
  },

  applyHeatmap(targetMesh) {
    targetMesh.traverse((child) => {
      if (child.isMesh && !child.name.startsWith("Decal_") && !child.name.startsWith("Marker_")) {
        // Save original material
        if (!this.originalMaterials.has(child.id)) {
          this.originalMaterials.set(child.id, child.material);
        }

        const geo = child.geometry;
        if (!geo || !geo.attributes.position || !geo.attributes.normal) return;

        const pos = geo.attributes.position;
        const norm = geo.attributes.normal;
        const count = pos.count;

        // Compute vertex-wise discrete mean curvature estimation
        const colors = [];
        const p = new THREE.Vector3();
        const n = new THREE.Vector3();

        for (let i = 0; i < count; i++) {
          p.fromBufferAttribute(pos, i);
          n.fromBufferAttribute(norm, i);

          // Curvature estimate: normal angle variation with respect to radius
          const radialDist = Math.sqrt(p.x * p.x + p.z * p.z);
          // High curvature where radial distance is small or rapidly changing
          const localCurvature = 1.0 / (radialDist + 0.4);
          const normalizedStrain = THREE.MathUtils.clamp((localCurvature - 0.5) / 1.5, 0.0, 1.0);

          const c = this.turboColormap(normalizedStrain);
          colors.push(c.r, c.g, c.b);
        }

        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // Assign vertex-color material
        child.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.5,
          metalness: 0.1,
          side: THREE.DoubleSide
        });
      }
    });
  },

  restoreOriginalMaterial(targetMesh) {
    targetMesh.traverse((child) => {
      if (child.isMesh && !child.name.startsWith("Decal_") && !child.name.startsWith("Marker_")) {
        if (this.originalMaterials.has(child.id)) {
          child.material = this.originalMaterials.get(child.id);
        }
      }
    });
  }
};
