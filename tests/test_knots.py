import numpy as np
import pytest

from tattooforge.utils.knots import create_open_uniform_knots


def test_knot_vector_length_and_clamps():
    """Verify clamped open uniform knot properties for various (n, p) pairs."""
    test_cases = [
        (4, 1),
        (4, 2),
        (4, 3),
        (6, 2),
        (6, 3),
        (10, 3),
    ]
    for num_ctrl_pts, degree in test_cases:
        knots = create_open_uniform_knots(num_ctrl_pts, degree)
        expected_length = num_ctrl_pts + degree + 1
        assert (
            len(knots) == expected_length
        ), f"Expected length {expected_length}, got {len(knots)}"

        # Clamped ends check
        assert np.all(
            knots[: degree + 1] == 0.0
        ), "Leading knots must be clamped to 0.0"
        assert np.all(
            knots[-(degree + 1) :] == 1.0
        ), "Trailing knots must be clamped to 1.0"

        # Monotonicity check
        assert np.all(
            np.diff(knots) >= 0.0
        ), "Knot vector must be monotonically non-decreasing"

        # Values bounded in [0, 1]
        assert np.all((knots >= 0.0) & (knots <= 1.0)), "Knots must be in [0, 1]"


def test_knot_vector_invalid_parameters():
    """Verify parameter validation for invalid degrees and control point counts."""
    with pytest.raises(ValueError, match="num_ctrl_pts must be >= 2"):
        create_open_uniform_knots(1, 1)

    with pytest.raises(ValueError, match="degree must be >= 1"):
        create_open_uniform_knots(4, 0)

    with pytest.raises(ValueError, match="degree .* must be < num_ctrl_pts"):
        create_open_uniform_knots(3, 3)

    with pytest.raises(ValueError, match="degree .* must be < num_ctrl_pts"):
        create_open_uniform_knots(3, 4)
