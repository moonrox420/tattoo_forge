from functools import cache

import numpy as np


@cache
def _bspline_basis_cached(t: float, i: int, k: int, knots: tuple[float, ...]) -> float:
    """
    Internal Cox-de Boor recursion with memoization.
    Accepts tuple for hashability in LRU cache.
    """
    if k == 0:
        if (knots[i] <= t < knots[i + 1]) or (
            t == knots[-1] and knots[i + 1] == knots[-1]
        ):
            return 1.0
        return 0.0

    denom1 = knots[i + k] - knots[i]
    c1 = (t - knots[i]) / denom1 if denom1 != 0.0 else 0.0

    denom2 = knots[i + k + 1] - knots[i + 1]
    c2 = (knots[i + k + 1] - t) / denom2 if denom2 != 0.0 else 0.0

    return c1 * _bspline_basis_cached(t, i, k - 1, knots) + c2 * _bspline_basis_cached(
        t, i + 1, k - 1, knots
    )


def bspline_basis(t: float, i: int, k: int, knots: np.ndarray) -> float:
    """
    Evaluates the B-spline basis function N_{i,k}(t) using the Cox-de Boor recursion formula.
    Handles the upper boundary t == 1.0 securely.
    """
    if not isinstance(knots, np.ndarray):
        raise TypeError(f"knots must be np.ndarray, got {type(knots).__name__}")
    if not (0.0 <= t <= 1.0):
        raise ValueError(f"t must be in [0, 1], got {t}")
    if i < 0 or k < 0:
        raise ValueError(f"i and k must be non-negative, got i={i}, k={k}")
    if i + k + 1 >= len(knots):
        raise ValueError(f"i + k + 1 ({i + k + 1}) exceeds knots length ({len(knots)})")
    return _bspline_basis_cached(t, i, k, tuple(knots))


@cache
def _bspline_basis_deriv_cached(
    t: float, i: int, k: int, knots: tuple[float, ...]
) -> float:
    """Internal first-derivative recursion with memoization."""
    if k == 0:
        return 0.0

    denom1 = knots[i + k] - knots[i]
    c1 = k / denom1 if denom1 != 0.0 else 0.0

    denom2 = knots[i + k + 1] - knots[i + 1]
    c2 = k / denom2 if denom2 != 0.0 else 0.0

    return c1 * _bspline_basis_cached(t, i, k - 1, knots) - c2 * _bspline_basis_cached(
        t, i + 1, k - 1, knots
    )


def bspline_basis_deriv(t: float, i: int, k: int, knots: np.ndarray) -> float:
    """Evaluates the first derivative of the B-spline basis function N'_{i,k}(t)."""
    if not isinstance(knots, np.ndarray):
        raise TypeError(f"knots must be np.ndarray, got {type(knots).__name__}")
    if not (0.0 <= t <= 1.0):
        raise ValueError(f"t must be in [0, 1], got {t}")
    if i < 0 or k < 0:
        raise ValueError(f"i and k must be non-negative, got i={i}, k={k}")
    if i + k + 1 >= len(knots):
        raise ValueError(f"i + k + 1 ({i + k + 1}) exceeds knots length ({len(knots)})")
    return _bspline_basis_deriv_cached(t, i, k, tuple(knots))


@cache
def _bspline_basis_deriv2_cached(
    t: float, i: int, k: int, knots: tuple[float, ...]
) -> float:
    """Internal second-derivative recursion with memoization."""
    if k <= 1:
        return 0.0

    denom1 = knots[i + k] - knots[i]
    c1 = k / denom1 if denom1 != 0.0 else 0.0

    denom2 = knots[i + k + 1] - knots[i + 1]
    c2 = k / denom2 if denom2 != 0.0 else 0.0

    return c1 * _bspline_basis_deriv_cached(
        t, i, k - 1, knots
    ) - c2 * _bspline_basis_deriv_cached(t, i + 1, k - 1, knots)


def bspline_basis_deriv2(t: float, i: int, k: int, knots: np.ndarray) -> float:
    """Evaluates the second derivative of the B-spline basis function N''_{i,k}(t)."""
    if not isinstance(knots, np.ndarray):
        raise TypeError(f"knots must be np.ndarray, got {type(knots).__name__}")
    if not (0.0 <= t <= 1.0):
        raise ValueError(f"t must be in [0, 1], got {t}")
    if i < 0 or k < 0:
        raise ValueError(f"i and k must be non-negative, got i={i}, k={k}")
    if i + k + 1 >= len(knots):
        raise ValueError(f"i + k + 1 ({i + k + 1}) exceeds knots length ({len(knots)})")
    return _bspline_basis_deriv2_cached(t, i, k, tuple(knots))


def precompute_basis_matrices(
    steps: np.ndarray, num_ctrl_pts: int, degree: int, knots: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Precomputes the values, first derivatives, and second derivatives of all
    active basis functions across an evaluation array to optimize grid iterations.
    """
    if not isinstance(steps, np.ndarray):
        raise TypeError(f"steps must be np.ndarray, got {type(steps).__name__}")
    if not isinstance(knots, np.ndarray):
        raise TypeError(f"knots must be np.ndarray, got {type(knots).__name__}")
    if degree < 0:
        raise ValueError(f"degree must be >= 0, got {degree}")
    if num_ctrl_pts < 1:
        raise ValueError(f"num_ctrl_pts must be >= 1, got {num_ctrl_pts}")
    if len(knots) < num_ctrl_pts + degree + 1:
        raise ValueError(
            f"knots length ({len(knots)}) is insufficient for num_ctrl_pts ({num_ctrl_pts}) and degree ({degree})"
        )

    num_steps = len(steps)
    N = np.zeros((num_steps, num_ctrl_pts))
    dN = np.zeros((num_steps, num_ctrl_pts))
    d2N = np.zeros((num_steps, num_ctrl_pts))

    for idx, t in enumerate(steps):
        for i in range(num_ctrl_pts):
            N[idx, i] = bspline_basis(t, i, degree, knots)
            dN[idx, i] = bspline_basis_deriv(t, i, degree, knots)
            d2N[idx, i] = bspline_basis_deriv2(t, i, degree, knots)

    return N, dN, d2N
