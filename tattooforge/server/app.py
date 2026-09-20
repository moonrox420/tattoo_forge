import base64
import io
import socket
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

from tattooforge.spline.surface import evaluate_surface_point_and_derivatives
from tattooforge.stencil.extractor import (
    extract_thermal_stencil,
    generate_curvature_compensated_stencil,
    remove_background_luminance,
)
from tattooforge.utils.knots import create_open_uniform_knots

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI(
    title="TattooForge Pro Workstation API",
    description="Professional 3D Visualization, Stencil Preparation, and Curvature Analysis Engine for Tattoo Artists",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _image_to_data_uri(img: Image.Image, format: str = "PNG") -> str:
    """Helper to convert PIL Image to base64 Data URI."""
    buf = io.BytesIO()
    img.save(buf, format=format)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    mime = "image/png" if format.upper() == "PNG" else "image/jpeg"
    return f"data:{mime};base64,{encoded}"


def _get_local_ip_addresses() -> list[str]:
    """Discover active local IPv4 addresses for studio LAN pairing."""
    ips = []
    try:
        # Standard socket connect trick to find preferred outbound IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        ips.append(primary_ip)
    except OSError:
        pass

    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
    except OSError:
        pass

    if not ips:
        ips.append("127.0.0.1")
    return ips


@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "engine": "TattooForge Pro 3D Workstation",
        "version": "2.0.0",
        "capabilities": [
            "3d_anatomical_models",
            "pbr_fitzpatrick_skin",
            "decal_projection",
            "360_sleeve_wrap",
            "thermal_stencil_extraction",
            "curvature_strain_analysis",
            "muscle_flex_deformation",
            "local_wifi_sharing",
        ],
    }


@app.get("/api/network/info")
async def network_info():
    """Returns local network endpoints for iPad and mobile client synchronization."""
    ips = _get_local_ip_addresses()
    primary_ip = ips[0] if ips else "127.0.0.1"
    port = 8000
    studio_url = f"http://{primary_ip}:{port}"
    return {
        "hostname": socket.gethostname(),
        "primary_ip": primary_ip,
        "all_ips": ips,
        "port": port,
        "studio_url": studio_url,
    }


class ProcessStencilJSONRequest(BaseModel):
    image_data_uri: str
    remove_bg: bool = True
    bg_threshold: int = 240
    line_weight: int = 2
    threshold_sensitivity: int = 128
    stencil_color_hex: str = "#3A235D"


def _process_image_core(
    image: Image.Image,
    filename: str,
    remove_bg: bool,
    bg_threshold: int,
    line_weight: int,
    threshold_sensitivity: int,
    stencil_color_hex: str,
) -> dict:
    orig_width, orig_height = image.size

    # 1. Clean transparent artwork for 3D decal
    if remove_bg:
        transparent_img = remove_background_luminance(image, threshold=bg_threshold)
    else:
        transparent_img = image.convert("RGBA")

    # 2. Extract thermal line stencil
    hex_clean = stencil_color_hex.lstrip("#")
    try:
        r = int(hex_clean[0:2], 16)
        g = int(hex_clean[2:4], 16)
        b = int(hex_clean[4:6], 16)
        stencil_rgb = (r, g, b)
    except (ValueError, IndexError):
        stencil_rgb = (58, 35, 93)

    stencil_trans, stencil_print = extract_thermal_stencil(
        transparent_img,
        line_weight=line_weight,
        threshold_sensitivity=threshold_sensitivity,
        stencil_color=stencil_rgb,
    )

    return {
        "width": orig_width,
        "height": orig_height,
        "filename": filename,
        "artwork_transparent_url": _image_to_data_uri(transparent_img),
        "stencil_decal_url": _image_to_data_uri(stencil_trans),
        "thermal_printable_url": _image_to_data_uri(stencil_print),
    }


@app.post("/api/stencil/process-json")
async def process_stencil_json(payload: ProcessStencilJSONRequest):
    """Processes tattoo artwork passed as a base64 Data URI."""
    try:
        _header, encoded = payload.image_data_uri.split(",", 1)
        data = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(data))
    except (ValueError, OSError, TypeError) as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to decode base64 image: {e!s}"
        )

    return _process_image_core(
        image=image,
        filename="artwork.png",
        remove_bg=payload.remove_bg,
        bg_threshold=payload.bg_threshold,
        line_weight=payload.line_weight,
        threshold_sensitivity=payload.threshold_sensitivity,
        stencil_color_hex=payload.stencil_color_hex,
    )


@app.post("/api/stencil/process")
async def process_stencil(
    file: Annotated[UploadFile, File(...)],
    remove_bg: Annotated[bool, Form()] = True,
    bg_threshold: Annotated[int, Form()] = 240,
    line_weight: Annotated[int, Form()] = 2,
    threshold_sensitivity: Annotated[int, Form()] = 128,
    stencil_color_hex: Annotated[str, Form()] = "#3A235D",
):
    """
    Ingests artist artwork file via multipart/form-data, eliminates solid paper background,
    and extracts crisp line-art stencil for thermal printers and 3D decal projection.
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
    except (ValueError, OSError, TypeError) as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to decode image file: {e!s}"
        )

    return _process_image_core(
        image=image,
        filename=file.filename or "artwork.png",
        remove_bg=remove_bg,
        bg_threshold=bg_threshold,
        line_weight=line_weight,
        threshold_sensitivity=threshold_sensitivity,
        stencil_color_hex=stencil_color_hex,
    )


class CompensateRequest(BaseModel):
    image_data_uri: str
    cylinder_radius_cm: float = 4.5
    arc_span_degrees: float = 120.0


@app.post("/api/stencil/compensate")
async def compensate_stencil(payload: CompensateRequest):
    """Generates curvature-compensated 2D stencil for printing onto transfer paper."""
    try:
        _header, encoded = payload.image_data_uri.split(",", 1)
        data = base64.b64decode(encoded)
        img = Image.open(io.BytesIO(data))
    except (ValueError, OSError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid data URI payload: {e!s}")

    compensated = generate_curvature_compensated_stencil(
        img,
        cylinder_radius_cm=payload.cylinder_radius_cm,
        arc_span_degrees=payload.arc_span_degrees,
    )
    return {
        "compensated_url": _image_to_data_uri(compensated),
        "cylinder_radius_cm": payload.cylinder_radius_cm,
        "arc_span_degrees": payload.arc_span_degrees,
    }


class CurvatureAnalyzeRequest(BaseModel):
    u: float
    v: float
    control_z: list[list[float]]
    degree: int = 2


@app.post("/api/curvature/analyze")
async def analyze_curvature(payload: CurvatureAnalyzeRequest):
    """Calculates Gaussian and Mean curvature for anatomical deformation."""
    import numpy as np

    ctrl_z = np.array(payload.control_z, dtype=np.float64)
    cols = ctrl_z.shape[0]
    knots = create_open_uniform_knots(cols, payload.degree)
    metrics = evaluate_surface_point_and_derivatives(
        payload.u, payload.v, ctrl_z, payload.degree, knots
    )
    return {
        "pos": metrics["pos"].tolist(),
        "normal": metrics["normal"].tolist(),
        "gaussian_curvature_K": float(metrics["K"]),
        "mean_curvature_H": float(metrics["H"]),
        "principal_curvature_k1": float(metrics["k1"]),
        "principal_curvature_k2": float(metrics["k2"]),
    }


# Static files mount
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        return HTMLResponse(
            "<h1>TattooForge Pro</h1><p>Initializing workstation interface...</p>"
        )
    return FileResponse(index_file)
