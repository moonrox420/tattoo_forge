from typing import Any

import numpy as np

import tattooforge.spline.basis as spline_basis
import tattooforge.spline.derivatives as spline_derivatives


def evaluate_surface_point_and_derivatives(
    u: float, v: float, control_z: np.ndarray, degree: int, knots: np.ndarray
) -> dict[str, Any]:

    if not isinstance(control_z, np.ndarray):
        raise TypeError(f"control_z must be np.ndarray, got {type(control_z).__name__}")
    if control_z.ndim != 2:
        raise ValueError(f"control_z must be 2D, got shape {control_z.shape}")
    if control_z.shape[0] != control_z.shape[1]:
        raise ValueError(f"control_z must be square, got shape {control_z.shape}")
    if not (0.0 <= u <= 1.0):
        raise ValueError(f"u must be in [0, 1], got {u}")
    if not (0.0 <= v <= 1.0):
        raise ValueError(f"v must be in [0, 1], got {v}")
    if degree < 1:
        raise ValueError(f"degree must be >= 1, got {degree}")
    if not isinstance(knots, np.ndarray):
        raise TypeError(f"knots must be np.ndarray, got {type(knots).__name__}")

    u_clamped = min(max(u, 0.0), 1.0)
    v_clamped = min(max(v, 0.0), 1.0)

    n = control_z.shape[0]
    u_coords = np.linspace(0.0, 1.0, n)
    v_coords = np.linspace(0.0, 1.0, n)

    pos = np.zeros(3)
    du = np.zeros(3)
    dv = np.zeros(3)
    d2u = np.zeros(3)
    d2v = np.zeros(3)
    dudv = np.zeros(3)

    for i in range(n):
        bu = spline_basis.bspline_basis(u_clamped, i, degree, knots)
        dbu = spline_basis.bspline_basis_deriv(u_clamped, i, degree, knots)
        d2bu = spline_basis.bspline_basis_deriv2(u_clamped, i, degree, knots)

        for j in range(n):
            bv = spline_basis.bspline_basis(v_clamped, j, degree, knots)
            dbv = spline_basis.bspline_basis_deriv(v_clamped, j, degree, knots)
            d2bv = spline_basis.bspline_basis_deriv2(v_clamped, j, degree, knots)

            cp = np.array([u_coords[i], v_coords[j], control_z[i, j]])

            pos += cp * (bu * bv)
            du += cp * (dbu * bv)
            dv += cp * (bu * dbv)
            d2u += cp * (d2bu * bv)
            d2v += cp * (bu * d2bv)
            dudv += cp * (dbu * dbv)

    normal, K, H, k1, k2 = spline_derivatives.compute_differential_geometry(
        du, dv, d2u, d2v, dudv
    )

    return {
        "pos": pos,
        "normal": normal,
        "du": du,
        "dv": dv,
        "d2u": d2u,
        "d2v": d2v,
        "dudv": dudv,
        "K": K,
        "H": H,
        "k1": k1,
        "k2": k2,
    }
