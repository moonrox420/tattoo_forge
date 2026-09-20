import numpy as np
import streamlit as st
from PIL import Image

from tattooforge.spline.surface import evaluate_surface_point_and_derivatives
from tattooforge.tattoo.flow_mapping import generate_tangent_field_strokes
from tattooforge.utils.knots import create_open_uniform_knots
from tattooforge.visualization.plots import render_curvature_topology_plots

PLOT_RES = 24
TATTOO_WIDTH = 1000
TATTOO_HEIGHT = 700


@st.cache_data
def _cached_topology_plots(
    plot_res: int,
    cols: int,
    degree: int,
    knots: np.ndarray,
    control_z: np.ndarray,
    evaluation_metrics: dict,
    u_eval: float,
    v_eval: float,
):
    return render_curvature_topology_plots(
        plot_res=plot_res,
        cols=cols,
        degree=degree,
        knots=knots,
        control_z=control_z,
        evaluation_metrics=evaluation_metrics,
        u_eval=u_eval,
        v_eval=v_eval,
    )


@st.cache_data
def _cached_tattoo(
    width: int,
    height: int,
    control_z: np.ndarray,
    degree: int,
    knots: np.ndarray,
    seed: int | None,
) -> Image.Image:
    return generate_tangent_field_strokes(
        width=width,
        height=height,
        control_z=control_z,
        degree=degree,
        knots=knots,
        seed=seed,
    )


st.set_page_config(page_title="TATTOOFORGE AI PRO", page_icon="🗡️", layout="wide")
st.title("🗡️ TATTOOFORGE AI PRO")
st.markdown(
    "**THE BADASS PRODUCTION ENGINE FOR TATTOO ARTISTS** — Analytical **B-SPLINE SURFACE TOPOLOGY ANALYZER**"
)

st.sidebar.header("🔥 DESIGN PARAMETERS")
style = st.sidebar.selectbox(
    "Tattoo Style", ["Neo-Traditional", "Blackwork", "Japanese Irezumi", "Realism"]
)
theme = st.sidebar.text_input(
    "Core Theme / Subject", "Roaring Dragon with Cherry Blossoms"
)
body_part = st.sidebar.selectbox("Body Placement", ["Forearm", "Rib Cage", "Thigh"])
distortion_level = st.sidebar.slider("Skin Distortion Intensity", 0, 100, 75)

st.header("📐 GEOMETRIC ANALYSIS ENGINE")

cols = st.slider("Control Points Grid Size", 3, 6, 4)
degree = st.slider("B-Spline Degree", 1, 3, 3)

# Safeguard parameter matching rule to prevent execution faults
if degree >= cols:
    st.error(
        f"Execution Blocked: B-Spline Degree ({degree}) must be strictly less than Grid Size ({cols})."
    )
    st.stop()

st.subheader("Interactive Skin Model Grid Control")
control_z = np.zeros((cols, cols))

# Render dynamic grid configurations columns
ui_cols = st.columns(cols)
for i in range(cols):
    with ui_cols[i]:
        for j in range(cols):
            control_z[i, j] = st.slider(
                f"CP [{i},{j}] Z-Height",
                0.0,
                10.0,
                float(2 + i + j),
                0.1,
                key=f"cp_p_{i}_{j}",
            )

u_eval = st.slider("Surface Parameter u (0-1)", 0.0, 1.0, 0.5, 0.005)
v_eval = st.slider("Surface Parameter v (0-1)", 0.0, 1.0, 0.5, 0.005)

# Calculate structural knot mappings
knots = create_open_uniform_knots(cols, degree)

# Execute core analytical evaluations
metrics = evaluate_surface_point_and_derivatives(
    u_eval, v_eval, control_z, degree, knots
)

col1, col2, col3 = st.columns(3)
with col1:
    st.metric(
        "Surface Coordinates (X, Y, Z)",
        f"({metrics['pos'][0]:.3f}, {metrics['pos'][1]:.3f}, {metrics['pos'][2]:.3f})",
    )
    st.metric(
        "Surface Normal Vector",
        f"({metrics['normal'][0]:.3f}, {metrics['normal'][1]:.3f}, {metrics['normal'][2]:.3f})",
    )
with col2:
    st.metric("Gaussian Curvature (K)", f"{metrics['K']:.4f}")
    st.metric("Mean Curvature (H)", f"{metrics['H']:.4f}")
with col3:
    st.metric("Principal Curvature k1", f"{metrics['k1']:.4f}")
    st.metric("Principal Curvature k2", f"{metrics['k2']:.4f}")

st.subheader("High-Performance Topographic Visualization")
fig = _cached_topology_plots(
    plot_res=PLOT_RES,
    cols=cols,
    degree=degree,
    knots=knots,
    control_z=control_z,
    evaluation_metrics=metrics,
    u_eval=u_eval,
    v_eval=v_eval,
)
st.pyplot(fig)

st.markdown("---")
st.subheader("Dynamic Curvature-Driven Tattoo Synthesis")

if st.button(
    "⚡ FORGE VECTORIZED FIELD-GUIDED INK PATHWAYS",
    type="primary",
    use_container_width=True,
):
    with st.spinner(
        "Executing integration trace along parameterization tangent fields..."
    ):
        tattoo_canvas = _cached_tattoo(
            TATTOO_WIDTH,
            TATTOO_HEIGHT,
            control_z,
            degree,
            knots,
            seed=42,
        )
        st.image(
            tattoo_canvas,
            caption="Vector Field Curvature-Guided Tattoo Mock Map",
            use_column_width=True,
        )
        st.success(
            "Ink pathways accurately tracked and continuous along native surface geometry fields."
        )

st.caption(
    "TATTOOFORGE AI v2.0 • Solid Mathematics Production Core • System Engine Crafted by Chloe"
)
