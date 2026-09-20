import numpy as np

from tattooforge.spline.basis import (
    bspline_basis,
    bspline_basis_deriv,
    bspline_basis_deriv2,
    precompute_basis_matrices,
)
from tattooforge.spline.surface import evaluate_surface_point_and_derivatives
from tattooforge.utils.knots import create_open_uniform_knots


def test_partition_of_unity():
    """Verify sum of basis functions equals 1.0 everywhere on [0, 1]."""
    num_ctrl_pts = 5
    degree = 3
    knots = create_open_uniform_knots(num_ctrl_pts, degree)

    t_samples = np.linspace(0.0, 1.0, 50)
    for t in t_samples:
        basis_sum = sum(bspline_basis(t, i, degree, knots) for i in range(num_ctrl_pts))
        assert np.isclose(
            basis_sum, 1.0, atol=1e-7
        ), f"Partition of unity failed at t={t}: sum={basis_sum}"


def test_basis_non_negativity_and_boundary():
    """Verify basis functions are non-negative and satisfy boundary Kronecker delta properties."""
    num_ctrl_pts = 4
    degree = 2
    knots = create_open_uniform_knots(num_ctrl_pts, degree)

    # Boundary at t = 0
    assert np.isclose(bspline_basis(0.0, 0, degree, knots), 1.0)
    for i in range(1, num_ctrl_pts):
        assert np.isclose(bspline_basis(0.0, i, degree, knots), 0.0)

    # Boundary at t = 1
    assert np.isclose(bspline_basis(1.0, num_ctrl_pts - 1, degree, knots), 1.0)
    for i in range(num_ctrl_pts - 1):
        assert np.isclose(bspline_basis(1.0, i, degree, knots), 0.0)

    # Non-negativity over sample grid
    for t in np.linspace(0.0, 1.0, 20):
        for i in range(num_ctrl_pts):
            val = bspline_basis(t, i, degree, knots)
            assert val >= -1e-9, f"Basis function negative at t={t}, i={i}: {val}"


def test_basis_derivatives_vs_finite_difference():
    """Verify first derivatives against central finite differences."""
    num_ctrl_pts = 5
    degree = 3
    knots = create_open_uniform_knots(num_ctrl_pts, degree)

    eps = 1e-5
    t_test = 0.45
    for i in range(num_ctrl_pts):
        analytical_deriv = bspline_basis_deriv(t_test, i, degree, knots)
        numerical_deriv = (
            bspline_basis(t_test + eps, i, degree, knots)
            - bspline_basis(t_test - eps, i, degree, knots)
        ) / (2.0 * eps)
        assert np.isclose(
            analytical_deriv, numerical_deriv, atol=1e-4
        ), f"Derivative mismatch for i={i}: analytical={analytical_deriv}, numerical={numerical_deriv}"


def test_precompute_basis_matrices():
    """Verify precomputed matrix dimensions and values match point evaluations."""
    steps = np.array([0.0, 0.25, 0.5, 0.75, 1.0])
    num_ctrl_pts = 4
    degree = 2
    knots = create_open_uniform_knots(num_ctrl_pts, degree)

    N, dN, d2N = precompute_basis_matrices(steps, num_ctrl_pts, degree, knots)

    assert N.shape == (5, 4)
    assert dN.shape == (5, 4)
    assert d2N.shape == (5, 4)

    for step_idx, t in enumerate(steps):
        for i in range(num_ctrl_pts):
            assert np.isclose(N[step_idx, i], bspline_basis(t, i, degree, knots))
            assert np.isclose(dN[step_idx, i], bspline_basis_deriv(t, i, degree, knots))
            assert np.isclose(
                d2N[step_idx, i], bspline_basis_deriv2(t, i, degree, knots)
            )


def test_flat_surface_differential_geometry():
    """A planar control grid must produce zero Gaussian and Mean curvature."""
    cols = 4
    degree = 2
    knots = create_open_uniform_knots(cols, degree)
    flat_control_z = np.zeros((cols, cols))

    metrics = evaluate_surface_point_and_derivatives(
        0.5, 0.5, flat_control_z, degree, knots
    )

    assert np.isclose(np.linalg.norm(metrics["normal"]), 1.0, atol=1e-6)
    assert np.isclose(
        metrics["K"], 0.0, atol=1e-6
    ), f"Expected K=0 on flat plane, got {metrics['K']}"
    assert np.isclose(
        metrics["H"], 0.0, atol=1e-6
    ), f"Expected H=0 on flat plane, got {metrics['H']}"
    assert np.isclose(metrics["k1"], 0.0, atol=1e-6)
    assert np.isclose(metrics["k2"], 0.0, atol=1e-6)
