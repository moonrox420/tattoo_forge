import numpy as np
from PIL import Image, ImageFilter, ImageOps


def remove_background_luminance(
    image: Image.Image,
    threshold: int = 240,
    softness: int = 20,
) -> Image.Image:
    """
    Converts white or light paper backgrounds into clean transparency.
    If the image already has an alpha channel with transparency, it respects it.
    """
    rgba = image.convert("RGBA")
    np_img = np.array(rgba, dtype=np.float32)

    # If alpha channel already has significant transparent pixels, preserve existing alpha
    current_alpha = np_img[:, :, 3]
    if np.any(current_alpha < 250):
        # Already has meaningful transparency
        return rgba

    # Calculate luminance (ITU-R 601-2)
    r, g, b = np_img[:, :, 0], np_img[:, :, 1], np_img[:, :, 2]
    luminance = 0.299 * r + 0.587 * g + 0.114 * b

    # Soft alpha ramp based on luminance
    lower_bound = max(0, threshold - softness)
    upper_bound = min(255, threshold)

    alpha = np.ones_like(luminance) * 255.0

    if upper_bound > lower_bound:
        mask = luminance > lower_bound
        alpha[mask] = 255.0 * (
            1.0 - (luminance[mask] - lower_bound) / (upper_bound - lower_bound)
        )
        alpha[luminance >= upper_bound] = 0.0
    else:
        alpha[luminance >= threshold] = 0.0

    np_img[:, :, 3] = np.clip(alpha, 0.0, 255.0)
    return Image.fromarray(np_img.astype(np.uint8), mode="RGBA")


def extract_thermal_stencil(
    image: Image.Image,
    line_weight: int = 2,
    threshold_sensitivity: int = 128,
    stencil_color: tuple[int, int, int] = (50, 30, 85),  # Classic Spirit thermal purple
    invert: bool = False,
) -> tuple[Image.Image, Image.Image]:
    """
    Extracts crisp, thermal-copier-ready line art from any input artwork.

    Returns:
    --------
    stencil_transparent : Image.Image
        RGBA image with transparent background, ideal for 3D decal projection.
    stencil_printable : Image.Image
        High-contrast black/purple on white paper background, ready for thermal transfer paper printing.
    """
    rgba = image.convert("RGBA")

    # Grayscale representation for edge analysis
    gray = ImageOps.grayscale(rgba)
    np_gray = np.array(gray, dtype=np.float32)

    # Multi-scale difference of Gaussians (DoG) for crisp outline extraction
    sigma1 = max(0.5, float(line_weight) * 0.5)
    sigma2 = sigma1 * 2.5

    blur1 = gray.filter(ImageFilter.GaussianBlur(radius=sigma1))
    blur2 = gray.filter(ImageFilter.GaussianBlur(radius=sigma2))

    dog = np.array(blur2, dtype=np.float32) - np.array(blur1, dtype=np.float32)
    dog_norm = (dog - dog.min()) / (dog.max() - dog.min() + 1e-8) * 255.0

    # Apply thresholding
    thresh = float(threshold_sensitivity)
    line_mask = dog_norm < thresh

    if invert:
        line_mask = ~line_mask

    # Printable stencil (opaque white background with purple/carbon lines)
    h, w = np_gray.shape
    printable_arr = np.ones((h, w, 3), dtype=np.uint8) * 255
    r_col, g_col, b_col = stencil_color

    printable_arr[line_mask, 0] = r_col
    printable_arr[line_mask, 1] = g_col
    printable_arr[line_mask, 2] = b_col

    # Transparent decal stencil for 3D projection
    decal_arr = np.zeros((h, w, 4), dtype=np.uint8)
    decal_arr[line_mask, 0] = r_col
    decal_arr[line_mask, 1] = g_col
    decal_arr[line_mask, 2] = b_col
    decal_arr[line_mask, 3] = 240  # Solid line ink

    stencil_transparent = Image.fromarray(decal_arr, mode="RGBA")
    stencil_printable = Image.fromarray(printable_arr, mode="RGB")

    return stencil_transparent, stencil_printable


def generate_curvature_compensated_stencil(
    image: Image.Image,
    cylinder_radius_cm: float = 4.5,
    arc_span_degrees: float = 120.0,
) -> Image.Image:
    """
    Applies inverse cylindrical / conical unwrap compensation so that a 2D printed stencil,
    when applied over curved anatomy (e.g. a forearm with taper), appears with intended
    geometric proportions without barrel distortion.
    """
    rgba = image.convert("RGBA")
    w, _h = rgba.size
    np_img = np.array(rgba)

    # Inverse arc-length compensation map
    # A point at normalized x in [-1, 1] on a cylinder of radius R has angle theta = x * (span / 2)
    # The projected flat width shrinks as cos(theta); inverse scaling stretches it proportionally:
    # x_compensated = arcsin(x * sin(max_theta)) / max_theta
    span_rad = np.radians(min(170.0, max(10.0, arc_span_degrees)))
    max_theta = span_rad / 2.0

    x_indices = np.linspace(-1.0, 1.0, w)
    sin_max = np.sin(max_theta)

    # Non-linear warp coordinates
    warped_x = np.arcsin(np.clip(x_indices * sin_max, -0.999, 0.999)) / max_theta
    sample_x = np.clip(((warped_x + 1.0) * 0.5 * (w - 1)), 0, w - 1).astype(np.int32)

    # Remap image horizontally
    compensated_arr = np_img[:, sample_x, :]
    return Image.fromarray(compensated_arr, mode="RGBA")
