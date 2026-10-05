"""
Detección de muros en planos 2D — OpenCV clásico (binarizado + Canny + Hough).

Reemplaza al stub simulado de `lib/property-pipeline/wall-detection.ts`
(Next.js) con visión por computadora real, corriendo fuera de las
funciones serverless de Vercel — ver ARCHITECTURE.md § "Detección de
muros" para el porqué de la separación.

Pipeline:
  1. Binarización (Otsu invertida — trazos oscuros como foreground blanco)
     + cierre morfológico para unir discontinuidades de una misma línea.
  2. Canny + HoughLinesP: segmentos de línea candidatos. Una pared larga
     sale fragmentada en decenas de segmentos pequeños.
  3. Fusión de segmentos casi-colineales y cercanos (mismo ángulo ±tol,
     mismo offset perpendicular ±tol) en un único segmento por muro.
  4. Emparejamiento de líneas paralelas cercanas: en planos dibujados con
     doble línea por pared (CAD estándar), colapsa el par en la línea
     central y MIDE el grosor real como la distancia entre caras — no lo
     asume, salvo que no se detecte el par.
  5. Clasificación de orientación (horizontal/vertical/diagonal).
  6. Aberturas: heurística de gap — un hueco entre dos muros colineales y
     alineados, de ancho plausible para puerta/ventana, se marca como
     abertura candidata.

Lo que sigue sin resolver (documentado, no oculto — mismo criterio de
honestidad que el resto del pipeline):
  - Escala px→metros: no hay forma de derivarla de una sola imagen sin
    una referencia (cota acotada, escalímetro, o un elemento de tamaño
    estándar detectado, ej. una puerta de 0.80 m). Se recibe como
    parámetro con un default documentado; `scale_source` en el resultado
    indica si fue "assumed" o (a futuro) "detected".
  - Aberturas: la heurística de gap encuentra huecos geométricos, no
    reconoce el símbolo de puerta (arco + línea) — puede confundir un
    corte real de pared con ruido de escaneo, o viceversa.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import cv2
import numpy as np

Orientation = Literal["horizontal", "vertical", "diagonal"]


@dataclass
class WallDetectionConfig:
    # Escala — sin referencia en la imagen, esto es un supuesto, no una
    # medición. 100 px ≈ 1 m, mismo placeholder que traía el stub de TS.
    assumed_scale_m_per_px: float = 1 / 100

    # Canny
    canny_low: int = 50
    canny_high: int = 150

    # HoughLinesP — los mínimos son relativos al lado menor de la imagen
    # para que el detector funcione igual en planos de cualquier resolución.
    # maxLineGap generoso: mejor que Hough bridgee el ruido interno de una
    # misma cara de pared ACÁ, con la geometría real de los píxeles, que
    # dejarlo para la heurística de gaps post-hoc del paso de fusión.
    hough_threshold: int = 50
    hough_min_line_length_frac: float = 0.03
    hough_max_line_gap_frac: float = 0.05
    close_kernel_px: int = 3

    # Fusión de segmentos colineales
    merge_angle_tol_deg: float = 4.0
    merge_offset_tol_px: float = 8.0
    # Gap máximo (a lo largo de la línea) para seguir fusionando como una
    # misma pared — cierra discontinuidades de Hough, pero debe quedar por
    # debajo de min_opening_gap_px o un hueco de puerta real se fusionaría
    # y desaparecería antes de llegar al detector de aberturas.
    merge_max_gap_px: float = 25.0
    min_wall_length_px: float = 25.0

    # Grosor: emparejamiento de líneas paralelas (doble línea = pared real)
    default_wall_thickness_m: float = 0.15
    thickness_pair_min_px: float = 8.0   # menos que esto ya se fusionó como una sola línea
    thickness_pair_max_px: float = 30.0  # más que esto son dos paredes distintas, no dos caras

    # Aberturas — gap entre muros colineales, en rango plausible de puerta/ventana
    min_opening_gap_px: float = 12.0
    max_opening_gap_px: float = 140.0


@dataclass
class Point2D:
    x: float
    y: float


@dataclass
class DetectedWall:
    start: Point2D
    end: Point2D
    thickness_m: float
    thickness_measured: bool  # True = distancia real entre caras; False = default asumido
    orientation: Orientation
    length_m: float


@dataclass
class DetectedOpening:
    wall_index: int
    position_ratio: float
    width_m: float


@dataclass
class WallDetectionResult:
    image_width_px: int
    image_height_px: int
    scale_m_per_px: float
    scale_source: Literal["assumed", "detected"]
    walls: list[DetectedWall] = field(default_factory=list)
    openings: list[DetectedOpening] = field(default_factory=list)
    raw_segments_found: int = 0
    walls_after_merge: int = 0


# ────────────────────────────────────────────────────────────
# Paso 1 — Binarización
# ────────────────────────────────────────────────────────────

def _binarize(gray: np.ndarray, cfg: WallDetectionConfig) -> np.ndarray:
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (cfg.close_kernel_px, cfg.close_kernel_px))
    return cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)


# ────────────────────────────────────────────────────────────
# Paso 2 — Canny + HoughLinesP
# ────────────────────────────────────────────────────────────

def _detect_segments(binary: np.ndarray, cfg: WallDetectionConfig) -> np.ndarray:
    edges = cv2.Canny(binary, cfg.canny_low, cfg.canny_high)
    h, w = binary.shape
    short_side = min(h, w)
    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=cfg.hough_threshold,
        minLineLength=cfg.hough_min_line_length_frac * short_side,
        maxLineGap=cfg.hough_max_line_gap_frac * short_side,
    )
    if lines is None:
        return np.empty((0, 4))
    return lines.reshape(-1, 4).astype(np.float64)


def _angle_deg(seg: np.ndarray) -> float:
    x1, y1, x2, y2 = seg
    return float(np.degrees(np.arctan2(y2 - y1, x2 - x1)) % 180)


# ────────────────────────────────────────────────────────────
# Paso 3 — Fusión de segmentos colineales/cercanos
# ────────────────────────────────────────────────────────────

def _merge_segments(segments: np.ndarray, cfg: WallDetectionConfig) -> list[np.ndarray]:
    """Agrupa segmentos casi-colineales (misma familia: ángulo + offset
    perpendicular dentro de tolerancia) y, DENTRO de cada familia, funde
    solo los tramos contiguos — un hueco real a lo largo de la línea
    (> merge_max_gap_px) parte la familia en varios muros en vez de
    saltarlo, para no borrar puertas/ventanas antes de poder detectarlas."""
    if len(segments) == 0:
        return []

    angles = np.array([_angle_deg(s) for s in segments])
    used = np.zeros(len(segments), dtype=bool)
    merged: list[np.ndarray] = []

    for i in range(len(segments)):
        if used[i]:
            continue
        x1, y1, x2, y2 = segments[i]
        dx, dy = x2 - x1, y2 - y1
        norm = float(np.hypot(dx, dy))
        if norm < 1e-6:
            used[i] = True
            continue
        ux, uy = dx / norm, dy / norm
        nx, ny = -uy, ux  # normal unitaria — mide distancia perpendicular
        ref_offset = x1 * nx + y1 * ny
        base_angle = angles[i]

        # 1) familia colineal — sin importar separación a lo largo de la línea
        family = [i]
        for j in range(i + 1, len(segments)):
            if used[j]:
                continue
            d_angle = min(abs(angles[j] - base_angle), 180 - abs(angles[j] - base_angle))
            if d_angle > cfg.merge_angle_tol_deg:
                continue
            xj1, yj1, xj2, yj2 = segments[j]
            off1 = xj1 * nx + yj1 * ny
            off2 = xj2 * nx + yj2 * ny
            if abs(off1 - ref_offset) > cfg.merge_offset_tol_px or abs(off2 - ref_offset) > cfg.merge_offset_tol_px:
                continue
            family.append(j)

        # 2) proyectar cada segmento de la familia sobre la dirección
        #    principal, ordenar, y partir en tramos contiguos por gap real
        entries = []  # (proj_lo, proj_hi, point_at_lo, point_at_hi, idx)
        for k in family:
            xk1, yk1, xk2, yk2 = segments[k]
            p1, p2 = xk1 * ux + yk1 * uy, xk2 * ux + yk2 * uy
            if p1 <= p2:
                entries.append((p1, p2, (xk1, yk1), (xk2, yk2), k))
            else:
                entries.append((p2, p1, (xk2, yk2), (xk1, yk1), k))
        entries.sort(key=lambda e: e[0])

        run = [entries[0]]
        run_hi = entries[0][1]
        for e in entries[1:]:
            if e[0] - run_hi <= cfg.merge_max_gap_px:
                run.append(e)
                run_hi = max(run_hi, e[1])
            else:
                merged.append(_finalize_run(run))
                for r in run:
                    used[r[4]] = True
                run = [e]
                run_hi = e[1]
        merged.append(_finalize_run(run))
        for r in run:
            used[r[4]] = True

    return merged


def _finalize_run(run: list[tuple]) -> np.ndarray:
    lo_entry = min(run, key=lambda e: e[0])
    hi_entry = max(run, key=lambda e: e[1])
    p_lo, p_hi = lo_entry[2], hi_entry[3]
    return np.array([p_lo[0], p_lo[1], p_hi[0], p_hi[1]])


# ────────────────────────────────────────────────────────────
# Paso 4 — Emparejamiento de caras paralelas → grosor medido
# ────────────────────────────────────────────────────────────

def _pair_and_measure_thickness(segs: list[np.ndarray], cfg: WallDetectionConfig) -> list[dict]:
    n = len(segs)
    paired = [False] * n
    results: list[dict] = []

    def projected_range(seg: np.ndarray, ux: float, uy: float) -> tuple[float, float]:
        x1, y1, x2, y2 = seg
        a, b = x1 * ux + y1 * uy, x2 * ux + y2 * uy
        return (a, b) if a <= b else (b, a)

    for i in range(n):
        if paired[i]:
            continue
        x1, y1, x2, y2 = segs[i]
        dx, dy = x2 - x1, y2 - y1
        norm = float(np.hypot(dx, dy)) or 1.0
        ux, uy = dx / norm, dy / norm
        nx, ny = -uy, ux
        offset_i = x1 * nx + y1 * ny
        ai = _angle_deg(segs[i])
        range_i = projected_range(segs[i], ux, uy)

        best_j, best_gap = None, None
        for j in range(n):
            if j == i or paired[j]:
                continue
            aj = _angle_deg(segs[j])
            d_angle = min(abs(aj - ai), 180 - abs(aj - ai))
            if d_angle > cfg.merge_angle_tol_deg:
                continue
            xj1, yj1, xj2, yj2 = segs[j]
            offset_j = xj1 * nx + yj1 * ny
            gap = abs(offset_j - offset_i)
            if not (cfg.thickness_pair_min_px <= gap <= cfg.thickness_pair_max_px):
                continue
            range_j = projected_range(segs[j], ux, uy)
            overlap = min(range_i[1], range_j[1]) - max(range_i[0], range_j[0])
            min_span = min(range_i[1] - range_i[0], range_j[1] - range_j[0]) or 1.0
            if overlap / min_span < 0.5:
                continue
            if best_gap is None or gap < best_gap:
                best_gap, best_j = gap, j

        if best_j is not None:
            paired[i] = paired[best_j] = True
            xj1, yj1, xj2, yj2 = segs[best_j]
            cx1, cy1 = (x1 + xj1) / 2, (y1 + yj1) / 2
            cx2, cy2 = (x2 + xj2) / 2, (y2 + yj2) / 2
            results.append({"seg": np.array([cx1, cy1, cx2, cy2]), "thickness_px": best_gap, "measured": True})
        else:
            paired[i] = True
            results.append({"seg": segs[i], "thickness_px": None, "measured": False})

    return results


# ────────────────────────────────────────────────────────────
# Paso 5 — Aberturas: heurística de gap entre muros colineales
# ────────────────────────────────────────────────────────────

def _range_gap(a: tuple[float, float], b: tuple[float, float]) -> float | None:
    a0, a1 = sorted(a)
    b0, b1 = sorted(b)
    if a1 < b0:
        return b0 - a1
    if b1 < a0:
        return a0 - b1
    return None  # se solapan → no hay gap


def _detect_openings(walls: list[DetectedWall], cfg: WallDetectionConfig) -> list[DetectedOpening]:
    openings: list[DetectedOpening] = []
    align_tol_m = cfg.merge_offset_tol_px * cfg.assumed_scale_m_per_px * 2

    for i in range(len(walls)):
        for j in range(i + 1, len(walls)):
            wi, wj = walls[i], walls[j]
            if wi.orientation != wj.orientation or wi.orientation == "diagonal":
                continue
            if wi.orientation == "horizontal":
                if abs(wi.start.y - wj.start.y) > align_tol_m:
                    continue
                gap = _range_gap((wi.start.x, wi.end.x), (wj.start.x, wj.end.x))
            else:
                if abs(wi.start.x - wj.start.x) > align_tol_m:
                    continue
                gap = _range_gap((wi.start.y, wi.end.y), (wj.start.y, wj.end.y))

            if gap is None:
                continue
            gap_px = gap / cfg.assumed_scale_m_per_px
            if cfg.min_opening_gap_px <= gap_px <= cfg.max_opening_gap_px:
                openings.append(DetectedOpening(wall_index=i, position_ratio=0.5, width_m=round(gap, 3)))

    return openings


# ────────────────────────────────────────────────────────────
# Orquestador
# ────────────────────────────────────────────────────────────

def detect_walls(image_bytes: bytes, config: WallDetectionConfig | None = None) -> WallDetectionResult:
    cfg = config or WallDetectionConfig()
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen (formato no soportado o datos corruptos)")

    h, w = img.shape
    binary = _binarize(img, cfg)
    raw_segments = _detect_segments(binary, cfg)
    merged = _merge_segments(raw_segments, cfg)
    merged = [s for s in merged if np.hypot(s[2] - s[0], s[3] - s[1]) >= cfg.min_wall_length_px]
    thickness_results = _pair_and_measure_thickness(merged, cfg)

    walls: list[DetectedWall] = []
    for r in thickness_results:
        x1, y1, x2, y2 = r["seg"]
        length_px = float(np.hypot(x2 - x1, y2 - y1))
        angle = _angle_deg(r["seg"])
        if angle < 10 or angle > 170:
            orientation: Orientation = "horizontal"
        elif 80 < angle < 100:
            orientation = "vertical"
        else:
            orientation = "diagonal"

        thickness_m = (
            r["thickness_px"] * cfg.assumed_scale_m_per_px
            if r["measured"]
            else cfg.default_wall_thickness_m
        )
        walls.append(
            DetectedWall(
                start=Point2D(round(x1 * cfg.assumed_scale_m_per_px, 3), round(y1 * cfg.assumed_scale_m_per_px, 3)),
                end=Point2D(round(x2 * cfg.assumed_scale_m_per_px, 3), round(y2 * cfg.assumed_scale_m_per_px, 3)),
                thickness_m=round(thickness_m, 3),
                thickness_measured=r["measured"],
                orientation=orientation,
                length_m=round(length_px * cfg.assumed_scale_m_per_px, 3),
            )
        )

    openings = _detect_openings(walls, cfg)

    return WallDetectionResult(
        image_width_px=w,
        image_height_px=h,
        scale_m_per_px=cfg.assumed_scale_m_per_px,
        scale_source="assumed",
        walls=walls,
        openings=openings,
        raw_segments_found=len(raw_segments),
        walls_after_merge=len(walls),
    )
