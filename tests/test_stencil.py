import numpy as np
from PIL import Image

from tattooforge.stencil.extractor import (
    extract_thermal_stencil,
    generate_curvature_compensated_stencil,
    remove_background_luminance,
)


def test_remove_background_luminance():
    """Verify white background is made transparent while dark lines remain opaque."""
    # Create 100x100 white image with a solid black square in the middle
    img = Image.new("RGB", (100, 100), (255, 255, 255))
    pixels = img.load()
    for x in range(40, 60):
        for y in range(40, 60):
            pixels[x, y] = (0, 0, 0)

    transparent_img = remove_background_luminance(img, threshold=240, softness=10)
    arr = np.array(transparent_img)

    # Background corners should have 0 alpha (fully transparent)
    assert arr[0, 0, 3] == 0
    assert arr[99, 99, 3] == 0

    # Center black square should have ~255 alpha (fully opaque)
    assert arr[50, 50, 3] == 255
    assert arr[50, 50, 0] == 0


def test_extract_thermal_stencil():
    """Verify thermal stencil extraction yields both transparent decal and printable image."""
    img = Image.new("RGB", (120, 120), (255, 255, 255))
    pixels = img.load()
    # Draw a black diagonal cross
    for i in range(20, 100):
        pixels[i, i] = (10, 10, 10)
        pixels[i, 119 - i] = (10, 10, 10)

    stencil_trans, stencil_print = extract_thermal_stencil(
        img, line_weight=2, threshold_sensitivity=130, stencil_color=(58, 35, 93)
    )

    assert stencil_trans.mode == "RGBA"
    assert stencil_print.mode == "RGB"
    assert stencil_trans.size == (120, 120)
    assert stencil_print.size == (120, 120)

    trans_arr = np.array(stencil_trans)
    # Some pixels must be non-zero alpha (the extracted stencil lines)
    assert np.any(trans_arr[:, :, 3] > 0)


def test_generate_curvature_compensated_stencil():
    """Verify geometry compensation preserves image dimensions and valid color channels."""
    img = Image.new("RGBA", (200, 150), (255, 0, 0, 255))
    compensated = generate_curvature_compensated_stencil(
        img, cylinder_radius_cm=4.5, arc_span_degrees=90.0
    )

    assert compensated.size == (200, 150)
    assert compensated.mode == "RGBA"
