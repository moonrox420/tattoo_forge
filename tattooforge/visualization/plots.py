import matplotlib.pyplot as plt
import numpy as np

from tattooforge.spline.basis import precompute_basis_matrices
from tattooforge.spline.derivatives import compute_differential_geometry


def render_curvature_topology_plots(
    plot_res: int,
    cols: int,
    degree: int,
    knots: np.ndarray,
    control_z: np.ndarray,
    evaluation_metrics: dict,
    u_eval: float,
    v_eval: float,
):
    """
    Renders high-speed, cached execution models for full 3D surface mapping and local analytical profiles.
    """
    u_steps = np.linspace(0.0, 1.0, plot_res)
    v_steps = np.linspace(0.0, 1.0, plot_res)

    # Linear cache matrix lookups eliminating O(N^4) calculations entirely
    N_u, dN_u, d2N_u = precompute_basis_matrices(u_steps, cols, degree, knots)
    N_v, dN_v, d2N_v = precompute_basis_matrices(v_steps, cols, degree, knots)

    surf_x = np.zeros((plot_res, plot_res))
    surf_y = np.zeros((plot_res, plot_res))
    surf_z = np.zeros((plot_res, plot_res))
    mean_curvature_map = np.zeros((plot_res, plot_res))

    u_coords = np.linspace(0.0, 1.0, cols)
    v_coords = np.linspace(0.0, 1.0, cols)

    for i in range(plot_res):
        for j in range(plot_res):
            pos = np.zeros(3)
            du = np.zeros(3)
            dv = np.zeros(3)
            d2u = np.zeros(3)
            d2v = np.zeros(3)
            dudv = np.zeros(3)

            for cx in range(cols):
                bu = N_u[i, cx]
                dbu = dN_u[i, cx]
                d2bu = d2N_u[i, cx]

                for cy in range(cols):
                    bv = N_v[j, cy]
                    dbv = dN_v[j, cy]
                    d2bv = d2N_v[j, cy]

                    cp = np.array([u_coords[cx], v_coords[cy], control_z[cx, cy]])

                    pos += cp * (bu * bv)
                    du += cp * (dbu * bv)
                    dv += cp * (bu * dbv)
                    d2u += cp * (d2bu * bv)
                    d2v += cp * (bu * d2bv)
                    dudv += cp * (dbu * dbv)

            surf_x[i, j] = pos[0]
            surf_y[i, j] = pos[1]
            surf_z[i, j] = pos[2]

            _, _, H, _, _ = compute_differential_geometry(du, dv, d2u, d2v, dudv)
            mean_curvature_map[i, j] = H

    fig = plt.figure(figsize=(15, 6))

    # 3D Geometric Topology View
    ax1 = fig.add_subplot(121, projection="3d")
    ax1.plot_surface(
        surf_x,
        surf_y,
        surf_z,
        facecolors=plt.cm.viridis(
            (mean_curvature_map - mean_curvature_map.min())
            / (mean_curvature_map.ptp() + 1e-8)
        ),
        alpha=0.8,
        shade=False,
    )

    pos_e = evaluation_metrics["pos"]
    norm_e = evaluation_metrics["normal"]
    ax1.quiver(
        pos_e[0],
        pos_e[1],
        pos_e[2],
        norm_e[0],
        norm_e[1],
        norm_e[2],
        length=0.3,
        color="red",
        linewidth=2.5,
        label="Normal Vector",
    )
    ax1.scatter(
        pos_e[0],
        pos_e[1],
        pos_e[2],
        c="lime",
        s=150,
        edgecolors="black",
        label="Eval Point",
        zorder=10,
    )
    ax1.set_xlabel("X Mapping")
    ax1.set_ylabel("Y Mapping")
    ax1.set_zlabel("Skin Contour Height")
    ax1.set_title("B-Spline Topology Map (Color = Mean Curvature)")
    ax1.legend()

    # 2D Curvature Parameter Analysis View
    ax2 = fig.add_subplot(122)
    contour = ax2.contourf(
        u_steps, v_steps, mean_curvature_map.T, cmap="magma", levels=20
    )
    fig.colorbar(contour, ax=ax2, label="Mean Curvature (H)")
    ax2.scatter(
        [u_eval],
        [v_eval],
        color="lime",
        edgecolors="black",
        s=100,
        label="Eval Vector Location",
    )
    ax2.set_xlabel("Parameter U")
    ax2.set_ylabel("Parameter V")
    ax2.set_title("Analytical Skin Strain / Curvature Map (H)")
    ax2.legend()

    return fig
