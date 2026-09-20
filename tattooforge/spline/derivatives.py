import numpy as np


def compute_differential_geometry(
    du: np.ndarray, dv: np.ndarray, d2u: np.ndarray, d2v: np.ndarray, dudv: np.ndarray
) -> tuple[np.ndarray, float, float, float, float]:
    """
    Computes first and second fundamental forms, normal vectors, Gaussian curvature (K),
    Mean curvature (H), and principal curvatures (k1, k2).
    """
    # Normal Vector Configuration
    raw_normal = np.cross(du, dv)
    norm_val = np.linalg.norm(raw_normal)
    if norm_val < 1e-8:
        raise ValueError(
            "Degenerate surface: zero normal vector at evaluation point. Partial derivatives are linearly dependent."
        )
    normal = raw_normal / norm_val

    # First Fundamental Form Coefficients (Metric Tensor)
    E = np.dot(du, du)
    F = np.dot(du, dv)
    G = np.dot(dv, dv)

    # Second Fundamental Form Coefficients
    L = np.dot(d2u, normal)
    M = np.dot(dudv, normal)
    N_coeff = np.dot(d2v, normal)

    # Curvature Extraction via Weingarten Equations
    eg_f2 = E * G - F * F
    if abs(eg_f2) < 1e-8:
        return normal, 0.0, 0.0, 0.0, 0.0

    # Gaussian Curvature (K)
    K = (L * N_coeff - M * M) / eg_f2

    # Mean Curvature (H)
    H = (E * N_coeff - 2.0 * F * M + G * L) / (2.0 * eg_f2)

    # Principal Curvatures via eigenvalues of the shape operator
    discriminant = max(0.0, H * H - K)
    k1 = H + np.sqrt(discriminant)
    k2 = H - np.sqrt(discriminant)

    return normal, K, H, k1, k2
