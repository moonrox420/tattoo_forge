import numpy as np
from PIL import Image, ImageDraw

from tattooforge.spline.surface import evaluate_surface_point_and_derivatives

STEP_LENGTH = 0.02
INTEGRATION_STEPS = 12
TANGENT_NORM_EPSILON = 1e-5
CURVATURE_COLOR_SCALE = 25
MAX_COLOR_INTENSITY = 180


def generate_tangent_field_strokes(
    width: int,
    height: int,
    control_z: np.ndarray,
    degree: int,
    knots: np.ndarray,
    density: int = 150,
    seed: int | None = None,
) -> Image.Image:
    """
    Generates vectorized tattoo lines driven dynamically by the analytical
    surface tangent vectors (du) instead of random placement.

    Parameters
    ----------
    width, height : int
        Canvas dimensions in pixels.
    control_z : np.ndarray
        Square grid of control point Z heights.
    degree : int
        B-spline degree.
    knots : np.ndarray
        Knot vector.
    density : int
        Number of seed points per field trace.
    seed : int | None
        Optional reproducibility seed for RNG.
    """
    if not isinstance(control_z, np.ndarray):
        raise TypeError(f"control_z must be np.ndarray, got {type(control_z).__name__}")

    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    metrics = None

    # Deterministic sampling for reproducibility
    rng = np.random.default_rng(seed)
    seed_u = rng.uniform(0.1, 0.9, density)
    seed_v = rng.uniform(0.1, 0.9, density)

    integration_steps = INTEGRATION_STEPS
    step_length = STEP_LENGTH

    for s_u, s_v in zip(seed_u, seed_v):
        curr_u, curr_v = s_u, s_v
        points_path = []

        for _ in range(integration_steps):
            if not (0.0 <= curr_u <= 1.0 and 0.0 <= curr_v <= 1.0):
                break

            metrics = evaluate_surface_point_and_derivatives(
                curr_u, curr_v, control_z, degree, knots
            )

            # Map parametric coordinate positions directly to 2D image coordinates
            img_x = int(curr_u * width)
            img_y = int((1.0 - curr_v) * height)
            points_path.append((img_x, img_y))

            # Extract direction vector from principal u-tangent
            tangent_u = metrics["du"][:2]
            norm_t = np.linalg.norm(tangent_u)

            if norm_t > TANGENT_NORM_EPSILON:
                dir_vector = tangent_u / norm_t
            else:
                dir_vector = np.array([1.0, 0.0])

            # Advance particle path step along vector direction field
            curr_u += dir_vector[0] * step_length
            curr_v += dir_vector[1] * step_length

        if metrics is not None and len(points_path) > 1:
            # Color tone shifts dynamically relative to local surface curvature context
            curvature_intensity = min(
                int(abs(metrics["H"]) * CURVATURE_COLOR_SCALE), MAX_COLOR_INTENSITY
            )
            stroke_color = (200, 40 + curvature_intensity, 80, 220)
            draw.line(points_path, fill=stroke_color, width=4, joint="round")

    return img
