import base64
import io

from fastapi.testclient import TestClient
from PIL import Image

from tattooforge.server.app import app

client = TestClient(app)


def test_health_check():
    """Verify backend health check endpoint returns 200 and feature capabilities."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "capabilities" in data
    assert "3d_anatomical_models" in data["capabilities"]


def test_serve_index_and_static():
    """Verify index.html and static 3D studio scripts are served successfully."""
    index_res = client.get("/")
    assert index_res.status_code == 200
    assert "TattooForge" in index_res.text
    assert "webgl-canvas" in index_res.text

    js_res = client.get("/static/js/app.js")
    assert js_res.status_code == 200
    assert "TattooForgeApp" in js_res.text


def test_network_info():
    """Verify studio LAN discovery endpoint provides valid IPs and studio URL."""
    response = client.get("/api/network/info")
    assert response.status_code == 200
    data = response.json()
    assert "primary_ip" in data
    assert "studio_url" in data
    assert "http://" in data["studio_url"]


def test_stencil_process_endpoint():
    """Verify image upload extracts transparent decal and printable stencil."""
    img = Image.new("RGB", (100, 100), (255, 255, 255))
    pixels = img.load()
    for i in range(30, 70):
        pixels[i, 50] = (20, 20, 20)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/api/stencil/process",
        files={"file": ("artwork.png", buf, "image/png")},
        data={
            "remove_bg": True,
            "bg_threshold": 240,
            "line_weight": 2,
            "threshold_sensitivity": 128,
            "stencil_color_hex": "#3A235D",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["width"] == 100
    assert data["height"] == 100
    assert "artwork_transparent_url" in data
    assert "stencil_decal_url" in data
    assert "thermal_printable_url" in data
    assert data["artwork_transparent_url"].startswith("data:image/png;base64,")


def test_stencil_process_json_endpoint():
    """Verify base64 JSON payload extracts transparent decal and printable stencil."""
    img = Image.new("RGB", (80, 80), (255, 255, 255))
    pixels = img.load()
    for i in range(20, 60):
        pixels[i, 40] = (15, 15, 15)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_str = (
        f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"
    )

    response = client.post(
        "/api/stencil/process-json",
        json={
            "image_data_uri": b64_str,
            "remove_bg": True,
            "bg_threshold": 240,
            "line_weight": 2,
            "threshold_sensitivity": 128,
            "stencil_color_hex": "#3A235D",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["width"] == 80
    assert data["height"] == 80
    assert "artwork_transparent_url" in data
    assert "stencil_decal_url" in data
    assert "thermal_printable_url" in data


def test_curvature_analyze_endpoint():
    """Verify B-spline differential geometry calculation via API."""
    payload = {
        "u": 0.5,
        "v": 0.5,
        "control_z": [
            [1.0, 1.0, 1.0],
            [1.0, 2.0, 1.0],
            [1.0, 1.0, 1.0],
        ],
        "degree": 2,
    }
    response = client.post("/api/curvature/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "gaussian_curvature_K" in data
    assert "mean_curvature_H" in data
    assert "normal" in data
    assert len(data["normal"]) == 3
