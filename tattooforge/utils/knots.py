import numpy as np


def create_open_uniform_knots(num_ctrl_pts: int, degree: int) -> np.ndarray:
    """
    Generates a clamped (open uniform) knot vector where the end knots
    have a multiplicity of p + 1.
    """
    if num_ctrl_pts < 2:
        raise ValueError(f"num_ctrl_pts must be >= 2, got {num_ctrl_pts}")
    if degree < 1:
        raise ValueError(f"degree must be >= 1, got {degree}")
    if degree >= num_ctrl_pts:
        raise ValueError(f"degree ({degree}) must be < num_ctrl_pts ({num_ctrl_pts})")

    n = num_ctrl_pts - 1
    m = n + degree + 1
    knots = np.zeros(m + 1)

    denominator = m - 2 * degree
    if denominator == 0:
        raise ValueError(
            f"Invalid configuration: m - 2*degree = 0 for num_ctrl_pts={num_ctrl_pts}, degree={degree}"
        )

    for j in range(m + 1):
        if j <= degree:
            knots[j] = 0.0
        elif j >= m - degree:
            knots[j] = 1.0
        else:
            knots[j] = (j - degree) / denominator

    return knots
