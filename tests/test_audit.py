import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from tattooforge.server.app import app
from tattooforge.spline.surface import evaluate_surface_point_and_derivatives
from tattooforge.stencil.extractor import (
    generate_curvature_compensated_stencil,
)
from tattooforge.utils.knots import create_open_uniform_knots

client = TestClient(app)


def test_audit_static_assets_completeness():
    """Verify all critical static assets are present and deliverable."""
    critical_assets = [
        "/static/index.html",
        "/static/css/studio.css",
        "/static/js/three.min.js",
        "/static/js/OrbitControls.js",
        "/static/js/DecalGeometry.js",
        "/static/js/OBJLoader.js",
        "/static/js/GLTFLoader.js",
        "/static/js/qrcode.min.js",
        "/static/js/anatomy_models.js",
        "/static/js/skin_shader.js",
        "/static/js/skin_color_wheel.js",
        "/static/js/decal_engine.js",
        "/static/js/curvature_heatmap.js",
        "/static/js/app.js",
        "/static/textures/skin_normal.png",
        "/static/textures/skin_roughness.png",
        "/static/textures/skin_albedo.png",
        "/static/textures/skin_ao.png",
        "/static/textures/samples/dagger_rose.png",
        "/static/textures/samples/sacred_mandala.png",
        "/static/textures/samples/fine_line_snake.png",
        "/static/models/male02.obj",
        "/static/models/female02.obj",
    ]

    for asset_path in critical_assets:
        res = client.get(asset_path)
        assert res.status_code == 200, f"Failed to serve asset: {asset_path}"
        assert (
            len(res.content) > 50
        ), f"Asset {asset_path} is suspiciously small: {len(res.content)} bytes"


def test_audit_invalid_image_error_handling():
    """Verify server rejects corrupt or non-image uploads with 400 Bad Request."""
    corrupt_bytes = b"This is clearly not a valid image payload"

    response = client.post(
        "/api/stencil/process",
        files={"file": ("fake.png", corrupt_bytes, "image/png")},
    )
    assert response.status_code == 400
    assert "Failed to decode image file" in response.json()["detail"]


def test_audit_invalid_json_base64_error_handling():
    """Verify server rejects corrupt base64 string payloads with 400 Bad Request."""
    response = client.post(
        "/api/stencil/process-json",
        json={"image_data_uri": "data:image/png;base64,invalid_base64_data"},
    )
    assert response.status_code == 400
    assert "Failed to decode base64 image" in response.json()["detail"]


def test_audit_extreme_curvature_compensation():
    """Verify compensation algorithm remains stable under extreme boundary angles."""
    img = Image.new("RGBA", (100, 100), (0, 0, 0, 255))
    # Test boundary span 10 degrees (almost flat) and 170 degrees (extreme cylinder)
    comp_flat = generate_curvature_compensated_stencil(
        img, cylinder_radius_cm=10.0, arc_span_degrees=10.0
    )
    comp_extreme = generate_curvature_compensated_stencil(
        img, cylinder_radius_cm=2.0, arc_span_degrees=170.0
    )

    assert comp_flat.size == (100, 100)
    assert comp_extreme.size == (100, 100)


def test_audit_bspline_boundary_and_degeneracy():
    """Verify B-spline math engine handles evaluation boundaries (0.0, 1.0) and clamped grids."""
    cols = 4
    degree = 2
    knots = create_open_uniform_knots(cols, degree)
    ctrl_z = np.ones((cols, cols)) * 3.0

    # Corners of the parametric space
    corners = [(0.0, 0.0), (1.0, 0.0), (0.0, 1.0), (1.0, 1.0)]
    for u, v in corners:
        metrics = evaluate_surface_point_and_derivatives(u, v, ctrl_z, degree, knots)
        assert np.isclose(np.linalg.norm(metrics["normal"]), 1.0, atol=1e-5)
        assert np.isfinite(metrics["K"])
        assert np.isfinite(metrics["H"])
