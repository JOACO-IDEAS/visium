"""
Pasos geométricos del pipeline — cada función es pura respecto a su entrada
y devuelve (resultado, métricas) para el reporte final.

Estrategia de preservación de texturas (los escaneos traen la luz horneada):
- Outliers: se filtran CARAS sobre el mismo objeto trimesh (las UVs quedan).
- Planarización: solo mueve vértices — las UVs no se tocan por definición.
- Agujeros/decimación: roundtrip por OBJ+MTL hacia PyMeshLab, que respeta
  wedge texcoords; la decimación usa el filtro *_with_texture cuando hay UVs.
"""

from __future__ import annotations

import subprocess
import tempfile
from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
import trimesh
import open3d as o3d
import pymeshlab


@dataclass
class PipelineConfig:
    # Paso 1 — outliers: componente que no llega a NINGUNO de los dos
    # umbrales se considera geometría fantasma y se elimina.
    min_component_area_frac: float = 0.002
    min_component_faces: int = 60

    # Paso 2 — planarización RANSAC
    max_planes: int = 12
    plane_distance: float = 0.018          # 1.8 cm — rugosidad típica de Scaniverse
    plane_min_inlier_frac: float = 0.05    # % de vértices RESTANTES para aceptar un plano
    plane_min_inliers_abs: int = 300       # piso absoluto de inliers
    normal_alignment_deg: float = 25.0     # protege esquinas y marcos (bordes duros)

    # Paso 3 — cierre de agujeros (tamaño máximo en aristas de borde)
    max_hole_size: int = 400

    # Paso 4 — decimación
    target_face_frac: float = 0.55
    min_faces_keep: int = 20_000

    # Export final
    draco: bool = True
    texture_size: int = 2048
    # Los escaneos traen la luz horneada en la textura: se restaura
    # KHR_materials_unlit (el roundtrip por OBJ lo pierde) para que el
    # GLB se vea idéntico al original en cualquier visor, sin luces.
    unlit: bool = True


# ────────────────────────────────────────────────────────────
# Paso 1 — Outlier removal: vértices flotantes y geometría fantasma
# ────────────────────────────────────────────────────────────

def remove_outliers(mesh: trimesh.Trimesh, cfg: PipelineConfig) -> tuple[trimesh.Trimesh, dict]:
    """Elimina componentes conexos diminutos filtrando caras in-place —
    el objeto conserva su visual (UVs/textura) intacto."""
    n_faces_before = len(mesh.faces)
    components = trimesh.graph.connected_components(
        mesh.face_adjacency, nodes=np.arange(n_faces_before), min_len=1
    )
    if len(components) <= 1:
        return mesh, {"components_found": 1, "components_removed": 0, "faces_removed": 0}

    total_area = mesh.area
    area_faces = mesh.area_faces
    keep_mask = np.zeros(n_faces_before, dtype=bool)
    removed = 0
    for comp in components:
        comp = np.asarray(comp)
        comp_area = float(area_faces[comp].sum())
        if comp_area >= cfg.min_component_area_frac * total_area or len(comp) >= cfg.min_component_faces:
            keep_mask[comp] = True
        else:
            removed += 1

    if keep_mask.all():
        return mesh, {"components_found": len(components), "components_removed": 0, "faces_removed": 0}

    mesh.update_faces(keep_mask)
    mesh.remove_unreferenced_vertices()
    return mesh, {
        "components_found": len(components),
        "components_removed": removed,
        "faces_removed": int(n_faces_before - keep_mask.sum()),
    }


# ────────────────────────────────────────────────────────────
# Paso 2 — Planarización RANSAC: paredes y pisos a planos perfectos
# ────────────────────────────────────────────────────────────

def planarize(mesh: trimesh.Trimesh, cfg: PipelineConfig) -> tuple[trimesh.Trimesh, dict]:
    """Segmenta planos dominantes con RANSAC (Open3D) y proyecta sobre cada
    plano SOLO los vértices cuya normal está alineada con él — así las
    esquinas y los marcos (donde la normal diverge) quedan intactos."""
    V = mesh.vertices.view(np.ndarray).copy()
    vnormals = mesh.vertex_normals.view(np.ndarray)
    cos_limit = float(np.cos(np.radians(cfg.normal_alignment_deg)))

    remaining = np.arange(len(V))
    planes_found = 0
    projected_total = 0

    for _ in range(cfg.max_planes):
        if len(remaining) < 500:
            break
        pcd = o3d.geometry.PointCloud(o3d.utility.Vector3dVector(V[remaining]))
        model, inliers = pcd.segment_plane(
            distance_threshold=cfg.plane_distance, ransac_n=3, num_iterations=1200
        )
        # Umbral relativo a lo que queda sin asignar — un tile rugoso de
        # Scaniverse nunca pasa un % del total, pero sus planos son reales.
        min_inliers = max(cfg.plane_min_inlier_frac * len(remaining), cfg.plane_min_inliers_abs)
        if len(inliers) < min_inliers:
            break

        n = np.asarray(model[:3], dtype=np.float64)
        d = float(model[3])
        idx = remaining[np.asarray(inliers, dtype=np.int64)]

        # Protección de bordes duros: normal del vértice ~ normal del plano
        aligned = np.abs(vnormals[idx] @ n) >= cos_limit
        movable = idx[aligned]
        if len(movable):
            dist = V[movable] @ n + d
            V[movable] -= np.outer(dist, n)
            projected_total += int(len(movable))

        planes_found += 1
        remaining = np.setdiff1d(remaining, idx, assume_unique=False)

    mesh.vertices = V
    return mesh, {"planes_found": planes_found, "vertices_projected": projected_total}


# ────────────────────────────────────────────────────────────
# Pasos 3 y 4 — PyMeshLab: cierre de agujeros + decimación
# (roundtrip por OBJ para conservar texturas en ambas direcciones)
# ────────────────────────────────────────────────────────────

def fill_and_decimate(mesh: trimesh.Trimesh, cfg: PipelineConfig, workdir: Path) -> tuple[trimesh.Trimesh, dict]:
    stage = workdir / "stage.obj"
    mesh.export(stage)

    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(str(stage))
    m = ms.current_mesh()
    faces_in = m.face_number()

    metrics: dict = {"faces_in": faces_in}

    # Saneamiento previo de topología
    ms.meshing_remove_duplicate_vertices()
    try:
        ms.meshing_repair_non_manifold_edges()
    except pymeshlab.PyMeshLabException:
        pass

    # Paso 4 primero — decimación sobre la malla texturada LIMPIA.
    # El cierre de agujeros agrega caras sin UVs que rompen la precondición
    # del filtro *_with_texture, así que decimamos antes de sellar.
    fn = ms.current_mesh().face_number()
    target = max(int(fn * cfg.target_face_frac), min(cfg.min_faces_keep, fn))
    if target < fn:
        has_uv = ms.current_mesh().has_wedge_tex_coord()

        def _try(fn_name: str, **kw) -> bool:
            try:
                getattr(ms, fn_name)(**kw)
                return True
            except pymeshlab.PyMeshLabException as exc:
                metrics.setdefault("decimation_attempts", []).append(
                    f"{fn_name}: {str(exc).splitlines()[0][:100]}"
                )
                return False

        done = False
        if has_uv:
            done = _try(
                "meshing_decimation_quadric_edge_collapse_with_texture",
                targetfacenum=target, preserveboundary=True, boundaryweight=1.5,
            )
            if not done:
                # Reintento tras reparar vértices non-manifold (causa típica)
                try:
                    ms.meshing_repair_non_manifold_vertices()
                except pymeshlab.PyMeshLabException:
                    pass
                done = _try(
                    "meshing_decimation_quadric_edge_collapse_with_texture",
                    targetfacenum=target, preserveboundary=True, boundaryweight=1.5,
                )
            # Sin tercer fallback: el quadric estándar destrozaría las UVs.
            # Mejor entregar pesado que entregar roto.
        else:
            done = _try(
                "meshing_decimation_quadric_edge_collapse",
                targetfacenum=target, preserveboundary=True, boundaryweight=1.5,
                preservenormal=True, planarquadric=True,
            )
        metrics["decimated"] = done
        metrics["decimated_with_texture"] = bool(has_uv and done)

    # Paso 3 después — agujeros negros de piso/techo sobre la malla ya liviana
    faces_pre_holes = ms.current_mesh().face_number()
    try:
        out = ms.meshing_close_holes(maxholesize=cfg.max_hole_size, newfaceselected=False)
        metrics["holes_closed"] = int(out.get("closed_holes", -1)) if isinstance(out, dict) else -1
    except pymeshlab.PyMeshLabException as exc:
        metrics["holes_closed"] = 0
        metrics["holes_warning"] = str(exc).splitlines()[0][:120]
    metrics["faces_added_by_holes"] = ms.current_mesh().face_number() - faces_pre_holes

    # Normales coherentes hacia afuera — sin esto, WebGL con materiales lit
    # muestra la malla negra (normales invertidas o desactualizadas tras
    # decimar/sellar). Los renderers unlit las ignoran, pero exportarlas
    # bien deja el GLB correcto para cualquier visor.
    try:
        ms.meshing_re_orient_faces_coherently()
    except pymeshlab.PyMeshLabException:
        pass  # falla en mallas non-manifold — no es bloqueante
    try:
        ms.compute_normal_per_vertex()
    except pymeshlab.PyMeshLabException:
        pass

    metrics["faces_out"] = ms.current_mesh().face_number()

    result_obj = workdir / "result.obj"
    ms.save_current_mesh(str(result_obj))
    cleaned = trimesh.load(result_obj, force="mesh", process=False)
    return cleaned, metrics


# ────────────────────────────────────────────────────────────
# Export — GLB + compresión Draco / WebP (gltf-transform)
# ────────────────────────────────────────────────────────────

def compress_glb(src: Path, dst: Path, cfg: PipelineConfig) -> dict:
    work = src
    restored_unlit = False
    if cfg.unlit:
        # Restaura KHR_materials_unlit perdido en el roundtrip por OBJ —
        # sin esto el GLB exige luces y los visores lo muestran negro.
        unlit_path = src.with_name("unlit.glb")
        proc = subprocess.run(
            ["npx", "-y", "@gltf-transform/cli", "unlit", str(src), str(unlit_path)],
            capture_output=True, text=True, timeout=300,
        )
        if proc.returncode == 0 and unlit_path.exists():
            work = unlit_path
            restored_unlit = True

    cmd = [
        "npx", "-y", "@gltf-transform/cli", "optimize", str(work), str(dst),
        "--compress", "draco",
        "--texture-compress", "webp",
        "--texture-size", str(cfg.texture_size),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if proc.returncode != 0:
        raise RuntimeError(f"gltf-transform falló: {proc.stderr[-400:]}")
    return {
        "raw_bytes": src.stat().st_size,
        "final_bytes": dst.stat().st_size,
        "unlit_restored": restored_unlit,
    }


# ────────────────────────────────────────────────────────────
# Orquestador — procesa cada malla de la escena y recompone el GLB
# ────────────────────────────────────────────────────────────

def process_file(input_path: Path, output_path: Path, cfg: PipelineConfig | None = None) -> dict:
    cfg = cfg or PipelineConfig()
    scene = trimesh.load(input_path, force="scene")

    report: dict = {
        "input": input_path.name,
        "config": asdict(cfg),
        "meshes": {},
    }

    with tempfile.TemporaryDirectory(prefix="visium-pipe-") as td:
        workroot = Path(td)
        for i, (name, geom) in enumerate(list(scene.geometry.items())):
            if not isinstance(geom, trimesh.Trimesh) or len(geom.faces) == 0:
                continue
            mesh_report: dict = {"vertices_in": len(geom.vertices), "faces_in": len(geom.faces)}

            geom, r1 = remove_outliers(geom, cfg)
            geom, r2 = planarize(geom, cfg)
            subdir = workroot / f"mesh-{i}"
            subdir.mkdir()
            cleaned, r3 = fill_and_decimate(geom, cfg, subdir)

            mesh_report.update(r1)
            mesh_report.update(r2)
            mesh_report.update(r3)
            mesh_report["vertices_out"] = len(cleaned.vertices)
            mesh_report["faces_out"] = len(cleaned.faces)
            report["meshes"][name] = mesh_report

            # Reemplazo in-place: el grafo de la escena (transforms) no se toca
            scene.geometry[name] = cleaned

        raw_glb = workroot / "assembled.glb"
        scene.export(raw_glb)

        if cfg.draco:
            report["export"] = compress_glb(raw_glb, output_path, cfg)
        else:
            output_path.write_bytes(raw_glb.read_bytes())
            report["export"] = {"raw_bytes": raw_glb.stat().st_size, "final_bytes": output_path.stat().st_size}

    report["output"] = output_path.name
    return report
